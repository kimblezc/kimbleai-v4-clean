# MCP Connection Fix - Handoff Document
**Date:** October 30, 2025
**Session:** Desktop → Laptop Transition
**Status:** Deployment in Progress

---

## 🎯 ORIGINAL PROBLEM

**User Report:** Continuous popup errors when trying to connect to MCP servers at https://www.kimbleai.com/integrations/mcp

**Error Message:**
```
Failed to connect to filesystem: MCP error -32000: Connection closed
Code: CONNECTION_ERROR
Failed to load resource: the server responded with a status of 500 ()
```

---

## 🔍 ROOT CAUSE ANALYSIS

### Issue #1: Wrong Deployment Platform
- **Problem:** User was being redirected to `www.kimbleai.com` (Vercel)
- **Why this matters:** Vercel's serverless environment **cannot support MCP stdio transport** (child processes)
- **Solution:** Migrated to Railway, which supports persistent Node.js processes

### Issue #2: DNS Still Points to Vercel
- **Finding:** `www.kimbleai.com` DNS records still point to Vercel deployment
- **Confirmed via:**
  ```bash
  curl -sI https://www.kimbleai.com/api/health
  # Returns: Server: Vercel

  curl -sI https://kimbleai-production-efed.up.railway.app/api/health
  # Returns: Server: railway-edge
  ```

### Issue #3: Authentication Redirects to Wrong URL
- **Problem:** `NEXTAUTH_URL` was set to `https://www.kimbleai.com` (Vercel)
- **Result:** After sign-in, users were redirected back to Vercel instead of Railway

### Issue #4: Annoying Alert Popups
- **Problem:** MCP components used browser `alert()` for errors
- **Impact:** Blocking popups that interrupt user workflow

### Issue #5: Missing Directory Path
- **Problem:** Filesystem server in database missing required `/tmp` directory argument
- **Fixed:** Called `/api/mcp/fix-args` endpoint to update database

---

## ✅ FIXES COMPLETED

### 1. Removed Alert Popups ✅
**Commit:** aa6a1e4
**Version:** v6.1.3
**Changes:**
- Replaced all `alert()` calls with `react-hot-toast` notifications
- Files modified:
  - `components/mcp/ServerCard.tsx`
  - `components/mcp/ServerInstaller.tsx`
  - `app/api/mcp/servers/[id]/connect/route.ts`

### 2. Added Enhanced MCP Logging ✅
**Commit:** d34f2f0 (fixed in 72c26ab)
**Changes:**
- Added detailed stdio transport logging
- Captures stderr output from MCP server processes
- Logs process exit codes and signals
- Logs command, args, and working directory
- **Note:** Had syntax error (misplaced parentheses), fixed in next commit

### 3. Fixed Filesystem Server Configuration ✅
**Method:** API call to `/api/mcp/fix-args`
**Result:**
```json
{
  "name": "filesystem",
  "command": "npx",
  "args": ["@modelcontextprotocol/server-filesystem", "/tmp"],
  "enabled": true
}
```

### 4. Updated NEXTAUTH_URL ✅
**Command:** `railway variables --set "NEXTAUTH_URL=https://kimbleai-production-efed.up.railway.app"`
**Before:** `https://www.kimbleai.com` (Vercel)
**After:** `https://kimbleai-production-efed.up.railway.app` (Railway)

### 5. Fixed Syntax Error ✅
**Commit:** 72c26ab
**Problem:** Misplaced parentheses in type assertions
**Fixed:**
```typescript
// WRONG:
if (transport as any).stderr) {

// CORRECT:
if ((transport as any).stderr) {
```

---

## 🚀 CURRENT DEPLOYMENT STATUS

**Latest Commit:** 72c26ab
**Version:** v6.1.4 (pending)
**Railway Deployment:** IN PROGRESS
**Build Logs:** https://railway.com/project/f0e9b8ac-8bea-4201-87c5-598979709394/service/194fb05e-f9fe-4f9f-a023-3b49adf4bc66?id=15811c4b-3ace-41ad-8a7b-8fb47caab67d

**ETA:** ~3-5 minutes from deployment trigger (started at 05:59 UTC)

---

## 📋 NEXT STEPS (FOR LAPTOP)

### Step 1: Wait for Deployment to Complete
```bash
# Check deployment status
railway status

# Monitor logs
railway logs --lines 50
```

**Expected:** Build should complete successfully now that syntax error is fixed.

### Step 2: Verify Application is Running
```bash
curl https://kimbleai-production-efed.up.railway.app/api/health
```

**Expected:** HTTP 200 OK with Railway server header

### Step 3: Test Authentication Flow
1. Open browser to: https://kimbleai-production-efed.up.railway.app
2. Sign in with Google
3. **Verify:** After sign-in, URL stays at `kimbleai-production-efed.up.railway.app`
4. **Should NOT redirect to:** `www.kimbleai.com`

### Step 4: Test MCP Connection
1. Navigate to: https://kimbleai-production-efed.up.railway.app/integrations/mcp
2. Click "Connect" on the Filesystem server
3. **Expected:**
   - ✅ Toast notification appears (not alert popup)
   - ✅ Detailed logs appear in Railway logs
   - ✅ Connection succeeds or shows specific error

### Step 5: Check Railway Logs for MCP Details
```bash
railway logs --lines 100 | grep -i "MCP-CLIENT\|MCP-STDIO\|MCP-CONNECT"
```

**Look for:**
- `[MCP-CLIENT] Creating stdio transport for filesystem`
- `[MCP-CLIENT] Command: npx`
- `[MCP-CLIENT] Args: ["@modelcontextprotocol/server-filesystem", "/tmp"]`
- `[MCP-STDIO-STDERR]` messages (if any errors)
- `[MCP-STDIO-EXIT]` messages (if process crashes)

---

## 🔧 TROUBLESHOOTING GUIDE

### If Build Fails Again
```bash
# Test build locally first
npm run build

# If successful locally, check Railway environment
railway variables | grep NODE_ENV
```

### If Authentication Still Redirects to Vercel
```bash
# Verify NEXTAUTH_URL is set correctly
railway variables --kv | grep NEXTAUTH_URL

# Should show:
# NEXTAUTH_URL=https://kimbleai-production-efed.up.railway.app
```

### If MCP Connection Still Fails
1. Check Railway logs for `[MCP-STDIO-STDERR]` entries
2. Look for specific error codes:
   - `ENOENT` = Command/file not found
   - `EACCES` = Permission denied
   - `Connection closed` = Process crashed/exited

3. Test MCP server manually on Railway:
```bash
railway run npx @modelcontextprotocol/server-filesystem /tmp
```

### If DNS Issue Persists
**Problem:** `www.kimbleai.com` still points to Vercel

**Solutions:**
1. **Temporary:** Use Railway URL directly: `kimbleai-production-efed.up.railway.app`
2. **Permanent:** Update DNS records to point to Railway (requires DNS provider access)

---

## 📊 VERIFICATION CHECKLIST

When testing on laptop, verify these items:

- [ ] Railway deployment completed successfully
- [ ] Health endpoint returns 200: `/api/health`
- [ ] Sign-in redirects to Railway URL (not Vercel)
- [ ] MCP page loads: `/integrations/mcp`
- [ ] MCP connection shows toast (not alert popup)
- [ ] Railway logs show MCP debug output
- [ ] MCP filesystem server can connect OR shows specific error
- [ ] Enhanced logging captures actual error details

---

## 🗂️ FILES MODIFIED

```
lib/mcp/mcp-client.ts           - Enhanced stdio logging + syntax fix
components/mcp/ServerCard.tsx    - Alert → Toast notifications
components/mcp/ServerInstaller.tsx - Alert → Toast notifications
app/api/mcp/servers/[id]/connect/route.ts - Enhanced error logging
```

---

## 🌐 ENVIRONMENT VARIABLES CHANGED

```bash
NEXTAUTH_URL=https://kimbleai-production-efed.up.railway.app
```

**Set via:** `railway variables --set`
**Effect:** Triggers automatic redeployment

---

## 📈 VERSION TRACKING

| Commit | Version | Status | Description |
|--------|---------|--------|-------------|
| aa6a1e4 | v6.1.3 | ✅ Deployed | Replaced alert popups with toasts |
| d34f2f0 | v6.1.4 | ❌ Failed | Enhanced logging (syntax error) |
| 72c26ab | v6.1.4 | 🚀 Deploying | Fixed syntax error |

---

## 🔗 IMPORTANT URLS

**Railway Dashboard:** https://railway.app
**Current Build:** https://railway.com/project/f0e9b8ac-8bea-4201-87c5-598979709394/service/194fb05e-f9fe-4f9f-a023-3b49adf4bc66?id=15811c4b-3ace-41ad-8a7b-8fb47caab67d
**Live App (Railway):** https://kimbleai-production-efed.up.railway.app
**Old App (Vercel):** https://www.kimbleai.com (DO NOT USE - won't support MCP)
**GitHub Repo:** https://github.com/kimblezc/kimbleai-v4-clean

---

## 💡 KEY INSIGHTS

1. **MCP Requires Persistent Processes:** Stdio transport needs Railway, not Vercel serverless
2. **DNS vs. Deployment:** Having Railway configured doesn't mean DNS points there
3. **NEXTAUTH_URL Must Match:** Authentication redirects to whatever this is set to
4. **Enhanced Logging is Critical:** Without detailed logs, MCP errors are impossible to debug
5. **Database Configuration:** MCP server args must be correct in Supabase database

---

## 🎯 SUCCESS CRITERIA

You'll know MCP is working when:

1. ✅ Sign-in stays on Railway URL
2. ✅ MCP page loads without errors
3. ✅ Connection attempt shows toast notification
4. ✅ Railway logs show MCP stdio process starting
5. ✅ Either connection succeeds OR specific error is logged
6. ✅ No more generic "Connection closed -32000" errors

---

## 📞 IF YOU NEED HELP

If issues persist after these fixes:

1. Share Railway logs: `railway logs --lines 200 > railway-logs.txt`
2. Share specific error from browser console (F12)
3. Check if `npx` is available: `railway run which npx`
4. Test MCP manually: `railway run npx @modelcontextprotocol/server-filesystem /tmp`

---

**End of Handoff Document**
