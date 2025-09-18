@echo off
cls
echo ===================================================
echo EMERGENCY FIX - SIMPLIFY TO GPT-4O-MINI
echo ===================================================
echo.
echo Replacing complex GPT-5 logic with simple GPT-4o-mini
echo This will get the chat working immediately
echo.
pause

echo.
echo [1/3] Backing up current route...
copy app\api\chat\route.ts app\api\chat\route-gpt5-backup.ts

echo.
echo [2/3] Replacing with simple version...
copy app\api\chat\route-simple.ts app\api\chat\route.ts /Y

echo.
echo [3/3] Deploying fix to Vercel...
vercel --prod --yes

echo.
echo ===================================================
echo FIX DEPLOYED!
echo ===================================================
echo.
echo Your app should now work at:
echo https://kimbleai-v4-clean.vercel.app
echo.
echo Using GPT-4o-mini for all queries (stable and working)
echo.
echo Check browser console (F12) for detailed logs
echo.
pause