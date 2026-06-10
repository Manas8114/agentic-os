<#>
.SYNOPSIS
    Start Agentic OS Dashboard on Windows
.DESCRIPTION
    Launches the FastAPI backend server for the Agentic OS dashboard.
    Uses Start-Process to keep the server running in the background.
.NOTES
    Usage: .\start.ps1 [-Port 8080]
    Note: For persistent background execution, run directly:
          python server.py --port 8080
#>

param(
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"

Write-Host "Starting Agentic OS Dashboard..." -ForegroundColor Cyan
Write-Host ""

$serverPath = Join-Path $PSScriptRoot "server.py"
if (-not (Test-Path $serverPath)) {
    Write-Error "ERROR: server.py not found. Are you in the right directory?"
    exit 1
}

# Get port from settings.json if exists
$settingsPath = Join-Path $PSScriptRoot "data\settings.json"
if (Test-Path $settingsPath) {
    try {
        $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
        if ($settings.dashboard.port) {
            $Port = $settings.dashboard.port
        }
    } catch {
        # Use default port
    }
}

# Check/install Python dependencies
Write-Host "Checking Python dependencies..." -ForegroundColor Yellow
try {
    pip install -r requirements.txt -q 2>$null
} catch {
    Write-Warning "Could not auto-install dependencies. Run .\install.ps1 first if needed."
}

Write-Host "`nDashboard: http://127.0.0.1:$Port" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start server - use Start-Process with a new window to keep it running
# On Windows, python runs in the same console unless we use a new window
Write-Host "Starting server in new window..." -ForegroundColor Yellow
Start-Process python -ArgumentList "server.py", "--port", $Port -WorkingDirectory $PSScriptRoot -NoNewWindow:$false

Write-Host "`nServer launched in separate window." -ForegroundColor Green
Write-Host "To stop: Close the python window or use Task Manager" -ForegroundColor Yellow
Write-Host ""
Write-Host "Alternatively, run directly in this terminal:" -ForegroundColor Cyan
Write-Host "  python server.py --port $Port" -ForegroundColor White