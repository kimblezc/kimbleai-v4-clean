# KIMBLEAI CLEANUP - PHASE 3: DEAD CODE REMOVAL
# This script removes unused components, archived code, and dead imports
# RISK LEVEL: MEDIUM (review recommendations first!)
# SPACE SAVED: ~500 KB + improved maintainability

$ErrorActionPreference = "Continue"
Write-Host "`n🧹 KIMBLEAI CLEANUP - PHASE 3: DEAD CODE REMOVAL`n" -ForegroundColor Cyan

# Navigate to project root
Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  ⚠️  Delete 15 unused agent dashboard components (440 KB)" -ForegroundColor Yellow
Write-Host "  ⚠️  Delete archived API routes (non-functional)" -ForegroundColor Yellow
Write-Host "  ⚠️  Uninstall @helicone/helicone npm package" -ForegroundColor Yellow
Write-Host "  ⚠️  Delete example files (claude-usage-examples.ts)" -ForegroundColor Yellow

Write-Host "`n⚠️  WARNING: This phase deletes code. Review before proceeding!" -ForegroundColor Red
$confirmation = Read-Host "`nContinue? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "❌ Cleanup cancelled" -ForegroundColor Red
    exit
}

Write-Host "`n✅ Starting dead code cleanup...`n" -ForegroundColor Green

# STEP 1: Delete unused agent dashboard components
Write-Host "📦 Step 1: Deleting unused agent components..." -ForegroundColor Cyan
$unusedComponents = @(
    "components\agents\AudioIntelligenceDashboard.tsx",
    "components\agents\ContinuityExample.tsx",
    "components\agents\CostAnalytics.tsx",
    "components\agents\CostMonitorConfig.tsx",
    "components\agents\CostMonitorDashboard.tsx",
    "components\agents\DeviceContinuityStatus.tsx",
    "components\agents\DriveIntelligenceDashboard.tsx",
    "components\agents\KnowledgeGraphDashboard.tsx",
    "components\agents\KnowledgeGraphViz.tsx",
    "components\agents\PredictionDashboard.tsx",
    "components\agents\ProjectContextDashboard.tsx",
    "components\agents\SecurityDashboard.tsx",
    "components\agents\WorkflowConfigInterface.tsx",
    "components\agents\WorkflowDesigner.tsx",
    "components\agents\WorkspaceOrchestratorDashboard.tsx"
)

$deletedComponents = 0
foreach ($component in $unusedComponents) {
    if (Test-Path $component) {
        Remove-Item $component -Force
        $deletedComponents++
        Write-Host "   🗑️  Deleted: $component" -ForegroundColor Gray
    }
}
Write-Host "   ✅ Deleted $deletedComponents unused components" -ForegroundColor Green

# Check if components\agents directory is now empty
if (Test-Path "components\agents") {
    $remaining = Get-ChildItem "components\agents" -File
    if ($remaining.Count -eq 0) {
        Remove-Item "components\agents" -Force
        Write-Host "   ✅ Removed empty components\agents directory" -ForegroundColor Green
    }
}

# STEP 2: Delete archived API routes
Write-Host "📁 Step 2: Deleting archived API routes..." -ForegroundColor Cyan
$archivedRoutes = @(
    "app\api\archive\archie-2.0-api-removed-2025-10-31",
    "archive\api-routes-removed-2025-10-31"
)

$deletedRoutes = 0
foreach ($route in $archivedRoutes) {
    if (Test-Path $route) {
        Remove-Item $route -Recurse -Force
        $deletedRoutes++
        Write-Host "   🗑️  Deleted: $route" -ForegroundColor Gray
    }
}
Write-Host "   ✅ Deleted $deletedRoutes archived route directories" -ForegroundColor Green

# STEP 3: Delete example files
Write-Host "📝 Step 3: Deleting example files..." -ForegroundColor Cyan
$exampleFiles = @(
    "examples\claude-usage-examples.ts"
)

$deletedExamples = 0
foreach ($file in $exampleFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        $deletedExamples++
        Write-Host "   🗑️  Deleted: $file" -ForegroundColor Gray
    }
}
Write-Host "   ✅ Deleted $deletedExamples example files" -ForegroundColor Green

# STEP 4: Uninstall unused npm dependency
Write-Host "📦 Step 4: Uninstalling unused npm packages..." -ForegroundColor Cyan
$output = npm uninstall @helicone/helicone 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Uninstalled @helicone/helicone" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  @helicone/helicone may not be installed" -ForegroundColor Yellow
}

# SUMMARY
Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✨ PHASE 3 CLEANUP COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Unused components deleted: $deletedComponents" -ForegroundColor Green
Write-Host "   ✅ Archived routes deleted: $deletedRoutes" -ForegroundColor Green
Write-Host "   ✅ Example files deleted: $deletedExamples" -ForegroundColor Green
Write-Host "   ✅ NPM packages uninstalled: 1" -ForegroundColor Green
Write-Host "`n   💾 SPACE SAVED: ~500 KB`n" -ForegroundColor Magenta

Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Run: npm run build (verify no import errors)" -ForegroundColor White
Write-Host "   2. Test app: npm run dev (ensure nothing broke)" -ForegroundColor White
Write-Host "   3. Commit: git add -A && git commit -m 'chore: Phase 3 - dead code removal'" -ForegroundColor White
Write-Host "   4. Run Phase 4: .\cleanup-phase4.ps1 (config cleanup)" -ForegroundColor White

Write-Host "`n✅ Phase 3 complete! Dead code removed.`n" -ForegroundColor Green
