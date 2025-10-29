# Railway Migration - Quick Start Guide

**5-Minute Setup for Railway Deployment**

## What This Is

Railway migration files to enable MCP stdio transport (child processes) which don't work on Vercel's serverless environment.

## Files Created

```
C:\Users\zachk\OneDrive\Documents\kimbleai-v4-clean\
├── railway.toml                          # Railway configuration
├── RAILWAY_MIGRATION_GUIDE.md            # Complete migration guide (30-45 min)
├── RAILWAY_QUICKSTART.md                 # This file
├── scripts/
│   ├── setup-railway-env.ps1            # Windows env setup
│   ├── setup-railway-env.sh             # Linux/Mac env setup
│   └── test-railway-deployment.ts       # Deployment verification
└── CLAUDE.md                             # Updated with Railway instructions
```

## Prerequisites Installed

- ✅ Railway CLI v4.11.0
- ✅ Node.js 22.x
- ✅ Git repository

## Next Steps (Manual)

### 1. Login to Railway (~2 min)

```bash
railway login
```

Opens browser for authentication. Follow the prompts.

### 2. Initialize Project (~1 min)

```bash
cd C:\Users\zachk\OneDrive\Documents\kimbleai-v4-clean
railway init
```

- Project name: `kimbleai`
- Create new: Yes

### 3. Set Environment Variables (~3 min)

**Windows**:
```powershell
.\scripts\setup-railway-env.ps1
```

**Linux/Mac**:
```bash
chmod +x scripts/setup-railway-env.sh
./scripts/setup-railway-env.sh
```

Verify:
```bash
railway variables
```

### 4. Deploy (~5 min)

```bash
railway up
```

Watch the build process. Expected: 3-5 minutes.

### 5. Get URL & Test (~2 min)

```bash
# Get your Railway URL
railway domain

# Test deployment
npx tsx scripts/test-railway-deployment.ts <your-railway-url>
```

### 6. Test MCP (Critical!)

1. Visit your Railway URL
2. Sign in with Google
3. Go to MCP Servers page
4. Click "Connect" on filesystem server
5. Watch for success (should NOT timeout like Vercel)

**Success Criteria**: MCP server connects without timeout errors.

## Expected Results

### Vercel (Current - FAILS)
```
[MCP-CONNECT] Attempting to connect...
[ERROR] Connection timeout after 60000ms
[ERROR] Cannot spawn child process
```

### Railway (After Migration - WORKS)
```
[MCP-CONNECT] Attempting to connect...
[MCP-INSTALL] Installing @modelcontextprotocol/server-filesystem
[MCP-STDIO] Child process spawned: PID 12345
✅ Connected to MCP server: filesystem
[MCP-TOOLS] Loaded 15 tools
```

## Troubleshooting

**Can't login?**
- Make sure browser opens
- Try `railway login --browserless`

**Build fails?**
- Check logs: `railway logs`
- Verify locally: `npm run build`

**Environment variables missing?**
- List them: `railway variables`
- Re-run setup script

**MCP still failing?**
- Check logs: `railway logs --tail`
- Test npx: `railway run which npx`
- This should work on Railway (was Vercel limitation)

## Full Documentation

- **Complete Guide**: See `RAILWAY_MIGRATION_GUIDE.md` (30-45 min detailed walkthrough)
- **Deployment Process**: See `CLAUDE.md` (updated with Railway instructions)
- **Testing**: See `scripts/test-railway-deployment.ts`

## Version Info

- **Version**: v6.1.0
- **Migration Date**: 2025-10-29
- **Reason**: Enable MCP stdio transport
- **Status**: Configuration ready, deployment pending

## Cost

- **Railway Starter**: $5/mo (includes 512MB RAM, 1 vCPU)
- **Free Trial**: $5 credit included
- **vs Vercel**: Free tier but MCP doesn't work

Worth it for MCP functionality.

## Rollback Plan

If Railway doesn't work, can revert to Vercel:
1. Keep Vercel deployment active for now
2. Test Railway for 24-48 hours
3. If issues, point DNS back to Vercel
4. Downtime: ~5 minutes (DNS propagation)

## Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Migration Guide**: `RAILWAY_MIGRATION_GUIDE.md`

---

**Total Time**: ~15 minutes for basic deployment
**Total Time (with testing)**: ~30 minutes
**Difficulty**: Easy (mostly automated)
