@echo off
:: EMERGENCY FIX - Deploy simplified chat API
cd /d "D:\OneDrive\Documents\kimbleai-v4-clean"

echo ================================================
echo   EMERGENCY FIX - SIMPLIFIED CHAT API
echo ================================================
echo.

echo [1/3] Backing up current route...
copy app\api\chat\route.ts app\api\chat\route-backup.ts

echo [2/3] Replacing with simplified version...
copy app\api\chat\route-simple.ts app\api\chat\route.ts /Y

echo [3/3] Committing and pushing...
git add -A
git commit -m "fix: Emergency - simplified chat API for debugging" -m "- Removed complex dependencies" -m "- Added detailed error logging" -m "- Using GPT-3.5-turbo for testing" -m "- Returns diagnostic information"
git push origin master

echo.
echo ================================================
echo   DEPLOYMENT COMPLETE
echo ================================================
echo.
echo The simplified API will:
echo - Show detailed error messages
echo - Use GPT-3.5-turbo (cheaper)
echo - Skip database operations
echo - Return diagnostic info
echo.
echo Wait 1-2 minutes for Vercel to redeploy
echo Then test the chat again
echo.
echo Check these URLs:
echo - App: https://kimbleai-v4-clean.vercel.app
echo - Health: https://kimbleai-v4-clean.vercel.app/api/health
echo - Logs: https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/functions
echo.
pause
