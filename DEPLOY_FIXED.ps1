# DEPLOY FIXED RAG SYSTEM
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "DEPLOYING FIXED RAG SYSTEM" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor White
Write-Host ""

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Commit fixes
Write-Host "Committing fixes..." -ForegroundColor Yellow
git add -A
git commit -m "Fix const reassignment and remove knowledge-extractor dependency"

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

# Deploy to Vercel
Write-Host "Deploying to Vercel..." -ForegroundColor Yellow
npx vercel --prod --force

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "FIXED DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green