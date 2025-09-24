# DEPLOY THE MEMORY FIX TO PRODUCTION
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "DEPLOYING MEMORY FIX TO PRODUCTION" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check git status first
Write-Host "[1/4] Checking git status..." -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "[2/4] Adding all changes..." -ForegroundColor Yellow
git add -A

Write-Host "[3/4] Committing with descriptive message..." -ForegroundColor Yellow
git commit -m "Fix cross-conversation memory retrieval - messages now persist across all conversations"

Write-Host ""
Write-Host "[4/4] Pushing to GitHub (triggers Vercel deployment)..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host "SUCCESS! DEPLOYMENT INITIATED" -ForegroundColor Green
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Vercel will now:" -ForegroundColor Cyan
    Write-Host "1. Detect the push to main branch" -ForegroundColor White
    Write-Host "2. Run the build process (~2 minutes)" -ForegroundColor White
    Write-Host "3. Deploy to production" -ForegroundColor White
    Write-Host ""
    Write-Host "Check deployment status at:" -ForegroundColor Yellow
    Write-Host "https://vercel.com/kimblezcs-projects/kimbleai-v4-clean" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Once deployed, test at:" -ForegroundColor Yellow
    Write-Host "https://kimbleai-v4-clean.vercel.app" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "TEST THE FIX:" -ForegroundColor Green
    Write-Host "1. Send a message as Zach with some facts" -ForegroundColor White
    Write-Host "2. Start a NEW conversation" -ForegroundColor White
    Write-Host "3. Ask about those facts - it should remember!" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Git push may have failed. Check if you need to pull first:" -ForegroundColor Yellow
    Write-Host "git pull origin main" -ForegroundColor Cyan
    Write-Host "Then try again:" -ForegroundColor Yellow
    Write-Host "git push origin main" -ForegroundColor Cyan
}