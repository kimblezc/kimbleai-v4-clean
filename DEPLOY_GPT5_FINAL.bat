@echo off
cls
echo ===================================================
echo KIMBLEAI V4 - FINAL GPT-5 DEPLOYMENT
echo ===================================================
echo.
echo ALL FIXES APPLIED:
echo ✅ GPT-5 uses max_completion_tokens (not max_tokens)
echo ✅ GPT-5 uses default temperature (no custom values)
echo ✅ GPT-4 fallback uses standard parameters
echo ✅ Intelligent model selection by query type
echo.
echo GPT-5 SPECIFIC PARAMETERS:
echo - max_completion_tokens: Output length control
echo - verbosity: low/medium/high
echo - reasoning_effort: minimal/medium/high
echo - temperature: ALWAYS DEFAULT (1.0)
echo.
pause

echo.
echo [1/5] Running final test...
node test-gpt5-final.js
echo.
pause

echo.
echo [2/5] Staging all changes...
git add -A

echo.
echo [3/5] Committing final GPT-5 implementation...
git commit -m "fix: GPT-5 models use default temperature only, GPT-4 fallback with custom temperature"

echo.
echo [4/5] Pushing to GitHub...
git push origin main

echo.
echo [5/5] Deploying to Vercel...
vercel --prod --yes

echo.
echo ===================================================
echo ✅ DEPLOYMENT COMPLETE!
echo ===================================================
echo.
echo Live URL: https://kimbleai-v4-clean.vercel.app
echo.
echo YOUR APP NOW:
echo - Attempts GPT-5 with correct parameters
echo - Falls back to GPT-4o-mini if needed
echo - Selects models intelligently
echo - Tracks usage and costs
echo.
echo TEST QUERIES:
echo 1. "Hi" → Should use GPT-5-nano or GPT-4o-mini
echo 2. "Write code to..." → Should use GPT-5 or GPT-4o-mini
echo 3. "Explain in detail..." → Should use high verbosity
echo.
pause