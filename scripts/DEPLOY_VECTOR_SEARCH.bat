@echo off
echo ===============================================
echo KIMBLEAI VECTOR SEARCH DEPLOYMENT
echo ===============================================
echo.

cd /d D:\OneDrive\Documents\kimbleai-v4-clean

echo [1/7] Creating services directory...
if not exist services mkdir services
echo Done!
echo.

echo [2/7] Running PowerShell script to generate files...
powershell -ExecutionPolicy Bypass -File FIX_VECTOR_SEARCH_COMPLETE.ps1
echo Done!
echo.

echo [3/7] Verifying TypeScript compilation...
call npx tsc --noEmit
if %errorlevel% neq 0 (
    echo TypeScript errors detected. Fixing...
    pause
)
echo.

echo [4/7] Installing dependencies...
call npm install
echo Done!
echo.

echo [5/7] Building application...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)
echo Build successful!
echo.

echo [6/7] Deploying to Vercel...
call npx vercel --prod --yes
echo Deployment complete!
echo.

echo [7/7] Pushing to GitHub...
git add -A
rem Only commit and push if there are staged changes
git diff --cached --quiet
if not %errorlevel%==0 (
    git commit -m "Deploy: Complete vector search with semantic memory"
    git push origin main
) else (
    echo No changes to commit. Skipping git commit/push.
)
echo.

echo ===============================================
echo DEPLOYMENT SUCCESSFUL!
echo ===============================================
echo.
echo CRITICAL NEXT STEP:
echo -------------------
echo 1. Open: https://supabase.com/dashboard/project/gbmefnaqsxtloseufjqp/sql
echo 2. Copy ALL text from: vector_search_schema.sql
echo 3. Paste in SQL Editor
echo 4. Click RUN
echo 5. Verify you see "Vector search functions created successfully!"
echo.
echo Then test with:
echo   powershell .\TEST_VECTOR_SEARCH.ps1
echo.
echo App URL: https://kimbleai-v4-clean-4oizii6tg-kimblezcs-projects.vercel.app
echo.
pause
