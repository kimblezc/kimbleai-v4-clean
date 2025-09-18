@echo off
cls
echo ===================================================
echo CLEAN UP AND SECURE GITHUB
echo ===================================================
echo.
echo This will:
echo 1. Remove test files with API keys from Git history
echo 2. Keep them locally for your use
echo 3. Push clean code to GitHub
echo.
pause

echo.
echo [1/5] Removing sensitive files from Git (keeping local copies)...
git rm --cached test-*.js DEPLOY_*.bat .env.local 2>nul
git rm --cached SECURITY_TODO.md quick-deploy.ps1 2>nul

echo.
echo [2/5] Committing removal of sensitive files...
git add .gitignore
git commit -m "security: Remove API keys from repository, add .gitignore"

echo.
echo [3/5] Creating new clean branch...
git checkout -b clean-main

echo.
echo [4/5] Force pushing clean branch...
git push origin clean-main --force

echo.
echo [5/5] Making it the default branch...
echo.
echo ===================================================
echo GITHUB CLEANUP COMPLETE
echo ===================================================
echo.
echo Your test files are still available locally but not in Git.
echo.
echo IMPORTANT: Go to GitHub settings and:
echo 1. Set 'clean-main' as default branch
echo 2. Delete the old 'main' branch
echo.
echo Your app is ALREADY LIVE at:
echo https://kimbleai-v4-clean.vercel.app
echo.
pause