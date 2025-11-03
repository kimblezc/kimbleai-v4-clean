# 📍 DEVELOPMENT LOCATION & WORKFLOW

**Added**: 2025-11-03  
**Reason**: OneDrive and Google Drive cannot handle npm install (50K+ files cause EPERM/EBADF errors)

---

## Development Location

**PRIMARY:** `C:\Dev\Projects\kimbleai-v4-clean`

**DO NOT use:**
- ❌ OneDrive (file locking, sync conflicts)
- ❌ Google Drive (EPERM errors on npm install)  
- ❌ Any cloud-synced folder

**WHY:**
- npm install works perfectly on local C:\ drive
- Builds complete in minutes (not hours)
- No DESKTOP-UN6T850 sync conflicts
- Professional standard

---

## Multi-Device Workflow

### Three Simple Scripts:
1. **work-start.bat** - Start work (pulls from GitHub)
2. **work-done.bat** - End work (pushes to GitHub)
3. **quick-save.bat** - Emergency save

### Usage:
```
Start work:  Double-click work-start.bat
End work:    Double-click work-done.bat
Emergency:   Double-click quick-save.bat
```

### Device Switching:
```
PC → Laptop: work-done.bat (PC) → work-start.bat (Laptop) = 25 seconds
```

**Full Guide:** See `WORKFLOW.md`

---

## Integration with CLAUDE.md

This workflow is now the **mandatory default** for kimbleai development.

All development MUST happen in `C:\Dev\Projects\kimbleai-v4-clean`.

