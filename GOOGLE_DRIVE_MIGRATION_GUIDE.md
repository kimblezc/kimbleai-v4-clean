# 🚚 KIMBLEAI: ONEDRIVE → GOOGLE DRIVE MIGRATION GUIDE

**Date**: 2025-11-03
**Current Location**: D:\OneDrive\Documents\kimbleai-v4-clean
**Target Location**: C:\GoogleDrive\Projects\kimbleai-v4-clean
**Estimated Time**: 30-45 minutes

---

## 📋 PRE-MIGRATION CHECKLIST

### ✅ 1. Complete Cleanup (REQUIRED)
Run all 4 cleanup phases to reduce migration size by 96%:

```powershell
# Phase 1: Safe deletions (2,220 MB saved)
.\cleanup-phase1.ps1

# Phase 2: Documentation (5 MB + massive clarity)
.\cleanup-phase2.ps1

# Phase 3: Dead code (500 KB)
.\cleanup-phase3.ps1

# Phase 4: Configs (verify Vercel usage first!)
.\cleanup-phase4.ps1
```

**Result**: ~3,300 MB → ~150 MB (94% reduction!)

### ✅ 2. Commit & Push to GitHub
```bash
# Commit all cleanup changes
git add -A
git commit -m "chore: Pre-migration cleanup - 96% size reduction"

# Push to remote (CRITICAL - this is your backup!)
git push origin master

# Verify push succeeded
git log -1
```

### ✅ 3. Verify Everything Works
```bash
# Restore dependencies
npm install

# Build project
npm run build

# Test locally
npm run dev
# Visit http://localhost:3000

# Verify Railway connection
railway status
```

### ✅ 4. Create Backup (Optional - Paranoid Mode)
```powershell
# Create compressed backup
cd D:\OneDrive\Documents
Compress-Archive -Path "kimbleai-v4-clean" -DestinationPath "kimbleai-backup-2025-11-03.zip"

# Verify backup
Get-Item "kimbleai-backup-2025-11-03.zip" | Select-Object Name, Length
```

---

## 📦 STEP 1: INSTALL GOOGLE DRIVE DESKTOP

### Download & Install:
1. Visit: https://www.google.com/drive/download/
2. Download "Google Drive for Desktop"
3. Run installer (GoogleDriveSetup.exe)
4. Sign in with your Google account (the one kimbleai.com uses)

### Configure Sync:
1. **Sync Location**: Choose `C:\GoogleDrive\` (or your preference)
2. **Sync Mode**: "Stream files" (saves local disk space)
   - Alternative: "Mirror files" (full local copy, uses more space)
3. **Bandwidth**: Unlimited (for faster sync)
4. **Wait for initial sync**: Let Google Drive finish indexing

---

## 📁 STEP 2: PREPARE TARGET DIRECTORY

```powershell
# Create Projects folder in Google Drive
New-Item -ItemType Directory -Path "C:\GoogleDrive\Projects" -Force

# Create kimbleai directory
New-Item -ItemType Directory -Path "C:\GoogleDrive\Projects\kimbleai-v4-clean" -Force

# Verify structure
Get-ChildItem "C:\GoogleDrive\Projects"
```

---

## 🚚 STEP 3: MIGRATE FILES

### Option A: PowerShell Script (RECOMMENDED)

Save as `migrate-to-google-drive.ps1`:

```powershell
# KIMBLEAI MIGRATION TO GOOGLE DRIVE
$source = "D:\OneDrive\Documents\kimbleai-v4-clean"
$destination = "C:\GoogleDrive\Projects\kimbleai-v4-clean"

Write-Host "🚚 Starting migration..." -ForegroundColor Cyan
Write-Host "   Source: $source" -ForegroundColor Gray
Write-Host "   Destination: $destination" -ForegroundColor Gray

# Copy .git directory first (preserves history)
Write-Host "`n📦 Step 1: Copying .git directory..." -ForegroundColor Cyan
robocopy "$source\.git" "$destination\.git" /E /Z /MT:8 /R:3 /W:5 /NFL /NDL
Write-Host "   ✅ Git history copied" -ForegroundColor Green

# Copy all files except build artifacts
Write-Host "`n📦 Step 2: Copying source files..." -ForegroundColor Cyan
robocopy $source $destination /E /Z /MT:8 /R:3 /W:5 `
    /XD node_modules .next .git `
    /XF *.log *.tsbuildinfo

Write-Host "`n✅ Migration complete!" -ForegroundColor Green
Write-Host "📊 Files copied to: $destination" -ForegroundColor Cyan
```

Run it:
```powershell
.\migrate-to-google-drive.ps1
```

### Option B: Manual Copy (SLOWER)

1. Open File Explorer
2. Navigate to: `D:\OneDrive\Documents\kimbleai-v4-clean`
3. Select all files **EXCEPT**:
   - `node_modules/`
   - `.next/`
   - `*.log` files
4. Copy (Ctrl+C)
5. Navigate to: `C:\GoogleDrive\Projects\kimbleai-v4-clean`
6. Paste (Ctrl+V)
7. Wait for copy to complete (~5-10 minutes for 150 MB)

---

## 🔧 STEP 4: VERIFY NEW LOCATION

```powershell
# Navigate to new location
cd "C:\GoogleDrive\Projects\kimbleai-v4-clean"

# Verify git is intact
git status
git log -1

# Verify all essential files present
Get-ChildItem -Path "." -Recurse -Depth 1 | Select-Object Name

# Check file count
(Get-ChildItem -Recurse -File | Measure-Object).Count
# Should be ~1,500 files (without node_modules)
```

---

## 📦 STEP 5: RESTORE DEPENDENCIES

```bash
# Install dependencies
npm install
# Wait ~2-3 minutes

# Verify installation
npm list --depth=0

# Build project
npm run build
# Should complete without errors
```

---

## 🧪 STEP 6: TEST EVERYTHING

### Local Development:
```bash
# Start dev server
npm run dev

# Open browser
start http://localhost:3000
```

**Verify**:
- ✅ Homepage loads
- ✅ Login works
- ✅ Chat functionality works
- ✅ Projects load
- ✅ No console errors

### Railway Connection:
```bash
# Verify Railway CLI still connected
railway status

# Test deployment (optional)
railway up --detach
```

### Git Operations:
```bash
# Make a test commit
echo "# Migration test" >> TEST.md
git add TEST.md
git commit -m "test: Verify git works from Google Drive"

# Push to remote
git push origin master

# Delete test file
git rm TEST.md
git commit -m "test: Clean up migration test"
git push origin master
```

---

## 🗑️ STEP 7: CLEANUP OLD LOCATION

**⚠️ ONLY after confirming everything works in Google Drive!**

### Safety Check:
```powershell
# Verify new location works
cd "C:\GoogleDrive\Projects\kimbleai-v4-clean"
npm run build
git status

# If all good, proceed with cleanup
```

### Delete OneDrive Copy:
```powershell
# FINAL WARNING: This deletes the old location!
# Make sure Google Drive copy is fully functional first!

$oldLocation = "D:\OneDrive\Documents\kimbleai-v4-clean"

# Remove old directory
Remove-Item -Path $oldLocation -Recurse -Force

Write-Host "✅ Old OneDrive location deleted" -ForegroundColor Green
```

---

## ⚙️ STEP 8: UPDATE DEVELOPMENT ENVIRONMENT

### VS Code Workspace:
1. Open VS Code
2. File → Open Folder
3. Select: `C:\GoogleDrive\Projects\kimbleai-v4-clean`
4. Save as Workspace: `kimbleai.code-workspace`

### Update Shortcuts:
```powershell
# Update PowerShell profile (optional)
notepad $PROFILE

# Add alias:
function kimble { Set-Location "C:\GoogleDrive\Projects\kimbleai-v4-clean" }

# Save and reload
. $PROFILE
```

### Update Scripts:
Any scripts with hardcoded paths need updating:
```bash
# Search for old path
grep -r "D:\\OneDrive\\Documents\\kimbleai-v4-clean" .

# Replace with new path
# (Do manually or with find-replace tool)
```

---

## 🔒 STEP 9: CONFIGURE GOOGLE DRIVE EXCLUSIONS

To prevent sync lag on large files:

1. Right-click Google Drive icon in system tray
2. Settings → Preferences
3. Google Drive → Advanced Settings

**Exclude from Sync**:
```
kimbleai-v4-clean/node_modules
kimbleai-v4-clean/.next
kimbleai-v4-clean/.git/objects
```

**Or use Selective Sync**:
- Only sync source code folders
- Exclude build artifacts

---

## 📊 POST-MIGRATION CHECKLIST

### Verify File Integrity:
```bash
# Compare file count
# Old location (if still exists): ~1,500 files
# New location: Should match

# Verify git history
git log --oneline | wc -l
# Should match old repo

# Verify latest commit
git log -1
# Should match GitHub
```

### Verify Functionality:
- [x] npm install works
- [x] npm run build works
- [x] npm run dev works
- [x] git push/pull works
- [x] Railway CLI works
- [x] VS Code recognizes project
- [x] All extensions work
- [x] Debugging works

### Update Documentation:
1. Update CLAUDE.md with new path (if mentioned)
2. Update any READMEs with setup instructions
3. Update Railway env vars if they reference file paths

---

## 🚨 TROUBLESHOOTING

### Problem: "Git detects changes after migration"
```bash
# Likely line ending differences
git config core.autocrlf true

# Reset to clean state
git reset --hard HEAD
```

### Problem: "npm install fails"
```bash
# Clear npm cache
npm cache clean --force

# Delete package-lock.json and try again
rm package-lock.json
npm install
```

### Problem: "Railway CLI can't find project"
```bash
# Relink project
railway link

# Or login again
railway logout
railway login
railway link
```

### Problem: "Google Drive sync is slow"
```bash
# Pause and resume sync
# Right-click Google Drive icon → Pause → Resume

# Or exclude large folders temporarily
# Settings → Preferences → Selective Sync
```

### Problem: "Files not appearing in Google Drive web"
- **Cause**: Using "Stream files" mode keeps files local-only
- **Solution**: Switch to "Mirror files" in Google Drive settings
- **Or**: Right-click files → "Make available offline"

---

## ✅ SUCCESS CRITERIA

Migration is successful when:
1. ✅ `npm run build` completes without errors
2. ✅ `npm run dev` starts and app loads
3. ✅ `git status` shows clean working tree
4. ✅ `git push origin master` works
5. ✅ `railway status` shows correct project
6. ✅ All tests pass (if you have tests)
7. ✅ No OneDrive sync conflicts appearing
8. ✅ Google Drive is syncing correctly

---

## 📈 BENEFITS AFTER MIGRATION

### Before (OneDrive):
- ❌ Sync conflicts (DESKTOP-UN6T850 files)
- ❌ Slow sync with large repos
- ❌ Build failures from file locking
- ❌ 3,300 MB bloated directory
- ❌ Confusing documentation structure

### After (Google Drive):
- ✅ No more sync conflicts
- ✅ Faster sync (better with git repos)
- ✅ Clean 150 MB directory
- ✅ Organized documentation
- ✅ Native integration with Google-centric project
- ✅ Better for development workflow

---

## 🎯 TIMELINE

| Step | Time | Cumulative |
|------|------|------------|
| Pre-flight cleanup | 10 min | 10 min |
| Install Google Drive | 5 min | 15 min |
| File migration | 5 min | 20 min |
| Restore dependencies | 3 min | 23 min |
| Testing & verification | 10 min | 33 min |
| Cleanup old location | 2 min | 35 min |
| Update environment | 5 min | 40 min |
| **TOTAL** | | **40 min** |

---

## 📞 SUPPORT

### If Migration Fails:
1. **DON'T PANIC** - Your code is safe on GitHub
2. Git clone fresh copy: `git clone https://github.com/kimblezc/kimbleai-v4-clean.git`
3. Run setup: `npm install && npm run build`
4. Compare with migrated copy to find issue

### Backup Recovery:
```powershell
# If you created backup in Step 4
Expand-Archive -Path "D:\OneDrive\Documents\kimbleai-backup-2025-11-03.zip" -DestinationPath "C:\Recovery\"
```

---

**Ready to migrate?** Run the cleanup scripts first, then follow this guide step by step.

**Questions?** Check CLAUDE.md or GitHub issues.

**Good luck! 🚀**
