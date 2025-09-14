# Quick Build Test Script
Write-Host "Testing KimbleAI V4 Build..." -ForegroundColor Cyan

# Check Node version
Write-Host "`nNode Version:" -ForegroundColor Yellow
node --version

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
    npm install
}

# Run build
Write-Host "`nRunning TypeScript build test..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "Ready for deployment to Vercel" -ForegroundColor Green
} else {
    Write-Host "`n❌ BUILD FAILED" -ForegroundColor Red
    Write-Host "Check the errors above" -ForegroundColor Red
}
