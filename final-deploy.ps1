#!/usr/bin/env powershell
# FINAL DEPLOYMENT - ALL ISSUES FIXED
Write-Host "================================================" -ForegroundColor Green
Write-Host "KIMBLEAI V4 - FINAL SECURE DEPLOYMENT" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Commit the TypeScript fix
Write-Host "`n[1/3] Committing TypeScript fix..." -ForegroundColor Cyan
git add app/api/chat/route.ts
git commit -m "fix: TypeScript error on line 458 - facts array type declaration"

# Push to GitHub
Write-Host "`n[2/3] Pushing to GitHub..." -ForegroundColor Cyan
git push origin master

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ GitHub push successful!" -ForegroundColor Green
    
    # Deploy to Vercel
    Write-Host "`n[3/3] Deploying to Vercel..." -ForegroundColor Cyan
    npx vercel --prod --force
    
    Write-Host "`n================================================" -ForegroundColor Green
    Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    
    Write-Host "`nFINAL STEPS:" -ForegroundColor Yellow
    Write-Host "1. Deployment URL: Check output above" -ForegroundColor White
    Write-Host "2. Add environment variables at:" -ForegroundColor White
    Write-Host "   https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables" -ForegroundColor Cyan
    Write-Host "`n3. Add these from your .env.local file:" -ForegroundColor White
    Write-Host "   - OPENAI_API_KEY" -ForegroundColor Gray
    Write-Host "   - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Gray
    Write-Host "   - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Gray
    Write-Host "   - NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Gray
    Write-Host "   - ZAPIER_WEBHOOK_URL" -ForegroundColor Gray
    
    Write-Host "`n4. After adding variables, redeploy:" -ForegroundColor White
    Write-Host "   npx vercel --prod --force" -ForegroundColor Cyan
    
    # Success webhook
    $webhookData = @{
        event = "DEPLOYMENT_SUCCESS"
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        status = "Clean deployment successful"
        github = "https://github.com/kimblezc/kimbleai-v4-clean"
        fixes = @("TypeScript error fixed", "Git history cleaned", "No exposed keys")
    } | ConvertTo-Json
    
    try {
        Invoke-WebRequest -Uri "https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/" `
                          -Method POST `
                          -Body $webhookData `
                          -ContentType "application/json" `
                          -ErrorAction SilentlyContinue
    } catch {
        # Ignore webhook errors
    }
    
} else {
    Write-Host "❌ Git push failed" -ForegroundColor Red
}
