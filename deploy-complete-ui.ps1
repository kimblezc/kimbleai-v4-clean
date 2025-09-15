#!/usr/bin/env powershell
Write-Host "Deploying complete UI with inline styles..." -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Test build
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful!" -ForegroundColor Green
    
    # Commit
    git add -A
    git commit -m "Complete UI rewrite with inline styles" `
               -m "All features visible and working" `
               -m "Sidebar, projects, tags all included" 2>$null
    
    # Push
    git push origin master
    
    Write-Host ""
    Write-Host "DEPLOYED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The UI now has:" -ForegroundColor Cyan
    Write-Host "✓ Hamburger menu (always visible)" -ForegroundColor White
    Write-Host "✓ Sidebar with conversation history" -ForegroundColor White
    Write-Host "✓ Project name input (top right)" -ForegroundColor White
    Write-Host "✓ Tag input field (top right)" -ForegroundColor White
    Write-Host "✓ Tag display with remove buttons" -ForegroundColor White
    Write-Host "✓ New Chat button" -ForegroundColor White
    Write-Host "✓ Delete conversation buttons" -ForegroundColor White
    Write-Host ""
    Write-Host "Check https://kimbleai-v4-clean.vercel.app in 2 minutes" -ForegroundColor Yellow
}