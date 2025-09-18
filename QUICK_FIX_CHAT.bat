@echo off
cls
echo ===================================================
echo QUICK FIX - REPLACE CHAT ENDPOINT
echo ===================================================
echo.
echo Replacing broken chat endpoint with minimal working version
echo.
pause

echo.
echo [1/4] Backing up current route...
copy app\api\chat\route.ts app\api\chat\route-broken.ts 2>nul

echo.
echo [2/4] Replacing with minimal working version...
copy app\api\chat\route-minimal.ts app\api\chat\route.ts /Y

echo.
echo [3/4] Quick local build check...
call npm run build

echo.
echo [4/4] Deploying to Vercel...
vercel --yes --force

echo.
echo ===================================================
echo DEPLOYMENT STARTED
echo ===================================================
echo.
echo Wait 2-3 minutes then:
echo 1. Clear browser cache (Ctrl+Shift+Delete)
echo 2. Go to https://kimbleai-v4-clean.vercel.app
echo 3. Try sending "Hello"
echo.
echo The chat should work with this minimal version.
echo.
pause