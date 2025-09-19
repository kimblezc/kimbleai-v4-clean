#!/usr/bin/env powershell
Write-Host "DEPLOY FIXED API" -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Build
npm run build

if ($LASTEXITCODE -eq 0) {
    # Commit
    git add app/api/chat/route.ts
    git commit -m "fix: Simplify API route for Vercel deployment" 2>$null
    
    # Push
    git push origin master 2>$null
    
    Write-Host ""
    Write-Host "DEPLOYING TO VERCEL..." -ForegroundColor Yellow
    npx vercel --prod --force
    
    Write-Host ""
    Write-Host "After deployment completes:" -ForegroundColor Cyan
    Write-Host "1. Check Functions tab in Vercel dashboard" -ForegroundColor White
    Write-Host "2. You should see api/chat listed" -ForegroundColor White
    Write-Host "3. Test: https://kimbleai-v4-clean.vercel.app/api/chat" -ForegroundColor White
} else {
    Write-Host "Build failed" -ForegroundColor Red
}