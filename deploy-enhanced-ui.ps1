#!/usr/bin/env powershell
# Deploy enhanced UI with chat history, projects, and tags
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   DEPLOYING ENHANCED UI WITH FULL FEATURES" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Build test
Write-Host "`n[1/4] Testing build..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    
    # Commit
    Write-Host "`n[2/4] Committing enhanced UI..." -ForegroundColor Yellow
    git add -A
    git commit -m "feat: Add chat history, projects, and tags" `
               -m "- Conversation history in sidebar" `
               -m "- Dynamic project assignment" `
               -m "- Tag system for organization" `
               -m "- LocalStorage persistence" `
               -m "- Delete conversations" `
               -m "- Auto-title from first message" 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Changes committed" -ForegroundColor Green
    }
    
    # Push
    Write-Host "`n[3/4] Pushing to GitHub..." -ForegroundColor Yellow
    git push origin master
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Pushed to GitHub" -ForegroundColor Green
    }
    
    # Deploy info
    Write-Host "`n[4/4] Deployment Info..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "NEW FEATURES ADDED:" -ForegroundColor Green
    Write-Host "✅ Chat History - All conversations saved locally" -ForegroundColor White
    Write-Host "✅ Sidebar - Browse and load past conversations" -ForegroundColor White
    Write-Host "✅ Projects - Assign project names to conversations" -ForegroundColor White
    Write-Host "✅ Tags - Add multiple tags for organization" -ForegroundColor White
    Write-Host "✅ Auto-Title - First message becomes conversation title" -ForegroundColor White
    Write-Host "✅ Delete - Remove unwanted conversations" -ForegroundColor White
    Write-Host "✅ Persistence - Everything saved in localStorage" -ForegroundColor White
    
    Write-Host "`nVercel will auto-deploy from GitHub push" -ForegroundColor Cyan
    Write-Host "Check in 1-2 minutes at:" -ForegroundColor Yellow
    Write-Host "https://kimbleai-v4-clean.vercel.app" -ForegroundColor White
    
} else {
    Write-Host "❌ Build failed" -ForegroundColor Red
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")