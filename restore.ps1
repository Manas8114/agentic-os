<#>
.SYNOPSIS
    Restore Agentic OS project from backup snapshot
.DESCRIPTION
    Extracts a backup tar.gz file, overwriting current project data.
.NOTES
    Usage: .\restore.ps1 [-BackupFile "path\to\backup.tar.gz"]
#>

param(
    [Parameter(Mandatory=$false, Position=0)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

$backupDir = Join-Path $PSScriptRoot "backups"

if (-not $BackupFile) {
    Write-Host "Available backups:" -ForegroundColor Cyan
    $backups = Get-ChildItem -Path $backupDir -Filter "*.tar.gz" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    if ($backups.Count -eq 0) {
        Write-Host "  No backups found in $backupDir" -ForegroundColor Yellow
        exit 1
    }
    $backups | ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        Write-Host "  $($_.Name) ($size MB) - $($_.LastWriteTime)" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Usage: .\restore.ps1 <backup-file>" -ForegroundColor Yellow
    Write-Host "Example: .\restore.ps1 backups\agentic-os-20260608_120000.tar.gz" -ForegroundColor Yellow
    exit 0
}

# Resolve backup file path
if (-not [IO.Path]::IsPathRooted($BackupFile)) {
    $BackupFile = Join-Path $PSScriptRoot $BackupFile
}

if (-not (Test-Path $BackupFile)) {
    Write-Error "ERROR: Backup file not found: $BackupFile"
    exit 1
}

Write-Host "Restoring from: $BackupFile" -ForegroundColor Cyan
Write-Host "WARNING: This will overwrite current brain/, skills/, agents/, data/, registry/, standards/, prompts/" -ForegroundColor Red

$confirm = Read-Host "Continue? (y/N)"
if ($confirm.ToLower() -ne 'y') {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host "`nRestoring..." -ForegroundColor Yellow

# Check if tar is available
if (Get-Command tar -ErrorAction SilentlyContinue) {
    & tar xzf $BackupFile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nRestore complete!" -ForegroundColor Green
    } else {
        Write-Error "Restore failed with exit code $LASTEXITCODE"
        exit 1
    }
} else {
    # Fallback: use .NET extraction
    Write-Host "tar.exe not found, using .NET extraction..." -ForegroundColor Yellow
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $extractPath = $PSScriptRoot
    [System.IO.Compression.ZipFile]::ExtractToDirectory($BackupFile, $extractPath, $true)
    Write-Host "`nRestore complete!" -ForegroundColor Green
}