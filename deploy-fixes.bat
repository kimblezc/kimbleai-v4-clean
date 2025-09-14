@echo off
:: DEPLOY FIXES TO VERCEL
cd /d "D:\OneDrive\Documents\kimbleai-v4-clean"

echo ================================================
echo   DEPLOYING CRITICAL FIXES
echo ================================================
echo.

echo [1/4] Committing fixes...
git add -A
git commit -m "fix: Frontend API integration and health endpoint" -m "- Fixed missing userId in chat requests" -m "- Fixed response field mapping (response vs message)" -m "- Added proper error handling and loading states" -m "- Added health check endpoint at /api/health" -m "- Added user ID persistence in localStorage"

echo [2/4] Pushing to GitHub...
git push origin master

if %ERRORLEVEL% EQU 0 (
    echo Successfully pushed fixes to GitHub
) else (
    echo Push may have failed or no changes
)

echo.
echo [3/4] Testing health endpoint locally...
echo Run: npm run dev
echo Then visit: http://localhost:3000/api/health
echo.
echo [4/4] After Vercel redeploys, check:
echo Production health: https://kimbleai-v4-clean.vercel.app/api/health
echo Production app: https://kimbleai-v4-clean.vercel.app
echo.
echo The health endpoint will show:
echo - Environment variables status
echo - Supabase connection
echo - OpenAI key validation
echo.
pause
