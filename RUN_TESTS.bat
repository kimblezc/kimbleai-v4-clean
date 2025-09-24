@echo off
echo Starting Automated Testing...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN_TESTS.ps1"
pause
