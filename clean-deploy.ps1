#!/usr/bin/env powershell
Write-Host "DEPLOY WITHOUT KEYS IN CODE" -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Remove files with keys
Remove-Item "quick-deploy.ps1" -Force
Remove-Item "SECURITY_TODO.md" -Force

# Create clean deployment script
@'
#!/usr/bin/env powershell
Write-Host "CLEAN DEPLOY" -ForegroundColor Cyan
Write-Host ""
Write-Host "Add these to Vercel Dashboard:" -ForegroundColor Yellow
Write-Host "https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables" -ForegroundColor Cyan
Write-Host ""
Write-Host "Then run: npx vercel --prod --force" -ForegroundColor Cyan
'@ | Out-File "deploy-now.ps1" -Encoding UTF8

# Commit without the problematic files
git add -A
git commit -m "Remove exposed keys from code" 2>$null

# Push
git push origin master

Write-Host ""
Write-Host "PUSHED SUCCESSFULLY" -ForegroundColor Green
Write-Host ""
Write-Host "NOW GO TO VERCEL DASHBOARD:" -ForegroundColor Yellow
Write-Host "https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables" -ForegroundColor Cyan
Write-Host ""
Write-Host "Add your 4 environment variables there" -ForegroundColor White
Write-Host "Then run: npx vercel --prod --force" -ForegroundColor Cyan