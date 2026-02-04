# KimbleAI Development Rules

## Current Deployment Status

**RULE: This section MUST be updated with every change to verify deployment**

```
Latest Version: v11.9.1
Latest Commit: 21058f0
Last Updated: 2026-02-04
Status: Deployed to Railway (DB SCHEMA FIX)
Live URL: https://www.kimbleai.com
```

### Recent Changes (Last 5 Only):
- **21058f0** (v11.9.1) - FIX: Project creation - priority 'urgent' changed to 'critical' to match DB schema.
- **e6075d5** (v11.9.0) - UI: ChatGPT-style unified sidebar, true dark mode (no blue).
- **572287d** (v11.8.6) - UI: Removed D&D themed labels from projects page.
- **3404baa** (v11.8.5) - GEMINI FIX: Corrected Gemini 3 model IDs (added -preview suffix).
- **4b08450** (v11.8.4) - HAIKU FIX: Corrected Claude Haiku 4.5 model ID (20251001 snapshot date).

**Full Changelog**: See `docs/archive/2025-01-changelog/CLAUDE-CHANGELOG.md`

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

## Key Reminders

- OpenAI GPT-5.x models exist and are in production
- At every change, update both Vx.x.x and commit hash
- Ensure builds are deployed and tested iteratively
- When complete with a task, show what version should appear on the main page
