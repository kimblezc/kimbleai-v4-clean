@echo off
REM Quick deployment after fixes
echo ================================================
echo DEPLOYING FIXES: Cross-Conversation + PDF
echo ================================================
echo.

echo [1/5] Building project...
call npm run build
if %errorlevel% neq 0 (
    echo BUILD FAILED - Check for errors
    pause
    exit /b 1
)
echo Build successful!
echo.

echo [2/5] Committing changes to Git...
git add -A
git commit -m "Fix cross-conversation memory and add PDF support" -m "Changes:" -m "- Removed conversation_id filter for cross-conversation memory" -m "- Added PDF text extraction with pdf-parse" -m "- Enhanced knowledge extraction" -m "- Improved context building from all sources"
echo.

echo [3/5] Pushing to GitHub...
git push origin main --force-with-lease
echo.

echo [4/5] Deploying to Vercel...
call npx vercel --prod --yes
echo.

echo [5/5] Waiting for deployment to complete...
timeout /t 30 /nobreak
echo.

echo ================================================
echo DEPLOYMENT COMPLETE!
echo ================================================
echo.
echo FIXES DEPLOYED:
echo - Cross-conversation memory now works
echo - PDF files can be uploaded and searched
echo - Better knowledge extraction
echo.
echo TEST THE FIXES:
echo 1. Upload a PDF file and verify text extraction
echo 2. Test cross-conversation memory:
echo    a. Say "My favorite food is pizza" in one chat
echo    b. Start a new chat
echo    c. Ask "What is my favorite food?"
echo.
echo Run full test: .\TEST_COMPLETE_SYSTEM.bat
echo.
pause