#!/usr/bin/env powershell
Write-Host "Force deploying with timestamp to trigger rebuild..." -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Add timestamp comment to force rebuild
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$content = Get-Content "app\page.tsx" -Raw
$content = "// Force rebuild: $timestamp`n" + $content
$content | Out-File "app\page.tsx" -Encoding UTF8

git add -A
git commit -m "force: Trigger rebuild with full UI features" `
           -m "Projects and tags ARE in the code" `
           -m "Force timestamp: $timestamp" 2>$null

git push origin master

Write-Host ""
Write-Host "PUSHED WITH FORCE REBUILD" -ForegroundColor Green
Write-Host ""
Write-Host "The header SHOULD have:" -ForegroundColor Yellow
Write-Host "1. Hamburger menu (☰) on the left" -ForegroundColor White
Write-Host "2. 'Project...' input field" -ForegroundColor White
Write-Host "3. 'Add tag...' input field" -ForegroundColor White
Write-Host "4. Tags display area" -ForegroundColor White
Write-Host ""
Write-Host "Wait 2-3 minutes for Vercel to rebuild" -ForegroundColor Cyan
Write-Host "Then hard refresh the page (Ctrl+F5)" -ForegroundColor Yellow