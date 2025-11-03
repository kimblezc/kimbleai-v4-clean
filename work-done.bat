@echo off
REM ===================================================
REM   END WORK - Save code to GitHub
REM ===================================================
echo.
echo ===== ENDING WORK SESSION =====
echo.

cd C:\Dev\Projects\kimbleai-v4-clean

echo What did you work on today?
set /p message="Commit message: "

echo.
echo [1/3] Saving all changes...
git add .

echo.
echo [2/3] Committing changes...
git commit -m "%message%"

echo.
echo [3/3] Pushing to GitHub...
git push origin master

echo.
echo ===== DONE! =====
echo.
echo ✅ Your changes are saved to GitHub
echo ✅ Railway auto-deploy triggered!
echo.
echo ⏱️  Deployment Timeline:
echo     - Build: ~4-6 minutes
echo     - Deploy: ~30 seconds
echo     - Total: ~7 minutes to LIVE
echo.
echo 🌐 Live URL: https://www.kimbleai.com
echo.
echo 💡 TIP: Wait 7 minutes, then visit kimbleai.com and hard refresh (Ctrl+Shift+R)
echo.
echo You can now work on your laptop - just run work-start.bat
echo.
pause
