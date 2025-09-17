@echo off
cls
echo ===================================================
echo KIMBLEAI V4 - GPT-5 FIXED DEPLOYMENT
echo ===================================================
echo.
echo CRITICAL FIX APPLIED:
echo - GPT-5 models now use max_completion_tokens (not max_tokens)
echo - Fallback to GPT-4o-mini uses max_tokens
echo - Proper parameter handling for each model type
echo.
echo GPT-5 PARAMETERS:
echo - max_completion_tokens: Controls output length
echo - verbosity: low/medium/high
echo - reasoning_effort: minimal/medium/high
echo.
pause

echo.
echo [1/5] Testing fixed implementation...
node test-gpt5-fixed.js
echo.
pause

echo.
echo [2/5] Staging changes...
git add -A

echo.
echo [3/5] Committing fix...
git commit -m "fix: Use max_completion_tokens for GPT-5 models, max_tokens for GPT-4 fallback"

echo.
echo [4/5] Pushing to GitHub...
git push origin main

echo.
echo [5/5] Deploying to Vercel...
vercel --prod --yes

echo.
echo ===================================================
echo DEPLOYMENT COMPLETE!
echo ===================================================
echo.
echo Live URL: https://kimbleai-v4-clean.vercel.app
echo.
echo The app will now:
echo 1. Try GPT-5 models with max_completion_tokens
echo 2. Fallback to GPT-4o-mini if GPT-5 unavailable
echo 3. Intelligently select models based on query type
echo 4. Track costs and token usage
echo.
pause