$ErrorActionPreference = 'Stop'

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$runtimeDir = Join-Path $repoRoot ".private-access"
$pidFile = Join-Path $runtimeDir "server.pid"

if (Get-Command tailscale -ErrorAction SilentlyContinue) {
  try {
    tailscale serve reset | Out-Host
  } catch {
    Write-Host "Could not reset tailscale serve config."
  }
}

if (Test-Path $pidFile) {
  $pidValue = Get-Content $pidFile -ErrorAction SilentlyContinue
  if ($pidValue -match '^\d+$') {
    try {
      Stop-Process -Id ([int]$pidValue) -Force -ErrorAction Stop
      Write-Host "Stopped app server process $pidValue"
    } catch {
      Write-Host "App server process was not running."
    }
  }

  Remove-Item $pidFile -ErrorAction SilentlyContinue
}
