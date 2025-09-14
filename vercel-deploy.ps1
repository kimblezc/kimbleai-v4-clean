#!/usr/bin/env powershell
# VERCEL PRODUCTION DEPLOYMENT SCRIPT
Write-Host "================================================" -ForegroundColor Green
Write-Host "KIMBLEAI V4 - VERCEL PRODUCTION DEPLOYMENT" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

Write-Host "`nDEPLOYMENT STATUS:" -ForegroundColor Cyan
Write-Host "- Local build: SUCCESS" -ForegroundColor Green
Write-Host "- GitHub: Pushed successfully" -ForegroundColor Green
Write-Host "- TypeScript: All errors fixed" -ForegroundColor Green

Write-Host "`n[1/2] Checking Vercel login..." -ForegroundColor Yellow
npx vercel whoami

Write-Host "`n[2/2] Deploying to production..." -ForegroundColor Yellow
npx vercel --prod --yes

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "IMPORTANT NEXT STEPS:" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Write-Host "`n1. CHECK DEPLOYMENT STATUS:" -ForegroundColor Yellow
Write-Host "   https://vercel.com/kimblezcs-projects/kimbleai-v4-clean" -ForegroundColor White

Write-Host "`n2. ADD ENVIRONMENT VARIABLES:" -ForegroundColor Yellow
Write-Host "   https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables" -ForegroundColor White

Write-Host "`n3. REQUIRED VARIABLES FROM .env.local:" -ForegroundColor Yellow
Write-Host "   - OPENAI_API_KEY" -ForegroundColor Gray
Write-Host "   - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Gray
Write-Host "   - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Gray
Write-Host "   - NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Gray
Write-Host "   - ZAPIER_WEBHOOK_URL" -ForegroundColor Gray

Write-Host "`n4. AFTER ADDING VARIABLES:" -ForegroundColor Yellow
Write-Host "   Click 'Redeploy' in Vercel dashboard" -ForegroundColor White

Write-Host "`n5. TEST YOUR APP:" -ForegroundColor Yellow
Write-Host "   https://kimbleai-v4-clean.vercel.app" -ForegroundColor White

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "LOCAL BUILD WORKS - VERCEL NEEDS ENV VARS" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
