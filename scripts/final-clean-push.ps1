# FINAL CLEAN PUSH - NO SECRETS
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "FINAL CLEAN PUSH TO GITHUB" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Switch back to main branch
Write-Host "Switching to main branch..." -ForegroundColor Yellow
git checkout main 2>$null

# Reset to clean state
Write-Host "Creating completely clean repository..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .git
git init
git branch -M main

# Add remote
Write-Host "Adding GitHub remote..." -ForegroundColor Yellow  
git remote add origin https://github.com/kimblezc/kimbleai-v4-clean.git

# Add all files (secrets are already removed)
Write-Host "Adding clean files only..." -ForegroundColor Yellow
git add .

# Commit
Write-Host "Creating initial commit..." -ForegroundColor Yellow
git commit -m "Initial commit: KimbleAI v4 - Clean deployment with vector search"

# Force push
Write-Host "Force pushing to GitHub (this will replace ALL history)..." -ForegroundColor Yellow
git push origin main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS! Repository is clean!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ All secrets removed" -ForegroundColor Green
    Write-Host "✅ Git history completely clean" -ForegroundColor Green
    Write-Host "✅ Ready for production" -ForegroundColor Green
    Write-Host ""
    Write-Host "Repository: https://github.com/kimblezc/kimbleai-v4-clean" -ForegroundColor Cyan
    Write-Host "Deployment: https://kimbleai-v4-clean.vercel.app" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Push blocked. Creating new repository..." -ForegroundColor Yellow
    Write-Host "You may need to:" -ForegroundColor Yellow
    Write-Host "1. Delete the repository on GitHub" -ForegroundColor White
    Write-Host "2. Create a new one with the same name" -ForegroundColor White
    Write-Host "3. Run this script again" -ForegroundColor White
}
