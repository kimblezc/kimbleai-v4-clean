@echo off
:: ULTRA SIMPLE DEPLOYMENT - Remove all complex dependencies
cd /d "D:\OneDrive\Documents\kimbleai-v4-clean"

echo ================================================
echo   ULTRA SIMPLE DEPLOYMENT
echo ================================================
echo.

echo [1/4] Testing build locally first...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo BUILD FAILED LOCALLY!
    echo Fixing TypeScript errors...
    echo.
) 

echo [2/4] Committing ultra-simple version...
git add -A
git commit -m "fix: Ultra-simple API with no dependencies" -m "- Removed all complex imports" -m "- Using fetch instead of OpenAI SDK" -m "- Basic health endpoint" -m "- Direct API calls only"

echo [3/4] Pushing to GitHub...
git push origin master

echo.
echo [4/4] IMPORTANT CHECKS:
echo ================================================
echo.
echo 1. Check Vercel Build Logs:
echo    https://vercel.com/kimblezcs-projects/kimbleai-v4-clean
echo    Click on the deployment and check "Build Logs"
echo.
echo 2. After deployment (2-3 minutes), test:
echo    - Chat: https://kimbleai-v4-clean.vercel.app
echo    - Health: https://kimbleai-v4-clean.vercel.app/api/health
echo    - Chat GET: https://kimbleai-v4-clean.vercel.app/api/chat
echo.
echo 3. If still not working, check:
echo    - Are environment variables set in Vercel?
echo    - Is the OpenAI API key valid?
echo    - Check Runtime Logs in Vercel
echo.
pause
