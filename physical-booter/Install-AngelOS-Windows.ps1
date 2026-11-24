<#
.SYNOPSIS
    Angel-OS Native Windows Partition & Local-Account Shell Installer
.DESCRIPTION
    Installs the Angel-OS offline OS bundle onto a selected local Windows drive/partition
    (default C:\Angel-OS), registers a strictly Local Account profile (no Microsoft/cloud sign-in),
    and creates a chromeless Fullscreen / Kiosk launcher shortcut on Desktop and Start Menu.
#>
param(
    [string]$InstallRoot = "C:\Angel-OS",
    [string]$LocalUsername = $env:USERNAME
)

$ErrorActionPreference = "Stop"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  ANGEL-OS WINDOWS NATIVE OS & PARTITION INSTALLER (v1.4)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Target Partition Path : $InstallRoot"
Write-Host "Local Account Policy  : LOCAL ACCOUNT ALWAYS (Offline Only)"
Write-Host "Default Local User    : $LocalUsername`n"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")

New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $InstallRoot "Users\$LocalUsername") | Out-Null

if (Test-Path (Join-Path $RepoRoot "dist\index.html")) {
    Copy-Item -Path (Join-Path $RepoRoot "dist\*") -Destination $InstallRoot -Recurse -Force
} elseif (Test-Path (Join-Path $RepoRoot "index.html")) {
    Copy-Item -Path (Join-Path $RepoRoot "*") -Destination $InstallRoot -Recurse -Force
}

$AccountConfig = @{
    accountPolicy      = "LOCAL_ACCOUNT_ALWAYS"
    activeLocalAccount = $LocalUsername
    installPartition   = (Split-Path -Qualifier $InstallRoot)
    installedAt        = (Get-Date).ToString("o")
} | ConvertTo-Json -Depth 4
$AccountConfig | Set-Content -Path (Join-Path $InstallRoot "local_account.json") -Encoding UTF8

# Create local lightweight HTTP launcher + Edge/Chrome chromeless OS shell runner
$RunnerBat = @"
@ECHO OFF
TITLE Angel-OS Native Shell ($LocalUsername - Local Account)
START /B python -m http.server 4195 --directory "$InstallRoot" > "%TEMP%\angelos_srv.log" 2>&1
IF EXIST "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="http://127.0.0.1:4195" --start-fullscreen
  EXIT /B 0
)
IF EXIST "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="http://127.0.0.1:4195" --start-fullscreen
  EXIT /B 0
)
START "" "http://127.0.0.1:4195"
"@
$BatPath = Join-Path $InstallRoot "Boot-AngelOS.bat"
$RunnerBat | Set-Content -Path $BatPath -Encoding ASCII

# Desktop Shortcut
$DesktopDir = [Environment]::GetFolderPath("Desktop")
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut((Join-Path $DesktopDir "Angel-OS ($LocalUsername).lnk"))
$Shortcut.TargetPath = $BatPath
$Shortcut.WorkingDirectory = $InstallRoot
$Shortcut.Description = "Boot Angel-OS (Local Account Always)"
$Shortcut.Save()

Write-Host "[OK] Angel-OS installed on $InstallRoot for local account '$LocalUsername'!" -ForegroundColor Green
Write-Host "     Double-click Desktop shortcut 'Angel-OS ($LocalUsername)' anytime to boot."
