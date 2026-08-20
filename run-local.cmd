@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to run BasedCode locally.
  echo Install Node.js 22.13 or newer, then run this script again.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js with npm included.
  exit /b 1
)

set "PORT=%~1"
if "%PORT%"=="" set "PORT=3000"

if not exist "node_modules\.bin\vinext.cmd" (
  echo Installing project dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)

if exist ".vinext\dev\lock.json" (
  powershell -NoProfile -Command "$lockPath = Join-Path (Get-Location) '.vinext\dev\lock.json'; try { $lock = Get-Content -Raw -LiteralPath $lockPath | ConvertFrom-Json } catch { exit 0 }; $age = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - [int64]$lock.startedAt; $listener = Get-NetTCPConnection -State Listen -LocalPort ([int]$lock.port) -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -eq [int]$lock.pid }; if ($listener) { Write-Host ('BasedCode is already running at ' + $lock.appUrl + '/'); exit 20 }; if ($age -gt 30000) { Remove-Item -LiteralPath $lockPath -Force; Write-Host 'Removed a stale local server lock.' }"
  if errorlevel 20 if not errorlevel 21 exit /b 0
  if errorlevel 1 exit /b 1
)

echo Starting BasedCode at http://localhost:%PORT%/
echo Press Ctrl+C to stop the local server.
echo.

call npm run dev -- --port %PORT%
exit /b %errorlevel%
