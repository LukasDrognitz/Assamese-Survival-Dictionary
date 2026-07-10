param(
  [int]$Port = 8080,
  [string]$RootPath = ""
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($RootPath)) {
  $RootPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
}

$RootPath = [System.IO.Path]::GetFullPath($RootPath)
$prefix = "http://127.0.0.1:$Port/"
$runtimeDir = Join-Path $RootPath ".private-access"
$statePath = Join-Path $runtimeDir "shared-state.json"

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".js" = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg" = "image/svg+xml"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif" = "image/gif"
  ".webp" = "image/webp"
  ".ico" = "image/x-icon"
  ".webmanifest" = "application/manifest+json; charset=utf-8"
  ".txt" = "text/plain; charset=utf-8"
  ".mp3" = "audio/mpeg"
  ".wav" = "audio/wav"
  ".ogg" = "audio/ogg"
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host "Private app server listening on $prefix"
Write-Host "Serving files from $RootPath"

function Write-JsonResponse {
  param(
    [Parameter(Mandatory = $true)]
    [System.Net.HttpListenerResponse]$Response,
    [Parameter(Mandatory = $true)]
    [int]$StatusCode,
    [Parameter(Mandatory = $false)]
    [object]$Payload = $null
  )

  $Response.StatusCode = $StatusCode
  $Response.ContentType = "application/json; charset=utf-8"

  if ($null -ne $Payload) {
    $json = $Payload | ConvertTo-Json -Depth 50 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $Response.ContentLength64 = $bytes.Length
    $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  }

  $Response.OutputStream.Close()
}

function Handle-StateApi {
  param(
    [Parameter(Mandatory = $true)]
    [System.Net.HttpListenerContext]$Context
  )

  $request = $Context.Request
  $response = $Context.Response

  if ($request.HttpMethod -eq "GET") {
    if (-not (Test-Path $statePath -PathType Leaf)) {
      Write-JsonResponse -Response $response -StatusCode 204
      return
    }

    $raw = Get-Content -Path $statePath -Raw -ErrorAction SilentlyContinue
    if ([string]::IsNullOrWhiteSpace($raw)) {
      Write-JsonResponse -Response $response -StatusCode 204
      return
    }

    $response.StatusCode = 200
    $response.ContentType = "application/json; charset=utf-8"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
    $response.ContentLength64 = $bytes.Length
    if ($request.HttpMethod -ne 'HEAD') {
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    $response.OutputStream.Close()
    return
  }

  if ($request.HttpMethod -eq "PUT") {
    $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
    $rawBody = $reader.ReadToEnd()
    $reader.Close()

    if ([string]::IsNullOrWhiteSpace($rawBody)) {
      Write-JsonResponse -Response $response -StatusCode 400 -Payload @{ error = "Body is required." }
      return
    }

    try {
      $null = $rawBody | ConvertFrom-Json -ErrorAction Stop
    } catch {
      Write-JsonResponse -Response $response -StatusCode 400 -Payload @{ error = "Invalid JSON payload." }
      return
    }

    [System.IO.File]::WriteAllText($statePath, $rawBody, [System.Text.Encoding]::UTF8)
    Write-JsonResponse -Response $response -StatusCode 200 -Payload @{ ok = $true }
    return
  }

  Write-JsonResponse -Response $response -StatusCode 405 -Payload @{ error = "Method not allowed." }
}

while ($listener.IsListening) {
  $context = $listener.GetContext()

  try {
    if ($context.Request.Url.AbsolutePath -eq "/api/state") {
      Handle-StateApi -Context $context
      continue
    }

    $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($requestPath)) {
      $requestPath = 'index.html'
    }

    $candidatePath = [System.IO.Path]::GetFullPath((Join-Path $RootPath $requestPath))
    if (-not $candidatePath.StartsWith($RootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
      $context.Response.StatusCode = 403
      $context.Response.Close()
      continue
    }

    if (-not (Test-Path $candidatePath -PathType Leaf)) {
      # SPA fallback for route-like paths.
      $candidatePath = Join-Path $RootPath 'index.html'
    }

    if (Test-Path $candidatePath -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($candidatePath).ToLowerInvariant()
      if ($mimeTypes.ContainsKey($ext)) {
        $context.Response.ContentType = $mimeTypes[$ext]
      }

      $bytes = [System.IO.File]::ReadAllBytes($candidatePath)
      $context.Response.ContentLength64 = $bytes.Length

      if ($context.Request.HttpMethod -ne 'HEAD') {
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      }

      $context.Response.StatusCode = 200
      $context.Response.OutputStream.Close()
      continue
    }

    $context.Response.StatusCode = 404
    $context.Response.Close()
  } catch {
    try {
      $context.Response.StatusCode = 500
      $context.Response.Close()
    } catch {}
  }
}
