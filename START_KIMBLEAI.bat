@echo off
:: KimbleAI v4 Clean - Quick Launch with Admin
:: This is the ACTIVE production version

title KimbleAI v4 Clean Development

echo.
echo ========================================
echo   KimbleAI v4 Clean - Active Version
echo ========================================
echo.

:: Launch PowerShell script with admin privileges
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0LAUNCH_DEV_ENVIRONMENT.ps1"

exit
