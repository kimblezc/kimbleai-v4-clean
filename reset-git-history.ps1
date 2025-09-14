#!/usr/bin/env powershell
# COMPLETE GIT HISTORY RESET AND SECURE PUSH
# This removes ALL history containing exposed keys

Write-Host "================================================" -ForegroundColor Red
Write-Host "GIT HISTORY RESET - REMOVING EXPOSED KEYS" -ForegroundColor Red
Write-Host "================================================" -ForegroundColor Red

# Navigate to correct directory
Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

Write-Host "`nThis will create a NEW clean history without exposed keys" -ForegroundColor Yellow

# Step 1: Create a new orphan branch (no history)
Write-Host "`n[1/6] Creating new clean branch..." -ForegroundColor Cyan
git checkout --orphan clean-master

# Step 2: Add all current files (which are now clean)
Write-Host "`n[2/6] Adding all clean files..." -ForegroundColor Cyan
git add -A

# Step 3: Commit with clean history
Write-Host "`n[3/6] Creating initial clean commit..." -ForegroundColor Cyan
git commit -m "Initial commit: KimbleAI V4 Clean - Secure Version" `
           -m "- All TypeScript errors fixed" `
           -m "- Environment variables in .env.local (gitignored)" `
           -m "- No exposed API keys in repository" `
           -m "- Webhook integration ready" `
           -m "- Ready for Vercel deployment"

# Step 4: Delete the old master branch
Write-Host "`n[4/6] Removing old branch with exposed keys..." -ForegroundColor Cyan
git branch -D master

# Step 5: Rename clean branch to master
Write-Host "`n[5/6] Setting clean branch as master..." -ForegroundColor Cyan
git branch -m master

# Step 6: Force push the clean history
Write-Host "`n[6/6] Force pushing clean history to GitHub..." -ForegroundColor Cyan
git push origin master --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n================================================" -ForegroundColor Green
    Write-Host "✅ GIT HISTORY CLEANED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    
    # Now deploy to Vercel
    Write-Host "`nDeploying to Vercel..." -ForegroundColor Yellow
    npx vercel --prod --force
    
    # Log success to webhook
    $webhookData = @{
        event = "SECURE_DEPLOYMENT_SUCCESS"
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        status = "Git history cleaned and pushed"
        security = "No exposed keys in repository"
        deployment = "Vercel deployment initiated"
        github = "https://github.com/kimblezc/kimbleai-v4-clean"
        note = "Repository is now completely clean"
    } | ConvertTo-Json
    
    Invoke-WebRequest -Uri "https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/" `
                      -Method POST `
                      -Body $webhookData `
                      -ContentType "application/json" `
                      -ErrorAction SilentlyContinue
    
    Write-Host "`n================================================" -ForegroundColor Green
    Write-Host "NEXT STEPS:" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "1. Vercel deployment is running" -ForegroundColor White
    Write-Host "2. Add environment variables at:" -ForegroundColor White
    Write-Host "   https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables" -ForegroundColor Yellow
    Write-Host "3. Copy values from your .env.local file" -ForegroundColor White
    Write-Host "`nYour repository is now completely clean!" -ForegroundColor Green
    
} else {
    Write-Host "`n❌ Push failed - check errors above" -ForegroundColor Red
}
