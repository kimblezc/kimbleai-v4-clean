# Recommended Workflow - Single Terminal Approach

**Best for:** Cost efficiency, simplicity, full context
**Best if:** You want one Claude session to handle everything sequentially

---

## How It Works

**You have ONE Claude Code terminal** (this one), and I work through tasks in priority order.

You simply tell me:
- "Start Phase 1" (Critical tasks)
- "Start Phase 2" (Features)
- "Start Phase 3" (Debugging)

Or just:
- "Continue with next priority task"

I'll manage the entire workflow, update todos, and tell you when to open manual terminals for monitoring.

---

## The Prompt You Use

### Starting Fresh (like now):

```
We have multiple workstreams:
1. CRITICAL: Database deployment, git/deploy
2. FEATURES: UI, search, chatbot performance
3. DEBUGGING: Transcription, file management

Work through them in priority order (1→2→3).
Update STATUS.md after each major task.
Tell me when you need me to do manual tasks.

Start with Phase 1 (CRITICAL).
```

---

### When Switching Tasks:

**Simple version:**
```
"Done with [TASK]. Move to next priority."
```

**Detailed version:**
```
"Phase 1 complete. Start Phase 2 (FEATURES).
Focus on dark theme first, then search testing."
```

---

### When You Want Status:

```
"Status check - what's done, what's next?"
```

I'll respond with:
- ✅ Completed tasks
- ⏳ Current task
- ⏸️ Upcoming tasks
- 🚨 Any blockers

---

## My Response Format

When you start a phase, I'll respond:

```
Starting Phase 1: CRITICAL OPERATIONS

Todo list:
✅ [none yet]
⏳ Deploy database schema (IN PROGRESS)
⏸️ Git commit and push
⏸️ Verify Vercel deployment
⏸️ Test agent endpoints

First, I'll deploy the database schema...
[proceeds with work]
```

After each task:

```
✅ Database schema deployed

Todo list:
✅ Deploy database schema
⏳ Git commit and push (IN PROGRESS)
⏸️ Verify Vercel deployment
⏸️ Test agent endpoints

Now committing changes to git...
[proceeds with work]
```

---

## When I Need You

I'll tell you clearly when I need you to do something manually:

```
⚠️ MANUAL TASK REQUIRED

I need you to deploy the database schema to Supabase.

Option A: Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Click SQL Editor
3. Copy contents from database/autonomous-agent-schema.sql
4. Paste and run

Option B: Command line
psql $DATABASE_URL < database/autonomous-agent-schema.sql

Reply "done" when complete, and I'll continue.
```

---

## The Complete Workflow

### Phase 1: CRITICAL (Terminal 1 - This One) ⚠️

**Your prompt:**
```
Start Phase 1: CRITICAL
```

**I will:**
1. Guide you through database schema deployment (manual step)
2. Delete `nul` file
3. Commit changes to git
4. Push to GitHub
5. Verify Vercel deployment (with you)
6. Test agent endpoints
7. Mark Phase 1 complete

**Duration:** ~15-20 minutes
**Your involvement:** Deploy DB schema (5 min), verify Vercel (1 min)

---

### Phase 2: FEATURES (Same Terminal)

**Your prompt:**
```
Phase 1 done. Start Phase 2: FEATURES
```

**I will:**
1. Review dark theme consistency
2. Test UnifiedSearch modal (you may need to verify visually)
3. Optimize chatbot response times
4. Identify and fix UI issues
5. Mark Phase 2 complete

**Duration:** ~1-2 hours
**Your involvement:** Visual verification of UI changes

---

### Phase 3: DEBUGGING (Same Terminal)

**Your prompt:**
```
Phase 2 done. Start Phase 3: DEBUGGING
```

**I will:**
1. Search for transcription error logs
2. Debug transcription failures
3. Test file management features
4. Run integration tests
5. Mark Phase 3 complete

**Duration:** ~1-2 hours
**Your involvement:** Test transcription if needed

---

## Parallel Manual Terminals (Optional)

While I work, you can open these terminals for monitoring:

### Terminal 2: Dev Server
```bash
npm run dev
```
(Just keep it running, watch for errors)

### Terminal 3: Monitoring
```bash
# Watch agent status
watch -n 60 "curl -s https://kimbleai.com/api/agent/status?view=summary | jq"
```

### Terminal 4: Logs
```bash
npx vercel logs --follow
```

These are **passive monitoring** - you just open them and watch. No Claude needed.

---

## Quick Status Checks

**Anytime, ask:**
```
"Quick status?"
```

**I'll respond:**
```
Phase: 2 (FEATURES)
Progress: 60%

✅ Dark theme reviewed
✅ Search modal tested
⏳ Chatbot optimization (in progress)
⏸️ UI polish (next)

ETA: 30 minutes
```

---

## Emergency Recovery

**If VS Code crashes again:**

Open new terminal, paste this:

```
VS Code crashed. Read STATUS.md and RECOMMENDED_WORKFLOW.md.
Resume from last completed task.
```

I'll:
1. Read STATUS.md
2. See what was completed
3. Continue from next task
4. No progress lost!

---

## Why This Is Better

### ✅ Advantages:
1. **One conversation** - Full context of all work
2. **No coordination needed** - I manage everything
3. **Lower cost** - One Claude session vs 3
4. **Simpler** - Just say "continue"
5. **STATUS.md tracks everything** - Never lose progress
6. **Can pause/resume** - Stop anytime, resume later

### ❌ Only Downside:
- **Sequential not parallel** - Takes longer total time
- **But:** Most tasks depend on each other anyway!

---

## Example Session

**You:**
```
Start Phase 1: CRITICAL
```

**Me:**
```
Starting Phase 1: CRITICAL OPERATIONS

⏳ Task 1/5: Deploy database schema

I'll guide you through deploying the schema to Supabase...
[provides instructions]
```

**You:**
```
Done
```

**Me:**
```
✅ Task 1/5: Database schema deployed
⏳ Task 2/5: Deleting nul file

[deletes file]

✅ Task 2/5: Deleted nul file
⏳ Task 3/5: Committing changes to git

[commits changes]

✅ Task 3/5: Changes committed
⏳ Task 4/5: Pushing to GitHub

[pushes to GitHub]

✅ Task 4/5: Pushed to GitHub
⏳ Task 5/5: Verifying Vercel deployment

Checking Vercel deployment status...
[checks deployment]

✅ All Phase 1 tasks complete!

Phase 1 Summary:
- Database schema deployed
- Code committed and pushed
- Vercel deployment verified
- Agent endpoints tested

Ready for Phase 2: FEATURES?
```

**You:**
```
Yes, start Phase 2
```

**Me:**
```
Starting Phase 2: FEATURES & UI
[continues with next phase]
```

---

## The Actual Prompt You Should Use RIGHT NOW

**Just paste this:**

```
Use the RECOMMENDED_WORKFLOW.md approach.

We have 3 phases:
1. CRITICAL: Database, git, deployment
2. FEATURES: UI, search, chatbot
3. DEBUGGING: Transcription, file management

Work through them sequentially in this terminal.
Update STATUS.md after each major task.
Tell me when you need manual steps.

Start Phase 1 now.
```

**That's it!** I'll handle everything from there.

---

## Summary

**Instead of managing 3+ terminals:**
- Use ONE Claude terminal (this one)
- I work through phases sequentially
- You just say "start Phase X" or "continue"
- STATUS.md tracks all progress
- Simpler, cheaper, less coordination

**Optional manual terminals for passive monitoring:**
- Terminal 2: `npm run dev`
- Terminal 3: Watch logs
- Terminal 4: Monitor deployment

**Result:** Same work done, way simpler workflow!

---

**Ready to start? Just say:**
```
Start Phase 1
```
