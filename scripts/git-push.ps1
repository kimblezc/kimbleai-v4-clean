# KIMBLEAI V4 CLEAN - GITHUB AUTOMATED PUSH
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "AUTOMATED GIT PUSH WITH VERSION CONTROL" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Generate version tag
$version = "v4.$(Get-Date -Format 'MMdd.HHmm')"
$message = "deployment: $version - Vector search with complete memory system"

Write-Host ""
Write-Host "Version: $version" -ForegroundColor Yellow
Write-Host "Message: $message" -ForegroundColor Yellow
Write-Host ""

# Stage all changes
Write-Host "Staging changes..." -ForegroundColor Cyan
git add -A

# Check if there are changes
$status = git status --porcelain
if ($status) {
    Write-Host "Changes detected, committing..." -ForegroundColor Green
    git commit -m "$message"
    
    # Push to GitHub
    Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
    git push origin main --force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "SUCCESS! Pushed to GitHub" -ForegroundColor Green
        Write-Host "Repository: https://github.com/kimblezc/kimbleai-v4-clean" -ForegroundColor Cyan
        
        # Create tag
        git tag -a $version -m "$message"
        git push origin $version
        Write-Host "Tagged as: $version" -ForegroundColor Green
    } else {
        Write-Host "Push failed. Setting up GitHub remote..." -ForegroundColor Yellow
        git remote remove origin 2>$null
        git remote add origin https://github.com/kimblezc/kimbleai-v4-clean.git
        git branch -M main
        git push -u origin main --force
    }
} else {
    Write-Host "No changes to commit" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "GitHub Update Complete!" -ForegroundColor Green