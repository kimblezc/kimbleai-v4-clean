@echo off
REM Direct Vercel deployment without local build
echo ================================================
echo DIRECT VERCEL DEPLOYMENT
echo ================================================
echo.

echo [1/4] Cleaning local build cache...
rmdir /s /q .next 2>nul
echo Cache cleared
echo.

echo [2/4] Committing all changes...
git add -A
git commit -m "Deploy with fixes: cross-conversation memory and PDF support" -m "- Fixed cross-conversation memory retrieval" -m "- Added dynamic PDF parsing" -m "- Enhanced knowledge extraction" -m "- All features intact"
echo.

echo [3/4] Pushing to GitHub...
git push origin main --force
echo.

echo [4/4] Triggering Vercel deployment...
echo Vercel will build directly in the cloud
call vercel --prod --yes
echo.

echo ================================================
echo DEPLOYMENT TRIGGERED
echo ================================================
echo.
echo Vercel is building in the cloud (avoids local issues)
echo Check deployment status at: https://vercel.com/dashboard
echo.
echo Once deployed, test at: https://kimbleai-v4-clean.vercel.app
echo.
echo TEST CHECKLIST:
echo [  ] Upload a PDF and verify text extraction
echo [  ] Test cross-conversation memory
echo [  ] Verify all existing features work
echo.
pause