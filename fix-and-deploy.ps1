# Fix Git and Deploy Script
Write-Host "KimbleAI V4 CLEAN - Git Fix and Deploy" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Ensure we're in the correct directory
Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"
Write-Host "`nCurrent Directory: $(Get-Location)" -ForegroundColor Yellow

# Check git status
Write-Host "`nGit Status:" -ForegroundColor Yellow
git status --short

# Check current branch
$branch = git branch --show-current
Write-Host "`nCurrent Branch: $branch" -ForegroundColor Yellow

# Push to GitHub
Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
git push origin $branch --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
    
    # Now deploy to Vercel
    Write-Host "`nDeploying to Vercel..." -ForegroundColor Yellow
    npx vercel --prod --force
    
    Write-Host "`n✅ Deployment initiated!" -ForegroundColor Green
    Write-Host "`nNEXT STEPS:" -ForegroundColor Cyan
    Write-Host "1. Add environment variables in Vercel Dashboard" -ForegroundColor White
    Write-Host "2. Visit: https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables" -ForegroundColor White
} else {
    Write-Host "❌ Git push failed. Check the error above." -ForegroundColor Red
}
