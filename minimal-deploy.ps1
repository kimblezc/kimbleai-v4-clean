#!/usr/bin/env powershell
Write-Host "DEPLOYING MINIMAL WORKING VERSION..." -ForegroundColor Green

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Commit and push
git add -A
git commit -m "MINIMAL: Ultra-simple working chat interface" -m "- Removed all complex features" -m "- Direct OpenAI integration only" -m "- Clear error messages" 2>$null
git push origin master

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Pushed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "=================" -ForegroundColor Cyan
    Write-Host "DEPLOYMENT INFO" -ForegroundColor Cyan
    Write-Host "=================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Wait 1-2 minutes for Vercel to deploy, then:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. CHECK STATUS:" -ForegroundColor White
    Write-Host "   https://kimbleai-v4-clean.vercel.app/api/status" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. TEST CHAT:" -ForegroundColor White
    Write-Host "   https://kimbleai-v4-clean.vercel.app" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "If you see 'ERROR: OpenAI API key is not set':" -ForegroundColor Red
    Write-Host "1. Go to Vercel dashboard" -ForegroundColor White
    Write-Host "2. Check environment variables" -ForegroundColor White
    Write-Host "3. Make sure OPENAI_API_KEY is there" -ForegroundColor White
    Write-Host "4. Make sure it's enabled for Production" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")