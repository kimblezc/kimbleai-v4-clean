# KimbleAI Work Organization Guide

**Created:** 2025-10-18
**Status:** Active

---

## Terminal Organization Strategy

### Active Claude Code Sessions (3 recommended)

#### **TERMINAL 1: CRITICAL OPERATIONS** 🚨
**Claude Session:** YES
**Focus:** Autonomous Agent + Database + Deployment

**Tasks:**
- [ ] Deploy Autonomous Agent database schema
- [ ] Verify agent tables created
- [ ] Test agent API endpoints
- [ ] Configure cron job
- [ ] Monitor first agent execution

**Why Critical:**
- Blocks all other features
- Production-breaking if not done
- Requires database access

**Commands:**
```bash
# Database deployment
psql $DATABASE_URL < database/autonomous-agent-schema.sql

# Testing
curl https://kimbleai.com/api/agent/status?view=summary
```

---

#### **TERMINAL 2: FEATURES & UI** 🎨
**Claude Session:** YES
**Focus:** Site Aesthetics + Search + Chatbot Performance

**Tasks:**
- [ ] Review dark theme consistency across app
- [ ] Test UnifiedSearch modal functionality
- [ ] Optimize chatbot response times
- [ ] Improve UI polish and animations
- [ ] Fix any visual bugs

**Why Grouped:**
- All frontend/user-facing work
- Can test together
- Visual changes easy to verify

**Commands:**
```bash
npm run dev
# Test at http://localhost:3000
```

---

#### **TERMINAL 3: DEBUGGING & FIXES** 🔧
**Claude Session:** YES
**Focus:** Transcription + File Management + Testing

**Tasks:**
- [ ] Debug transcription failures
- [ ] Review transcription logs
- [ ] Test file upload/download
- [ ] Improve file searchability
- [ ] Integration testing

**Why Grouped:**
- All debugging/investigation work
- Requires log analysis
- May need multiple test iterations

**Commands:**
```bash
# Check logs
curl https://kimbleai.com/api/logs?type=transcription

# Test transcription
npx tsx scripts/test-transcription.ts
```

---

### Manual Terminals (No Claude)

#### **TERMINAL 4: GIT OPERATIONS** 📦
**Purpose:** Version control and deployment

**Workflow:**
```bash
# Clean up
rm nul

# Commit changes
git add .
git commit -m "feat: Add Autonomous Agent system and search improvements"

# Push to deploy
git push origin master

# Monitor deployment
# Watch Vercel dashboard
```

---

#### **TERMINAL 5: MONITORING** 📊
**Purpose:** Watch production logs and metrics

**Commands:**
```bash
# Vercel logs
npx vercel logs

# Agent status
watch -n 60 "curl -s https://kimbleai.com/api/agent/status?view=summary | jq"

# Check cron executions
# (View in Vercel dashboard)
```

---

#### **TERMINAL 6: LOCAL DEVELOPMENT** 💻
**Purpose:** Run dev server and hot reload

**Commands:**
```bash
npm run dev

# Keep running, watch for:
# - Compilation errors
# - Console warnings
# - Hot reload status
```

---

#### **TERMINAL 7: DATABASE CLIENT** 🗄️
**Purpose:** Manual database queries and verification

**Commands:**
```bash
# Connect to DB
psql $DATABASE_URL

# Verify agent tables
\dt agent_*

# Check agent state
SELECT * FROM agent_state;
```

---

#### **TERMINAL 8: TESTING** 🧪
**Purpose:** Run tests and validation scripts

**Commands:**
```bash
# Type checking
npx tsc --noEmit

# Run tests
npm test

# Custom test scripts
npx tsx scripts/test-*.ts
```

---

## Task Priority Matrix

### 🔴 CRITICAL (Do First - Terminal 1)
1. Deploy Autonomous Agent database schema
2. Commit and push code to GitHub
3. Verify Vercel deployment successful

### 🟡 HIGH (Do Next - Terminal 2)
4. Test UnifiedSearch modal
5. Review site aesthetics/dark theme
6. Optimize chatbot performance

### 🟢 MEDIUM (Do After - Terminal 3)
7. Debug transcription failures
8. Improve file management
9. Integration testing

### 🔵 LOW (Nice to Have)
10. Documentation updates
11. Code cleanup
12. Performance monitoring

---

## Claude Code Coordination

### When Starting a Terminal:

**Tell Claude:**
```
"Terminal X ready. Focus on [TASK CATEGORY].
Here's what other terminals are working on: [summary]"
```

**Example:**
```
"Terminal 1 ready. Focus on CRITICAL OPERATIONS (database schema, deployment).
Terminal 2 is working on UI improvements.
Terminal 3 will handle debugging later."
```

---

### Progress Updates Between Terminals:

**Create a status file that all Claude sessions can read:**

```bash
# In each terminal, Claude updates this:
echo "Terminal 1: Database schema deployed ✅" >> STATUS.md
echo "Terminal 2: Dark theme reviewed ⏳" >> STATUS.md
echo "Terminal 3: Waiting for Terminal 1 ⏸️" >> STATUS.md
```

---

### Handoff Protocol:

**When switching focus:**
1. Current terminal: Mark todos complete
2. You: Read STATUS.md to see what's done
3. Next terminal: Start with context from STATUS.md
4. Claude: Updates STATUS.md when task done

---

## File Organization

### Status Tracking
- `STATUS.md` - Real-time progress (auto-updated by Claude)
- `WORK_ORGANIZATION.md` - This file (strategy guide)
- `DEPLOYMENT_SUMMARY.md` - What was deployed
- `TODO.md` - Master todo list (optional)

### Documentation
- `docs/AUTONOMOUS_AGENT.md` - Agent documentation
- `DEPLOY_AGENT.md` - Agent deployment guide
- `SEARCH-ADDED.md` - Search feature notes

### Scripts
- `scripts/test-*.ts` - Testing scripts
- `scripts/deploy-*.ts` - Deployment scripts

---

## Communication Protocol

### Starting Work in a Terminal:

**You say:**
```
"Terminal 1: Start CRITICAL OPERATIONS"
```

**Claude responds:**
```
"Starting CRITICAL OPERATIONS. First task: Deploy database schema..."
[Uses TodoWrite to track progress]
```

---

### Checking Progress:

**You say:**
```
"Status check all terminals"
```

**Claude responds:**
```
"Reading STATUS.md..."
- Terminal 1: Database schema deployed ✅
- Terminal 2: Dark theme 60% complete ⏳
- Terminal 3: Not started yet ⏸️
```

---

### Coordinating Between Terminals:

**You say:**
```
"Terminal 2: Wait for Terminal 1 database deployment before testing search"
```

**Claude responds:**
```
"Understood. Blocking Terminal 2 tasks until database is ready.
Will focus on non-database tasks (dark theme review) first."
```

---

## Recommended Sequence

### Phase 1: CRITICAL (Terminal 1) - 30 minutes
1. Deploy database schema
2. Commit code to git
3. Push to GitHub
4. Verify Vercel deployment
5. Test agent endpoints

**Blocker:** Nothing else works until this is done!

---

### Phase 2: FEATURES (Terminal 2) - 1-2 hours
1. Test UnifiedSearch modal
2. Review dark theme consistency
3. Optimize chatbot response time
4. UI polish and improvements

**Parallel:** Can work while Terminal 3 debugs

---

### Phase 3: DEBUGGING (Terminal 3) - 1-2 hours
1. Debug transcription failures
2. Test file management
3. Integration testing
4. Bug fixes

**Parallel:** Can work while Terminal 2 does UI work

---

### Phase 4: MONITORING (Manual Terminals) - Ongoing
1. Watch deployment logs
2. Monitor agent executions
3. Check error rates
4. Performance metrics

---

## Success Criteria

### Terminal 1 (CRITICAL) Done When:
- ✅ 5 agent tables exist in database
- ✅ Code pushed to GitHub
- ✅ Vercel shows "Ready" status
- ✅ `/api/agent/status` returns 200
- ✅ Cron job configured in Vercel

### Terminal 2 (FEATURES) Done When:
- ✅ Search modal opens and searches work
- ✅ Dark theme consistent across all pages
- ✅ Chatbot response time < 5 seconds
- ✅ No visual bugs or inconsistencies

### Terminal 3 (DEBUGGING) Done When:
- ✅ Transcription errors identified and logged
- ✅ File upload/download working
- ✅ Search finds files correctly
- ✅ All integration tests pass

---

## Tips for Success

### 1. Use STATUS.md for coordination
Every Claude session reads/writes to this file.

### 2. Clear task boundaries
Don't let Terminal 2 work on database stuff (Terminal 1's job).

### 3. Update todos frequently
Use TodoWrite after EVERY task completion.

### 4. Communicate blockers
Tell Claude when tasks depend on other terminals.

### 5. Test incrementally
Don't wait until everything is done to test.

---

## Emergency Procedures

### If VS Code Crashes Again:
1. Reboot PC (done)
2. Open this file: `WORK_ORGANIZATION.md`
3. Read `STATUS.md` for latest progress
4. Tell Claude: "VS Code crashed. Read STATUS.md and continue from last checkpoint"
5. Claude resumes work from last status update

### If You Lose Track:
```bash
# Check what's been deployed
git log --oneline -10

# Check what's pending
git status

# Check database
psql $DATABASE_URL -c "\dt agent_*"

# Check production
curl https://kimbleai.com/api/agent/status?view=summary
```

---

## Current Session Status

**Date:** 2025-10-18
**Session:** Post-crash recovery

**Terminals Active:**
- Terminal 1: This terminal (Autonomous Agent focus)
- Terminal 2-9: To be created

**Next Steps:**
1. [ ] Create STATUS.md file
2. [ ] Start Terminal 1 (CRITICAL)
3. [ ] Deploy database schema
4. [ ] Git commit and push

---

**Ready to start? Tell me which terminal number this is, and I'll begin!**
