# CLEAN GIT HISTORY - REMOVE EXPOSED SECRETS
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "CLEANING GIT HISTORY OF EXPOSED SECRETS" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Create new clean branch
Write-Host "Creating clean branch without history..." -ForegroundColor Yellow
git checkout --orphan clean-main

# Add all current files (which are clean)
Write-Host "Adding clean files..." -ForegroundColor Yellow
git add -A

# Commit with clean state
Write-Host "Creating fresh commit..." -ForegroundColor Yellow
git commit -m "Initial commit: KimbleAI v4 Clean - Vector search and memory system"

# Force push to overwrite history
Write-Host "Force pushing clean history to GitHub..." -ForegroundColor Yellow
git branch -M main
git push origin main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS! Git history cleaned and pushed" -ForegroundColor Green
    Write-Host "All exposed secrets removed from history" -ForegroundColor Green
    Write-Host ""
    Write-Host "Repository: https://github.com/kimblezc/kimbleai-v4-clean" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "If push still fails, you need to:" -ForegroundColor Yellow
    Write-Host "1. Go to the URLs provided in the error" -ForegroundColor White
    Write-Host "2. Click 'Allow and push' for this one-time push" -ForegroundColor White
    Write-Host "3. Then immediately rotate your API keys" -ForegroundColor Red
}
