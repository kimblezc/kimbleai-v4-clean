@echo off
cls
echo ===================================================
echo KIMBLEAI V4 - FIX GPT-5 MODEL ISSUE
echo ===================================================
echo.
echo FIXED: Replaced non-existent GPT-5 models with:
echo - gpt-4o (for complex tasks)
echo - gpt-4o-mini (for simple queries)
echo.
echo Removed invalid parameters:
echo - verbosity (not valid)
echo - reasoning_effort (not valid)
echo.
pause

echo.
echo [1/4] Staging changes...
git add -A

echo.
echo [2/4] Committing fix...
git commit -m "fix: Replace invalid GPT-5 models with GPT-4o and remove invalid API parameters"

echo.
echo [3/4] Pushing to GitHub...
git push origin main

echo.
echo [4/4] Deploying to Vercel...
vercel --prod --yes

echo.
echo ===================================================
echo DEPLOYMENT COMPLETE!
echo ===================================================
echo.
echo Live URL: https://kimbleai-v4-clean.vercel.app
echo.
echo Test the chat functionality now - it should work!
echo.
pause