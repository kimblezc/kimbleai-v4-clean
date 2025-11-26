# KimbleAI Development Rules

## 🚀 Current Deployment Status

**RULE: This section MUST be updated with every change to verify deployment**

```
Latest Version: v10.4.0
Latest Commit: e2e3ebf
Last Updated: 2025-11-26
Status: ⏳ Ready for Deployment
Live URL: https://www.kimbleai.com
```

### Recent Changes (Last 5 Only):
- **e2e3ebf** (v10.4.0) - 🚀 PHASE 1 - ADVANCED TOOL USE: Implemented Anthropic's best practices with 20+ tools, 35+ examples (72%→90% accuracy)
- **ccfd13e** (v10.3.3) - 🧹 DOCUMENTATION CLEANUP: Archived 26+ docs (~564KB), optimized CLAUDE.md, created ACTIVE_DOCS.md index
- **5af0426** (v10.3.2) - ✨ UNIFIED INTEGRATION DASHBOARD: Combined all 22 integrations into /integrations/health
- **dd7645e** (v9.7.1) - 🧹 CLEANUP: Removed all vestigial Guardian references
- **de6ee66** (v8.19.1) - 🔧 UI OVERLAP FIXES: Fixed draft restored toast overlapping with cost tracker

**Full Changelog**: See `docs/archive/2025-01-changelog/CLAUDE-CHANGELOG.md`

**Purpose**: This section serves as a checkpoint to ensure all changes are properly versioned, committed, and deployed. Every modification to the codebase must update this section with the new version and commit hash.

---

## Archie - Autonomous Code Maintenance

**A.R.C.H.I.E.** = Autonomous Repository Coding & Housekeeping Intelligence Engine

**Status**: ✅ Active (Runs every hour)

### Philosophy
> "Don't make me think about lint errors. Just fix them."

Archie is a simple, practical coding janitor that automatically maintains kimbleai.com.

**No approval workflows. No databases. No complexity. Just gets stuff done.**

### What Archie Does

Every hour, Archie:
1. **Scans** the codebase for issues (lint, dead code, type errors, dependencies)
2. **Fixes** issues using multiple strategies (up to 3 attempts per issue)
3. **Tests** each fix to verify it actually works (runs tsc/lint)
4. **Rolls back** failed fixes and tries different approaches
5. **Commits** successful fixes to git with detailed messages
6. **Logs** everything with comprehensive attempt tracking

**Auto-Fixes:**
- ✓ Linting errors (`npm run lint --fix`)
- ✓ Unused imports and dead code (AI-powered with GPT-4o-mini)
- ✓ TypeScript errors (AI-powered with GPT-4o, 3 retry attempts)
- ✓ Patch-level dependency updates (1.2.3 → 1.2.4)

**Fix Strategy (Progressive):**
1. **Attempt 1**: Minimal changes, preserve code structure
2. **Attempt 2**: Type assertions, null checks, more aggressive
3. **Attempt 3**: Any types, disable strict checks (last resort)

**Doesn't Touch:**
- ❌ Major refactoring
- ❌ API breaking changes
- ❌ Database schema changes
- ❌ Anything requiring human judgment

### Implementation

**Files:**
- `lib/archie-agent.ts` - Main agent logic
- `app/api/archie/run/route.ts` - API endpoint
- `app/agent/page.tsx` - Dashboard showing activity

**Schedule**: Every hour via Vercel Cron (`0 * * * *`)
**Manual trigger**: `/api/archie/run?trigger=manual`
**Dashboard**: https://www.kimbleai.com/agent

### Safety Features

1. **Max 5 fixes per run** - Prevents going crazy
2. **Max 3 retry attempts** - Stops after 3 failed fix attempts per issue
3. **Test before commit** - Runs tsc/lint to verify each fix works
4. **Automatic rollback** - Reverts failed fixes via git checkout
5. **Git commits** - Every change is tracked and revertable
6. **Dry-run mode** - Test without making changes
7. **Limited scope** - Only touches obvious issues
8. **No databases** - Simple, can't corrupt data
9. **OpenAI optional** - Works without AI (skips complex fixes)

### Monitoring & Access

**Dashboard**: https://www.kimbleai.com/agent
- View all Archie commits with timestamps
- See what was fixed and when
- Manual trigger button available

**Sidebar Button**: Click the green 🦉 button above version info

**Manual Trigger**: `/api/archie/run?trigger=manual` (takes 1-2 min)

**Git Logs**:
```bash
# See all Archie activity
git log --author="Archie" --oneline -20

# See last 24 hours
git log --author="Archie" --since="24 hours ago"
```

### Why This Approach?

**Previous agents (Archie 1.0, MCP, etc.) failed because:**
- Too complex (approval queues, databases)
- Too ambitious (tried to do everything)
- No visibility (ran without logging)
- No accountability (changes disappeared)

**This Archie succeeds because:**
- Simple (one file, one endpoint, one dashboard)
- Focused (only fixes boring stuff)
- Transparent (git commits show everything)
- Practical (actually useful, not theoretical)

### Documentation

See `ARCHIE.md` for full details.

---

## Task Completion Documentation

**Rule: Always Include Version and Commit Information**

When completing any task (either in Claude Code or at kimbleai.com), ALWAYS include:

### Required Information:
1. **Current Version** - The version number from `version.json` or `package.json`
2. **Commit Hash** - The git commit hash (short form: first 7 characters)
3. **What Changed** - Brief description of the changes made
4. **Status** - Whether it's committed, deployed, or pending

### Format Example:
```
✅ Task completed
Version: v6.0.1
Commit: f0370be
Changes: Fixed project deletion endpoint to actually delete records
Status: Deployed to https://kimbleai.com
```

### When to Include:
- At the end of any feature implementation
- When fixing bugs
- After deploying to production
- When creating or updating documentation
- During code reviews or testing

### Rationale:
This practice ensures:
- **Traceability**: Every change can be traced to a specific commit
- **Version Control**: Clear understanding of what version includes which features
- **Debugging**: Easy to identify when a feature was added or bug was fixed
- **Documentation**: Automatic creation of change log
- **Accountability**: Clear record of all modifications

### Version Numbering:
Follow semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes or complete phase completions
- **MINOR**: New features, non-breaking changes
- **PATCH**: Bug fixes, small improvements

---

## Auto-Deployment Process

**Rule: Always Deploy After Completing Features**

After implementing any feature, bug fix, or change to the codebase, follow this process:

### Deployment Platform: Railway

**Important**: We migrated from Vercel to Railway to support MCP stdio transport (child processes).

### 1. Pre-Deployment Checks
```bash
# Verify build succeeds
npm run build

# Check git status
git status

# Run tests if available
npm test
```

### 2. Commit Changes
```bash
# Stage all changes
git add -A

# Commit with descriptive message
git commit -m "feat: Description of what changed"

# Push to repository
git push origin master
```

### 3. Deploy to Railway
```bash
# Deploy current directory to Railway
railway up

# Or trigger deployment from git
railway up --detach
```

### 4. Monitor Deployment
```bash
# Watch logs in real-time
railway logs --tail

# Or view in Railway dashboard
railway open
```

### 5. Verify Deployment
```bash
# Get Railway URL
railway domain

# Run comprehensive test suite
npx tsx scripts/test-railway-deployment.ts <railway-url>
```

Or manually:
1. Visit Railway URL in browser
2. Test health endpoint: `https://your-url.railway.app/api/health`
3. Verify all features work
4. Check for console errors

### Deployment Timeline
- **railway up → Build starts**: Instant
- **Build process**: 3-5 minutes
- **Deployment → Live**: 10-30 seconds
- **Total**: 4-6 minutes

### Railway Configuration

**Configuration File**: `railway.toml`
- **Builder**: NIXPACKS (auto-detects Next.js)
- **Node Version**: 22.x
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Health Check**: `/api/health`

**Environment Variables**: Set via CLI or dashboard
```bash
# Set individual variable
railway variables set KEY=value

# Or use automated script
.\scripts\setup-railway-env.ps1  # Windows
./scripts/setup-railway-env.sh   # Linux/Mac
```

### Required Environment Variables
All environment variables from `.env.production`:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXTAUTH_SECRET
- NEXTAUTH_URL
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- OPENAI_API_KEY
- ASSEMBLYAI_API_KEY
- ZAPIER_WEBHOOK_URL
- ZAPIER_MEMORY_WEBHOOK_URL
- ZAPIER_WEBHOOK_SECRET
- NODE_ENV

### Troubleshooting Deployments

**"Build failed"**:
- Check Railway logs: `railway logs`
- Run `npm run build` locally to reproduce
- Verify all dependencies are in `package.json`
- Check Node version matches (22.x)

**"Changes aren't showing"**:
- Hard refresh browser (Ctrl+Shift+R)
- Check Railway deployment status: `railway status`
- Verify build completed successfully

**"Environment variables missing"**:
- Verify with: `railway variables`
- Re-run setup script if needed
- Check Railway dashboard

**"MCP servers won't connect"**:
- This was the Vercel issue - should work on Railway
- Check logs for process spawn errors
- Verify `npx` is available: `railway run which npx`
- Test manual connection: `railway run npx @modelcontextprotocol/server-filesystem`

### Deployment Verification Script

Use `scripts/test-railway-deployment.ts` for comprehensive verification:

```bash
npx tsx scripts/test-railway-deployment.ts https://your-url.railway.app
```

Tests performed:
1. ✅ Health endpoint
2. ✅ Home page loads
3. ✅ NextAuth configured
4. ✅ API accessibility
5. ✅ MCP endpoints accessible
6. ✅ Environment variables present
7. ✅ Database connection

### Cache Management
- **Server-side**: No caching (Railway serves fresh content)
- **Client-side**: Browser cache (hard refresh to clear)
- **Static assets**: Served from Railway's CDN

To force cache invalidation:
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Success Criteria
Deployment is successful when:
1. ✅ Railway build completes without errors
2. ✅ Health endpoint returns 200 OK
3. ✅ Production URL loads correctly
4. ✅ All features accessible
5. ✅ MCP stdio servers can connect
6. ✅ Version number updated (if changed)

### Railway Dashboard
- **URL**: https://railway.app
- **Project**: kimbleai
- **View logs**: `railway logs`
- **Open dashboard**: `railway open`
- **Check status**: `railway status`

### Railway CLI Commands

```bash
# Authentication
railway login              # Login to Railway
railway whoami             # Check authentication

# Project management
railway init               # Initialize new project
railway link               # Link to existing project
railway unlink             # Unlink project

# Deployment
railway up                 # Deploy current directory
railway up --detach        # Deploy in background

# Monitoring
railway logs               # View recent logs
railway logs --tail        # Stream logs in real-time
railway status             # Check deployment status
railway open               # Open Railway dashboard

# Environment variables
railway variables          # List all variables
railway variables set      # Set variable
railway variables delete   # Remove variable

# Domain management
railway domain             # Show current domain
railway domain add         # Add custom domain
```

### Migration from Vercel

**Why we migrated**: Vercel's serverless environment cannot spawn child processes, which MCP stdio transport requires. Railway runs a persistent Node.js server that fully supports this.

**Complete migration guide**: See `RAILWAY_MIGRATION_GUIDE.md`

**Key differences**:
- ✅ MCP stdio transport works on Railway
- ✅ Persistent server (not serverless functions)
- ✅ Better support for long-running processes
- ✅ More predictable resource allocation
- 💰 Cost: ~$5/mo (vs Vercel's free tier)

### Cron Jobs on Railway

**Status**: ✅ FIXED (v8.0.3)

Railway doesn't have built-in cron scheduling like Vercel. We've implemented **in-process node-cron scheduling**.

**Implementation**:
- `lib/cron-scheduler.ts` - Node-cron scheduler with CRON_SECRET authentication
- `instrumentation.ts` - Next.js hook that initializes cron jobs on server start
- Runs only in Railway production environment

**Schedule**:
- **Archie**: Every hour (0 * * * *)
- **Guardian**: Every 6 hours (0 */6 * * *)
- **Backup**: Daily at 2:00 AM (0 2 * * *)
- **Index**: Every 6 hours (0 */6 * * *)
- **Index Attachments**: Every 4 hours (0 */4 * * *)

**Verification**:
```bash
# Check cron initialization
railway logs | grep "CRON"

# Expected output:
[CRON] Initializing cron jobs...
[CRON] All cron jobs scheduled...

# Verify Archie commits
git log --author="Archie" --oneline -5

# Verify Guardian commits
git log --author="Guardian" --oneline -5
```

**Documentation**: See `ARCHIE_GUARDIAN_CRON_FIX.md` for complete details.

### Rationale
Consistent deployment process ensures:
- **Reliability**: Features deploy predictably
- **Traceability**: Every deployment linked to commit
- **Quality**: Build errors caught before going live
- **Speed**: Automated process takes minutes
- **MCP Support**: Stdio transport works correctly
- **Confidence**: Comprehensive testing verifies success
- openai chatgpt5 models exist.
- at every change to code and new deployment update both the Vx.x.x and the commit. include it in your response here in claude code every time.
- ensure that builds are actively deployed and test them iteratively
- when complete with a task as a default always show what Vx.x.x and commit should be seen on the main page.