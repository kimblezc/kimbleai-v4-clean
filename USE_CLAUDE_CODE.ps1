# FIX PROJECTS AND TAGS WITH CLAUDE CODE

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "USING CLAUDE CODE TO FIX PROJECTS" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Test if Claude is authenticated
Write-Host "Testing Claude authentication..." -ForegroundColor Yellow
$testAuth = npx claude --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Claude is installed: $testAuth" -ForegroundColor Green
} else {
    Write-Host "Need to authenticate first. Run: claude setup-token" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "OPTION 1: Fix Projects/Tags Organization (Interactive)" -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Gray
Write-Host "Run this command:" -ForegroundColor Cyan
Write-Host ""
Write-Host 'npx claude "In the kimbleai-v4-clean project, update the UI to show conversations grouped by project in the left sidebar. Each project should be collapsible, show conversation count, and display tags. The current ProjectSidebar component exists but needs to be integrated into app/page.tsx"' -ForegroundColor White
Write-Host ""

Write-Host "OPTION 2: Add Google Integration (Non-Interactive)" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Gray
Write-Host "Run this command:" -ForegroundColor Cyan
Write-Host ""
Write-Host 'npx claude --print "Create complete Google OAuth integration for the Next.js app in kimbleai-v4-clean. Add NextAuth configuration, Google Drive search API, and Gmail search API. The environment variables for Google are already set."' -ForegroundColor White
Write-Host ""

Write-Host "OPTION 3: Fix PDF Support (Direct)" -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Gray
Write-Host "Run this command:" -ForegroundColor Cyan
Write-Host ""
Write-Host 'npx claude --print "In kimbleai-v4-clean/app/api/upload/route.ts, replace the pdf-parse library with pdfjs-dist and implement PDF text extraction that works with Next.js build process"' -ForegroundColor White
Write-Host ""

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "ACCOMPLISHING YOUR PROJECT GOALS" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "YOUR ORIGINAL GOALS:" -ForegroundColor Yellow
Write-Host "1. ✅ Cross-platform chat AI (PC/Mac/Android/iPhone) - DONE via web" -ForegroundColor Green
Write-Host "2. ✅ 2 users (Zach & Rebecca) - WORKING" -ForegroundColor Green
Write-Host "3. ✅ Reference anything from past - MEMORY WORKING" -ForegroundColor Green
Write-Host "4. ✅ Local files - UPLOAD WORKING" -ForegroundColor Green
Write-Host "5. ❌ Google Drive integration - NOT DONE" -ForegroundColor Red
Write-Host "6. ❌ Gmail integration - NOT DONE" -ForegroundColor Red
Write-Host "7. ⚠️  Projects/Tags organization - NEEDS UI FIX" -ForegroundColor Yellow
Write-Host ""

Write-Host "TO COMPLETE YOUR PROJECT (in order):" -ForegroundColor Cyan
Write-Host ""
Write-Host "STEP 1: Fix Project Organization (5 minutes)" -ForegroundColor White
Write-Host "STEP 2: Add Google OAuth (30 minutes with Claude)" -ForegroundColor White
Write-Host "STEP 3: Test Everything (10 minutes)" -ForegroundColor White
Write-Host "STEP 4: You're DONE!" -ForegroundColor Green