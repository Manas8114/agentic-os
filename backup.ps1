<#>
.SYNOPSIS
    Create backup snapshot of Agentic OS project
.DESCRIPTION
    Creates a compressed tar.gz archive of all project data (brain, skills, agents, etc.)
    excluding settings files.
.NOTES
    Usage: .\backup.ps1
#>

$ErrorActionPreference = "Stop"

$backupDir = Join-Path $PSScriptRoot "backups"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $backupDir "agentic-os-$timestamp.tar.gz"

# Create backup directory
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

Write-Host "Creating backup: $backupFile" -ForegroundColor Cyan

# Directories to backup
$dirsToBackup = @(
    "brain",
    "skills",
    "agents",
    "data",
    "registry",
    "standards",
    "prompts"
)

# Build tar command - exclude data/settings.json
$excludeArgs = @("--exclude=data/settings.json", "--exclude=data/chat-history.json", "--exclude=data/cost-history.json")

# Check if tar is available (Windows 10 1706+ has tar.exe)
if (Get-Command tar -ErrorAction SilentlyContinue) {
    $sourcePaths = $dirsToBackup | Where-Object { Test-Path (Join-Path $PSScriptRoot $_) }
    if ($sourcePaths.Count -eq 0) {
        Write-Warning "No source directories found to backup!"
        exit 1
    }
    
    $tarArgs = @("czf", $backupFile) + $excludeArgs + $sourcePaths
    & tar @tarArgs
    
    if ($LASTEXITCODE -eq 0) {
        $size = (Get-Item $backupFile).Length
        $sizeKB = [math]::Round($size / 1KB, 1)
        $sizeMB = [math]::Round($size / 1MB, 2)
        $displaySize = if ($sizeMB -ge 1) { "$sizeMB MB" } else { "$sizeKB KB" }
        
        Write-Host "`nBackup created: $displaySize" -ForegroundColor Green
        Write-Host "Path: $backupFile" -ForegroundColor Green
    } else {
        Write-Error "Backup failed with exit code $LASTEXITCODE"
        exit 1
    }
} else {
    # Fallback: use .NET compression (slower but no external dependency)
    Write-Host "tar.exe not found, using .NET compression..." -ForegroundColor Yellow
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($PSScriptRoot, $backupFile)
    
    if (Test-Path $backupFile) {
        $size = (Get-Item $backupFile).Length
        $sizeKB = [math]::Round($size / 1KB, 1)
        $sizeMB = [math]::Round($size / 1MB, 2)
        $displaySize = if ($sizeMB -ge 1) { "$sizeMB MB" } else { "$sizeKB KB" }
        
        Write-Host "`nBackup created: $displaySize" -ForegroundColor Green
        Write-Host "Path: $backupFile" -ForegroundColor Green
    } else {
        Write-Error "Backup failed"
        exit 1
    }
}