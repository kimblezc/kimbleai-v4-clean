# PowerShell script to display environment variables for Vercel
# This makes it easy to copy/paste into Vercel dashboard

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  ENVIRONMENT VARIABLES FOR VERCEL" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Read the .env.local file
$envFile = ".env.local"
if (Test-Path $envFile) {
    Write-Host "Copy this entire block to Vercel:" -ForegroundColor Green
    Write-Host "--------------------------------" -ForegroundColor Gray
    Write-Host ""
    
    # Display the contents for easy copying
    Get-Content $envFile | ForEach-Object {
        Write-Host $_ -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "--------------------------------" -ForegroundColor Gray
    Write-Host ""
    Write-Host "INSTRUCTIONS:" -ForegroundColor Green
    Write-Host "1. Copy the yellow text above" -ForegroundColor White
    Write-Host "2. Go to: https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables" -ForegroundColor White
    Write-Host "3. Click 'Bulk Edit' or 'Import .env'" -ForegroundColor White
    Write-Host "4. Paste the variables" -ForegroundColor White
    Write-Host "5. Select: Production, Preview, Development" -ForegroundColor White
    Write-Host "6. Click Save" -ForegroundColor White
    Write-Host "7. Go to Deployments tab and click 'Redeploy'" -ForegroundColor White
    Write-Host ""
    Write-Host "Your app will be live at:" -ForegroundColor Green
    Write-Host "https://kimbleai-v4-clean.vercel.app" -ForegroundColor Cyan
} else {
    Write-Host "ERROR: .env.local file not found!" -ForegroundColor Red
    Write-Host "Make sure you're in the correct directory." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
