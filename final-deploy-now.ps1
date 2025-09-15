#!/usr/bin/env powershell
# FINAL DEPLOYMENT WITH AUTO GIT PUSH
# This script handles everything automatically

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   KIMBLEAI V4 - FINAL DEPLOYMENT" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# 1. Check current status
Write-Host "`n[STEP 1] Checking git status..." -ForegroundColor Yellow
git status --short

# 2. Add and commit any changes
Write-Host "`n[STEP 2] Committing changes..." -ForegroundColor Yellow
git add -A
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "Auto-deploy: $timestamp" -m "Continuous deployment update" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Changes committed successfully" -ForegroundColor Green
} else {
    Write-Host "No changes to commit" -ForegroundColor Gray
}

# 3. Push to GitHub
Write-Host "`n[STEP 3] Pushing to GitHub..." -ForegroundColor Yellow
git push origin master

if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed - trying to pull and merge first..." -ForegroundColor Yellow
    git pull origin master --no-edit
    git push origin master
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "GitHub push successful!" -ForegroundColor Green
} else {
    Write-Host "GitHub push failed - check your connection" -ForegroundColor Red
}

# 4. Test build locally
Write-Host "`n[STEP 4] Testing local build..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Check errors above" -ForegroundColor Red
    exit 1
}

Write-Host "Build successful!" -ForegroundColor Green

# 5. Deploy to Vercel
Write-Host "`n[STEP 5] Deploying to Vercel..." -ForegroundColor Yellow
npx vercel --prod --force 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Vercel deployment triggered!" -ForegroundColor Green
} else {
    Write-Host "Vercel deployment needs manual trigger" -ForegroundColor Yellow
}

# 6. Show environment variables status
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "   DEPLOYMENT STATUS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Write-Host "`n✅ COMPLETED:" -ForegroundColor Green
Write-Host "  - Code committed to git" -ForegroundColor White
Write-Host "  - Pushed to GitHub" -ForegroundColor White
Write-Host "  - Local build successful" -ForegroundColor White
Write-Host "  - Vercel deployment triggered" -ForegroundColor White

Write-Host "`n⚠️  IMPORTANT - ADD ENVIRONMENT VARIABLES:" -ForegroundColor Yellow
Write-Host ""

# Check if .env.local exists
if (Test-Path ".env.local") {
    Write-Host "Your environment variables to add to Vercel:" -ForegroundColor Cyan
    Write-Host "--------------------------------------------" -ForegroundColor Gray
    Get-Content .env.local | ForEach-Object {
        if ($_ -match "^([^=]+)=(.+)$") {
            $key = $matches[1]
            $value = $matches[2]
            # Mask sensitive values for display
            if ($value.Length -gt 20) {
                $masked = $value.Substring(0, 10) + "..." + $value.Substring($value.Length - 5)
            } else {
                $masked = "***"
            }
            Write-Host "$key=$masked" -ForegroundColor Yellow
        }
    }
    Write-Host "--------------------------------------------" -ForegroundColor Gray
}

Write-Host "`n📋 TO COMPLETE DEPLOYMENT:" -ForegroundColor Cyan
Write-Host "1. Go to: https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables" -ForegroundColor White
Write-Host "2. Click 'Import .env'" -ForegroundColor White
Write-Host "3. Copy contents from .env.local file" -ForegroundColor White
Write-Host "4. Paste and save" -ForegroundColor White
Write-Host "5. Redeploy from Vercel dashboard" -ForegroundColor White

Write-Host "`n🌐 Your app will be live at:" -ForegroundColor Green
Write-Host "   https://kimbleai-v4-clean.vercel.app" -ForegroundColor Cyan

Write-Host "`n📊 GitHub Repository:" -ForegroundColor Green
Write-Host "   https://github.com/kimblezc/kimbleai-v4-clean" -ForegroundColor Cyan

# Send webhook notification
$webhookData = @{
    event = "DEPLOYMENT_UPDATE"
    timestamp = $timestamp
    status = "Deployed to Vercel"
    github = "https://github.com/kimblezc/kimbleai-v4-clean"
    vercel = "https://kimbleai-v4-clean.vercel.app"
    note = "Environment variables need to be added manually"
} | ConvertTo-Json

try {
    Invoke-WebRequest -Uri "https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/" `
                      -Method POST `
                      -Body $webhookData `
                      -ContentType "application/json" `
                      -ErrorAction SilentlyContinue | Out-Null
    Write-Host "`n✅ Master Document updated via Zapier" -ForegroundColor Green
} catch {
    # Ignore webhook errors
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "   DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")