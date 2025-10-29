# KimbleAI Development Rules

## 🚀 Current Deployment Status

**RULE: This section MUST be updated with every change to verify deployment**

```
Latest Version: v6.0.5
Latest Commit: 94c34db
Last Updated: 2025-10-29
Status: ✅ Deployed to Production
Live URL: https://www.kimbleai.com
```

### Recent Changes:
- **94c34db** (v6.0.5) - Fixed project deletion with cascading deletes for related records
- **24fa879** (v6.0.4) - Updated CLAUDE.md with final deployment status
- **cc3f71e** (v6.0.4) - Updated version.json with deployment verification tracking
- **5da98da** (v6.0.4) - Updated claude.md with commit hash
- **0a90959** (v6.0.4) - Added deployment verification section to CLAUDE.md with version/commit tracking
- **6db8dc5** (v6.0.3) - MCP end-to-end proof of functionality documentation
- **75bccd8** (v6.0.3) - MCP server installation fix (added -y flag and directory path)
- **0abc9aa** (v6.0.3) - Archie page redesign with animated owl and overwatch positioning

**Purpose**: This section serves as a checkpoint to ensure all changes are properly versioned, committed, and deployed. Every modification to the codebase must update this section with the new version and commit hash.

---

## Agent Visibility and Oversight

**Rule: All Active Agents Must Be Visible on the Archie Dashboard**

Archie serves as the central oversight coordinator for all autonomous agents in the system. The Archie Dashboard at `/agent` must display:

### Required Information for Each Active Agent:
1. **Agent Name and Type** (e.g., "Archie Utility Agent", "Drive Intelligence Agent")
2. **Current Status** (Active, Running, Idle, Error)
3. **Execution Schedule** (e.g., "Every 15 minutes", "Every 6 hours")
4. **Last Run Time** (When the agent last executed)
5. **What It's Doing** (Current or recent findings)
6. **Next Tasks** (Upcoming tasks in the queue)
7. **API Endpoint** (For manual triggering/debugging)

### Active Agents (as of Oct 2025):
1. **Autonomous Agent** - Every 5 minutes - `/api/agent/cron`
   - Main orchestrator, code analysis, self-improvement

2. **Archie Utility Agent** - Every 15 minutes - `/api/cron/archie-utility`
   - Actionable conversation detection, cost monitoring, task optimization

3. **Drive Intelligence Agent** - Every 6 hours - `/api/cron/drive-intelligence`
   - File organization, duplicate detection, media discovery

4. **Device Sync Agent** - Every 2 minutes - `/api/cron/device-sync`
   - Cross-device state synchronization, conflict resolution

### Dashboard Requirements:
- Must be server-side rendered (no caching)
- Must auto-update on each page visit
- Must show real-time agent status
- Must display findings and tasks from all agents
- Must provide visual indicators for agent health (active/inactive/error)

### Adding New Agents:
When adding a new autonomous agent to the system:
1. Create the agent implementation in `lib/`
2. Create the API endpoint in `app/api/cron/`
3. Add the cron schedule to `vercel.json`
4. **Update the Archie Dashboard** at `app/agent/page.tsx` to include the new agent
5. Document the agent in this file under "Active Agents"

### Rationale:
Without centralized visibility, agents can:
- Run without oversight
- Generate duplicate or conflicting tasks
- Consume resources unnecessarily
- Fail silently without alerting the team

Archie's dashboard provides a single pane of glass for monitoring all autonomous activity, ensuring transparency and accountability in the AI-driven workflow.

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

### 1. Pre-Deployment Checks
```bash
# Verify build succeeds
npm run build

# Check git status
git status

# Run tests if available
npm test
```

### 2. Commit and Push
```bash
# Stage all changes
git add -A

# Commit with descriptive message
git commit -m "feat: Description of what changed"

# Push to master (triggers auto-deploy)
git push origin master
```

### 3. Verify Deployment
```bash
# Run deployment verification script
npx tsx scripts/test-deployment.ts
```

Or manually:
1. Wait 3-5 minutes for Vercel to build and deploy
2. Hard refresh production site (Ctrl+Shift+R or Cmd+Shift+R)
3. Test new endpoints/features directly
4. Check Vercel dashboard for "Ready" status

### Deployment Timeline
- **Git push → Vercel builds**: 2-4 minutes
- **Build → Live**: 10-30 seconds
- **Live → Visible (hard refresh)**: Instant
- **Live → Visible (natural cache)**: 5-15 minutes

**Total with hard refresh**: 3-5 minutes
**Total without refresh**: 8-20 minutes

### Troubleshooting Deployments

**"Changes aren't showing"**:
- Solution: Hard refresh browser (Ctrl+Shift+R)
- Reason: Browser/CDN cache

**"Build failed"**:
- Check Vercel dashboard build logs
- Run `npm run build` locally to reproduce
- Fix errors and push again

**"Vercel not deploying"**:
- Check GitHub webhook in Vercel settings
- Verify Vercel project is linked to repo
- Check Vercel dashboard for deployment errors

### Vercel Configuration
- **Branch**: master (auto-deploy enabled)
- **Framework**: Next.js 15.5.3
- **Node Version**: 22.x
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### Required Environment Variables (Vercel)
All environment variables from `.env.production` must be configured in Vercel dashboard:
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_ANTHROPIC_API_KEY
- (See .env.production for complete list)

### Deployment Verification Script
Use `scripts/test-deployment.ts` for comprehensive verification:

```bash
npx tsx scripts/test-deployment.ts
```

Tests performed:
1. ✅ Git status (clean tree)
2. ✅ Package version
3. ✅ Build success
4. ✅ Production URL accessibility
5. ✅ Endpoint functionality
6. ⏳ Vercel deployment status (if credentials available)

### Cache Management
- **HTML**: Cached by browser (invalidate with hard refresh)
- **API responses**: Not cached (revalidate: 0)
- **Static assets**: Cached by CDN (~5 minutes)
- **Images**: Cached aggressively (hours)

To force cache invalidation:
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or wait 15-20 minutes for natural cache expiration

### Success Criteria
Deployment is successful when:
1. ✅ Vercel dashboard shows "Ready"
2. ✅ Build completed without errors
3. ✅ Production URL loads (200 OK)
4. ✅ New features/endpoints are accessible
5. ✅ Version number updated (if changed)

### Rationale
Consistent deployment process ensures:
- **Reliability**: Features deploy predictably
- **Traceability**: Every deployment linked to commit
- **Quality**: Build errors caught before going live
- **Speed**: Automated process takes minutes
- **Confidence**: Verification confirms success
