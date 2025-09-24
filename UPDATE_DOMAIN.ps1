#!/usr/bin/env pwsh
# UPDATE_DOMAIN.ps1 - Update domain configuration

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "DOMAIN UPDATE SCRIPT" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to project directory
Set-Location "C:\Users\zachk\OneDrive\Documents\kimbleai-v4-clean"

# Step 1: Update environment variables for new domain
Write-Host "[1/5] Updating environment variables for www.kimbleai.com..." -ForegroundColor Yellow

# Update NEXTAUTH_URL in Vercel
Write-Host "Setting NEXTAUTH_URL to https://www.kimbleai.com..." -ForegroundColor Yellow
vercel env add NEXTAUTH_URL production < "https://www.kimbleai.com"

# Step 2: Add domain to Vercel
Write-Host "[2/5] Adding www.kimbleai.com domain to Vercel..." -ForegroundColor Yellow
vercel domains add www.kimbleai.com

# Step 3: Remove old domain
Write-Host "[3/5] Removing ai.kimbleai.com domain..." -ForegroundColor Yellow
vercel domains rm ai.kimbleai.com

# Step 4: Update Google OAuth redirect URIs
Write-Host "[4/5] Google OAuth Configuration Required:" -ForegroundColor Yellow
Write-Host ""
Write-Host "MANUAL STEPS REQUIRED:" -ForegroundColor Red
Write-Host "1. Go to: https://console.cloud.google.com/apis/credentials" -ForegroundColor White
Write-Host "2. Click on your OAuth 2.0 Client ID" -ForegroundColor White
Write-Host "3. Update Authorized redirect URIs:" -ForegroundColor White
Write-Host "   - Remove: https://ai.kimbleai.com/api/auth/callback/google" -ForegroundColor White
Write-Host "   - Add: https://www.kimbleai.com/api/auth/callback/google" -ForegroundColor White
Write-Host "4. Update Authorized JavaScript origins:" -ForegroundColor White
Write-Host "   - Remove: https://ai.kimbleai.com" -ForegroundColor White
Write-Host "   - Add: https://www.kimbleai.com" -ForegroundColor White
Write-Host "5. Click SAVE" -ForegroundColor White
Write-Host ""

# Step 5: Deploy with new configuration
Write-Host "[5/5] Deploying with new domain configuration..." -ForegroundColor Yellow
vercel --prod

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "DOMAIN UPDATE COMPLETE!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "DNS CONFIGURATION REQUIRED:" -ForegroundColor Yellow
Write-Host "Add these DNS records to your domain provider:" -ForegroundColor White
Write-Host ""
Write-Host "Type: CNAME" -ForegroundColor White
Write-Host "Name: www" -ForegroundColor White
Write-Host "Value: cname.vercel-dns.com" -ForegroundColor White
Write-Host ""
Write-Host "OR (for root domain):" -ForegroundColor White
Write-Host "Type: A" -ForegroundColor White
Write-Host "Name: @" -ForegroundColor White
Write-Host "Value: 76.76.21.21" -ForegroundColor White
Write-Host ""

# Open Vercel domains page
Write-Host "Opening Vercel domains page..." -ForegroundColor Yellow
Start-Process "https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/domains"
