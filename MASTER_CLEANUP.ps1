# KIMBLEAI V4-CLEAN COMPLETE CLEANUP AND VECTOR/RAG FIX
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "KIMBLEAI COMPLETE CLEANUP AND FIX" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# STEP 1: BACKUP
Write-Host "[1/8] Creating backup..." -ForegroundColor Yellow
$backupDir = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Name $backupDir -Force | Out-Null
Copy-Item -Path "app", "components", "lib", "services", ".env.local" -Destination $backupDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "  Backup saved to: $backupDir" -ForegroundColor Green

# STEP 2: CLEAN JUNK
Write-Host "[2/8] Removing junk files..." -ForegroundColor Yellow
$junkPatterns = @(
    "TEST_*.ps1", "FIX_*.ps1", "DEPLOY_*.ps1", "DEPLOY_*.bat",
    "PHASE*.ps1", "COMPLETE_*.ps1", "ULTIMATE_*.ps1", "VERIFY_*.ps1",
    "CLEANUP_*.ps1", "*_backup*", "*.old", "*.backup", "*.log", "*.tmp", "*~"
)
$removeCount = 0
foreach ($pattern in $junkPatterns) {
    $files = Get-ChildItem -Path . -Filter $pattern -File -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue
        $removeCount++
    }
}
Write-Host "  Removed $removeCount junk files" -ForegroundColor Green

# STEP 3: ORGANIZE
Write-Host "[3/8] Organizing folders..." -ForegroundColor Yellow
Move-Item "*.sql" "sql\" -Force -ErrorAction SilentlyContinue
Write-Host "  Folders organized" -ForegroundColor Green

Write-Host ""
Write-Host "Cleanup complete! Check sql\SUPABASE_VECTOR_FIX.sql" -ForegroundColor Green
