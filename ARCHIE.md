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
- Unused imports and dead code (AI-powered)
- TypeScript syntax errors (AI-powered with retry logic)
- Patch-level dependency updates (1.2.3 → 1.2.4)
- Code optimization issues (AI-powered)

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

## AI-Powered Fixes

Archie uses GPT-4 to fix complex issues that can't be auto-fixed with simple tools:

### What AI Can Fix
- **TypeScript syntax errors** - Missing commas, brackets, type issues
- **Unused imports** - Intelligently removes dead code
- **Code optimization** - Performance improvements, better patterns
- **Complex type errors** - Infers correct types and assertions

### AI Safety Guardrails
1. **Cost limits**: Max $0.50 per run (prevents runaway costs)
2. **Model selection**: Uses `gpt-4o-mini` for cheap fixes, `gpt-4o` for complex ones
3. **Size checks**: Rejects fixes that change file size by >50%
4. **Build validation**: Tests all fixes to ensure they don't break compilation
5. **Retry logic**: 3 attempts with escalating approaches (minimal → aggressive → any-type)
6. **CANNOT_FIX**: AI can refuse unsafe changes

### Cost Tracking
- Estimates tokens before making API calls
- Tracks actual costs using OpenAI usage data
- Reports total cost in summary (e.g., "AI cost: $0.0234")
- Skips fixes if budget exceeded

### How It Works
```typescript
// Attempt 1: Minimal fix with gpt-4o-mini
System: "Fix with MINIMAL changes. Return ONLY fixed code."

// Attempt 2: More aggressive with gpt-4o
System: "First fix failed. Try type assertions, null checks."

// Attempt 3: Last resort
System: "Use 'any' types if needed to make it compile."
```

## Safety Features

1. **Max 5 fixes per run** - Prevents going crazy
2. **AI cost limits** - Max $0.50 per run
3. **Dry-run mode** - Test without making changes
4. **Git commits** - Every change is tracked
5. **Rollback ready** - Can revert any commit
6. **Build validation** - Tests all fixes before committing
7. **Size safety checks** - Rejects drastic changes
8. **Limited scope** - Only touches obvious issues

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
  "timestamp": "2025-11-01T10:00:00Z",
  "tasksFound": 12,
  "tasksCompleted": 5,
  "improvements": [
    {
      "type": "type_error",
      "file": "lib/archie-agent.ts",
      "issue": "',' expected.",
      "priority": 7
    },
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
  "summary": "Fixed 5/12 issues: 1 type error, 3 lint, 1 dead code (AI cost: $0.0234)"
}
```

## Configuration

You can adjust AI behavior in `lib/archie-agent.ts`:

```typescript
// AI Configuration
private useAI: boolean = true;              // Enable/disable AI fixes
private maxAICost: number = 0.50;           // Max $0.50 per run
private aiModel: string = 'gpt-4o-mini';    // Cheap model for simple fixes
private aiModelAdvanced: string = 'gpt-4o'; // Smart model for complex fixes
```

To disable AI fixes entirely:
```typescript
const archie = new ArchieAgent(process.cwd(), false);
archie.useAI = false; // No AI, only simple fixes
```

## Future Enhancements

- ✅ AI-powered code fixes (GPT-4) - **DONE**
- ✅ More sophisticated dead code detection - **DONE**
- ✅ TypeScript error fixing - **DONE**
- Automatic test generation
- Security vulnerability scanning
- Performance profiling integration
- Dependency security audits

## Estimated Costs

With AI enabled:
- **Per run**: $0.01 - $0.05 (typically fixes 1-3 issues)
- **Per month**: ~$1.00 - $3.00 (running hourly, 24/7)
- **Max per run**: $0.50 (hard limit to prevent runaway costs)

Most runs cost under $0.02 because:
- Simple fixes don't use AI (linting, dependencies)
- Uses cheap `gpt-4o-mini` model first
- Only escalates to `gpt-4o` for complex retries
- Cost checks prevent expensive operations

For now: **Keep it simple. Make it smart.**

---

**Dashboard**: https://www.kimbleai.com/agent
**Manual Trigger**: `/api/archie/run?trigger=manual`
**Schedule**: Every hour
