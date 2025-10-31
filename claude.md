# KimbleAI Development Rules

## 🚀 Current Deployment Status

**RULE: This section MUST be updated with every change to verify deployment**

```
Latest Version: v7.6.4
Latest Commit: 79d7ac3
Last Updated: 2025-10-31
Status: ✅ Deployed to Production
Live URL: https://www.kimbleai.com
```

### Recent Changes:
- **79d7ac3** (v7.6.4) - CRITICAL FIX: React Error #310 resolved with shuffled queue approach - Moved shuffleArray outside component, use ref-based queue of shuffled indices, empty dependency array prevents recreation, maintains full random non-repeating feature
- **00ba6e9** (v7.6.3) - FEATURE: Fantasy-themed fonts - Replaced Inter/Space Grotesk with Cinzel (elegant Roman serif for headers) and Crimson Text (readable serif for body), improved typography with 16px base size, 1.6 line-height, and letter-spacing for D&D rulebook aesthetic
- **8a2f887** (v7.6.2) - HOTFIX: Empty dependency array fix - Changed useEffect from [currentFactIndex] to [] to prevent re-creation on every fact change, uses functional setState for prevIndex access
- **1d43080** (v7.6.2) - HOTFIX: React Error #310 crash - Fixed infinite render loop caused by nested state updates in D&D facts rotation, imported missing useRef hook, refactored to use useRef for tracking used indices (single state update per interval)
- **1b5b670** (v7.6.1) - FEATURE: 20 D&D facts with smart rotation - Expanded to 20 curated facts mixing surface-level and deep lore (THAC0, Vecna, Lady of Pain, Spelljammer, Blood War), smart rotation tracks used facts and never repeats until all shown, provides 2min 40sec of unique content before any repeats
- **39ca25b** (v7.6.0) - FEATURE: Rotating D&D facts on empty state - Removed large "KimbleAI" branding from center, added 10 rotating D&D facts that change every 8 seconds, kept time-based greetings, cleaner minimal UI, changed input placeholder to "Ask me anything..."
- **7ce3fa4** (v7.5.7) - HOTFIX: Fixed TypeError in conversation sorting - Added defensive null checks for conversations without timestamps, prevents 'Cannot read properties of undefined (reading getTime)' error
- **38e311d** (v7.5.6) - UX: Added timestamps to conversation sidebar + sorted conversations newest to oldest - Shows relative time (e.g., '2h ago') for each chat, conversations now properly sorted within each group
- **60b37e5** (v7.5.5) - HOTFIX: Fixed 500 error on page load - Improved error handling with detailed logging, added minimal field fallback query, JavaScript-based sorting backup, resilient timestamp handling using message timestamps when conversation timestamps missing
- **5322b57** (v7.5.4) - FINAL FIX: Removed ALL hardcoded user lookups + fixed userId dependency + chronological sorting - Fixed useMessages dependency array, replaced all hardcoded user queries with getUserByIdentifier in conversations & chat APIs, added full timestamps with newest-first sorting, created cleanup script for orphaned conversations
- **af78dbf** (v7.5.3) - FIX: Added robust error handling and filtered test conversations - Graceful 404 handling, removed test data from sidebar
- **d459cd0** (v7.5.2) - FIX: Added GET method to conversations API - Eliminates 405 errors, enables proper conversation loading with messages
- **1f0b147** (v7.5.1) - CRITICAL HOTFIX: Fixed circular dependency causing "Cannot access 'c' before initialization" - Moved useEffect after function definitions
- **ee47d21** (v7.5.0) - FEATURE: Auto-load conversation messages when clicking sidebar chats - Added useEffect to automatically fetch and display old conversations
- **72da669** (v7.4.7) - CRITICAL FIX: Use user.id UUID instead of userId string in projects API - Fixed 500 errors by using actual UUID from user object for owner_id, created_by, assigned_to fields
- **5dd16a4** (v7.4.6) - COMPREHENSIVE FIX: Complete UUID handling across all API endpoints - Added getUserByIdentifier() helper, fixed delete/edit authorization on projects/tags, eliminated all UUID errors
- **78ee567** (v7.4.5) - COMPREHENSIVE FIX: Added flexible user ID mapper (mapUserIdentifier) to handle UUIDs, friendly IDs, and names - eliminates recurring UUID mismatch errors across entire codebase
- **2076386** (v7.4.4) - FIXED: Project delete returning 403 Forbidden - corrected column name from user_id to owner_id in /api/projects/delete authorization check
- **a88ca85** (v7.4.3) - CRITICAL FIX: Added ANTHROPIC_API_KEY fallback to prevent 503 errors when Claude models selected without credentials
- **d4d6069** (v7.4.2) - CRITICAL FIX: ModelSelector error handling - Fixed 503 errors by adding robust fallback logic
- **c358233** (v7.4.1) - DEBUG: Temporarily bypassed ModelSelector to isolate 503 cause
- **0342d07** (v7.4.1) - BUGFIX: Removed duplicate DESKTOP-UN6T850 route files causing 503/500 API errors
- **265e08e** (v7.4.0) - Smart model selection system + Tags feature + MCP cleanup (see full details below)
- **4487124** (v7.3.5) - Added SSE streaming to chat API - messages now display in real-time with typing animation
- **323d5b3** (v7.3.4) - Switched default model back to Claude Sonnet 4.5 after Anthropic credits added
- **5b9e36e** (v7.3.3) - Fixed chat API request format - useMessages now sends correct messages array
- **927777e** (v7.3.2) - Fixed critical chat endpoint crash caused by undefined mcpTools reference
- **58b17b7** (v7.3.1) - Added project rename and delete with inline action buttons (✏️ 🗑️)
- **44b1e9f** (v7.3.0) - Version tracking update for integrated features
- **4cd2712** (v7.3.0) - Integrated tag and project systems with D20 in header - Full CRUD + tag management UI
- **8e79aca** (v7.2.0) - Complete page.tsx refactoring: 4,041 → 430 lines (89% reduction) with custom hooks
- **72c26ab** (v6.1.4) - Fixed syntax error in MCP stdio logging, updated NEXTAUTH_URL to Railway
- **d34f2f0** (v6.1.4) - Added enhanced stdio process logging for MCP debugging (had syntax error)
- **aa6a1e4** (v6.1.3) - Fixed MCP popup errors: Replaced alert() with toast notifications, added detailed error logging
- **1b8a853** (v6.1.0) - Railway migration complete: Fixed broadcastActivity imports, deployed successfully with MCP stdio support
- **4fd5c74** (v6.1.0) - Fixed Select component exports for workflow compatibility
- **ef3c114** (v6.1.0) - Fixed initial broadcastActivity import errors in mcp-tool-executor
- **4559253** (v6.1.0) - Railway migration preparation: Configuration, scripts, and documentation for MCP stdio support
- **b8770c5** (v6.0.10) - Fixed MCP manager timeouts by adding initializeWithoutConnect method
- **fa7ff80** (v6.0.9) - Fixed MCP manager auto-initialization on serverless cold starts
- **069cb1a** (v6.0.8) - Added error logging to MCP servers GET endpoint to debug 500 error
- **755f924** (v6.0.7) - Added comprehensive error logging for project deletion and MCP installation debugging
- **7ed63ae** (v6.0.6) - Fixed MCP filesystem server installation (process.cwd() browser error)
- **94c34db** (v6.0.5) - Fixed project deletion with cascading deletes for related records

### v7.4.0 Detailed Feature Breakdown:
**Smart Model Selection System:**
- Intelligent model selector with task complexity analysis (simple/medium/complex)
- Automatic task type detection (coding, analysis, creative, reasoning, file_processing)
- User preference support (cost/speed/quality optimization)
- Integrated Claude (Sonnet 4.5, Haiku, Opus) and GPT models
- Performance tracking and cost monitoring per model
- Automatic fallback handling for unavailable models

**Tags System:**
- Full CRUD API for tags (/api/tags, /api/tags/stats)
- Tags management UI at /app/tags
- Tag utilities library (lib/tag-utils.ts)
- Database migration (add-tags-table.sql)
- Tag associations for conversations and projects

**React Hooks & Utilities:**
- useConversations.ts - Conversation management hook
- useMessages.ts - Message handling hook
- useProjects.ts - Project operations hook
- lib/chat-utils.ts - Chat utility functions

**MCP System Cleanup:**
- Archived all MCP docs to docs/archive/mcp-removed-2025-10-30/
- Removed deprecated MCP endpoints and components
- Database cleanup script (cleanup-mcp.sql)
- Preserved documentation for future reference

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

Railway doesn't have built-in cron scheduling like Vercel. Options:

1. **External cron service**: Use cron-job.org or similar
2. **Node-cron**: Implement in-process scheduling
3. **Railway Cron plugin**: Use Railway's cron service (if available)

Current approach: Keep Vercel cron endpoints active, point them to Railway URLs.

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