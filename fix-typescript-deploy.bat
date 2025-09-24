@echo off
:: FIX TYPESCRIPT AND DEPLOY
cd /d "D:\OneDrive\Documents\kimbleai-v4-clean"

echo ================================================
echo   FIXING TYPESCRIPT ERROR AND DEPLOYING
echo ================================================
echo.

echo [1/4] Testing build locally...
call npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo BUILD SUCCESSFUL!
    echo.
) else (
    echo.
    echo BUILD STILL FAILING - Check error above
    echo.
    pause
    exit /b 1
)

echo [2/4] Committing fix...
git add -A
git commit -m "fix: TypeScript error in message-reference-system" -m "- Fixed optional chaining with nullish coalescing" -m "- Build now passes successfully"

echo [3/4] Pushing to GitHub...
git push origin master

echo.
echo [4/4] SUCCESS! Now checking deployment...
echo ================================================
echo.
echo Vercel will redeploy automatically in 1-2 minutes
echo.
echo Test these URLs once deployed:
echo.
echo 1. Test endpoint (simplest):
echo    https://kimbleai-v4-clean.vercel.app/api/test
echo.
echo 2. Health check:
echo    https://kimbleai-v4-clean.vercel.app/api/health
echo.
echo 3. Chat API status:
echo    https://kimbleai-v4-clean.vercel.app/api/chat
echo.
echo 4. Main app:
echo    https://kimbleai-v4-clean.vercel.app
echo.
echo If any return 404, check Vercel build logs for errors.
echo.
pause
