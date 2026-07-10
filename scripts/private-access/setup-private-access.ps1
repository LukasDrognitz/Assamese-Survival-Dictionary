param(
  [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$runtimeDir = Join-Path $repoRoot ".private-access"
$pidFile = Join-Path $runtimeDir "server.pid"
$serverScript = Join-Path $repoRoot "scripts\private-access\start-app-server.ps1"

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

function Ensure-Tailscale {
  if (-not (Get-Command tailscale -ErrorAction SilentlyContinue)) {
    throw "tailscale is not installed. Install Tailscale first."
  }

  $service = Get-Service -Name "Tailscale" -ErrorAction SilentlyContinue
  if ($null -eq $service) {
    throw "Tailscale service is missing. Reinstall Tailscale."
  }

  if ($service.Status -ne 'Running') {
    Start-Service -Name "Tailscale"
  }
}

function Ensure-AppServer {
  if (Test-Path $pidFile) {
    $existingPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($existingPid -match '^\d+$') {
      $proc = Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue
      if ($null -ne $proc) {
        return
      }
    }
  }

  $proc = Start-Process -FilePath "powershell" -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $serverScript,
    "-Port", "$Port",
    "-RootPath", $repoRoot
  ) -PassThru -WindowStyle Hidden

  Set-Content -Path $pidFile -Value $proc.Id
}

function Ensure-TailscaleLogin {
  # This call exits quickly when already authenticated, otherwise it prints a login URL.
  tailscale up | Out-Host
}

function Configure-TailscaleServe {
  tailscale serve --bg "http://127.0.0.1:$Port" | Out-Host
}

function Show-AccessUrl {
  $statusJson = tailscale status --json | ConvertFrom-Json
  $dnsName = $statusJson.Self.DNSName

  if ([string]::IsNullOrWhiteSpace($dnsName)) {
    throw "Could not determine Tailscale DNS name."
  }

  $url = "https://$dnsName"
  Write-Host ""
  Write-Host "Private app URL (requires your Tailscale login):"
  Write-Host $url
  Write-Host ""
  Write-Host "Install Tailscale on any device where you want access, log in with the same account, then open that URL."
}

Ensure-Tailscale
Ensure-AppServer
Ensure-TailscaleLogin
Configure-TailscaleServe
Show-AccessUrl
