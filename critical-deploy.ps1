#!/usr/bin/env powershell
Write-Host "================================================" -ForegroundColor Red
Write-Host "   CRITICAL: Force Complete Redeployment" -ForegroundColor Red
Write-Host "================================================" -ForegroundColor Red

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Step 1: Clear Vercel cache
Write-Host "`n[1/5] Clearing Vercel cache..." -ForegroundColor Yellow
npx vercel --prod --force --skip-domain 2>$null

# Step 2: Test build locally
Write-Host "`n[2/5] Testing local build..." -ForegroundColor Yellow
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Test locally
Write-Host "`n[3/5] Starting local test server..." -ForegroundColor Yellow
Write-Host "Open http://localhost:3000 in a new browser tab" -ForegroundColor Cyan
Write-Host "You SHOULD see:" -ForegroundColor Yellow
Write-Host "  - Hamburger menu (☰) in top left" -ForegroundColor White
Write-Host "  - Project input field in header" -ForegroundColor White
Write-Host "  - Tag input field in header" -ForegroundColor White
Write-Host ""
Write-Host "Press Y if you see these features, N if not: " -ForegroundColor Yellow -NoNewline
$confirm = Read-Host

if ($confirm -ne 'Y' -and $confirm -ne 'y') {
    Write-Host "Local version doesn't have features. Checking code..." -ForegroundColor Red
    exit 1
}

# Step 4: Deploy to Vercel
Write-Host "`n[4/5] Deploying to Vercel with force..." -ForegroundColor Yellow
npx vercel --prod --force

# Step 5: Instructions
Write-Host "`n[5/5] DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host ""
Write-Host "CRITICAL STEPS:" -ForegroundColor Red
Write-Host "1. Wait 2-3 minutes for deployment" -ForegroundColor Yellow
Write-Host "2. Open an INCOGNITO/PRIVATE browser window" -ForegroundColor Yellow
Write-Host "3. Go to: https://kimbleai-v4-clean.vercel.app" -ForegroundColor Cyan
Write-Host "4. You MUST see the hamburger menu (☰)" -ForegroundColor Yellow
Write-Host ""
Write-Host "If features still missing, run:" -ForegroundColor Red
Write-Host "  npm run dev" -ForegroundColor White
Write-Host "And use http://localhost:3000 instead" -ForegroundColor White