@echo off
REM ===================================================
REM   AUTO-START - Runs work-start.bat automatically
REM ===================================================
REM
REM To use: Add this to Windows Startup folder
REM Location: %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
REM
echo.
echo ===== AUTO-STARTING KIMBLEAI =====
echo.

cd C:\Dev\Projects\kimbleai-v4-clean

echo Waiting 10 seconds for Windows to fully load...
timeout /t 10 /nobreak

echo.
echo Starting work-start.bat...
call work-start.bat
