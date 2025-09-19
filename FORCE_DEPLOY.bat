@echo off
cls
echo ===================================================
echo FORCE PRODUCTION DEPLOYMENT
echo ===================================================
echo.
echo Forcing production deployment with minimal chat route
echo.
pause

echo.
echo [1/3] Testing if API key is set...
echo %OPENAI_API_KEY:~0,20%...

echo.
echo [2/3] Setting Vercel environment if needed...
vercel env add OPENAI_API_KEY production 2>nul

echo.
echo [3/3] Force deploying to production...
vercel --prod --yes

echo.
echo ===================================================
echo DEPLOYMENT COMPLETE
echo ===================================================
echo.
echo The deployment is live. Test it:
echo.
echo 1. Go to: https://kimbleai-v4-clean.vercel.app
echo 2. Open browser console (F12)
echo 3. Try sending "Hello"
echo.
echo If still failing, check:
echo https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/functions
echo.
pause