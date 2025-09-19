@echo off
cls
echo ===================================================
echo COMPREHENSIVE CLEAN DEPLOYMENT
echo ===================================================
echo.
echo This will:
echo 1. Clean build cache
echo 2. Verify environment variables
echo 3. Deploy fresh build
echo.
pause

echo.
echo [1/7] Cleaning .next build folder...
rmdir /s /q .next 2>nul

echo.
echo [2/7] Cleaning node_modules (optional - skip if slow)...
REM rmdir /s /q node_modules
REM npm install

echo.
echo [3/7] Checking current environment...
echo API Key exists in .env.local: 
findstr "OPENAI_API_KEY" .env.local

echo.
echo [4/7] Building locally to catch errors...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo BUILD FAILED! Check errors above.
    pause
    exit /b 1
)

echo.
echo [5/7] Verifying Vercel environment variables...
vercel env ls production

echo.
echo [6/7] Pulling latest Vercel environment...
vercel env pull .env.local

echo.
echo [7/7] Deploying to production...
vercel --prod --yes --force

echo.
echo ===================================================
echo DEPLOYMENT COMPLETE
echo ===================================================
echo.
echo IMPORTANT: After deployment completes:
echo.
echo 1. Wait 2-3 minutes for propagation
echo 2. Hard refresh browser: Ctrl+Shift+R
echo 3. Clear browser cache if needed
echo 4. Test at: https://kimbleai-v4-clean.vercel.app
echo.
echo If still having issues:
echo - Check Vercel dashboard for function logs
echo - Verify environment variables on Vercel
echo.
pause