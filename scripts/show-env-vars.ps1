# SHOW ENVIRONMENT VARIABLES FOR VERCEL
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "ENVIRONMENT VARIABLES FOR VERCEL" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Copy these to Vercel Dashboard:" -ForegroundColor Yellow
Write-Host "https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables" -ForegroundColor Cyan
Write-Host ""

# Read .env.local and display
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local"
    foreach ($line in $envContent) {
        if ($line -match "^([^=]+)=(.+)$") {
            $key = $matches[1]
            $value = $matches[2]
            Write-Host "Key: " -NoNewline -ForegroundColor White
            Write-Host $key -ForegroundColor Yellow
            Write-Host "Value: " -NoNewline -ForegroundColor White
            Write-Host $value -ForegroundColor Gray
            Write-Host "---" -ForegroundColor DarkGray
        }
    }
} else {
    Write-Host "ERROR: .env.local not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "INSTRUCTIONS:" -ForegroundColor Cyan
Write-Host "1. Go to Vercel Environment Variables page (link above)" -ForegroundColor White
Write-Host "2. Click 'Add Variable' for each one" -ForegroundColor White
Write-Host "3. Paste the Key and Value" -ForegroundColor White
Write-Host "4. Select 'Production', 'Preview', and 'Development'" -ForegroundColor White
Write-Host "5. Click 'Save' after adding all 5 variables" -ForegroundColor White
Write-Host "6. Redeploy from Vercel dashboard" -ForegroundColor White
