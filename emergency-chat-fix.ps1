#!/usr/bin/env powershell
# Emergency fix for chat functionality
Write-Host "================================================" -ForegroundColor Red
Write-Host "   EMERGENCY FIX - CHAT API" -ForegroundColor Red
Write-Host "================================================" -ForegroundColor Red

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Quick commit
Write-Host "`n[1/3] Committing chat API fix..." -ForegroundColor Yellow
git add -A
git commit -m "CRITICAL: Fix chat API with full diagnostics" `
           -m "- Added environment variable validation" `
           -m "- Added detailed error messages" `
           -m "- Added OpenAI API key format checking" `
           -m "- Added debug information for troubleshooting" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Fix committed" -ForegroundColor Green
}

# Push to GitHub
Write-Host "`n[2/3] Pushing to GitHub..." -ForegroundColor Yellow
git push origin master

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Pushed to GitHub" -ForegroundColor Green
    
    # Trigger Vercel deployment
    Write-Host "`n[3/3] Deploying to Vercel..." -ForegroundColor Yellow
    npx vercel --prod --force 2>$null
    
    Write-Host "`n================================================" -ForegroundColor Green
    Write-Host "   FIX DEPLOYED!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    
    Write-Host "`n📝 WHAT THIS FIXES:" -ForegroundColor Cyan
    Write-Host "  - Chat API now has full diagnostics" -ForegroundColor White
    Write-Host "  - Will show if OpenAI key is missing or invalid" -ForegroundColor White
    Write-Host "  - Better error messages" -ForegroundColor White
    Write-Host "  - Debug information in responses" -ForegroundColor White
    
    Write-Host "`n🔍 TO TEST:" -ForegroundColor Yellow
    Write-Host "1. Wait 1-2 minutes for deployment" -ForegroundColor White
    Write-Host "2. Go to: https://kimbleai-v4-clean.vercel.app" -ForegroundColor Cyan
    Write-Host "3. Try sending a message" -ForegroundColor White
    Write-Host "4. Check the response for diagnostic info" -ForegroundColor White
    
    Write-Host "`n💡 ALSO CHECK:" -ForegroundColor Yellow
    Write-Host "API Status: https://kimbleai-v4-clean.vercel.app/api/chat" -ForegroundColor Cyan
    Write-Host "This will show if your OpenAI key is detected" -ForegroundColor White
    
} else {
    Write-Host "❌ Push failed" -ForegroundColor Red
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")