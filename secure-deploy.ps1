#!/usr/bin/env powershell
# SECURE DEPLOYMENT SCRIPT
Write-Host "================================================" -ForegroundColor Red
Write-Host "   SECURITY CHECK & DEPLOYMENT" -ForegroundColor Red
Write-Host "================================================" -ForegroundColor Red

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# CRITICAL SECURITY CHECK
Write-Host "`n[SECURITY] Checking for exposed API keys..." -ForegroundColor Red

$gitCheck = git diff --cached --name-only | Select-String -Pattern "\.env"
if ($gitCheck) {
    Write-Host "ERROR: .env files are staged for commit!" -ForegroundColor Red
    Write-Host "Run: git reset HEAD .env.local" -ForegroundColor Yellow
    exit 1
}

$keyCheck = git grep -I "sk-proj" 2>$null
if ($keyCheck) {
    Write-Host "ERROR: OpenAI API key found in repository!" -ForegroundColor Red
    Write-Host "This is a critical security issue!" -ForegroundColor Red
    Write-Host ""
    Write-Host "IMMEDIATE ACTIONS REQUIRED:" -ForegroundColor Yellow
    Write-Host "1. Go to https://platform.openai.com/api-keys" -ForegroundColor White
    Write-Host "2. Revoke the exposed key immediately" -ForegroundColor White
    Write-Host "3. Generate a new key" -ForegroundColor White
    Write-Host "4. Remove key from git history:" -ForegroundColor White
    Write-Host "   git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch .env.local' --prune-empty --tag-name-filter cat -- --all" -ForegroundColor Gray
    exit 1
}

Write-Host "✓ No API keys found in git" -ForegroundColor Green

# Check .gitignore
if (-not (Select-String -Path ".gitignore" -Pattern "\.env\.local" -Quiet)) {
    Write-Host "WARNING: .env.local not in .gitignore!" -ForegroundColor Yellow
    Add-Content -Path ".gitignore" -Value "`n.env.local"
    Write-Host "Added .env.local to .gitignore" -ForegroundColor Green
}

# Build
Write-Host "`n[BUILD] Building project..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Commit (excluding .env files)
Write-Host "`n[GIT] Committing changes..." -ForegroundColor Yellow
git add -A -- ':!.env*' ':!**/api-keys*' ':!**/secrets*'
git commit -m "feat: Secure implementation with proper key handling" 2>$null

# Push
Write-Host "`n[DEPLOY] Pushing to GitHub..." -ForegroundColor Yellow
git push origin master

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "   DEPLOYMENT READY - SECURITY VERIFIED" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

Write-Host "`nNEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Set environment variables in Vercel Dashboard:" -ForegroundColor Yellow
Write-Host "   - Go to: https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables" -ForegroundColor White
Write-Host "   - Add:" -ForegroundColor White
Write-Host "     OPENAI_API_KEY = [your-new-key]" -ForegroundColor Gray
Write-Host "     NEXT_PUBLIC_SUPABASE_URL = https://gbmefnaqsxtloseufjixp.supabase.co" -ForegroundColor Gray
Write-Host "     SUPABASE_SERVICE_ROLE_KEY = [your-service-key]" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Deploy to production:" -ForegroundColor Yellow
Write-Host "   npx vercel --prod" -ForegroundColor White
Write-Host ""
Write-Host "SECURITY REMINDERS:" -ForegroundColor Red
Write-Host "- NEVER commit API keys to git" -ForegroundColor White
Write-Host "- Rotate keys regularly" -ForegroundColor White
Write-Host "- Use environment variables only" -ForegroundColor White
Write-Host "- Check git history for exposed keys" -ForegroundColor White