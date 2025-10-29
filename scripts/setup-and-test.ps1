# Complete Setup and Test Workflow
# Runs OAuth verification and MCP testing in sequence

Write-Host "🚀 KimbleAI Setup and Test Workflow" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Step 1: Railway OAuth Verification
Write-Host "Step 1: Verifying Railway OAuth Configuration..." -ForegroundColor Yellow
Write-Host ""

& "$PSScriptRoot\verify-railway-oauth.ps1"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ OAuth verification failed!" -ForegroundColor Red
    Write-Host "Please fix the issues above before continuing." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Press Enter to continue to MCP testing..." -ForegroundColor Gray
Read-Host

# Step 2: MCP Testing
Write-Host ""
Write-Host "Step 2: Testing MCP Deployment..." -ForegroundColor Yellow
Write-Host ""

$url = Read-Host "Enter URL to test (default: https://www.kimbleai.com)"
if ([string]::IsNullOrWhiteSpace($url)) {
    $url = "https://www.kimbleai.com"
}

Write-Host ""
Write-Host "Testing MCP at: $url" -ForegroundColor Cyan
Write-Host ""

npx tsx scripts/test-mcp-deployment.ts $url

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️  MCP tests had failures!" -ForegroundColor Yellow
    Write-Host "Review the results above." -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "✅ All MCP tests passed!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Setup and Test Complete!" -ForegroundColor Green
Write-Host ""
