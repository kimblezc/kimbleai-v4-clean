@echo off
echo DRY RUN: Running steps up to generated files only
cd /d D:\OneDrive\Documents\kimbleai-v4-clean
echo [1] Ensure services dir...
if not exist services mkdir services
echo [2] Run FIX_VECTOR_SEARCH_COMPLETE.ps1 (generation only)
powershell -ExecutionPolicy Bypass -File FIX_VECTOR_SEARCH_COMPLETE.ps1
echo DRY RUN COMPLETE
pause
