# DEPLOY RAG SYSTEM NOW
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "DEPLOYING COMPREHENSIVE RAG SYSTEM" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor White
Write-Host ""

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Step 1: Check current files
Write-Host "[1/6] Checking files..." -ForegroundColor Yellow
if (Test-Path "app\api\chat\route-enhanced.ts") {
    Write-Host "✅ Enhanced route exists" -ForegroundColor Green
} else {
    Write-Host "❌ Enhanced route missing!" -ForegroundColor Red
    exit
}

# Step 2: Backup current route
Write-Host "[2/6] Backing up current route..." -ForegroundColor Yellow
Copy-Item "app\api\chat\route.ts" "app\api\chat\route-$(Get-Date -Format 'yyyyMMdd-HHmmss').backup.ts"
Write-Host "✅ Backup created" -ForegroundColor Green

# Step 3: Deploy enhanced route
Write-Host "[3/6] Deploying enhanced RAG route..." -ForegroundColor Yellow
Copy-Item "app\api\chat\route-enhanced.ts" "app\api\chat\route.ts" -Force
Write-Host "✅ Enhanced route deployed" -ForegroundColor Green

# Step 4: Git commit
Write-Host "[4/6] Committing changes..." -ForegroundColor Yellow
git add -A
git commit -m "Deploy comprehensive RAG knowledge base system with file indexing"
Write-Host "✅ Changes committed" -ForegroundColor Green

# Step 5: Push to GitHub
Write-Host "[5/6] Pushing to GitHub..." -ForegroundColor Yellow
git push origin main
Write-Host "✅ Pushed to GitHub" -ForegroundColor Green

# Step 6: Deploy to Vercel
Write-Host "[6/6] Deploying to Vercel..." -ForegroundColor Yellow
Write-Host "Running: npx vercel --prod --force" -ForegroundColor Gray
npx vercel --prod --force

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your RAG system is now live at:" -ForegroundColor Yellow
Write-Host "https://kimbleai-v4-clean.vercel.app" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test with: .\scripts\test-complete-system.ps1" -ForegroundColor White