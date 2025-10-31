# KimbleAI Laptop Sync Script (PowerShell)
# Automatically pulls latest changes and prepares environment
# Run this when switching from desktop to laptop

Write-Host "🔄 KimbleAI Laptop Sync Starting..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Not in kimbleai-v4-clean directory" -ForegroundColor Red
    Write-Host "   Please cd to the project directory first" -ForegroundColor Yellow
    exit 1
}

# Check for uncommitted changes
$hasChanges = git diff-index --quiet HEAD --
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Warning: You have uncommitted changes" -ForegroundColor Yellow
    Write-Host "   Stashing them before pulling..." -ForegroundColor Yellow
    git stash
    $stashed = $true
}

# Pull latest changes
Write-Host "📥 Pulling latest changes from GitHub..." -ForegroundColor Cyan
git pull origin master

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git pull failed. Please resolve conflicts manually." -ForegroundColor Red
    exit 1
}

# Check if package.json changed
$packageChanged = git diff HEAD@{1} HEAD --name-only | Select-String "package.json"
if ($packageChanged) {
    Write-Host "📦 package.json changed, installing dependencies..." -ForegroundColor Cyan
    npm install
}

# Restore stashed changes if any
if ($stashed) {
    Write-Host "📋 Restoring your stashed changes..." -ForegroundColor Cyan
    git stash pop
}

# Clean and rebuild
Write-Host "🏗️  Cleaning build cache..." -ForegroundColor Cyan
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

Write-Host "🔨 Building project..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Check errors above." -ForegroundColor Red
    exit 1
}

# Show session handoff
Write-Host ""
Write-Host "✅ Sync complete! Showing session handoff info..." -ForegroundColor Green
Write-Host ""
Get-Content SESSION_HANDOFF.md | Select-Object -First 50
Write-Host ""
Write-Host "📖 Full handoff: cat SESSION_HANDOFF.md" -ForegroundColor Cyan
Write-Host "🚀 Start dev server: npm run dev" -ForegroundColor Cyan
Write-Host "☁️  Deploy to Railway: railway up" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ Ready to continue coding!" -ForegroundColor Green
