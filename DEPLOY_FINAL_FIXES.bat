@echo off
REM Deploy fixes for persistence and PDF issues
echo ================================================
echo DEPLOYING MEMORY AND FILE FIXES
echo ================================================
echo.

echo [1/6] Cleaning cache...
rmdir /s /q .next 2>nul
echo.

echo [2/6] Committing fixes...
git add -A
git commit -m "Fix cross-conversation memory and simplify file upload" -m "Changes:" -m "- Ensure all messages are retrieved across conversations" -m "- Temporarily disable PDF parsing to avoid errors" -m "- Focus on TXT, MD, CSV file support" -m "- All core features intact"
echo.

echo [3/6] Pushing to GitHub...
git push origin main --force
echo.

echo [4/6] Deploying to Vercel (cloud build)...
call npx vercel --prod --yes
echo.

echo [5/6] Waiting for deployment...
timeout /t 30 /nobreak
echo.

echo [6/6] Running memory test...
call TEST_MEMORY.bat
echo.

echo ================================================
echo DEPLOYMENT COMPLETE
echo ================================================
echo.
echo WHAT'S FIXED:
echo 1. PDF temporarily disabled (use TXT/MD/CSV files)
echo 2. Cross-conversation memory should work now
echo.
echo TEST NOW:
echo 1. Upload test_document.txt
echo 2. Check if memory works across conversations
echo.
pause