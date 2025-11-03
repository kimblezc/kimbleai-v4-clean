@echo off
REM ===================================================
REM   START WORK - Pull latest code from GitHub
REM ===================================================
echo.
echo ===== STARTING WORK SESSION =====
echo.

cd C:\Dev\Projects\kimbleai-v4-clean

echo [1/3] Pulling latest code from GitHub...
git pull origin master

echo.
echo [2/3] Installing any new dependencies...
call npm install

echo.
echo [3/3] Starting development server...
echo.
echo ===== READY TO WORK! =====
echo Server starting at http://localhost:3000
echo Press Ctrl+C to stop
echo.

call npm run dev
