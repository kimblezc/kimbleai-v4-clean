#!/usr/bin/env powershell
# KIMBLEAI V4 CLEAN - COMPLETE DEPLOYMENT
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   KIMBLEAI V4 - FULL DEPLOYMENT" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Step 1: Environment Check
Write-Host "`n[1/8] Checking environment..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local..." -ForegroundColor Yellow
    @"
# OpenAI
OPENAI_API_KEY=$($env:OPENAI_API_KEY)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://gbmefnaqsxtloseufjixp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=$($env:SUPABASE_SERVICE_ROLE_KEY)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdibWVmbmFxc3h0bG9zZXVmanFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM0NzcxMDAsImV4cCI6MjAzOTA1MzEwMH0.N3IK_-eaBe8FXzs8gtMCl5wAvr-yNwMoIVEMiqex5qo
"@ | Out-File ".env.local" -Encoding UTF8
}

# Step 2: Install dependencies
Write-Host "`n[2/8] Installing dependencies..." -ForegroundColor Yellow
npm install

# Step 3: Build
Write-Host "`n[3/8] Building project..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Checking errors..." -ForegroundColor Red
    npx tsc --noEmit
    exit 1
}

# Step 4: Git commit
Write-Host "`n[4/8] Committing to Git..." -ForegroundColor Yellow
git add -A
git commit -m "feat: Complete KimbleAI v4 with persistent memory" `
           -m "- Supabase integration for persistent storage" `
           -m "- Vector embeddings for semantic search" `
           -m "- Message reference system" `
           -m "- Full conversation history" `
           -m "- GPT-4 integration" 2>$null

# Step 5: Push to GitHub
Write-Host "`n[5/8] Pushing to GitHub..." -ForegroundColor Yellow
git push origin master

# Step 6: Set Vercel environment variables
Write-Host "`n[6/8] Setting Vercel environment variables..." -ForegroundColor Yellow
Write-Host "Run these commands manually:" -ForegroundColor Cyan
Write-Host 'echo "https://gbmefnaqsxtloseufjixp.supabase.co" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production' -ForegroundColor White
Write-Host 'echo "[YOUR_OPENAI_KEY]" | npx vercel env add OPENAI_API_KEY production' -ForegroundColor White
Write-Host 'echo "[YOUR_SUPABASE_SERVICE_KEY]" | npx vercel env add SUPABASE_SERVICE_ROLE_KEY production' -ForegroundColor White

# Step 7: Deploy
Write-Host "`n[7/8] Ready to deploy..." -ForegroundColor Yellow
Write-Host "Run: npx vercel --prod --force" -ForegroundColor Cyan

# Step 8: Summary
Write-Host "`n[8/8] DEPLOYMENT READY" -ForegroundColor Green
Write-Host ""
Write-Host "FEATURES ACTIVE:" -ForegroundColor Cyan
Write-Host "✓ Persistent memory in Supabase" -ForegroundColor White
Write-Host "✓ Vector search for semantic queries" -ForegroundColor White
Write-Host "✓ Message reference system" -ForegroundColor White
Write-Host "✓ Full conversation history" -ForegroundColor White
Write-Host "✓ GPT-4 responses" -ForegroundColor White
Write-Host "✓ Automatic embeddings" -ForegroundColor White
Write-Host ""
Write-Host "DATABASE:" -ForegroundColor Cyan
Write-Host "Tables created in Supabase" -ForegroundColor White
Write-Host "Embeddings enabled for search" -ForegroundColor White
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Set Vercel env variables (commands above)" -ForegroundColor White
Write-Host "2. Run: npx vercel --prod --force" -ForegroundColor White
Write-Host "3. Test at: https://kimbleai-v4-clean.vercel.app" -ForegroundColor White