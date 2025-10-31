# Archie 2.0 - Smart Autonomous Agent with Human Oversight

## What Changed from 1.0

**Archie 1.0 (Failed)**: Tried to do everything autonomously → uncontrolled, no visibility, failed silently

**Archie 2.0 (New Design)**: Smart enough to handle small stuff, asks permission for big changes

---

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                   ARCHIE 2.0 WORKFLOW                   │
└─────────────────────────────────────────────────────────┘

1. CodeHealthAnalyzer (runs every 30 min)
   ├─ Scans codebase
   ├─ Generates health score (0-100)
   ├─ Finds issues
   └─ Creates improvement proposals

2. Smart Approval Gate
   ├─ SMALL CHANGES → Auto-approved & executed
   │  • Fix linting errors
   │  • Remove dead code
   │  • Add null checks
   │  • Update patch versions
   │
   └─ BIG CHANGES → Requires your approval
      • API contract changes
      • Database migrations
      • Major refactoring
      • Critical security fixes

3. Executor (runs approved proposals)
   ├─ Creates feature branch
   ├─ Makes changes
   ├─ Runs tests
   ├─ Creates PR or auto-merges (if safe)
   └─ Reports results

4. Validator (runs after deployments)
   ├─ Checks health score
   ├─ Compares before/after
   ├─ Reports success/regression
   └─ Updates metrics
```

---

## Auto-Approved (You never see these)

✅ **Code Cleanup**
- Remove unused imports
- Fix linting/formatting
- Delete dead code
- Fix comment typos

✅ **Safe Dependencies**
- Patch updates only (1.2.3 → 1.2.4)
- Must have passing tests

✅ **Simple Performance**
- Add database indexes
- Add React.memo to pure components
- Basic caching

✅ **Obvious Bug Fixes**
- Add missing null checks
- Fix TypeScript errors with clear solutions
- Add input validation

✅ **Low-Risk Security**
- Basic HTML/SQL sanitization
- Simple input validation

**Safety Limits on Auto-Approve:**
- Max 5 files changed
- Max 50 lines changed
- Must have tests
- Must be "low" severity

---

## Requires Your Approval (Show up on dashboard)

🛑 **Big Changes**
- Major refactoring (>10 files)
- API contract changes
- Database schema changes

🛑 **Risky Updates**
- Major/minor dependency updates
- Breaking changes

🛑 **Critical Fixes**
- High/critical security issues
- Data migrations

🛑 **Architecture**
- New caching layers
- CDN configuration
- Major performance changes

---

## The Dashboard (`/agent`)

```
┌─────────────────────────────────────────────────┐
│ 🦉 Archie 2.0 Dashboard                         │
├─────────────────────────────────────────────────┤
│                                                  │
│ 📊 Code Health: 78/100 (↑5 this week)          │
│                                                  │
│ 🤖 Status:                                      │
│   ✅ Healthy - Last run: 15m ago                │
│   💰 Cost: $2.34 this week                      │
│                                                  │
│ 🔔 NEEDS YOUR APPROVAL (2):                     │
│   [APPROVE] Update React 18.2 → 18.3           │
│   [APPROVE] Refactor auth system (12 files)     │
│                                                  │
│ ✅ AUTO-APPROVED TODAY (7):                     │
│   ✓ Fixed 12 linting errors                     │
│   ✓ Removed 3 unused imports                    │
│   ✓ Added null checks to UserProfile.tsx        │
│   ...                                            │
│                                                  │
│ 📈 This Week:                                   │
│   • 47 improvements deployed                     │
│   • 12 bugs fixed                                │
│   • Health score: 73 → 78 (+5)                  │
│                                                  │
│ [Emergency Stop] [Pause Auto-Execute]           │
└─────────────────────────────────────────────────┘
```

---

## Safety Features

🛡️ **Cost Controls**
- Max $5/day for scanning
- Max $10/day for execution
- Hard stop at limits

🛡️ **Rate Limiting**
- Max 2 scans per hour
- Max 5 executions per day
- Prevents runaway behavior

🛡️ **Emergency Stop**
- Big red button to pause everything
- Kills all running agents
- Prevents auto-approvals

🛡️ **Rollback**
- Every change tracked
- Can revert any change
- Automatic rollback on test failures

🛡️ **Dry-Run Mode**
- Test without making changes
- Preview proposals
- Validate safety rules

---

## Database Schema

**archie_runs** - Execution history
**archie_proposals** - Improvement queue (approved/pending/rejected)
**archie_auto_approval_rules** - What can auto-execute
**archie_safety_limits** - Cost/rate limits
**archie_health_history** - Code health over time
**archie_state** - Persistent settings

---

## Implementation Status

✅ Database schema designed
✅ Auto-approval rules defined
⏳ CodeHealthAnalyzer implementation
⏳ Dashboard UI
⏳ Executor agent
⏳ Validator agent

---

## Migration from 1.0

Run:
```sql
-- Clears old data, creates new schema
\i database/archie-2.0-migration.sql

-- Sets up auto-approval rules
\i database/archie-auto-approval-rules.sql
```

All old Archie 1.0 data is archived to `archie_1_0_archive` table for reference.

---

## Philosophy

> **"Archie should handle the tedious stuff I don't want to think about,
> and only interrupt me for important decisions."**

Small improvements compound over time. Let Archie handle the boring work
(fixing linting, removing dead code, updating patches) while you focus on
architecture and features.

When Archie finds something big, it'll ask. Otherwise, it just quietly
makes your codebase better every 30 minutes.

---

## Next Steps

1. ✅ Run migration SQL
2. Build CodeHealthAnalyzer agent
3. Update `/agent` dashboard with approval UI
4. Test in dry-run mode for 24 hours
5. Enable auto-execute for low-risk rules
6. Monitor for 1 week
7. Gradually enable more auto-approval rules
