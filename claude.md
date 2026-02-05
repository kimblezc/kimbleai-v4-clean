# KimbleAI Development Rules

## Project Location

**RULE: The canonical project directory is `C:\KimbleAI`. Always use this path.**

```
Project Root: C:\KimbleAI
```

This is the permanent, authoritative location for all KimbleAI development. Do not use other paths like `D:\OneDrive\Documents\kimbleai-v4-clean` - those are legacy/backup locations only.

---

## Current Deployment Status

**RULE: This section MUST be updated with every change to verify deployment**

```
Latest Version: v11.9.12
Latest Commit: a5fbf0f
Last Updated: 2026-02-05
Status: Deployed to Railway (MODEL DISPLAY + D20 2X + SIDEBAR FIX)
Live URL: https://www.kimbleai.com
```

### Recent Changes (Last 5 Only):
- **a5fbf0f** (v11.9.12) - FEAT: Show model used in chat responses, 2x D20 size, sidebar shows all chats.
- **62f0053** (v11.9.11) - FEAT: Restore KimbleAI logo and rotating D20 icosahedron to all pages.
- **1aa787a** (v11.9.10) - FIX: Project chat creation - projectId to project_id column mapping.
- **7fb5ea6** (v11.9.9) - FEAT: Automated workflow - preflight checks, deployment verification, enhanced health API.
- **0aa02ef** (v11.9.8) - FEAT: Project-chat integration - clickable projects, back nav, version commit, project context.

**Full Changelog**: See `docs/archive/2025-01-changelog/CLAUDE-CHANGELOG.md`

---

## MANDATORY Development Workflow

**RULE: This workflow is AUTOMATIC and ENFORCED. Execute it for EVERY change without being asked.**

### The Complete Workflow

```
0. PREFLIGHT → 1. READ LOGS → 2. UNDERSTAND → 3. FIX → 4. TEST LOCAL → 5. DEPLOY → 6. VERIFY DEPLOYED → 7. DEBUG/FIX → 8. ITERATE
```

**⚠️ CRITICAL: Do NOT stop until the feature works in production. This is non-negotiable.**

---

### Step 0: Preflight Check (Before ANY Work)
```bash
npm run preflight
```
This checks: git status, dependencies, env vars, version file.

**Always read relevant files BEFORE making changes. Understand existing patterns.**

---

### Step 1: Check Logs for Actual Errors
```bash
railway logs 2>&1 | grep -E "error|ERROR|fail|POST|GET" | tail -30
```
**NEVER guess at fixes. Read the ACTUAL error message first.**

---

### Step 2: Understand the Problem
- Read the relevant source files
- Check existing patterns in the codebase
- Identify ALL affected files upfront
- Use TodoWrite to track tasks

---

### Step 3: Fix the Issue
- Make changes based on ACTUAL errors
- Follow existing code patterns
- Don't over-engineer

---

### Step 4: Test Locally
```bash
npm run build                    # Must pass!
```
If build fails, fix and retry before proceeding.

---

### Step 5: Deploy to Railway
```bash
# Update version.json first
git add -A && git commit -m "fix: Description" && git push origin master
railway up --detach
```

---

### Step 6: Verify Deployment (MANDATORY)
```bash
# Wait for deployment (typically 60-150 seconds)
sleep 120

# Run automated verification
npm run verify:deployed
```

**Note:** Railway deployments typically take 60-150 seconds. If verification shows old version, wait longer.

The verification script checks:
- ✓ Version API returns correct version/commit
- ✓ Health API returns status: ok
- ✓ All services healthy

---

### Step 7: Debug if Needed
If verification fails:
```bash
railway logs 2>&1 | grep -E "error|ERROR" | tail -30
```
Then return to Step 3.

---

### Step 8: Iterate Until Working
**Do not stop. Do not ask permission. Keep fixing until it works.**

---

### Quick Commands Reference
```bash
npm run preflight        # Step 0: Check environment
npm run build           # Step 4: Test locally
npm run deploy          # Steps 5: Build + push + deploy
npm run verify:deployed # Step 6: Verify production
npm run deploy:verify   # Steps 5-6: Full deploy + verify
```

---

### Enforcement Rules

**I MUST automatically:**
1. Run `npm run build` before every commit
2. Run `npm run verify:deployed` after every deployment
3. Check Railway logs if verification fails
4. Continue iterating until all checks pass
5. Update CLAUDE.md status after successful deployment

**I MUST NOT:**
1. Stop after making changes without testing
2. Ask user to manually verify
3. Assume deployment worked without checking
4. Leave broken code in production

---

### Key Principles
- **Don't wait for user screenshots** - check logs yourself
- **Test locally first** - catch errors before deploying
- **Verify deployment is live** - use verify:deployed script
- **Read actual errors** - don't guess at fixes
- **Be autonomous** - keep iterating until it works
- **Update status** - always update CLAUDE.md after deployment

---

## Autonomous Task Execution

**RULE: If you have pending tasks in your todo list, start them immediately. Don't wait for permission.**

### Philosophy
> "If there's work to do, do it. The user shouldn't have to ask twice."

When you have tasks in your todo list with status "pending", you should:
1. **Automatically start** the next pending task when the current task is completed
2. **Don't ask for permission** to continue - the user already asked you to do it
3. **Update the todo list** as you progress through tasks
4. **Only stop and ask** if you encounter ambiguity or need clarification

### When to Stop and Ask:
- You encounter technical ambiguity (multiple valid approaches)
- You need user input (API keys, design preferences, etc.)
- You discover a blocker (missing dependencies, architectural decision needed)
- You finish ALL pending tasks

---

## Task Completion Documentation

**Rule: Always Include Version and Commit Information**

When completing any task, ALWAYS include:

### Required Information:
1. **Current Version** - The version number from `version.json`
2. **Commit Hash** - The git commit hash (short form: first 7 characters)
3. **What Changed** - Brief description of the changes made
4. **Status** - Whether it's committed, deployed, or pending

### Format Example:
```
Task completed
Version: v11.8.3
Commit: a303d3b
Changes: Fixed Claude model IDs
Status: Deployed to https://kimbleai.com
```

### Version Numbering:
Follow semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes or complete phase completions
- **MINOR**: New features, non-breaking changes
- **PATCH**: Bug fixes, small improvements

---

## Auto-Deployment Process

**Rule: Always Deploy After Completing Features**

### Deployment Platform: Railway

### 1. Pre-Deployment Checks
```bash
npm run build
git status
```

### 2. Commit Changes
```bash
git add -A
git commit -m "feat: Description of what changed"
git push origin master
```

### 3. Deploy to Railway
```bash
railway up --detach
```

### 4. Monitor Deployment
```bash
railway logs --tail
```

### 5. Verify Deployment
- Visit https://kimbleai.com
- Test health endpoint: `/api/health`
- Verify version in footer matches expected

### Required Environment Variables
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXTAUTH_SECRET
- NEXTAUTH_URL
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- OPENAI_API_KEY
- ANTHROPIC_API_KEY
- GOOGLE_GENERATIVE_AI_API_KEY (for Gemini)

### Railway CLI Commands
```bash
railway login              # Login
railway up                 # Deploy
railway logs --tail        # Stream logs
railway variables          # List env vars
railway open               # Open dashboard
```

---

## AI Models (2026)

### Available Models
- **GPT-5.2** - Best general intelligence (default)
- **GPT-5.2-Pro** - Highest quality for difficult questions
- **GPT-5.2-Codex** - Advanced coding model
- **Claude Opus 4.5** - Best for coding, agents, computer use
- **Claude Sonnet 4.5** - Code screenshots, UI analysis
- **Claude Haiku 4.5** - Fast, cost-effective
- **Gemini 3 Pro** - Complex reasoning, 1M context
- **Gemini 3 Flash** - Pro-level at Flash speed

### Smart Routing
The model router automatically selects the best model based on:
- Task type (chat, reasoning, creative, vision, code-vision)
- Input size (large inputs route to Gemini for 1M context)
- Quality threshold (standard, high, maximum)
- Budget constraints

---

## UI Requirements

### KimbleAI Logo and D20 Icosahedron
**RULE: Every page within KimbleAI MUST display the rotating wireframe D20 icosahedron and "KimbleAI" text in the upper left.**

Requirements:
- The D20 icon is a geometrically correct wireframe icosahedron (20-sided die) that rotates continuously
- The "KimbleAI" text appears next to the D20
- Clicking EITHER the D20 or the text navigates to the main page (kimbleai.com)
- Component: `components/layout/Logo.tsx`
- Used in: `components/layout/Sidebar.tsx` (appears on all pages with sidebar)

This is non-negotiable branding. If the D20 or KimbleAI text is missing from any page, fix it immediately.

### Version Display
**RULE: Every page within KimbleAI must display the full version and commit hash.**

Format: `vX.X.X @ commit_hash`
Example: `v11.9.4 @ 7be080f`

This should appear in the footer or a consistent location on every page.

---

## Key Reminders

- OpenAI GPT-5.x models exist and are in production
- At every change, update both Vx.x.x and commit hash
- Ensure builds are deployed and tested iteratively
- When complete with a task, show what version should appear on the main page
- **Every page must show version and commit in format `vX.X.X @ commit`**
