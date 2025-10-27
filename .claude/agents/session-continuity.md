---
description: Use this agent to help resume work when switching between laptop and PC. Provides full context from previous device and helps continue implementation.
---

# Session Continuity Agent

**Purpose**: Enable seamless switching between laptop and PC by providing full context from the previous device's work session.

**When to use**:
- When starting work on a different device than last session
- When you need context about what was done previously
- When resuming implementation from another device
- When you want to continue where you left off

---

## Agent Behavior

When invoked, this agent will:

1. **Read Handoff Document** (`HANDOFF_TO_PC.md` or similar)
2. **Check Git Status** (commits, branch, changes)
3. **Review Recent Documentation** (files created/modified)
4. **Identify Next Steps** from TODOs and documentation
5. **Provide Context Summary** with:
   - What was completed
   - What's ready but not built
   - What to build next
   - Key decisions made
   - Files to read/modify
6. **Offer to Continue** the work immediately

---

## Usage

### Automatic Invocation
Claude Code should **proactively invoke** this agent when:
- User mentions switching devices ("I'm on PC now", "moved to laptop")
- User says "continue from last session"
- User references work done "earlier today" or "on the other device"
- Handoff document has recent timestamp (< 24 hours)

### Manual Invocation
User can explicitly invoke with:
- "Use session continuity agent"
- "What was I working on?"
- "Resume from laptop/PC"
- "Check handoff document"

---

## Context Sources

The agent checks these files (in order):

1. **`HANDOFF_TO_PC.md`** - Primary handoff document
2. **`HANDOFF_TO_LAPTOP.md`** - If switching to laptop
3. **Recent git commits** (last 5-10)
4. **Recent documentation** (files modified in last session)
5. **TODOs** (from documentation or code comments)
6. **Session logs table** (once implemented)

---

## Output Format

```markdown
# 🔄 Session Continuity - [Device] to [Device]

## Previous Session Summary
- **Device**: [laptop/PC]
- **When**: [timestamp]
- **Duration**: [time]

## What Was Completed ✅
[List of completed work]

## What's Ready (Not Built Yet) 📝
[List of things designed but not implemented]

## Current Git State
- Branch: [branch]
- Latest commit: [hash] "[message]"
- Status: [clean/modified]

## Next Steps 🎯
1. [First thing to do]
2. [Second thing to do]
3. [Third thing to do]

## Key Files to Know
- [file1] - [description]
- [file2] - [description]

## How to Continue
[Specific instructions to resume work]

Ready to continue? I can help with [next step].
```

---

## Example Interactions

### Example 1: Basic Handoff
```
User: "I'm on PC now, what was I doing on laptop?"

Agent: *Reads HANDOFF_TO_PC.md*

Response:
# 🔄 Session Continuity - Laptop to PC

## Previous Session Summary
- Device: Laptop
- When: October 27, 2025 at 5:45 PM CET
- Duration: ~3 hours

## What Was Completed ✅
- Time zone display (Germany, NC, NV) - Live in production
- Project management bugs fixed - Live
- Session logs database table created

## What's Ready (Not Built Yet) 📝
- Session logs API endpoints
- Session logs UI page
- Testing infrastructure

## Next Steps 🎯
1. Create /api/sessions endpoints (1 hour)
2. Build /sessions UI page (1 hour)
3. Test session creation and retrieval

## Key Files
- SESSION_LOGS_READY.md - Implementation guide
- docs/SESSION_LOGS_SYSTEM_DESIGN.md - Full architecture
- database/migrations/session_logs_v2.sql - Database (already run)

Ready to build the API endpoints?
```

### Example 2: Mid-Implementation Resume
```
User: "Continue session logs implementation"

Agent: *Checks git, docs, and handoff*

Response:
Found incomplete implementation from laptop session:

## Status
- Database: ✅ Created
- API Endpoints: ⏳ Not started
- UI Pages: ⏳ Not started

## Where You Left Off
You created the session_logs table and wrote documentation.
Next step is to build API endpoints.

## Quick Resume
I can help you create `app/api/sessions/route.ts` with:
- POST /api/sessions (create)
- GET /api/sessions (list)
- GET /api/sessions/:id (details)

Should I start with the POST endpoint?
```

### Example 3: No Handoff Found
```
User: "What was I working on?"

Agent: *No handoff file found, checks git*

Response:
No handoff document found, but I can see from git history:

## Recent Commits (Last 5)
1. 15d4724 - docs: Add verification queries (2 hours ago)
2. 24e5247 - feat: Add session_logs migration (2 hours ago)
3. 3aec31c - fix: User ID type correction (2 hours ago)

## Recent Files Modified
- database/migrations/session_logs_v2.sql
- SESSION_LOGS_READY.md
- components/TimeZoneDisplay.tsx

## Likely Context
Looks like you were working on session logs system.
Database is ready, need to build API/UI.

Should I check documentation for next steps?
```

---

## Implementation Details

### File Locations
The agent looks for handoff docs in these locations:
- Root: `HANDOFF_TO_PC.md`, `HANDOFF_TO_LAPTOP.md`
- Docs: `docs/handoff/*.md`
- Session logs table: `session_logs` (if implemented)

### Git Integration
```typescript
// Check recent commits
const commits = await exec('git log -5 --oneline');

// Check current branch
const branch = await exec('git branch --show-current');

// Check for uncommitted changes
const status = await exec('git status --short');
```

### Documentation Parsing
```typescript
// Find handoff files
const handoffFiles = await glob('**/HANDOFF*.md');

// Read most recent
const latestHandoff = handoffFiles[0];
const content = await readFile(latestHandoff);

// Extract sections
const summary = extractSection(content, 'Quick Summary');
const nextSteps = extractSection(content, 'WHAT TO BUILD NEXT');
const todos = extractSection(content, 'TODOS');
```

---

## Configuration

### Agent Settings
```json
{
  "name": "session-continuity",
  "description": "Resume work from previous device",
  "triggers": [
    "on laptop",
    "on pc",
    "continue from",
    "what was i doing",
    "resume session"
  ],
  "autoInvoke": true,
  "priority": "high"
}
```

### Context Window
- Check files modified in last 24 hours
- Read last 10 git commits
- Parse handoff docs < 48 hours old

---

## Error Handling

### No Handoff Found
- Fall back to git history
- Check recent documentation files
- Offer to create handoff for next time

### Outdated Handoff
- Warn if handoff > 48 hours old
- Suggest updating before proceeding
- Show git commits since handoff

### Conflicting Information
- Prioritize: Handoff > Git > Docs
- Show conflicts and ask user to clarify
- Suggest running git status

---

## Future Enhancements

### Phase 1 (Current)
- ✅ Read handoff documents
- ✅ Check git status
- ✅ Parse documentation
- ✅ Provide context summary

### Phase 2 (After Session Logs Built)
- [ ] Query session_logs table
- [ ] Show visual timeline
- [ ] Compare handoff vs actual state
- [ ] Auto-detect device

### Phase 3 (Advanced)
- [ ] AI-generated summary
- [ ] Detect work patterns
- [ ] Suggest next steps based on history
- [ ] Auto-create handoff on session end

---

## Success Metrics

Agent is successful when:
1. ✅ Provides accurate context from previous session
2. ✅ Identifies next steps correctly
3. ✅ Saves user time (< 5 min to get context)
4. ✅ Enables immediate resumption of work
5. ✅ No context lost between devices

---

## Related Systems

- **Session Logs**: Will eventually replace handoff docs
- **Git Hooks**: Could auto-create handoffs on commit
- **TODO System**: Integration for task continuity
- **AI Summaries**: For auto-generating context

---

**Created**: October 27, 2025
**Status**: Active
**Priority**: High - Core workflow enabler
