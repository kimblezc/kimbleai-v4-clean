# Railway Verification Steps

## Quick Commands (Run in PowerShell)

```powershell
# 1. Login to Railway (opens browser)
railway login

# 2. Link to kimbleai project
railway link

# 3. Verify authentication
railway whoami

# 4. Check NEXTAUTH_URL setting
railway variables | Select-String -Pattern "NEXTAUTH_URL"
```

## Expected Output

You should see:
```
NEXTAUTH_URL=https://www.kimbleai.com
```

## If NEXTAUTH_URL is Wrong

```powershell
railway variables set NEXTAUTH_URL=https://www.kimbleai.com
```

## After Railway is Configured

Run the test suite:
```bash
npx tsx scripts/test-mcp-deployment.ts https://www.kimbleai.com
```

## Current Status

✅ OAuth: Updated in Google Console
⏳ Railway: Need to verify NEXTAUTH_URL
⏳ MCP: Ready to test after Railway verification
