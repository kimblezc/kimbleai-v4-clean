#!/usr/bin/env powershell
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   PROPER DEPLOYMENT WITH FULL FEATURES" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Step 1: Test build
Write-Host "`n[1/5] Testing build..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Checking for issues..." -ForegroundColor Red
    npx next build --debug
    exit 1
}

Write-Host "Build successful!" -ForegroundColor Green

# Step 2: Commit changes
Write-Host "`n[2/5] Committing changes..." -ForegroundColor Yellow
git add -A
git commit -m "fix: Restore full UI with all features properly configured" `
           -m "- Fixed Tailwind configuration" `
           -m "- Sidebar with conversation history" `
           -m "- Project and tag management in header" `
           -m "- Proper state management" `
           -m "- LocalStorage persistence" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Changes committed" -ForegroundColor Green
} else {
    Write-Host "No changes to commit" -ForegroundColor Gray
}

# Step 3: Push to GitHub
Write-Host "`n[3/5] Pushing to GitHub..." -ForegroundColor Yellow
git push origin master

if ($LASTEXITCODE -eq 0) {
    Write-Host "Pushed to GitHub" -ForegroundColor Green
} else {
    Write-Host "Push failed - check connection" -ForegroundColor Yellow
}

# Step 4: Deployment info
Write-Host "`n[4/5] Features included:" -ForegroundColor Cyan
Write-Host "- Hamburger menu toggles sidebar width" -ForegroundColor White
Write-Host "- Sidebar shows all conversations" -ForegroundColor White  
Write-Host "- New Chat button creates fresh conversation" -ForegroundColor White
Write-Host "- Click conversation to load it" -ForegroundColor White
Write-Host "- X button deletes conversations" -ForegroundColor White
Write-Host "- Project input field in header (top right)" -ForegroundColor White
Write-Host "- Tag input field - press Enter to add tags" -ForegroundColor White
Write-Host "- Tags show with X to remove them" -ForegroundColor White
Write-Host "- Everything saves to localStorage" -ForegroundColor White

# Step 5: Test locally first
Write-Host "`n[5/5] Testing locally..." -ForegroundColor Yellow
Write-Host "Starting dev server on http://localhost:3000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop when done testing" -ForegroundColor Gray
Write-Host ""

npm run dev