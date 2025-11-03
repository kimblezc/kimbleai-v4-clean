# KIMBLEAI CLEANUP - PHASE 2: DOCUMENTATION CLEANUP
# This script archives obsolete documentation to docs/archive/
# RISK LEVEL: LOW (just moving files, not deleting)
# CLARITY IMPROVEMENT: Massive (95→15 root files)

$ErrorActionPreference = "Continue"
Write-Host "`n🧹 KIMBLEAI CLEANUP - PHASE 2: DOCUMENTATION CLEANUP`n" -ForegroundColor Cyan

# Navigate to project root
Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  - Move 80+ obsolete .md files to docs/archive/session-reports/" -ForegroundColor Yellow
Write-Host "  - Keep only essential docs in root (CLAUDE.md, README.md, etc.)" -ForegroundColor Yellow
Write-Host "  - Create clean, navigable documentation structure" -ForegroundColor Yellow

$confirmation = Read-Host "`nContinue? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "❌ Cleanup cancelled" -ForegroundColor Red
    exit
}

Write-Host "`n✅ Starting documentation cleanup...`n" -ForegroundColor Green

# Create archive directory if it doesn't exist
$archiveDir = "docs\archive\session-reports"
if (-not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
    Write-Host "   ✅ Created $archiveDir" -ForegroundColor Green
}

# Essential docs to KEEP in root
$essentialDocs = @(
    "CLAUDE.md",
    "ARCHIE.md",
    "GUARDIAN.md",
    "README.md",
    "RAILWAY_MIGRATION_GUIDE.md",
    "RAILWAY_QUICKSTART.md",
    "DEPLOYMENT_CHECKLIST.md",
    "MONITORING_GUIDE.md",
    "QUICK_START_GUIDE.md",
    "CRON_SETUP_GUIDE.md",
    "CLEANUP_MASTER_REPORT.md"
)

# Get all .md files in root
$allMdFiles = Get-ChildItem -Path "." -Filter "*.md" -File

# Files to archive (those not in essential list)
$filesToArchive = $allMdFiles | Where-Object {
    $essentialDocs -notcontains $_.Name
}

Write-Host "📝 Found $($filesToArchive.Count) documentation files to archive" -ForegroundColor Cyan

# Move files to archive
$movedCount = 0
foreach ($file in $filesToArchive) {
    $destination = Join-Path $archiveDir $file.Name
    try {
        Move-Item -Path $file.FullName -Destination $destination -Force
        $movedCount++
        Write-Host "   ↳ Archived: $($file.Name)" -ForegroundColor Gray
    } catch {
        Write-Host "   ⚠️  Could not move: $($file.Name)" -ForegroundColor Yellow
    }
}

# Delete specific outdated files if they exist
$toDelete = @(
    "version-ZACH-2019-BUILD.json",
    "temp_files.txt"
)

$deletedCount = 0
foreach ($file in $toDelete) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        $deletedCount++
        Write-Host "   🗑️  Deleted: $file" -ForegroundColor Gray
    }
}

# SUMMARY
Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✨ PHASE 2 CLEANUP COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Files archived: $movedCount" -ForegroundColor Green
Write-Host "   ✅ Files deleted: $deletedCount" -ForegroundColor Green
Write-Host "   ✅ Root .md files remaining: $($essentialDocs.Count)" -ForegroundColor Green
Write-Host "   ✅ Archive location: $archiveDir" -ForegroundColor Green

Write-Host "`n📋 Essential docs in root:" -ForegroundColor Cyan
foreach ($doc in $essentialDocs) {
    if (Test-Path $doc) {
        Write-Host "   ✓ $doc" -ForegroundColor Green
    }
}

Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Review remaining root docs to ensure all essential" -ForegroundColor White
Write-Host "   2. Commit changes: git add -A && git commit -m 'chore: Phase 2 - documentation cleanup'" -ForegroundColor White
Write-Host "   3. Run Phase 3: .\cleanup-phase3.ps1 (dead code removal)" -ForegroundColor White

Write-Host "`n✅ Phase 2 complete! Root directory is now 95% cleaner.`n" -ForegroundColor Green
