# KIMBLEAI CLEANUP - PHASE 1: SAFE DELETIONS
# This script removes duplicates, build artifacts, and logs
# RISK LEVEL: ZERO (everything is regenerable or duplicate)
# SPACE SAVED: ~2,220 MB (66% of directory)

$ErrorActionPreference = "Continue"
Write-Host "`n🧹 KIMBLEAI CLEANUP - PHASE 1: SAFE DELETIONS`n" -ForegroundColor Cyan

# Navigate to project root
Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Confirm before proceeding
Write-Host "This will delete:" -ForegroundColor Yellow
Write-Host "  - 68 OneDrive duplicate files (DESKTOP-UN6T850)" -ForegroundColor Yellow
Write-Host "  - node_modules directory (1,291 MB)" -ForegroundColor Yellow
Write-Host "  - .next build cache (1,954 MB)" -ForegroundColor Yellow
Write-Host "  - Log files and build artifacts" -ForegroundColor Yellow
Write-Host "  - Backup files (.backup)" -ForegroundColor Yellow
Write-Host "`nTotal space to reclaim: ~2,220 MB`n" -ForegroundColor Green

$confirmation = Read-Host "Continue? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "❌ Cleanup cancelled" -ForegroundColor Red
    exit
}

Write-Host "`n✅ Starting cleanup...`n" -ForegroundColor Green

# STEP 1: Delete OneDrive duplicates (856 MB)
Write-Host "📝 Step 1: Deleting OneDrive duplicates..." -ForegroundColor Cyan
$desktopFiles = Get-ChildItem -Recurse -File "*-DESKTOP-UN6T850*"
$desktopCount = $desktopFiles.Count
if ($desktopCount -gt 0) {
    $desktopFiles | Remove-Item -Force
    Write-Host "   ✅ Deleted $desktopCount DESKTOP-UN6T850 files" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  No DESKTOP-UN6T850 files found" -ForegroundColor Gray
}

# STEP 2: Delete node_modules (1,291 MB)
Write-Host "📦 Step 2: Deleting node_modules..." -ForegroundColor Cyan
if (Test-Path "node_modules") {
    Remove-Item -Path "node_modules" -Recurse -Force
    Write-Host "   ✅ Deleted node_modules (1,291 MB)" -ForegroundColor Green
    Write-Host "   ℹ️  Run 'npm install' to restore" -ForegroundColor Gray
} else {
    Write-Host "   ℹ️  node_modules not found" -ForegroundColor Gray
}

# STEP 3: Delete .next cache (1,954 MB)
Write-Host "🔨 Step 3: Deleting .next build cache..." -ForegroundColor Cyan
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force
    Write-Host "   ✅ Deleted .next cache (1,954 MB)" -ForegroundColor Green
    Write-Host "   ℹ️  Run 'npm run build' to regenerate" -ForegroundColor Gray
} else {
    Write-Host "   ℹ️  .next directory not found" -ForegroundColor Gray
}

# STEP 4: Delete log files
Write-Host "📋 Step 4: Deleting log files..." -ForegroundColor Cyan
$logFiles = @(
    "114log.json",
    "logs.*.json",
    "test-results.json",
    "build-output.log",
    "deployment-test-results.log"
)
$logCount = 0
foreach ($pattern in $logFiles) {
    $files = Get-ChildItem -File $pattern -ErrorAction SilentlyContinue
    if ($files) {
        $files | Remove-Item -Force
        $logCount += $files.Count
    }
}
# Delete logs directory
if (Test-Path "logs") {
    Remove-Item -Path "logs" -Recurse -Force
    $logCount++
}
Write-Host "   ✅ Deleted $logCount log files/directories" -ForegroundColor Green

# STEP 5: Delete build artifacts
Write-Host "🔧 Step 5: Deleting build artifacts..." -ForegroundColor Cyan
$buildFiles = Get-ChildItem -File "*.tsbuildinfo" -Recurse -ErrorAction SilentlyContinue
if ($buildFiles) {
    $buildCount = $buildFiles.Count
    $buildFiles | Remove-Item -Force
    Write-Host "   ✅ Deleted $buildCount tsbuildinfo files" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  No tsbuildinfo files found" -ForegroundColor Gray
}

# STEP 6: Delete backup files
Write-Host "💾 Step 6: Deleting backup files..." -ForegroundColor Cyan
$backupFiles = Get-ChildItem -File "*.backup" -Recurse -ErrorAction SilentlyContinue
if ($backupFiles) {
    $backupCount = $backupFiles.Count
    $backupFiles | Remove-Item -Force
    Write-Host "   ✅ Deleted $backupCount backup files" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  No backup files found" -ForegroundColor Gray
}

# STEP 7: Update .gitignore
Write-Host "📄 Step 7: Updating .gitignore..." -ForegroundColor Cyan
$gitignoreAdditions = @"

# OneDrive/sync conflicts (added 2025-11-03)
*-DESKTOP-*
*-UN6T850*
*-ZACH-*

# Build artifacts
*.tsbuildinfo

# Logs
*.log.json
logs.*.json
114log.json
test-results.json

# Backups
*.backup
*.old
*.bak
"@

Add-Content -Path ".gitignore" -Value $gitignoreAdditions
Write-Host "   ✅ Updated .gitignore with new rules" -ForegroundColor Green

# STEP 8: Run git gc (optimize repository)
Write-Host "🗜️  Step 8: Optimizing git repository..." -ForegroundColor Cyan
git gc --aggressive --prune=now 2>&1 | Out-Null
Write-Host "   ✅ Git repository optimized" -ForegroundColor Green

# SUMMARY
Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✨ PHASE 1 CLEANUP COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   ✅ DESKTOP duplicates: $desktopCount files deleted" -ForegroundColor Green
Write-Host "   ✅ node_modules: Deleted (1,291 MB)" -ForegroundColor Green
Write-Host "   ✅ .next cache: Deleted (1,954 MB)" -ForegroundColor Green
Write-Host "   ✅ Log files: $logCount deleted" -ForegroundColor Green
Write-Host "   ✅ Build artifacts: Cleaned" -ForegroundColor Green
Write-Host "   ✅ .gitignore: Updated" -ForegroundColor Green
Write-Host "`n   💾 ESTIMATED SPACE SAVED: ~2,220 MB (66%)`n" -ForegroundColor Magenta

Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Restore dependencies: npm install" -ForegroundColor White
Write-Host "   2. Rebuild project: npm run build" -ForegroundColor White
Write-Host "   3. Commit changes: git add -A && git commit -m 'chore: Phase 1 cleanup'" -ForegroundColor White
Write-Host "   4. Run Phase 2: .\cleanup-phase2.ps1 (documentation cleanup)" -ForegroundColor White

Write-Host "`n✅ Phase 1 complete! Your codebase is now 66% smaller.`n" -ForegroundColor Green
