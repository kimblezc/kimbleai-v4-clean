#!/usr/bin/env powershell
Write-Host "Forcing full rebuild with enhanced UI..." -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Clean build cache
Write-Host "Cleaning build cache..." -ForegroundColor Yellow
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue

# Rebuild
Write-Host "Building fresh..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful!" -ForegroundColor Green
    
    # Force deploy
    Write-Host "Force deploying to Vercel..." -ForegroundColor Yellow
    npx vercel --prod --force
    
    Write-Host ""
    Write-Host "DEPLOYMENT FORCED" -ForegroundColor Green
    Write-Host "The UI should now have:" -ForegroundColor Cyan
    Write-Host "- Hamburger menu to toggle sidebar" -ForegroundColor White
    Write-Host "- Project input field in header" -ForegroundColor White
    Write-Host "- Tag input field in header" -ForegroundColor White
    Write-Host "- Conversation history in sidebar" -ForegroundColor White
    
} else {
    Write-Host "Build failed" -ForegroundColor Red
}