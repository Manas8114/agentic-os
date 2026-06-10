<#>
.SYNOPSIS
    Agentic OS Installer for Windows (PowerShell)
.DESCRIPTION
    One-command installer that sets up Python dependencies, checks for required tools,
    and initializes the Agentic OS project on Windows.
.NOTES
    Run from PowerShell (not cmd.exe). Right-click PowerShell and "Run as Administrator"
    if you need to install Python/Node system-wide.
    Usage: .\install.ps1
#>

param(
    [switch]$SkipPythonDeps,
    [switch]$SkipNodeCheck,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "=== Agentic OS Installer (Windows) ===" -ForegroundColor Cyan
Write-Host ""

# Detect OS
$os = (Get-CimInstance Win32_OperatingSystem).Caption
Write-Host "Detected OS: $os" -ForegroundColor Green

# Check PowerShell version
$psVersion = $PSVersionTable.PSVersion.Major
if ($psVersion -lt 5) {
    Write-Warning "PowerShell 5.1+ recommended. Current: $psVersion"
}

# Check Python
Write-Host "`nChecking Python..." -ForegroundColor Yellow
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pyVersion = python --version 2>&1
    Write-Host "Python: $pyVersion" -ForegroundColor Green
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pyVersion = python3 --version 2>&1
    Write-Host "Python: $pyVersion" -ForegroundColor Green
} else {
    Write-Error "ERROR: Python 3.10+ required."
    Write-Host "Install via: winget install Python.Python.3.11" -ForegroundColor Yellow
    Write-Host "Or download from: https://www.python.org/downloads/windows/" -ForegroundColor Yellow
    exit 1
}

# Check pip
if (-not (Get-Command pip -ErrorAction SilentlyContinue)) {
    Write-Host "Installing pip..." -ForegroundColor Yellow
    python -m ensurepip --upgrade
}

# Install Python dependencies
if (-not $SkipPythonDeps) {
    Write-Host "`nInstalling Python dependencies..." -ForegroundColor Yellow
    try {
        pip install -r requirements.txt
        Write-Host "Python dependencies installed successfully!" -ForegroundColor Green
    } catch {
        Write-Error "Failed to install Python dependencies: $_"
        exit 1
    }
}

# Check Node.js (for opencode)
if (-not $SkipNodeCheck) {
    Write-Host "`nChecking Node.js..." -ForegroundColor Yellow
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $nodeVersion = node --version
        Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
        $majorVersion = [int]($nodeVersion.TrimStart('v').Split('.')[0])
        if ($majorVersion -lt 18) {
            Write-Warning "opencode requires Node 18+. Current: $nodeVersion"
        }
    } else {
        Write-Warning "Node.js not found. opencode requires Node 18+."
        Write-Host "  Install via: winget install OpenJS.NodeJS" -ForegroundColor Yellow
        Write-Host "  Or: choco install nodejs" -ForegroundColor Yellow
        Write-Host "  Or download from: https://nodejs.org/" -ForegroundColor Yellow
    }
}

# Check opencode
Write-Host "`nChecking opencode..." -ForegroundColor Yellow
if (Get-Command opencode -ErrorAction SilentlyContinue) {
    $ocVersion = opencode --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "opencode: $ocVersion" -ForegroundColor Green
    } else {
        Write-Host "opencode: installed" -ForegroundColor Green
    }
} else {
    Write-Warning "opencode not found. Install via: npm install -g @opencode/cli"
}

# Check Hermes
Write-Host "`nChecking Hermes Agent..." -ForegroundColor Yellow
if (Get-Command hermes -ErrorAction SilentlyContinue) {
    Write-Host "Hermes: found" -ForegroundColor Green
} else {
    Write-Warning "Hermes Agent not found."
    Write-Host "  Install via: irm https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1 | iex" -ForegroundColor Yellow
    Write-Host "  Or (if you have curl): curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash" -ForegroundColor Yellow
}

# Check Gemini CLI
Write-Host "`nChecking Gemini CLI..." -ForegroundColor Yellow
if (Get-Command gemini -ErrorAction SilentlyContinue) {
    Write-Host "Gemini CLI: found" -ForegroundColor Green
} else {
    Write-Warning "Gemini CLI not found. Install via: npm install -g @google/gemini-cli"
}

# Create required directories
Write-Host "`nCreating directories..." -ForegroundColor Yellow
$dirs = @("backups", "audit", "data", "brain\journal", "scheduler\jobs")
foreach ($dir in $dirs) {
    $fullPath = Join-Path $PSScriptRoot $dir
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "  Created: $dir" -ForegroundColor Gray
    }
}

# Initialize git if not already
if (-not (Test-Path (Join-Path $PSScriptRoot ".git"))) {
    Write-Host "`nInitializing git repository..." -ForegroundColor Yellow
    git init
    $gitignore = Join-Path $PSScriptRoot ".gitignore"
    $ignoreEntries = @(
        "audit/*",
        "backups/*.tar.gz",
        "data/settings.json",
        "data/chat-history.json",
        "data/cost-history.json"
    )
    foreach ($entry in $ignoreEntries) {
        if (-not (Select-String -Pattern ([regex]::Escape($entry)) -Path $gitignore -Quiet 2>$null)) {
            Add-Content -Path $gitignore -Value $entry
        }
    }
}

Write-Host "`n=== Installation complete! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "  1. Edit data\settings.json with your API keys" -ForegroundColor White
Write-Host "  2. Run .\start.ps1 to launch the dashboard" -ForegroundColor White
Write-Host "  3. Open http://127.0.0.1:8080 in your browser" -ForegroundColor White
Write-Host ""
Write-Host "For Hermes (OpenRouter) API key:" -ForegroundColor Yellow
Write-Host '  $env:OPENROUTER_API_KEY = "sk-or-..."' -ForegroundColor White
Write-Host '  Or create ~/.hermes/.env with: OPENROUTER_API_KEY=sk-or-...' -ForegroundColor White
Write-Host ""
Write-Host "For Gemini CLI (Google OAuth):" -ForegroundColor Yellow
Write-Host "  gemini auth login" -ForegroundColor White