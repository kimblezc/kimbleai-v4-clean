# Railway Migration Guide

Complete guide for migrating kimbleai.com from Vercel (serverless) to Railway (server).

## Why Migrate?

**Critical Issue**: MCP (Model Context Protocol) servers use stdio transport, which requires spawning Node.js child processes (`npx @modelcontextprotocol/server-filesystem`). Vercel's serverless environment **cannot** spawn child processes, resulting in "Connection closed" errors.

**Solution**: Railway runs a persistent Node.js server that fully supports child process spawning, enabling MCP stdio transport.

## Migration Overview

- **From**: Vercel (serverless functions)
- **To**: Railway (persistent Node.js server)
- **Database**: Supabase (external, stays the same)
- **Domain**: kimbleai.com (will be updated after migration)
- **Estimated Time**: 30-45 minutes
- **Downtime**: ~5 minutes (DNS propagation)

## Prerequisites

- [x] Railway CLI installed: `npm install -g @railway/cli`
- [ ] Railway account (free tier available at railway.app)
- [ ] Access to current environment variables
- [ ] Git repository access

## Phase 1: Railway Account & Project Setup (10 min)

### Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub account
3. Verify email if required

### Step 2: Login via CLI

```bash
railway login
```

This will open a browser window for authentication. Follow the prompts.

### Step 3: Verify Authentication

```bash
railway whoami
```

Should display your Railway username.

### Step 4: Initialize Railway Project

```bash
# Navigate to project directory
cd C:\Users\zachk\OneDrive\Documents\kimbleai-v4-clean

# Initialize Railway project
railway init
```

When prompted:
- **Project name**: `kimbleai`
- **Create new project**: Yes
- **Link to existing service**: No (create new)

### Step 5: Link Local Directory

```bash
railway link
```

Select the `kimbleai` project you just created.

## Phase 2: Environment Variables (10 min)

### Option A: Automated Setup (Recommended)

**Windows PowerShell**:
```powershell
.\scripts\setup-railway-env.ps1
```

**Linux/Mac**:
```bash
chmod +x scripts/setup-railway-env.sh
./scripts/setup-railway-env.sh
```

### Option B: Manual Setup

Set each variable individually:

```bash
railway variables set NEXT_PUBLIC_SUPABASE_URL="https://gbmefnaqsxtoseufjixp.supabase.co"
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
railway variables set NEXTAUTH_SECRET="your-secret"
railway variables set NEXTAUTH_URL="https://www.kimbleai.com"
railway variables set GOOGLE_CLIENT_ID="your-client-id"
railway variables set GOOGLE_CLIENT_SECRET="your-client-secret"
railway variables set OPENAI_API_KEY="your-openai-key"
railway variables set ASSEMBLYAI_API_KEY="your-assemblyai-key"
railway variables set ZAPIER_WEBHOOK_URL="your-zapier-url"
railway variables set ZAPIER_MEMORY_WEBHOOK_URL="your-zapier-memory-url"
railway variables set ZAPIER_WEBHOOK_SECRET="your-zapier-secret"
railway variables set NODE_ENV="production"
```

### Step 6: Verify Environment Variables

```bash
railway variables
```

Ensure all required variables are present.

## Phase 3: Initial Deployment (15 min)

### Step 7: Deploy to Railway

```bash
railway up
```

This will:
1. Upload your project files
2. Run `npm install`
3. Run `npm run build`
4. Start the server with `npm start`

**Expected build time**: 3-5 minutes

### Step 8: Monitor Build Logs

```bash
railway logs
```

Watch for:
- ✅ `npm install` completes
- ✅ `npm run build` succeeds
- ✅ Server starts on PORT (Railway assigns this automatically)
- ✅ No fatal errors

### Step 9: Get Railway URL

```bash
railway domain
```

This will show your temporary Railway URL (e.g., `kimbleai-production.up.railway.app`)

### Step 10: Test Railway Deployment

Open the Railway URL in your browser. Verify:
- [ ] Site loads successfully
- [ ] Health check works: `https://your-url.railway.app/api/health`
- [ ] No console errors

## Phase 4: MCP Testing (10 min)

### Step 11: Test MCP Stdio Connection

**Critical Test**: Verify that MCP servers can connect using stdio transport.

1. **Sign in** to your Railway deployment
2. Navigate to **MCP Servers** page (`/mcp`)
3. Find the **filesystem** server
4. Click **Connect** button
5. Watch the logs:

```bash
railway logs --tail
```

**Look for**:
- `[MCP-CONNECT] Attempting to connect to filesystem server`
- `[MCP-INSTALL] Installing @modelcontextprotocol/server-filesystem`
- `✅ Connected to MCP server: filesystem`

**Success Criteria**:
- ✅ No timeout errors (60s was Vercel issue)
- ✅ Connection established
- ✅ Can list tools/resources
- ✅ Can execute at least one tool (e.g., list files)

**If MCP Still Fails**:

Check Railway logs for:
- Process spawn errors
- Missing dependencies
- Permission issues

Debug with:
```bash
railway run npx @modelcontextprotocol/server-filesystem
```

### Step 12: Test MCP Tool Execution

1. In chat, try using an MCP tool:
   - "List files in my current directory" (filesystem)
   - "Show my GitHub repositories" (github)

2. Verify the tool executes successfully

3. Check Railway logs for execution traces

## Phase 5: Full Feature Testing (10 min)

### Step 13: Test Critical Features

| Feature | Test | Status |
|---------|------|--------|
| **Auth** | Sign in with Google OAuth | [ ] |
| **Chat** | Send message, get response | [ ] |
| **Projects** | Create/delete project | [ ] |
| **Files** | Upload and process file | [ ] |
| **Transcription** | Upload audio, transcribe | [ ] |
| **Agents** | View Archie dashboard | [ ] |
| **MCP** | Connect to all 3 servers | [ ] |
| **API** | Test `/api/health` | [ ] |

### Step 14: Performance Check

Compare with Vercel:
- **Cold start**: Railway may be faster (persistent server)
- **Response times**: Should be similar or better
- **Memory usage**: Check Railway dashboard

```bash
railway status
```

### Step 15: Database Verification

1. Create a new conversation
2. Check Supabase dashboard - should see new record
3. Delete conversation
4. Verify deletion in Supabase

## Phase 6: Custom Domain (15 min)

### Step 16: Add Custom Domain

```bash
railway domain add kimbleai.com
```

Railway will provide DNS configuration:
- **Type**: CNAME or A record
- **Host**: @ or www
- **Value**: Railway's edge network address

### Step 17: Update DNS

**Current DNS** (Vercel):
- Provider: Check domain registrar (Cloudflare, Namecheap, etc.)
- Current records point to Vercel

**New DNS** (Railway):
1. Go to your DNS provider
2. Update/replace the CNAME or A record for `kimbleai.com`
3. Point to Railway's provided address
4. Save changes

**DNS Propagation**: 5-15 minutes (can be up to 48 hours)

### Step 18: Update OAuth Redirect URLs

**Google Cloud Console**:
1. Go to https://console.cloud.google.com
2. Navigate to APIs & Services > Credentials
3. Edit OAuth 2.0 Client ID
4. Update Authorized redirect URIs:
   - Remove: `https://www.kimbleai.com/api/auth/callback/google`
   - Add: `https://kimbleai-production.up.railway.app/api/auth/callback/google`
   - Or keep both during transition

**Important**: Update `NEXTAUTH_URL` in Railway:
```bash
railway variables set NEXTAUTH_URL="https://kimbleai-production.up.railway.app"
```

After DNS propagation, update to final domain:
```bash
railway variables set NEXTAUTH_URL="https://www.kimbleai.com"
```

### Step 19: SSL/HTTPS Verification

Railway automatically provisions SSL certificates. Verify:
- [ ] HTTPS works on Railway URL
- [ ] Certificate is valid (click padlock in browser)
- [ ] No mixed content warnings

## Phase 7: Final Verification (10 min)

### Step 20: Create Deployment Checklist

- [ ] Railway deployment successful
- [ ] All environment variables set
- [ ] Health check returns 200 OK
- [ ] Auth (Google OAuth) works
- [ ] Chat functionality works
- [ ] MCP stdio servers connect successfully
- [ ] At least one MCP tool executes
- [ ] Database reads/writes work
- [ ] Performance acceptable
- [ ] Custom domain configured (if ready)
- [ ] SSL certificate valid

### Step 21: Document MCP Success

**Proof of Concept**:

1. Take screenshot of successful MCP connection
2. Capture logs showing stdio transport working
3. Compare with Vercel (failed) vs Railway (success)

**Example Log Evidence**:

**Vercel (Failed)**:
```
[MCP-CONNECT] Attempting to connect...
[ERROR] Connection timeout after 60000ms
[ERROR] StdioClientTransport: Cannot spawn child process
```

**Railway (Success)**:
```
[MCP-CONNECT] Attempting to connect...
[MCP-INSTALL] Installing @modelcontextprotocol/server-filesystem
[MCP-STDIO] Child process spawned: PID 12345
[MCP-STDIO] Connected via stdio transport
✅ Connected to MCP server: filesystem
[MCP-TOOLS] Loaded 15 tools
```

### Step 22: Update Version & Commit

```bash
# Update version.json
# Edit: version to "6.1.0", commit to current hash

git add .
git commit -m "feat: Migrate to Railway for MCP stdio support

- Add railway.toml configuration
- Create environment setup scripts
- Document complete migration process
- Enable MCP stdio transport with persistent server
- Version bump to v6.1.0

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git tag v6.1.0
git push origin master --tags
```

## Phase 8: Cleanup & Documentation

### Step 23: Update CLAUDE.md

Update deployment instructions to use Railway instead of Vercel.

### Step 24: Keep Vercel as Backup (Optional)

You can keep the Vercel deployment as a backup:
- Don't delete Vercel project immediately
- Test Railway for 24-48 hours
- If issues arise, DNS can be reverted to Vercel
- After Railway is stable, deactivate Vercel

## Troubleshooting

### Build Fails

**Issue**: `npm run build` fails on Railway

**Solutions**:
1. Check Railway logs: `railway logs`
2. Test locally: `npm run build`
3. Check Node version: Railway should use 22.x
4. Verify all environment variables are set

### MCP Still Timing Out

**Issue**: MCP connections still fail on Railway

**Solutions**:
1. Check if `npx` is available: `railway run which npx`
2. Test manual connection: `railway run npx @modelcontextprotocol/server-filesystem`
3. Check Railway resource limits (free tier: 512MB RAM, 1 vCPU)
4. Increase timeout in MCP client configuration

### Database Connection Issues

**Issue**: Can't connect to Supabase

**Solutions**:
1. Verify environment variables: `railway variables`
2. Check Supabase URL is correct
3. Test connection: `railway run node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"`
4. Ensure service role key is set

### OAuth Not Working

**Issue**: Google OAuth redirect fails

**Solutions**:
1. Update `NEXTAUTH_URL` to Railway URL
2. Add Railway URL to Google OAuth redirect URIs
3. Clear browser cookies and try again
4. Check NextAuth logs in Railway

### Slow Performance

**Issue**: Railway is slower than Vercel

**Solutions**:
1. Check Railway resource usage dashboard
2. Upgrade to Railway Pro plan ($5/mo) for more resources
3. Enable Railway's edge network
4. Optimize Next.js build (check bundle size)

## Cost Comparison

| Platform | Plan | Cost | MCP Support |
|----------|------|------|-------------|
| Vercel | Hobby | Free | ❌ No (serverless) |
| Vercel | Pro | $20/mo | ❌ No (serverless) |
| Railway | Starter | $5/mo | ✅ Yes (persistent) |
| Railway | Developer | $20/mo | ✅ Yes (persistent) |

**Recommendation**: Start with Railway Starter ($5/mo). The free trial includes $5 credit.

## Rollback Plan

If Railway has critical issues:

1. **Revert DNS**: Point domain back to Vercel
2. **Revert OAuth**: Update Google redirect URIs back to Vercel
3. **Wait for propagation**: 5-15 minutes
4. **Verify Vercel still works**: Test core features
5. **Debug Railway offline**: Fix issues without affecting production

## Success Criteria

✅ **Migration is successful when**:
1. Site fully deployed on Railway
2. All features working (auth, chat, projects, files)
3. MCP stdio servers successfully connecting
4. At least one MCP tool execution demonstrated
5. Logs prove it works on Railway (but failed on Vercel)
6. Performance acceptable (not slower than Vercel)
7. Documentation updated
8. Version bumped to v6.1.0

## Next Steps After Migration

1. Monitor Railway dashboard for errors
2. Set up Railway alerts for downtime
3. Configure Railway cron jobs (if needed)
4. Optimize Railway resource usage
5. Consider upgrading to paid plan for production
6. Deactivate Vercel after 7 days of stable Railway operation

## Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **GitHub Issues**: For kimbleai-specific problems

---

**Migration Version**: v1.0
**Last Updated**: 2025-10-29
**Author**: Claude Code Assistant
