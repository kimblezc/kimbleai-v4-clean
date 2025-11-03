@echo off
REM ===================================================
REM   QUICK SAVE - Fast backup to GitHub
REM ===================================================
echo.
echo ===== QUICK SAVE =====
echo.

cd C:\Dev\Projects\kimbleai-v4-clean

git add .
git commit -m "Quick save - %date% %time%"
git push origin master

echo.
echo ===== SAVED! =====
echo.
pause
