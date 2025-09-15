@echo off
:: CLEAN BUILD AND DEPLOY
cd /d "D:\OneDrive\Documents\kimbleai-v4-clean"

echo ================================================
echo   CLEAN BUILD AND DEPLOY
echo ================================================
echo.

echo [1/5] Cleaning build artifacts...
rmdir /s /q .next 2>nul
rmdir /s /q node_modules\.cache 2>nul

echo [2/5] Testing clean build...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Build failed. Trying alternative approach...
    echo Deleting package-lock.json and reinstalling...
    del package-lock.json
    call npm install
    call npm run build
)

echo [3/5] If build succeeded, committing...
git add -A
git commit -m "fix: Clean build after removing corrupted .next folder" -m "- Cleaned build artifacts" -m "- Fixed type issues" -m "- Simplified API for testing"

echo [4/5] Pushing to GitHub...
git push origin master

echo.
echo [5/5] CHECKING DEPLOYMENT
echo ================================================
echo.
echo Wait 2-3 minutes for Vercel to deploy, then test:
echo.
echo 1. TEST ENDPOINT (simplest):
echo    https://kimbleai-v4-clean.vercel.app/api/test
echo    Should return: {"message":"Test endpoint works!"}
echo.
echo 2. HEALTH CHECK:
echo    https://kimbleai-v4-clean.vercel.app/api/health
echo    Shows which environment variables are set
echo.
echo 3. CHAT STATUS:
echo    https://kimbleai-v4-clean.vercel.app/api/chat
echo    Should show if chat API is running
echo.
echo 4. MAIN APP:
echo    https://kimbleai-v4-clean.vercel.app
echo.
echo If test endpoint works but chat doesn't:
echo - OpenAI API key is missing or invalid
echo - Check the health endpoint for details
echo.
pause
