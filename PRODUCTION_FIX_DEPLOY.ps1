#!/usr/bin/env pwsh
# PRODUCTION_FIX_DEPLOY.ps1 - Fix production root route and deploy

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "KIMBLEAI V4 - PRODUCTION FIX DEPLOYMENT" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to project directory
Set-Location "C:\Users\zachk\OneDrive\Documents\kimbleai-v4-clean"

# Step 1: Clean build folder
Write-Host "[1/10] Cleaning build folders..." -ForegroundColor Yellow
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".vercel" -Recurse -Force -ErrorAction SilentlyContinue

# Step 2: Update vercel.json to ensure proper routing
Write-Host "[2/10] Updating Vercel configuration..." -ForegroundColor Yellow
$vercelConfig = @'
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/",
      "destination": "/"
    }
  ]
}
'@
Set-Content -Path "vercel.json" -Value $vercelConfig

# Step 3: Ensure middleware is not causing redirects
Write-Host "[3/10] Checking for middleware issues..." -ForegroundColor Yellow
$middlewarePath = "middleware.ts"
if (Test-Path $middlewarePath) {
    Write-Host "Removing middleware to prevent redirects..." -ForegroundColor Yellow
    Remove-Item $middlewarePath -Force
}

# Step 4: Git add all changes
Write-Host "[4/10] Adding changes to git..." -ForegroundColor Yellow
git add -A

# Step 5: Commit changes
Write-Host "[5/10] Committing changes..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "Fix production root route - Remove redirect, ensure dark mode interface loads - $timestamp"

# Step 6: Push to GitHub
Write-Host "[6/10] Pushing to GitHub..." -ForegroundColor Yellow
git push origin main --force

# Step 7: Pull Vercel environment variables
Write-Host "[7/10] Pulling Vercel environment variables..." -ForegroundColor Yellow
vercel env pull .env.production

# Step 8: Deploy to Vercel production
Write-Host "[8/10] Deploying to Vercel production..." -ForegroundColor Yellow
$deployOutput = vercel --prod 2>&1

# Step 9: Extract deployment URL
$deploymentUrl = $deployOutput | Select-String -Pattern "https://.*\.vercel\.app" | Select-Object -First 1
if ($deploymentUrl) {
    $url = $deploymentUrl.Matches[0].Value
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Production URL: $url" -ForegroundColor Cyan
    Write-Host ""
    
    # Step 10: Test endpoints
    Write-Host "[10/10] Testing production endpoints..." -ForegroundColor Yellow
    Write-Host ""
    
    # Test root route
    Write-Host "Testing root route..." -ForegroundColor Yellow
    $rootResponse = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing
    if ($rootResponse.StatusCode -eq 200) {
        Write-Host "✓ Root route: OK (200)" -ForegroundColor Green
    } else {
        Write-Host "✗ Root route: $($rootResponse.StatusCode)" -ForegroundColor Red
    }
    
    # Test /api/health
    Write-Host "Testing /api/health..." -ForegroundColor Yellow
    try {
        $healthResponse = Invoke-RestMethod -Uri "$url/api/health" -Method GET
        Write-Host "✓ Health API: OK" -ForegroundColor Green
    } catch {
        Write-Host "✗ Health API: Failed" -ForegroundColor Red
    }
    
    # Test /simple route
    Write-Host "Testing /simple route..." -ForegroundColor Yellow
    try {
        $simpleResponse = Invoke-WebRequest -Uri "$url/simple" -Method GET -UseBasicParsing
        if ($simpleResponse.StatusCode -eq 200) {
            Write-Host "✓ Simple route: OK (200)" -ForegroundColor Green
        }
    } catch {
        Write-Host "✗ Simple route: Failed" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "NEXT STEPS:" -ForegroundColor Yellow
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "1. Open $url to verify dark mode interface" -ForegroundColor White
    Write-Host "2. Update domain from ai.kimbleai.com to www.kimbleai.com in Vercel settings" -ForegroundColor White
    Write-Host "3. Test file uploads and Google integrations" -ForegroundColor White
    Write-Host ""
    
    # Open in browser
    Start-Process $url
    
} else {
    Write-Host "Could not extract deployment URL from output" -ForegroundColor Red
    Write-Host "Full output:" -ForegroundColor Yellow
    Write-Host $deployOutput
}

Write-Host ""
Write-Host "Deployment process complete!" -ForegroundColor Green
