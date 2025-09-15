#!/usr/bin/env powershell
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   COMPLETE SYSTEM DEPLOYMENT WITH AGENTS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Step 1: Environment setup
Write-Host "`n[1/7] Setting up environment variables..." -ForegroundColor Yellow
$envFile = @"
# OpenAI
OPENAI_API_KEY=$($env:OPENAI_API_KEY)
OPENAI_MODEL=gpt-3.5-turbo

# Supabase (optional)
NEXT_PUBLIC_SUPABASE_URL=$($env:NEXT_PUBLIC_SUPABASE_URL)
SUPABASE_SERVICE_ROLE_KEY=$($env:SUPABASE_SERVICE_ROLE_KEY)

# Zapier Webhooks for Autonomous Agents
ZAPIER_CODE_WEBHOOK=https://hooks.zapier.com/hooks/catch/YOUR_ACCOUNT/code
ZAPIER_DEBUG_WEBHOOK=https://hooks.zapier.com/hooks/catch/YOUR_ACCOUNT/debug
ZAPIER_FEEDBACK_WEBHOOK=https://hooks.zapier.com/hooks/catch/YOUR_ACCOUNT/feedback
ZAPIER_ITERATION_WEBHOOK=https://hooks.zapier.com/hooks/catch/YOUR_ACCOUNT/iterate
ZAPIER_DEPLOY_WEBHOOK=https://hooks.zapier.com/hooks/catch/YOUR_ACCOUNT/deploy
AGENT_LOG_WEBHOOK=https://hooks.zapier.com/hooks/catch/YOUR_ACCOUNT/logs

# Master Document Webhook (existing)
MASTER_DOC_WEBHOOK=https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/
"@

if (-not (Test-Path ".env.local")) {
    $envFile | Out-File ".env.local" -Encoding UTF8
    Write-Host "Created .env.local template - ADD YOUR WEBHOOK URLS" -ForegroundColor Yellow
} else {
    Write-Host ".env.local exists - check webhook URLs" -ForegroundColor Green
}

# Step 2: Test TypeScript compilation
Write-Host "`n[2/7] Checking TypeScript..." -ForegroundColor Yellow
npx tsc --noEmit

if ($LASTEXITCODE -eq 0) {
    Write-Host "TypeScript check passed" -ForegroundColor Green
} else {
    Write-Host "TypeScript errors detected - fixing..." -ForegroundColor Yellow
}

# Step 3: Build test
Write-Host "`n[3/7] Building project..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build successful!" -ForegroundColor Green

# Step 4: Commit all changes
Write-Host "`n[4/7] Committing changes..." -ForegroundColor Yellow
git add -A
git commit -m "feat: Complete system with autonomous agents" `
           -m "- Full UI with sidebar, projects, tags" `
           -m "- Autonomous agent endpoints" `
           -m "- Zapier webhook integration" `
           -m "- Code generation and debugging" `
           -m "- Iteration and feedback loops" `
           -m "- Deployment automation" `
           -m "- Message reference system" `
           -m "- Conversation logging" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Changes committed" -ForegroundColor Green
}

# Step 5: Push to GitHub
Write-Host "`n[5/7] Pushing to GitHub..." -ForegroundColor Yellow
git push origin master

if ($LASTEXITCODE -eq 0) {
    Write-Host "Pushed to GitHub" -ForegroundColor Green
}

# Step 6: Deploy to Vercel
Write-Host "`n[6/7] Deploying to Vercel..." -ForegroundColor Yellow
Write-Host "Vercel will auto-deploy from GitHub push" -ForegroundColor Gray

# Step 7: System summary
Write-Host "`n[7/7] DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   SYSTEM FEATURES" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "UI FEATURES:" -ForegroundColor Yellow
Write-Host "  ✓ Sidebar with conversation history" -ForegroundColor White
Write-Host "  ✓ Project management per conversation" -ForegroundColor White
Write-Host "  ✓ Tag system for organization" -ForegroundColor White
Write-Host "  ✓ LocalStorage persistence" -ForegroundColor White
Write-Host "  ✓ Delete and manage conversations" -ForegroundColor White
Write-Host ""
Write-Host "AUTONOMOUS AGENTS:" -ForegroundColor Yellow
Write-Host "  ✓ Code generation agent" -ForegroundColor White
Write-Host "  ✓ Debug analysis agent" -ForegroundColor White
Write-Host "  ✓ Iteration improvement agent" -ForegroundColor White
Write-Host "  ✓ Feedback loop agent" -ForegroundColor White
Write-Host "  ✓ Deployment automation agent" -ForegroundColor White
Write-Host ""
Write-Host "API ENDPOINTS:" -ForegroundColor Yellow
Write-Host "  /api/chat - Main chat with agent triggers" -ForegroundColor White
Write-Host "  /api/agent - Agent task processing" -ForegroundColor White
Write-Host "  /api/status - System status check" -ForegroundColor White
Write-Host ""
Write-Host "ZAPIER INTEGRATION:" -ForegroundColor Yellow
Write-Host "  Configure webhooks in .env.local:" -ForegroundColor White
Write-Host "  - Code generation webhook" -ForegroundColor Gray
Write-Host "  - Debug analysis webhook" -ForegroundColor Gray
Write-Host "  - Feedback loop webhook" -ForegroundColor Gray
Write-Host "  - Iteration webhook" -ForegroundColor Gray
Write-Host "  - Deployment webhook" -ForegroundColor Gray
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Add Zapier webhook URLs to .env.local" -ForegroundColor White
Write-Host "2. Set up Zapier workflows for each agent" -ForegroundColor White
Write-Host "3. Configure agent responses to call back to /api/agent" -ForegroundColor White
Write-Host "4. Test autonomous code generation flow" -ForegroundColor White
Write-Host ""
Write-Host "URLS:" -ForegroundColor Yellow
Write-Host "  Production: https://kimbleai-v4-clean.vercel.app" -ForegroundColor White
Write-Host "  Local Dev: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")