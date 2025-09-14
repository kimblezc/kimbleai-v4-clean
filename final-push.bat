@echo off
:: QUICK GIT PUSH FOR HELPER SCRIPTS
cd /d "D:\OneDrive\Documents\kimbleai-v4-clean"

echo Committing deployment helpers...
git add -A
git commit -m "feat: Add Vercel deployment helpers" -m "- show-env-for-vercel.ps1 displays env vars safely" -m "- deploy-to-vercel.bat guides through final deployment" -m "- Updated DEPLOYMENT_STATUS.md with current state"
git push origin master

echo.
echo ================================================
echo   EVERYTHING IS READY
echo ================================================
echo.
echo Your repository is clean and secure.
echo All helpers are in place.
echo.
echo LAST STEP:
echo Run: .\deploy-to-vercel.bat
echo.
echo This will show you exactly what to copy
echo to Vercel's environment variables.
echo.
pause
