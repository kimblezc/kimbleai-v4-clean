#!/usr/bin/env powershell
Write-Host "DEPLOYING COMPLETE UI WITH ALL FEATURES" -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Build
Write-Host "Building with complete UI..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    # Commit
    git add app/page.tsx
    git commit -m "feat: Complete UI with sidebar, user distinction, projects and tags" -m "- Sidebar with conversation history" -m "- User selector (Zach/Rebecca)" -m "- Project and tag management per conversation" -m "- Persistent localStorage backup" -m "- Color-coded messages by user" 2>$null
    
    # Push
    git push origin master
    
    Write-Host ""
    Write-Host "DEPLOYING TO VERCEL..." -ForegroundColor Yellow
    npx vercel --prod --force
    
    Write-Host ""
    Write-Host "COMPLETE UI FEATURES:" -ForegroundColor Green
    Write-Host "- Sidebar with conversation history" -ForegroundColor White
    Write-Host "- User selector (Zach/Rebecca)" -ForegroundColor White  
    Write-Host "- Project assignment per conversation" -ForegroundColor White
    Write-Host "- Tag system (comma separated)" -ForegroundColor White
    Write-Host "- Color-coded messages (Blue for Zach, Pink for Rebecca)" -ForegroundColor White
    Write-Host "- LocalStorage persistence" -ForegroundColor White
    Write-Host "- Supabase persistence (when connected)" -ForegroundColor White
    Write-Host "- Delete conversations" -ForegroundColor White
    Write-Host "- New conversation button" -ForegroundColor White
} else {
    Write-Host "Build failed" -ForegroundColor Red
}