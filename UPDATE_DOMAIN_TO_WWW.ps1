# UPDATE_DOMAIN_TO_WWW.ps1
# Script to update domain from ai.kimbleai.com to www.kimbleai.com

Write-Host "=== Update KimbleAI Domain Configuration ===" -ForegroundColor Cyan
Write-Host "Changing from ai.kimbleai.com to www.kimbleai.com" -ForegroundColor Yellow

# Navigate to project
Set-Location "C:\Users\zachk\OneDrive\Documents\kimbleai-v4-clean"

Write-Host "`n[STEP 1] Update local environment files..." -ForegroundColor Green

# Update .env.local
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local" -Raw
    $envContent = $envContent -replace "NEXTAUTH_URL=.*", "NEXTAUTH_URL=https://www.kimbleai.com"
    Set-Content ".env.local" -Value $envContent
    Write-Host "   Updated .env.local" -ForegroundColor Green
}

# Update .env.production if it exists
if (Test-Path ".env.production") {
    $envContent = Get-Content ".env.production" -Raw
    $envContent = $envContent -replace "NEXTAUTH_URL=.*", "NEXTAUTH_URL=https://www.kimbleai.com"
    Set-Content ".env.production" -Value $envContent
    Write-Host "   Updated .env.production" -ForegroundColor Green
}

Write-Host "`n[STEP 2] Update Vercel environment variables..." -ForegroundColor Green
Write-Host "Running: vercel env add NEXTAUTH_URL production" -ForegroundColor Yellow
"https://www.kimbleai.com" | vercel env add NEXTAUTH_URL production

Write-Host "`n[STEP 3] Commit changes to Git..." -ForegroundColor Green
git add -A
git commit -m "Update domain configuration to www.kimbleai.com"
git push origin main

Write-Host "`n[STEP 4] Deploy with new configuration..." -ForegroundColor Green
vercel --prod

Write-Host "`n=== MANUAL STEPS REQUIRED ===" -ForegroundColor Cyan
Write-Host "1. Go to Vercel Dashboard: https://vercel.com/dashboard" -ForegroundColor Yellow
Write-Host "2. Select your kimbleai-v4-clean project" -ForegroundColor Yellow
Write-Host "3. Go to Settings -> Domains" -ForegroundColor Yellow
Write-Host "4. Remove ai.kimbleai.com" -ForegroundColor Yellow
Write-Host "5. Add www.kimbleai.com" -ForegroundColor Yellow
Write-Host "6. Update your DNS records:" -ForegroundColor Yellow
Write-Host "   - Add CNAME record: www -> cname.vercel-dns.com" -ForegroundColor White
Write-Host "   - Or A record: @ -> 76.76.21.21" -ForegroundColor White
Write-Host "`n7. Go to Google Cloud Console:" -ForegroundColor Yellow
Write-Host "   - Update OAuth redirect URI to https://www.kimbleai.com/api/auth/callback/google" -ForegroundColor White
Write-Host "`nDomain propagation may take up to 48 hours." -ForegroundColor Cyan
