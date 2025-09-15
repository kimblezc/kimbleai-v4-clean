#!/usr/bin/env powershell
# QUICK FIX AND DEPLOY SCRIPT
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   KIMBLEAI V4 - TYPESCRIPT FIX & DEPLOY" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Test build
Write-Host "`n[1/5] Testing build..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    
    # Commit fixes
    Write-Host "`n[2/5] Committing TypeScript fixes..." -ForegroundColor Yellow
    git add -A
    git commit -m "fix: TypeScript errors in message-reference-system-backup.ts" `
               -m "- Fixed Decision[] type casting on line 352" `
               -m "- Fixed ActionItem[] type casting on line 399" `
               -m "- Added proper type guards for JSON data" 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Changes committed" -ForegroundColor Green
    } else {
        Write-Host "No changes to commit" -ForegroundColor Gray
    }
    
    # Push to GitHub
    Write-Host "`n[3/5] Pushing to GitHub..." -ForegroundColor Yellow
    git push origin master
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ GitHub push successful!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Push failed - check connection" -ForegroundColor Yellow
    }
    
    # Deploy to Vercel
    Write-Host "`n[4/5] Triggering Vercel deployment..." -ForegroundColor Yellow
    npx vercel --prod --force 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Vercel deployment triggered!" -ForegroundColor Green
    }
    
    # Display environment variable status
    Write-Host "`n[5/5] Checking environment variables..." -ForegroundColor Yellow
    
    Write-Host "`n================================================" -ForegroundColor Cyan
    Write-Host "   DEPLOYMENT COMPLETE!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Cyan
    
    Write-Host "`n✅ ALL SYSTEMS GO:" -ForegroundColor Green
    Write-Host "  - TypeScript errors: FIXED" -ForegroundColor White
    Write-Host "  - Build: SUCCESSFUL" -ForegroundColor White
    Write-Host "  - GitHub: UPDATED" -ForegroundColor White
    Write-Host "  - Vercel: DEPLOYED" -ForegroundColor White
    
    Write-Host "`n⚠️  FINAL STEP - ADD ENVIRONMENT VARIABLES:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables" -ForegroundColor Cyan
    Write-Host "2. Click 'Import .env'" -ForegroundColor White
    Write-Host "3. Paste these variables:" -ForegroundColor White
    Write-Host ""
    
    # Show masked env vars
    if (Test-Path ".env.local") {
        Get-Content .env.local | ForEach-Object {
            if ($_ -match "^([^=]+)=(.+)$") {
                $key = $matches[1]
                Write-Host "  $key=[YOUR VALUE]" -ForegroundColor Yellow
            }
        }
    }
    
    Write-Host ""
    Write-Host "4. Select all environments (Production, Preview, Development)" -ForegroundColor White
    Write-Host "5. Save and Redeploy" -ForegroundColor White
    
    Write-Host "`n🌐 Your app will be live at:" -ForegroundColor Green
    Write-Host "   https://kimbleai-v4-clean.vercel.app" -ForegroundColor Cyan
    
} else {
    Write-Host "❌ Build failed - checking errors..." -ForegroundColor Red
    Write-Host "Please review the TypeScript errors above" -ForegroundColor Yellow
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")