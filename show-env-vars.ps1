#!/usr/bin/env powershell
# VIEW ENVIRONMENT VARIABLES FOR VERCEL SETUP
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "ENVIRONMENT VARIABLES FOR VERCEL" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

Write-Host "`nREADING .env.local FILE..." -ForegroundColor Yellow
Write-Host "Copy these values to Vercel Dashboard" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local"
    
    Write-Host "`nFOUND VARIABLES:" -ForegroundColor Green
    foreach ($line in $envContent) {
        if ($line -match "^([^=]+)=(.*)$") {
            $key = $matches[1]
            $value = $matches[2]
            
            # Mask sensitive keys for display
            if ($key -like "*API_KEY*" -or $key -like "*SERVICE*") {
                $displayValue = $value.Substring(0, [Math]::Min(15, $value.Length)) + "...[HIDDEN]"
                Write-Host "$key = $displayValue" -ForegroundColor Yellow
            } else {
                Write-Host "$key = $value" -ForegroundColor White
            }
        }
    }
    
    Write-Host "`n================================================" -ForegroundColor Cyan
    Write-Host "TO ADD IN VERCEL:" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    
    Write-Host "`n1. Go to Settings -> Environment Variables" -ForegroundColor White
    Write-Host "   https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables" -ForegroundColor Cyan
    
    Write-Host "`n2. Click 'Add Variable' for each one" -ForegroundColor White
    
    Write-Host "`n3. After adding all, redeploy from Deployments tab" -ForegroundColor White
    
    Write-Host "`n================================================" -ForegroundColor Green
    Write-Host "OPENING .env.local IN NOTEPAD..." -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    
    # Open in notepad for easy copying
    notepad .env.local
    
} else {
    Write-Host "ERROR: .env.local file not found!" -ForegroundColor Red
    Write-Host "Creating template..." -ForegroundColor Yellow
    
    $template = @"
NEXT_PUBLIC_SUPABASE_URL=https://gbmefnaqsxtloseufjixp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_KEY_HERE
OPENAI_API_KEY=YOUR_OPENAI_KEY_HERE
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/
"@
    
    Set-Content -Path ".env.local.template" -Value $template
    Write-Host "Template created at .env.local.template" -ForegroundColor Yellow
}
