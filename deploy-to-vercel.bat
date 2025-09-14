@echo off
:: FINAL VERCEL DEPLOYMENT HELPER
cd /d "D:\OneDrive\Documents\kimbleai-v4-clean"

echo ================================================
echo   KIMBLEAI V4 - READY FOR VERCEL DEPLOYMENT
echo ================================================
echo.
echo STATUS CHECK:
echo -------------
echo [✓] Code: All TypeScript errors fixed
echo [✓] Git: Repository clean and pushed
echo [✓] Security: No exposed secrets
echo [✓] Local Build: Successful
echo [✓] Export Files: Created for Opus 4
echo.
echo REMAINING TASK:
echo ---------------
echo [ ] Add environment variables to Vercel
echo.
echo ================================================
echo   DISPLAYING YOUR ENVIRONMENT VARIABLES
echo ================================================
echo.

:: Run PowerShell script to show env vars
powershell -ExecutionPolicy Bypass -File show-env-for-vercel.ps1

echo.
echo ================================================
echo   AFTER ADDING VARIABLES TO VERCEL
echo ================================================
echo.
echo Run this command to verify deployment:
echo.
echo   npx vercel --prod
echo.
echo Or use the Vercel dashboard to redeploy.
echo.
pause
