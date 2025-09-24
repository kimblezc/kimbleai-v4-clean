# FIX BUILD BY REMOVING PROBLEMATIC BACKUP FILES
Write-Host "=================================================" -ForegroundColor Red
Write-Host "REMOVING PROBLEMATIC BACKUP FILES" -ForegroundColor Red
Write-Host "=================================================" -ForegroundColor White
Write-Host ""

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Remove all backup files that have the bad import
Write-Host "Removing backup files with bad imports..." -ForegroundColor Yellow
Remove-Item "app\api\chat\route-*.backup.ts" -Force -ErrorAction SilentlyContinue
Remove-Item "app\api\chat\route-backup*.ts" -Force -ErrorAction SilentlyContinue
Remove-Item "app\api\chat\route-enhanced.ts" -Force -ErrorAction SilentlyContinue
Remove-Item "app\api\chat\route-fixed.ts" -Force -ErrorAction SilentlyContinue

Write-Host "✅ Backup files removed" -ForegroundColor Green

# Commit and deploy
Write-Host "Committing cleanup..." -ForegroundColor Yellow
git add -A
git commit -m "Remove backup files causing build errors"

Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "Deploying to Vercel..." -ForegroundColor Yellow
npx vercel --prod --force

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "CLEAN DEPLOYMENT INITIATED" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green