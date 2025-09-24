@echo off
:: KimbleAI v4 Clean - Admin Launcher
:: Double-click this file to launch the development environment

echo Starting KimbleAI v4 Clean Development Environment...
echo.

:: Run the PowerShell script with admin privileges
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch-kimbleai-admin.ps1"

exit
