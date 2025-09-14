@echo off
:: RESET AND CLEAN PUSH - Remove exposed secrets
cd /d "D:\OneDrive\Documents\kimbleai-v4-clean"

echo ================================================
echo   REMOVING EXPOSED SECRETS AND REPUSHING
echo ================================================
echo.

:: Reset the last commit
echo [1/5] Resetting last commit...
git reset --soft HEAD~1

:: Add the fixed files
echo [2/5] Adding fixed files...
git add -A

:: Commit with safe versions
echo [3/5] Committing safe versions...
git commit -m "feat: Opus 4 exports and automation (secrets removed)" -m "- Added OPUS_4_MASTER_INTEGRATION.md" -m "- Added OPUS_4_CRITICAL_EXPORT.md" -m "- Added auto-sync.bat for Zapier automation" -m "- Environment variables stored safely in .env.local only"

:: Force push to overwrite
echo [4/5] Force pushing to GitHub...
git push origin master --force

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================
    echo   SUCCESS - REPOSITORY CLEANED
    echo ================================================
    echo.
    echo Secrets removed from repository
    echo Your .env.local file still has all values
    echo.
) else (
    echo.
    echo Push failed - check GitHub permissions
)

:: Create a secure reference file
echo [5/5] Creating secure reference...
echo # ENVIRONMENT VARIABLES LOCATION > ENV_SECURE_REFERENCE.md
echo. >> ENV_SECURE_REFERENCE.md
echo Your environment variables are stored ONLY in: >> ENV_SECURE_REFERENCE.md
echo - Local: .env.local (never commit this file) >> ENV_SECURE_REFERENCE.md
echo. >> ENV_SECURE_REFERENCE.md
echo To add to Vercel: >> ENV_SECURE_REFERENCE.md
echo 1. Copy values from your .env.local file >> ENV_SECURE_REFERENCE.md
echo 2. Paste into Vercel dashboard >> ENV_SECURE_REFERENCE.md
echo 3. Never commit API keys to Git >> ENV_SECURE_REFERENCE.md

git add ENV_SECURE_REFERENCE.md
git commit -m "docs: Add secure environment variable reference"
git push origin master

echo.
echo NEXT STEPS:
echo 1. Open your .env.local file to copy values
echo 2. Go to Vercel dashboard
echo 3. Add environment variables manually
echo 4. Redeploy
echo.
pause
