# OAuth & MCP Setup Guide

Quick guide to configure OAuth and test MCP on kimbleai.com

## Prerequisites

1. Railway CLI installed: `npm install -g @railway/cli`
2. Logged into Railway: `railway login` (opens browser)
3. Linked to project: `railway link` (select kimbleai project)

## Step 1: Update Google OAuth Console

**Action Required**: Manual update in Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find OAuth Client ID: `968455155458-nuerqfbgqmdarn2hal4es081d9ut152t`
3. Click "Edit"

### Add Authorized JavaScript Origins:
```
https://kimbleai.com
https://www.kimbleai.com
https://kimbleai-production-efed.up.railway.app
```

### Add Authorized Redirect URIs:
```
https://kimbleai.com/api/auth/callback/google
https://www.kimbleai.com/api/auth/callback/google
https://kimbleai-production-efed.up.railway.app/api/auth/callback/google
```

4. Click "Save"

## Step 2: Verify Railway Configuration

Run the verification script:

```powershell
.\scripts\verify-railway-oauth.ps1
```

This will check:
- ✅ Railway CLI authentication
- ✅ NEXTAUTH_URL = https://www.kimbleai.com
- ✅ Google OAuth credentials set
- ✅ All required environment variables

## Step 3: Test MCP Deployment

Run MCP test suite:

```bash
npx tsx scripts/test-mcp-deployment.ts https://www.kimbleai.com
```

Expected results:
- ✅ 3/3 servers connected (Filesystem, GitHub, Memory)
- ✅ All servers showing tools (not 0)
- ✅ Tool discovery working

## Step 4: Complete Workflow (Optional)

Run both steps in sequence:

```powershell
.\scripts\setup-and-test.ps1
```

## Troubleshooting

### OAuth Login Fails
- Check Google Console redirect URIs
- Verify NEXTAUTH_URL in Railway
- Hard refresh browser (Ctrl+Shift+R)

### MCP Shows 0 Tools
- This should be fixed in v6.1.1 (commit 1448b6c)
- Wait for Railway deployment (~5 min after push)
- Check Railway logs: `railway logs`

### Railway Not Authenticated
```bash
railway login
railway link
railway whoami  # Verify
```

## Quick Commands

```bash
# Check Railway variables
railway variables | grep NEXTAUTH_URL

# Set Railway variable
railway variables set NEXTAUTH_URL=https://www.kimbleai.com

# View Railway logs
railway logs --tail

# Test deployment
npx tsx scripts/test-mcp-deployment.ts
```

## Success Criteria

✅ Google OAuth login works on kimbleai.com
✅ All 3 MCP servers connected
✅ Tool counts > 0 for all servers
✅ Can use MCP tools in chat

## Current Deployment

```
Version: v6.1.1
Commit: 1448b6c
Platform: Railway
URL: https://www.kimbleai.com
Fix: MCP persistent client instances (0 tools bug fixed)
```
