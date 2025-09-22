# KIMBLEAI DEPLOYMENT SCRIPT
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "DEPLOYING MEMORY FIX TO PRODUCTION" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Deploy to GitHub
Write-Host "Adding files to git..." -ForegroundColor Yellow
git add -A

Write-Host "Committing changes..." -ForegroundColor Yellow
git commit -m "Fix cross-conversation memory retrieval"

Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS! Deployment initiated" -ForegroundColor Green
    Write-Host "Vercel will auto-deploy in ~2 minutes" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Check deployment at:" -ForegroundColor Yellow
    Write-Host "https://vercel.com/kimblezcs-projects/kimbleai-v4-clean" -ForegroundColor Cyan
} else {
    Write-Host "Push failed. Try: git pull origin main --rebase" -ForegroundColor Red
}