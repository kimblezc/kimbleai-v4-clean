#!/usr/bin/env powershell
# Final TypeScript fix and deploy
Write-Host "FIXING TYPESCRIPT ERROR AND DEPLOYING..." -ForegroundColor Yellow

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

git add -A
git commit -m "fix: TypeScript error with undefined apiKey check" 2>$null
git push origin master

Write-Host "✅ Fix pushed - Vercel will auto-deploy" -ForegroundColor Green
Write-Host ""
Write-Host "Wait 1-2 minutes then check:" -ForegroundColor Cyan
Write-Host "1. API Status: https://kimbleai-v4-clean.vercel.app/api/chat" -ForegroundColor White
Write-Host "2. Main App: https://kimbleai-v4-clean.vercel.app" -ForegroundColor White