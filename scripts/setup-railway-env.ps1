# Railway Environment Variables Setup Script (PowerShell)
# This script sets all required environment variables for Railway deployment

Write-Host "🚂 Setting up Railway environment variables..." -ForegroundColor Cyan
Write-Host ""

# Load .env.production file
$envFile = Join-Path $PSScriptRoot "..\\.env.production"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env.production not found!" -ForegroundColor Red
    exit 1
}

# Parse .env.production
$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"')
        $envVars[$key] = $value
    }
}

# Required environment variables (excluding Vercel-specific ones)
$requiredVars = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "OPENAI_API_KEY",
    "ASSEMBLYAI_API_KEY",
    "ZAPIER_WEBHOOK_URL",
    "ZAPIER_MEMORY_WEBHOOK_URL",
    "ZAPIER_WEBHOOK_SECRET"
)

Write-Host "Setting environment variables..." -ForegroundColor Yellow

foreach ($varName in $requiredVars) {
    if ($envVars.ContainsKey($varName)) {
        $value = $envVars[$varName]
        Write-Host "  Setting $varName..." -ForegroundColor Gray
        & railway variables --set "$varName=$value"
    } else {
        Write-Host "  ⚠️  Warning: $varName not found in .env.production" -ForegroundColor Yellow
    }
}

# Set additional Railway-specific variables
Write-Host "  Setting NODE_ENV..." -ForegroundColor Gray
& railway variables --set "NODE_ENV=production"

Write-Host ""
Write-Host "✅ Environment variables set successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Verify with: railway variables" -ForegroundColor Cyan
