#!/usr/bin/env powershell
Write-Host "Deploying simplified chat API..." -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

git add -A
git commit -m "fix: Simplify chat API and add status endpoint" 2>$null
git push origin master

Write-Host "✅ Pushed to GitHub" -ForegroundColor Green
Write-Host ""
Write-Host "After deployment (1-2 min), check these:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. STATUS CHECK:" -ForegroundColor Cyan
Write-Host "   https://kimbleai-v4-clean.vercel.app/api/status" -ForegroundColor White
Write-Host "   (This will show if OpenAI key is detected)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. MAIN APP:" -ForegroundColor Cyan  
Write-Host "   https://kimbleai-v4-clean.vercel.app" -ForegroundColor White
Write-Host "   (Try sending a message)" -ForegroundColor Gray