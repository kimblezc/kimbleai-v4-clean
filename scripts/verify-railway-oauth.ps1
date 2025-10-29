# Railway OAuth Configuration Verification Script
# Verifies that Railway environment variables are correctly configured for kimbleai.com

Write-Host "🚂 Railway OAuth Configuration Checker" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Check if railway CLI is installed
Write-Host "Checking Railway CLI installation..." -ForegroundColor Yellow
$railwayCheck = Get-Command railway -ErrorAction SilentlyContinue
if (-not $railwayCheck) {
    Write-Host "❌ Railway CLI not found!" -ForegroundColor Red
    Write-Host "Install with: npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Railway CLI installed" -ForegroundColor Green
Write-Host ""

# Check if logged in
Write-Host "Checking Railway authentication..." -ForegroundColor Yellow
$whoami = railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Railway!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run: railway login" -ForegroundColor Yellow
    Write-Host "This will open your browser to authenticate." -ForegroundColor Gray
    exit 1
}
Write-Host "✅ Logged in as: $whoami" -ForegroundColor Green
Write-Host ""

# Get all variables
Write-Host "Fetching Railway environment variables..." -ForegroundColor Yellow
$allVars = railway variables 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to fetch variables!" -ForegroundColor Red
    Write-Host "Make sure you're in the project directory and linked to Railway." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Try running: railway link" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Variables fetched successfully" -ForegroundColor Green
Write-Host ""

# Parse and display OAuth-related variables
Write-Host "OAuth Configuration:" -ForegroundColor Cyan
Write-Host "-" * 60 -ForegroundColor Cyan

$oauthVars = @(
    "NEXTAUTH_URL",
    "NEXTAUTH_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET"
)

$found = @{}
$missing = @()

foreach ($var in $oauthVars) {
    $value = railway variables get $var 2>&1
    if ($LASTEXITCODE -eq 0 -and $value) {
        $found[$var] = $value

        # Show value with masking for secrets
        if ($var -like "*SECRET*" -or $var -like "*KEY*") {
            $masked = $value.Substring(0, [Math]::Min(10, $value.Length)) + "..." + $value.Substring([Math]::Max(0, $value.Length - 4))
            Write-Host "✅ $var = $masked" -ForegroundColor Green
        } else {
            Write-Host "✅ $var = $value" -ForegroundColor Green
        }
    } else {
        $missing += $var
        Write-Host "❌ $var = NOT SET" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "-" * 60 -ForegroundColor Cyan

# Verify NEXTAUTH_URL specifically
if ($found.ContainsKey("NEXTAUTH_URL")) {
    $nextauthUrl = $found["NEXTAUTH_URL"]

    Write-Host ""
    Write-Host "NEXTAUTH_URL Verification:" -ForegroundColor Cyan
    Write-Host "-" * 60 -ForegroundColor Cyan

    $expectedUrls = @(
        "https://kimbleai.com",
        "https://www.kimbleai.com"
    )

    if ($nextauthUrl -in $expectedUrls) {
        Write-Host "✅ NEXTAUTH_URL is correctly set to: $nextauthUrl" -ForegroundColor Green
    } else {
        Write-Host "⚠️  NEXTAUTH_URL is set to: $nextauthUrl" -ForegroundColor Yellow
        Write-Host "   Expected: https://www.kimbleai.com" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To fix, run:" -ForegroundColor Yellow
        Write-Host "railway variables set NEXTAUTH_URL=https://www.kimbleai.com" -ForegroundColor Cyan
    }
}

# Summary
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "-" * 60 -ForegroundColor Cyan
Write-Host "Found: $($found.Count)/$($oauthVars.Count) required variables" -ForegroundColor $(if ($found.Count -eq $oauthVars.Count) { "Green" } else { "Yellow" })

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Missing Variables:" -ForegroundColor Yellow
    foreach ($var in $missing) {
        Write-Host "   - $var" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "To set missing variables, run:" -ForegroundColor Yellow
    Write-Host "railway variables set VARIABLE_NAME=value" -ForegroundColor Cyan
}

# Google OAuth Console Instructions
Write-Host ""
Write-Host "Google OAuth Console Configuration:" -ForegroundColor Cyan
Write-Host "-" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "Make sure your Google OAuth Client has these settings:" -ForegroundColor Yellow
Write-Host ""
Write-Host "📍 Authorized JavaScript Origins:" -ForegroundColor Cyan
Write-Host "   • https://kimbleai.com"
Write-Host "   • https://www.kimbleai.com"
Write-Host "   • https://kimbleai-production-efed.up.railway.app"
Write-Host ""
Write-Host "🔗 Authorized Redirect URIs:" -ForegroundColor Cyan
Write-Host "   • https://kimbleai.com/api/auth/callback/google"
Write-Host "   • https://www.kimbleai.com/api/auth/callback/google"
Write-Host "   • https://kimbleai-production-efed.up.railway.app/api/auth/callback/google"
Write-Host ""
Write-Host "Update at: https://console.cloud.google.com/apis/credentials" -ForegroundColor Blue
Write-Host ""

# Test endpoints
Write-Host "Test Your Configuration:" -ForegroundColor Cyan
Write-Host "-" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Visit: https://www.kimbleai.com" -ForegroundColor Yellow
Write-Host "2. Click 'Sign in with Google'" -ForegroundColor Yellow
Write-Host "3. Should redirect properly after authentication" -ForegroundColor Yellow
Write-Host ""
Write-Host "If login fails, check browser console for errors." -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Verification Complete!" -ForegroundColor Green
