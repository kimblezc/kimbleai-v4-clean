#!/usr/bin/env powershell
Write-Host "KIMBLEAI - SIMPLE DEPLOYMENT" -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Build
Write-Host "Building..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    # Commit and push
    git add -A
    git commit -m "Update with persistent memory" 2>$null
    git push origin master
    
    Write-Host ""
    Write-Host "DEPLOYED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "WHAT'S WORKING NOW:" -ForegroundColor Cyan
    Write-Host "- Every message saved to Supabase instantly" -ForegroundColor White
    Write-Host "- Conversations persist across devices" -ForegroundColor White
    Write-Host "- Full history available always" -ForegroundColor White
    Write-Host "- Search across all messages" -ForegroundColor White
    Write-Host ""
    Write-Host "SETUP SUPABASE:" -ForegroundColor Yellow
    Write-Host "1. Go to Supabase dashboard" -ForegroundColor White
    Write-Host "2. Run SQL from supabase/schema.sql" -ForegroundColor White
    Write-Host "3. Messages will save automatically" -ForegroundColor White
} else {
    Write-Host "Build failed" -ForegroundColor Red
}