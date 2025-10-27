# Session Logs System Design - KimbleAI.com

**Purpose**: Store Claude Code session logs accessible at kimbleai.com to enable seamless work switching between laptop and PC

**Date**: October 27, 2025
**Version**: 6.0.1

---

## Problem Statement

**Current Issue**: When switching between laptop and PC, Claude Code loses context of:
- Previous conversations and decisions made
- Work completed in prior sessions
- Files modified and their locations
- TODOs and task status
- Git commits and deployment history
- Context needed to continue work seamlessly

**Goal**: Create a centralized session log system at kimbleai.com that captures everything needed to resume work on any device.

---

## System Architecture

### 1. Session Log Storage (Database)

**Table: `session_logs`**
```sql
CREATE TABLE session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),

  -- Session metadata
  session_id TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL, -- 'laptop' | 'pc' | 'other'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Context
  project_path TEXT NOT NULL,
  git_branch TEXT,
  git_commit_hash TEXT,
  working_directory TEXT,

  -- Session summary
  title TEXT NOT NULL,
  summary TEXT,
  tags TEXT[],

  -- Detailed logs
  conversation_transcript JSONB, -- Full conversation with Claude
  files_modified TEXT[], -- List of file paths
  git_commits JSONB[], -- Array of commit objects
  todos JSONB[], -- Task list state

  -- Quick reference
  key_decisions TEXT[],
  next_steps TEXT[],
  blockers TEXT[],

  -- Search
  search_vector TSVECTOR,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_logs_user_id ON session_logs(user_id);
CREATE INDEX idx_session_logs_started_at ON session_logs(started_at DESC);
CREATE INDEX idx_session_logs_device ON session_logs(device_name);
CREATE INDEX idx_session_logs_search ON session_logs USING gin(search_vector);
```

---

### 2. Session Capture Component

**Location**: `components/SessionLogger.tsx`

**Functionality**:
- Auto-detects device (laptop vs PC)
- Captures session start/end timestamps
- Records all files modified during session
- Stores git commits made
- Saves TODO list states
- Logs key decisions and actions

**Implementation**:
```typescript
interface SessionLog {
  sessionId: string;
  deviceName: 'laptop' | 'pc';
  startedAt: string;
  endedAt?: string;
  title: string;
  summary: string;

  // Context
  projectPath: string;
  gitBranch: string;
  gitCommit: string;

  // Work done
  filesModified: string[];
  gitCommits: Array<{
    hash: string;
    message: string;
    timestamp: string;
  }>;
  todos: Array<{
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
  }>;

  // Quick reference
  keyDecisions: string[];
  nextSteps: string[];
  blockers: string[];
}

// Auto-capture session data
export function useSessionLogger() {
  useEffect(() => {
    // Start session on mount
    const sessionId = generateSessionId();
    startSession(sessionId);

    // End session on unmount
    return () => endSession(sessionId);
  }, []);
}
```

---

### 3. Session Logs UI

**Page**: `/sessions` or `/logs`

**Features**:
- **List View**: Timeline of all sessions
- **Device Filter**: Show only laptop or PC sessions
- **Search**: Full-text search across all logs
- **Detail View**: Expand to see full session
- **Export**: Download session as markdown
- **Continue**: Quick button to resume context

**UI Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  Session Logs                           [Search] [Filter] │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  📅 Oct 27, 2025 - 3:00 PM - 5:30 PM (2h 30m) [Laptop]  │
│  🎯 Project Management Fixes & Time Zone Display         │
│  ─────────────────────────────────────────────────────  │
│  ✅ Fixed 3 bugs in project deletion                     │
│  ✅ Added 24-hour time zone display                      │
│  📝 Files: 11 modified | Commits: 4 | TODOs: 4 complete │
│                                          [View] [Continue]│
│                                                           │
│  📅 Oct 26, 2025 - 1:00 PM - 4:15 PM (3h 15m) [PC]      │
│  🎯 Archie Agent Optimization                            │
│  ─────────────────────────────────────────────────────  │
│  ✅ Fixed infinite task loop                             │
│  ✅ Added duplicate detection                            │
│  📝 Files: 5 modified | Commits: 2 | TODOs: 6 complete  │
│                                          [View] [Continue]│
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

### 4. Platform Switching Workflow

**Scenario**: Working on PC, need to switch to laptop

**Step 1**: PC saves session
```bash
# Claude Code automatically saves on exit
Session saved: session_abc123
- Files modified: 11
- Commits: 4
- Next steps: 3
```

**Step 2**: Laptop loads latest session
```bash
# On laptop, visit kimbleai.com/sessions
# Click "Continue" on latest PC session
# Claude Code receives context:
```

**Context Provided to New Instance**:
```markdown
# Session Context from PC (2 hours ago)

## What Was Done
- Fixed project deletion bugs (3 critical issues)
- Added 24-hour time zone display to main pages
- Updated labels: Germany, NC, NV

## Files Modified
1. app/page.tsx (time zone integration)
2. app/api/projects/delete/route.ts (database deletion)
3. components/TimeZoneDisplay.tsx (new component)
... (8 more)

## Git Commits
- 58099dc: "fix: Complete project deletion with database cleanup"
- 9cd2458: "feat: Add 24-hour time zone display"
- 50499de: "fix: Update time zone labels to Germany, NC, and Nevada"
- 623a068: "docs: Add deployment summary"

## Current State
- Working directory: C:\Users\zachk\OneDrive\Documents\kimbleai-v4-clean
- Branch: master (up to date with origin)
- Last commit: 623a068
- Build: Successful
- Deployed: Production (Vercel)

## Next Steps
1. Monitor production deployment
2. Test time zones on live site
3. Verify project deletion works in production

## TODOs Completed
✅ Add 24-hour time display component
✅ Integrate into main pages
✅ Fix project deletion bugs
✅ Deploy to production
```

---

## Implementation Plan

### Phase 1: Database Setup ✅ Can Do Now
```sql
-- Add to existing migration or create new
-- tables/session_logs.sql
```

### Phase 2: API Endpoints
**Create**:
- `POST /api/sessions` - Start new session
- `PATCH /api/sessions/:id` - Update session (add files, commits, etc.)
- `POST /api/sessions/:id/end` - End session with summary
- `GET /api/sessions` - List all sessions (paginated, filtered)
- `GET /api/sessions/:id` - Get session details
- `GET /api/sessions/latest` - Get most recent session

### Phase 3: Auto-Capture Logic
**Integrate with existing systems**:
- Hook into git commits (capture automatically)
- Hook into file saves (track modifications)
- Hook into TODO updates (save state)
- Capture conversation with Claude Code

### Phase 4: UI Pages
- `/sessions` - List view
- `/sessions/:id` - Detail view
- `/sessions/continue/:id` - Resume session context

### Phase 5: Claude Code Integration
**Generate session summary markdown** that includes:
- All context needed to continue
- Links to files and commits
- Current branch and git state
- TODOs and next steps

---

## Data Capture Points

### 1. Session Start
```typescript
// Capture immediately when Claude Code starts
{
  sessionId: uuid(),
  deviceName: detectDevice(), // laptop | pc
  startedAt: new Date(),
  projectPath: process.cwd(),
  gitBranch: await git.branch(),
  gitCommit: await git.log(['-1', '--format=%H']),
}
```

### 2. During Session
```typescript
// Update continuously as work happens
{
  filesModified: trackFileChanges(),
  gitCommits: watchGitCommits(),
  todos: getCurrentTodoState(),
  conversationTranscript: captureMessages(),
}
```

### 3. Session End
```typescript
// Generate summary when closing
{
  endedAt: new Date(),
  duration: calculateDuration(),
  summary: generateAISummary(), // Use Claude to summarize
  keyDecisions: extractKeyDecisions(),
  nextSteps: extractNextSteps(),
  blockers: extractBlockers(),
}
```

---

## AI-Generated Session Summaries

**Use Claude API to auto-generate**:
```typescript
async function generateSessionSummary(session: SessionLog): Promise<string> {
  const prompt = `
    Analyze this coding session and create a concise summary:

    Duration: ${session.duration} minutes
    Files Modified: ${session.filesModified.length}
    Git Commits: ${session.gitCommits.length}

    Conversation:
    ${session.conversationTranscript}

    Generate:
    1. Brief title (5-10 words)
    2. Summary paragraph (2-3 sentences)
    3. Key accomplishments (bullet points)
    4. Next steps (3-5 items)
    5. Any blockers or issues
  `;

  const summary = await callClaudeAPI(prompt);
  return summary;
}
```

---

## Search & Filtering

### Full-Text Search
```typescript
// Search across all session content
GET /api/sessions?q=project+deletion

// Returns sessions matching:
// - Title
// - Summary
// - File paths
// - Commit messages
// - Conversation content
```

### Filters
```typescript
GET /api/sessions?device=laptop&date_from=2025-10-01&tags=bug-fix
```

### Sort Options
- Most recent first (default)
- Longest duration
- Most files modified
- Most commits

---

## Platform Detection

**Auto-detect device**:
```typescript
function detectDevice(): 'laptop' | 'pc' | 'other' {
  const hostname = os.hostname();

  // Check environment variables or hostnames
  if (hostname.includes('laptop') || process.env.DEVICE === 'laptop') {
    return 'laptop';
  }
  if (hostname.includes('desktop') || hostname.includes('pc')) {
    return 'pc';
  }

  // Ask user on first run
  return askUserDevice();
}
```

---

## Continue Session Feature

**"Continue" Button Flow**:

1. User clicks "Continue" on session from 2 days ago
2. System generates context document:
   ```markdown
   # Resume Context: Oct 25 Session (PC)

   ## Git State
   - Branch: master
   - Last commit: abc123
   - Status: Clean (no uncommitted changes)

   ## Files You Were Working On
   1. app/api/projects/route.ts (modified)
   2. components/ProjectList.tsx (new file)

   ## What You Accomplished
   - Created project list component
   - Added filtering by status
   - Fixed pagination bug

   ## Where You Left Off
   - Next: Add project sorting
   - TODO: Write tests for ProjectList
   - Blocker: Need API endpoint for bulk actions

   ## How to Resume
   1. Pull latest: `git pull origin master`
   2. Check out branch: `git checkout feature/projects`
   3. Review changes: `git diff abc123..HEAD`
   4. Continue with TODOs above
   ```

3. New Claude Code instance receives this context
4. User can immediately continue where they left off

---

## Storage Considerations

### Size Estimates
- Average session: ~500 KB (with full transcript)
- Sessions per day: 2-4
- Monthly storage: ~30-60 MB
- Yearly storage: ~360-720 MB

### Retention Policy
- Keep all sessions for 90 days
- Archive older sessions (compress, move to cold storage)
- Never delete (valuable historical context)

---

## Security & Privacy

### Access Control
- Sessions are user-scoped (only show your own)
- API requires authentication
- Sensitive data filtered (API keys, passwords)

### Data Sanitization
```typescript
function sanitizeSession(session: SessionLog): SessionLog {
  // Remove sensitive data before storing
  return {
    ...session,
    conversationTranscript: sanitizeConversation(session.conversationTranscript),
    filesModified: session.filesModified.map(sanitizePath),
  };
}

function sanitizeConversation(transcript: any): any {
  // Remove API keys, tokens, passwords
  const sensitivePatterns = [
    /sk-[a-zA-Z0-9]{48}/g, // OpenAI keys
    /ghp_[a-zA-Z0-9]{36}/g, // GitHub tokens
    /Bearer [a-zA-Z0-9-_]+/g, // Bearer tokens
  ];

  let cleaned = JSON.stringify(transcript);
  sensitivePatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '[REDACTED]');
  });

  return JSON.parse(cleaned);
}
```

---

## Quick Start Implementation

### Minimal Viable Product (MVP)

**Phase 1: Manual Logging** (Can do today)
1. Create session_logs table ✅
2. Add manual "Save Session" button
3. Simple form: title, summary, next steps
4. Store in database
5. List view at /sessions

**Phase 2: Auto-Capture** (Next week)
1. Hook into git commits
2. Track file modifications
3. Save TODO state
4. Auto-detect device

**Phase 3: AI Summaries** (Following week)
1. Integrate Claude API
2. Auto-generate summaries
3. Extract key decisions
4. Suggest next steps

---

## Example: Today's Session

```json
{
  "sessionId": "session_2025-10-27_1500",
  "deviceName": "laptop",
  "startedAt": "2025-10-27T15:00:00Z",
  "endedAt": "2025-10-27T17:30:00Z",
  "durationMinutes": 150,

  "projectPath": "/Users/zach/kimbleai-v4-clean",
  "gitBranch": "master",
  "gitCommit": "623a068",

  "title": "Project Management Fixes & Time Zone Display",
  "summary": "Fixed 3 critical bugs in project deletion system and added real-time 24-hour time zone display showing Germany, NC, and NV across main pages.",

  "filesModified": [
    "app/page.tsx",
    "app/api/projects/delete/route.ts",
    "components/TimeZoneDisplay.tsx",
    "app/costs/page.tsx",
    "app/dashboard/page.tsx",
    "PROJECT_DELETION_6_PHASES_VERIFICATION.md",
    "PROJECT_MANAGEMENT_TEST_RESULTS.md",
    "TIMEZONE_FEATURE_ADDED.md",
    "DEPLOYMENT_SUMMARY_2025-10-27.md"
  ],

  "gitCommits": [
    {
      "hash": "58099dc",
      "message": "fix: Complete project deletion with database cleanup",
      "timestamp": "2025-10-27T16:10:00Z"
    },
    {
      "hash": "9cd2458",
      "message": "feat: Add 24-hour time zone display",
      "timestamp": "2025-10-27T16:24:00Z"
    },
    {
      "hash": "50499de",
      "message": "fix: Update time zone labels to Germany, NC, and Nevada",
      "timestamp": "2025-10-27T16:26:00Z"
    },
    {
      "hash": "623a068",
      "message": "docs: Add deployment summary",
      "timestamp": "2025-10-27T16:30:00Z"
    }
  ],

  "todos": [
    {"content": "Fix project deletion bugs", "status": "completed"},
    {"content": "Add time zone display", "status": "completed"},
    {"content": "Deploy to production", "status": "completed"}
  ],

  "keyDecisions": [
    "Use dedicated /api/projects/delete endpoint instead of generic projects API",
    "Add database deletion query to prevent ghost projects",
    "Change time zone labels from abbreviations to location names",
    "Deploy immediately to production after testing"
  ],

  "nextSteps": [
    "Monitor production deployment for errors",
    "Test time zones display on live site",
    "Verify project deletion works in production",
    "Consider adding user-selectable time zones"
  ],

  "blockers": []
}
```

---

## Conclusion

This session logs system will enable seamless switching between laptop and PC by:

1. ✅ **Capturing all context** - Everything Claude needs to continue
2. ✅ **Searchable history** - Find any past session instantly
3. ✅ **AI summaries** - Quick understanding of what was done
4. ✅ **Platform agnostic** - Works on any device
5. ✅ **Centralized storage** - Accessible at kimbleai.com

**Next Steps**:
1. Create session_logs table
2. Build basic UI at /sessions
3. Add manual "Save Session" button
4. Test with next laptop ↔ PC switch

---

**Design Complete**: Ready for implementation
**Estimated Implementation Time**: 2-3 sessions
**Priority**: High (enables key workflow improvement)
