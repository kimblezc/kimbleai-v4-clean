# FIX ZAPIER WEBHOOK SECURITY ISSUE
Write-Host "=================================================" -ForegroundColor Red
Write-Host "FIXING ZAPIER WEBHOOK SECURITY" -ForegroundColor Red
Write-Host "=================================================" -ForegroundColor White
Write-Host ""

Write-Host "PROBLEM: Your webhook has been compromised/hijacked" -ForegroundColor Yellow
Write-Host "Someone set up an unsubscribe response on your webhook URL" -ForegroundColor Yellow
Write-Host ""

Write-Host "SOLUTION STEPS:" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. CREATE NEW SECURE WEBHOOK:" -ForegroundColor Green
Write-Host "   - Log into Zapier: https://zapier.com" -ForegroundColor White
Write-Host "   - Go to your Zaps" -ForegroundColor White
Write-Host "   - Find the KimbleAI logging Zap" -ForegroundColor White
Write-Host "   - Click on the Webhook trigger" -ForegroundColor White
Write-Host "   - Click 'Generate New URL'" -ForegroundColor White
Write-Host "   - Copy the new webhook URL" -ForegroundColor White
Write-Host ""

Write-Host "2. UPDATE YOUR ENVIRONMENT VARIABLES:" -ForegroundColor Green
$newWebhook = Read-Host "Paste your NEW Zapier webhook URL here"

if ($newWebhook -match "^https://hooks.zapier.com/") {
    # Update .env.local
    $envContent = Get-Content ".env.local" -Raw
    $envContent = $envContent -replace 'ZAPIER_WEBHOOK_URL=.*', "ZAPIER_WEBHOOK_URL=$newWebhook"
    Set-Content -Path ".env.local" -Value $envContent
    Write-Host "✅ Updated .env.local" -ForegroundColor Green
    
    # Update conversation-logger.ts
    $loggerPath = "lib\conversation-logger.ts"
    $loggerContent = Get-Content $loggerPath -Raw
    $loggerContent = $loggerContent -replace "MASTER_DOC_WEBHOOK = '[^']*'", "MASTER_DOC_WEBHOOK = '$newWebhook'"
    Set-Content -Path $loggerPath -Value $loggerContent
    Write-Host "✅ Updated conversation-logger.ts" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "3. UPDATE VERCEL:" -ForegroundColor Green
    Write-Host "   Run: npx vercel env pull" -ForegroundColor White
    Write-Host "   Then: npx vercel env add ZAPIER_WEBHOOK_URL" -ForegroundColor White
    Write-Host "   Paste: $newWebhook" -ForegroundColor White
    Write-Host "   Then: npx vercel --prod" -ForegroundColor White
    
} else {
    Write-Host "❌ Invalid webhook URL. Must start with https://hooks.zapier.com/" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. TEST NEW WEBHOOK:" -ForegroundColor Green
Write-Host "   After updating, run: .\scripts\test-zapier-secure.ps1" -ForegroundColor White
