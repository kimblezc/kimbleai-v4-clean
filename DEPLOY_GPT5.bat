@echo off
cls
echo ===================================================
echo KIMBLEAI V4 - GPT-5 IMPLEMENTATION
echo ===================================================
echo.
echo RESTORED GPT-5 MODELS:
echo - gpt-5 (for complex tasks)
echo - gpt-5-mini (for standard queries)
echo - gpt-5-nano (for simple responses)
echo.
echo Pricing:
echo - GPT-5: $1.25/1M input, $10/1M output
echo - GPT-5-mini: $0.25/1M input, $2/1M output
echo - GPT-5-nano: $0.05/1M input, $0.40/1M output
echo.
pause

echo.
echo [1/4] Staging changes...
git add -A

echo.
echo [2/4] Committing GPT-5 implementation...
git commit -m "feat: Implement GPT-5 models with intelligent selection and proper fallback"

echo.
echo [3/4] Pushing to GitHub...
git push origin main

echo.
echo [4/4] Deploying to Vercel...
vercel --prod --yes

echo.
echo ===================================================
echo DEPLOYMENT COMPLETE WITH GPT-5!
echo ===================================================
echo.
echo Live URL: https://kimbleai-v4-clean.vercel.app
echo.
echo Your app now uses GPT-5 models!
echo Note: If you get API errors, your key may need GPT-5 access enabled.
echo.
pause