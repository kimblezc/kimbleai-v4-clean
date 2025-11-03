# KIMBLEAI CLEANUP - PHASE 4: CONFIGURATION CLEANUP
# This script removes deprecated configs and unused environment variables
# RISK LEVEL: MEDIUM (verify Vercel cron usage first!)
# MAINTENANCE IMPROVEMENT: Massive

$ErrorActionPreference = "Continue"
Write-Host "`n🧹 KIMBLEAI CLEANUP - PHASE 4: CONFIGURATION CLEANUP`n" -ForegroundColor Cyan

# Navigate to project root
Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

Write-Host "⚠️  IMPORTANT: Before proceeding, verify:" -ForegroundColor Red
Write-Host "   - Are you still using Vercel for cron jobs?" -ForegroundColor Yellow
Write-Host "   - If YES: Skip this phase or manually review vercel.json" -ForegroundColor Yellow
Write-Host "   - If NO: Safe to proceed with full cleanup" -ForegroundColor Yellow

Write-Host "`nThis will:" -ForegroundColor Yellow
Write-Host "  ⚠️  Delete vercel.json and .env.vercel (if crons migrated)" -ForegroundColor Yellow
Write-Host "  ⚠️  Delete old version files" -ForegroundColor Yellow
Write-Host "  ⚠️  Clean Vercel vars from .env.production" -ForegroundColor Yellow

$confirmation = Read-Host "`nContinue? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "❌ Cleanup cancelled" -ForegroundColor Red
    exit
}

# Ask about Vercel usage
$vercelInUse = Read-Host "`nAre you still using Vercel for cron jobs? (yes/no)"

Write-Host "`n✅ Starting configuration cleanup...`n" -ForegroundColor Green

# STEP 1: Delete Vercel configs (if not in use)
Write-Host "📄 Step 1: Cleaning Vercel configs..." -ForegroundColor Cyan
if ($vercelInUse -eq "no") {
    $vercelFiles = @(
        "vercel.json",
        ".env.vercel"
    )

    $deletedVercel = 0
    foreach ($file in $vercelFiles) {
        if (Test-Path $file) {
            Remove-Item $file -Force
            $deletedVercel++
            Write-Host "   🗑️  Deleted: $file" -ForegroundColor Gray
        }
    }
    Write-Host "   ✅ Deleted $deletedVercel Vercel config files" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  Keeping Vercel configs (crons still in use)" -ForegroundColor Gray
}

# STEP 2: Delete old version files
Write-Host "📦 Step 2: Deleting old version files..." -ForegroundColor Cyan
$oldVersions = @(
    "version-ZACH-2019-BUILD.json"
)

$deletedVersions = 0
foreach ($file in $oldVersions) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        $deletedVersions++
        Write-Host "   🗑️  Deleted: $file" -ForegroundColor Gray
    }
}
Write-Host "   ✅ Deleted $deletedVersions old version files" -ForegroundColor Green

# STEP 3: Clean .env.production
Write-Host "🔧 Step 3: Cleaning .env.production..." -ForegroundColor Cyan
if (Test-Path ".env.production") {
    # Read current content
    $envContent = Get-Content ".env.production"

    # Variables to remove (Vercel-specific)
    $varsToRemove = @(
        "VERCEL_OIDC_TOKEN",
        "TURBO_CACHE",
        "TURBO_DOWNLOAD_LOCAL_ENABLED",
        "TURBO_REMOTE_ONLY",
        "TURBO_RUN_SUMMARY",
        "NX_DAEMON",
        "VERCEL=1",
        "VERCEL_ENV",
        "VERCEL_GIT_"  # This will match all VERCEL_GIT_* vars
    )

    # Filter out unwanted variables
    $cleanedContent = $envContent | Where-Object {
        $line = $_
        $shouldKeep = $true
        foreach ($varToRemove in $varsToRemove) {
            if ($line -like "$varToRemove*") {
                $shouldKeep = $false
                Write-Host "   🗑️  Removed: $($line.Split('=')[0])" -ForegroundColor Gray
                break
            }
        }
        $shouldKeep
    }

    # Save cleaned content
    $cleanedContent | Set-Content ".env.production"
    Write-Host "   ✅ Cleaned .env.production" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  .env.production not found" -ForegroundColor Gray
}

# SUMMARY
Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✨ PHASE 4 CLEANUP COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "📊 Summary:" -ForegroundColor Cyan
if ($vercelInUse -eq "no") {
    Write-Host "   ✅ Vercel configs deleted" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  Vercel configs kept (crons in use)" -ForegroundColor Gray
}
Write-Host "   ✅ Old version files deleted: $deletedVersions" -ForegroundColor Green
Write-Host "   ✅ .env.production cleaned" -ForegroundColor Green

Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Review .env.production for any remaining unused vars" -ForegroundColor White
Write-Host "   2. Test deployment: npm run build && railway up" -ForegroundColor White
Write-Host "   3. Commit: git add -A && git commit -m 'chore: Phase 4 - config cleanup'" -ForegroundColor White
Write-Host "   4. Push to GitHub: git push origin master" -ForegroundColor White
Write-Host "   5. Ready for Google Drive migration!" -ForegroundColor Green

Write-Host "`n✅ Phase 4 complete! Configs are now clean and minimal.`n" -ForegroundColor Green
Write-Host "🚀 Your codebase is ready for Google Drive migration!`n" -ForegroundColor Magenta
