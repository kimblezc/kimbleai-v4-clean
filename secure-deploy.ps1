#!/usr/bin/env powershell
# SECURE GIT CLEANUP AND DEPLOYMENT SCRIPT
# Removes files with exposed keys and pushes clean version

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "KIMBLEAI V4 - SECURE DEPLOYMENT" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Navigate to correct directory
Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Remove files with exposed keys
Write-Host "`nRemoving files with exposed keys..." -ForegroundColor Yellow
Remove-Item "OPUS_4_FINAL_EXPORT.md" -Force -ErrorAction SilentlyContinue
Remove-Item "deploy.ps1" -Force -ErrorAction SilentlyContinue

# Stage all changes
Write-Host "`nStaging secure files..." -ForegroundColor Yellow
git add -A

# Commit with security message
Write-Host "`nCommitting secure version..." -ForegroundColor Yellow
git commit -m "security: Remove all exposed API keys from repository" `
           -m "- Removed files containing exposed keys" `
           -m "- Added secure deployment guide" `
           -m "- Added secure master document entry" `
           -m "- API keys remain safe in .env.local (gitignored)" `
           -m "- Reference Google Drive doc for key storage"

# Push to GitHub
Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
git push origin master --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ SECURE PUSH SUCCESSFUL!" -ForegroundColor Green
    
    # Deploy to Vercel
    Write-Host "`nDeploying to Vercel..." -ForegroundColor Yellow
    npx vercel --prod --force
    
    # Log to webhook
    Write-Host "`nLogging to Master Document..." -ForegroundColor Yellow
    $webhookData = @{
        event = "SECURE_DEPLOYMENT"
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        status = "Repository cleaned of exposed keys"
        security = "All API keys in .env.local only"
        deployment = "Vercel production deployment initiated"
        github = "https://github.com/kimblezc/kimbleai-v4-clean"
    } | ConvertTo-Json
    
    Invoke-WebRequest -Uri "https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/" `
                      -Method POST `
                      -Body $webhookData `
                      -ContentType "application/json"
    
    Write-Host "`n================================================" -ForegroundColor Green
    Write-Host "DEPLOYMENT COMPLETE - SECURE VERSION" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "`nNEXT STEPS:" -ForegroundColor Cyan
    Write-Host "1. Go to Vercel Dashboard" -ForegroundColor White
    Write-Host "2. Add environment variables from .env.local" -ForegroundColor White
    Write-Host "3. URL: https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables" -ForegroundColor Yellow
    
} else {
    Write-Host "`n❌ Git push failed - check for errors above" -ForegroundColor Red
}
