# Archie - Autonomous Code Maintenance

**A.R.C.H.I.E.** = Autonomous Repository Coding & Housekeeping Intelligence Engine

## What is Archie?

Archie is a simple, practical autonomous agent that keeps kimbleai.com's codebase clean and healthy.

**No approval workflows. No databases. No complexity. Just gets stuff done.**

## What Archie Does

Every hour, Archie:
1. ✓ Scans the codebase for issues
2. ✓ Fixes obvious problems automatically
3. ✓ Commits the changes
4. ✓ Logs what it did

**Auto-Fixes:**
- Linting errors (`npm run lint --fix`)
- Unused imports and dead code
- Patch-level dependency updates (1.2.3 → 1.2.4)
- Simple TypeScript errors (future)

**Doesn't Touch:**
- Major refactoring
- API breaking changes
- Database schema changes
- Anything requiring human judgment

## How It Works

```
┌─────────────────────────────────────┐
│  ARCHIE RUN (Every Hour)            │
├─────────────────────────────────────┤
│                                     │
│ 1. Scan codebase                    │
│    ├─ npm run lint                  │
│    ├─ npx tsc --noEmit              │
│    ├─ npm outdated                  │
│    └─ Find unused imports           │
│                                     │
│ 2. Fix top 5 issues                 │
│    ├─ Auto-fix linting              │
│    ├─ Remove dead code              │
│    └─ Update patch versions         │
│                                     │
│ 3. Commit changes                   │
│    └─ Git commit with details       │
│                                     │
│ 4. Report results                   │
│    └─ Log to console                │
│                                     │
└─────────────────────────────────────┘
```

## Dashboard

View Archie's activity: **https://www.kimbleai.com/agent**

Shows:
- Total fixes made
- Last run time
- Recent commits by Archie
- Manual trigger button

## Manual Trigger

```
GET /api/archie/run?trigger=manual
```

Or click "Run Archie Now" on the dashboard.

## Implementation

**Agent**: `lib/archie-agent.ts`
- Scans for issues
- Fixes them automatically
- Commits changes
- Returns summary

**API**: `app/api/archie/run/route.ts`
- Runs on cron schedule
- Can be triggered manually
- Returns JSON result

**Dashboard**: `app/agent/page.tsx`
- Shows recent activity
- Displays stats
- Manual trigger button

## Schedule

**Cron**: Every hour (`0 * * * *`)
**Platform**: Vercel Cron (or external cron service)

## Safety Features

1. **Max 5 fixes per run** - Prevents going crazy
2. **Dry-run mode** - Test without making changes
3. **Git commits** - Every change is tracked
4. **Rollback ready** - Can revert any commit
5. **Limited scope** - Only touches obvious issues

## Why This Approach?

**Previous agents failed because:**
- Too complex (approval queues, databases)
- Too ambitious (tried to do everything)
- No visibility (ran without oversight)
- No accountability (changes disappeared)

**Archie succeeds because:**
- Simple (one file, one endpoint, one dashboard)
- Focused (only fixes obvious issues)
- Transparent (git commits show everything)
- Accountable (every change is logged)
- Practical (actually useful, not theoretical)

## Philosophy

> "Don't make me think about lint errors. Just fix them."

Archie is a **coding janitor**, not an AI architect. It does the boring maintenance work you don't want to think about, leaving you free to build features.

## Example Output

```json
{
  "success": true,
  "timestamp": "2025-10-31T10:00:00Z",
  "tasksFound": 12,
  "tasksCompleted": 5,
  "improvements": [
    {
      "type": "lint",
      "file": "app/page.tsx",
      "issue": "Missing semicolon",
      "priority": 8
    },
    {
      "type": "dead_code",
      "file": "lib/utils.ts",
      "issue": "Unused import: lodash",
      "priority": 3
    }
  ],
  "commitHash": "abc1234",
  "summary": "Fixed 5/12 issues: 3 lint, 2 dead code"
}
```

## Future Enhancements

- AI-powered code fixes (GPT-4)
- More sophisticated dead code detection
- Automatic test generation
- Performance optimization suggestions
- Security vulnerability scanning

For now: **Keep it simple. Make it work.**

---

**Dashboard**: https://www.kimbleai.com/agent
**Manual Trigger**: `/api/archie/run?trigger=manual`
**Schedule**: Every hour
