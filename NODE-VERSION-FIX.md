# Node.js 22.x Fix for Railway

## Problem
Railway deployment was using Node.js 18.20.5 instead of the required Node.js 22.x, causing:
- Multiple "Unsupported engine" warnings for MCP packages (lru-cache, @modelcontextprotocol/sdk)
- Supabase deprecation warning: "Node.js 18 and below are deprecated"
- Potential MCP connection failures (500 errors)

## Solution Applied

### Files Created:

1. **`.nvmrc`** (commit 34c7331)
   ```
   22
   ```
   - Specifies Node.js 22 for NVM-compatible systems
   - Standard convention for Node version pinning

2. **`nixpacks.toml`** (commit 34c7331)
   ```toml
   [phases.setup]
   nixPkgs = ["nodejs-22_x"]

   [phases.build]
   cmds = ["npm ci", "npm run build"]

   [phases.start]
   cmd = "npm start"

   [variables]
   NODE_ENV = "production"
   ```
   - Explicitly tells Nixpacks to use Node.js 22.x package
   - Should override Railway's auto-detection

### Deployment Status:
- ✅ Committed and pushed to GitHub (commit 34c7331)
- ✅ Triggered Railway deployment with `railway up`
- ⏳ Build in progress at Railway
- 📊 Build logs: https://railway.com/project/f0e9b8ac-8bea-4201-87c5-598979709394/service/194fb05e-f9fe-4f9f-a023-3b49adf4bc66?id=d57cdbed-15b0-476b-bc45-88e036a635f5

## Next Steps

### 1. Wait for Build (5-10 minutes)
The Railway build needs time to complete. You can monitor progress at:
- Railway dashboard: Check the build logs URL above
- Or run: `railway logs --lines 50`

### 2. Verify Node Version
Once the new deployment is live, check the logs:
```bash
railway logs --lines 100 | grep -i "node\|version"
```

You should see:
- ✅ Node.js 22.x in the build output
- ✅ No "Unsupported engine" warnings for lru-cache
- ✅ No Supabase Node 18 deprecation warning

### 3. Test MCP Servers
After confirming Node 22.x is active:

```bash
# Run automated test suite
npx tsx scripts/test-mcp-deployment.ts https://www.kimbleai.com
```

Or manually test at: https://www.kimbleai.com/integrations/mcp

Expected results:
- ✅ All 3 servers connected (Filesystem, GitHub, Memory)
- ✅ Tool counts > 0 (not showing "0 tools")
- ✅ No 500 errors when connecting to servers
- ✅ MCP tools actually used in chat (not Google Drive API fallback)

### 4. Check Railway Logs for 500 Errors
If MCP servers still show 500 errors, get detailed logs:

```bash
railway logs --lines 100 | grep -i "mcp-connect\|error"
```

The enhanced logging added in the previous deployment should show:
- Which server is failing to connect
- The exact error message and stack trace
- Whether it's a process spawn issue, permission issue, or other error

## Troubleshooting

### If Still Using Node 18:
```bash
# Check Railway environment variables
railway variables | grep NODE

# Verify nixpacks.toml is in the repo
git ls-files nixpacks.toml

# Check Railway build logs for Nixpacks output
# Look for "Using nodejs-22_x" message
```

### If Build Fails:
- Check Railway dashboard for build errors
- Run `railway logs` to see error messages
- Verify nixpacks.toml syntax is correct
- Ensure .nvmrc contains only "22" (no extra whitespace)

## Technical Details

**Why Two Files?**
- `.nvmrc`: Standard Node version file, used by many tools
- `nixpacks.toml`: Railway-specific, tells Nixpacks builder exactly which package to use

**Why Node 22.x Required?**
- `lru-cache@11.2.2` requires: `node: '20 || >=22'`
- `@modelcontextprotocol/sdk` dependencies have similar requirements
- Node 18 is deprecated by Supabase (security and compatibility)

## Current Version

**Commit**: 34c7331
**Changes**: Added .nvmrc and nixpacks.toml to force Node 22.x
**Status**: Deployed, waiting for Railway build

## Related Issues

- Previous MCP fix: commit 1448b6c (persistent MCPClient instances)
- Enhanced logging: commit c0ea14c (detailed 500 error diagnostics)
- Node version fix: commit 34c7331 (this fix)

All three fixes combined should resolve the MCP 0 tools bug.
