@echo off
cls
echo ===================================================
echo KIMBLEAI V4 - COMPLETE GPT-5 IMPLEMENTATION
echo ===================================================
echo.
echo GPT-5 FEATURES IMPLEMENTED:
echo.
echo MODELS:
echo - gpt-5 ($1.25/1M input, $10/1M output)
echo - gpt-5-mini ($0.25/1M input, $2/1M output)  
echo - gpt-5-nano ($0.05/1M input, $0.40/1M output)
echo.
echo PARAMETERS:
echo - verbosity: low/medium/high (controls response length)
echo - reasoning_effort: minimal/medium/high (controls thinking depth)
echo.
echo INTELLIGENT SELECTION:
echo - Coding tasks → GPT-5 + high verbosity + high reasoning
echo - Analysis → GPT-5 + medium verbosity + medium reasoning
echo - Simple chat → GPT-5-nano + low verbosity + minimal reasoning
echo - Memory recall → GPT-5-mini + medium verbosity + minimal reasoning
echo.
echo COST TRACKING:
echo - Real-time token usage
echo - Per-request cost estimates
echo - Automatic model optimization
echo.
pause

echo.
echo [1/5] Testing new API key with GPT-5...
node test-new-key.js
echo.
pause

echo.
echo [2/5] Staging all changes...
git add -A

echo.
echo [3/5] Committing GPT-5 implementation...
git commit -m "feat: Complete GPT-5 implementation with verbosity and reasoning_effort parameters"

echo.
echo [4/5] Pushing to GitHub...
git push origin main

echo.
echo [5/5] Deploying to Vercel...
vercel --prod --yes

echo.
echo ===================================================
echo GPT-5 DEPLOYMENT COMPLETE!
echo ===================================================
echo.
echo Live URL: https://kimbleai-v4-clean.vercel.app
echo.
echo TEST THE FOLLOWING:
echo 1. Simple greeting - should use GPT-5-nano
echo 2. "Write code to..." - should use GPT-5 with high settings
echo 3. "What do you know about me?" - should use GPT-5-mini
echo 4. Complex analysis - should use GPT-5 with medium settings
echo.
echo MONITOR:
echo - Console logs for model selection
echo - Response includes cost estimates
echo - Fallback cascade if GPT-5 unavailable
echo.
pause