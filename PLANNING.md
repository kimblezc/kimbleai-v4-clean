# KimbleAI Project Planning Guide

## How to Use Claude Code for Effective Planning

### The Planning Philosophy

**DON'T** jump straight into coding. **DO** plan systematically first.

**Good Workflow:**
1. Define the problem clearly
2. Break into categories
3. Identify dependencies
4. Create task list
5. Implement incrementally
6. Test continuously

**Bad Workflow:**
1. Start coding immediately
2. Realize dependencies mid-implementation
3. Refactor repeatedly
4. Lose track of what's done

### Use Plan Mode

Claude Code has a **Plan Mode** specifically for this:

```
/plan [describe what you want to build]
```

**Example:**
```
/plan Add transcription download feature with speaker separation
```

Claude will:
- Break down the requirements
- Identify necessary files and changes
- Create a step-by-step implementation plan
- Ask clarifying questions
- Present for your approval

**Then use:**
```
/tasks
```

To see the plan converted to actionable tasks.

---

## Project Categories for KimbleAI

Your project has these main categories:

### 1. **Transcription & Download**
**Location:** `app/api/transcribe/`, `app/components/`
**Features:**
- Audio transcription via AssemblyAI
- Speaker detection and separation
- Export to Google Drive
- Download as formatted document

**Key Files:**
- `app/api/transcribe/assemblyai/route.ts` - Main transcription logic
- `app/api/transcribe/save-to-drive/route.ts` - Drive export
- `app/page.tsx` - UI for transcription

**Planning Tip:** Always consider:
- What if the file is too large?
- What if Drive export fails?
- How do we handle speaker separation errors?

### 2. **Project Management Within Chat**
**Location:** `app/page.tsx`, `app/api/chat/`
**Features:**
- Project-based conversations
- Tag system for categorization
- Conversation history
- Context persistence

**Key Files:**
- `app/page.tsx` - Main chat interface
- `app/api/chat/route.ts` - Chat API
- Database tables: `conversations`, `projects`

**Planning Tip:** Consider:
- How do projects relate to conversations?
- When should we auto-create vs manually create projects?
- How to search/filter by project?

### 3. **Calendar Integration**
**Location:** `app/api/calendar/`
**Features:**
- Google Calendar sync
- Event creation from chat
- Reminders and notifications

**Key Files:**
- `app/api/calendar/` - Calendar API routes
- OAuth scopes in `app/api/auth/[...nextauth]/route.ts`

**Planning Tip:** Consider:
- OAuth token refresh
- Time zone handling
- Conflict detection

### 4. **Gmail Integration**
**Location:** `app/api/gmail/`
**Features:**
- Email reading and search
- Draft creation
- Label management

**Key Files:**
- `app/api/gmail/` - Gmail API routes
- OAuth scopes for gmail.readonly

**Planning Tip:** Consider:
- Rate limiting
- Privacy/security
- Large mailbox performance

### 5. **Drive Management**
**Location:** `app/api/drive/`
**Features:**
- File browsing
- Upload/download
- Search and organization

**Key Files:**
- `app/api/drive/` - Drive API routes
- Drive export from transcription

**Planning Tip:** Consider:
- File size limits
- Folder permissions
- Duplicate handling

### 6. **Aesthetics & UI**
**Location:** `app/components/`, `app/globals.css`
**Features:**
- Consistent design system
- Responsive layout
- Dark theme
- Loading states

**Key Files:**
- `app/components/` - Reusable UI components
- `app/globals.css` - Global styles
- `tailwind.config.js` - Tailwind configuration

**Planning Tip:** Consider:
- Mobile vs desktop
- Accessibility
- Performance (bundle size)

### 7. **Cost Tracker**
**Location:** `app/costs/`, `app/api/costs/`
**Features:**
- API usage tracking
- Budget alerts
- Usage analytics

**Key Files:**
- `app/costs/page.tsx` - Cost dashboard
- `app/api/costs/route.ts` - Cost tracking API
- Database: `ai_costs` table

**Planning Tip:** Consider:
- Real-time vs batch tracking
- Alert thresholds
- Historical data retention

### 8. **Autonomous Agents**
**Location:** `lib/autonomous-agent.ts`, `app/api/agent/`
**Features:**
- Background monitoring
- Automatic improvements
- Error detection and fixing

**Key Files:**
- `lib/autonomous-agent.ts` - Core agent logic
- `app/api/agent/cron/route.ts` - Scheduled execution
- `.github/workflows/trigger-archie.yml` - GitHub Actions trigger

---

## Lessons from Archie (The Autonomous Agent)

### ✅ What Archie Did Well

1. **Self-Contained Execution**
   - Runs independently via cron
   - Doesn't require manual intervention
   - Persists state in database

2. **Structured Data Model**
   - Clear separation: findings (insights) vs tasks (actions)
   - Priority system for task queue
   - Status tracking (pending → in_progress → completed)

3. **Comprehensive Logging**
   - All actions logged to database
   - Generate able reports
   - Executive summaries

### ❌ What Went Wrong with Archie

1. **Generic Titles**
   - Problem: All tasks titled "Improvement Suggestion"
   - Lesson: **ALWAYS use descriptive, specific titles**
   - Fix: Extract key info from description for title

2. **Fake Tasks**
   - Problem: 109 "documentation_update" tasks that weren't executable
   - Lesson: **Distinguish between insights and actionable tasks**
   - Fix: Don't convert analysis outputs to tasks automatically

3. **No Visibility**
   - Problem: Tasks complete instantly, never see "in_progress"
   - Lesson: **Add logging checkpoints for long-running tasks**
   - Fix: Update status at multiple points during execution

4. **Task Type Explosion**
   - Problem: Too many task types, some not implemented
   - Lesson: **Start with core types, expand gradually**
   - Fix: Only add new types when ready to implement

### Improved Agent Design

```typescript
// ✅ GOOD: Specific, actionable title
{
  task_type: 'code_cleanup',
  title: 'Add error boundary to TranscriptionPanel component',
  description: 'Wrap TranscriptionPanel in React error boundary to prevent crashes',
  file_paths: ['app/components/TranscriptionPanel.tsx'],
  priority: 8
}

// ❌ BAD: Generic, vague title
{
  task_type: 'improvement',
  title: 'Improvement Suggestion',
  description: 'Consider improving error handling...',
  priority: 5
}
```

### Key Principles for Autonomous Agents

1. **Specific Titles** - Anyone should understand what the task does from the title alone
2. **Executable Tasks Only** - If it can't be automatically executed, it's not a task (it's a finding/insight)
3. **Clear Ownership** - Who/what is responsible for execution?
4. **Measurable Success** - How do you know when it's done?
5. **Visible Progress** - Log status updates throughout execution
6. **Idempotent Actions** - Safe to retry if interrupted
7. **Rollback Capability** - Can undo if something goes wrong

---

## Planning Workflow for New Features

### Step 1: Define the Feature Clearly

**Template:**
```
Feature: [Name]
Goal: [What problem does this solve?]
Users: [Who benefits?]
Success Criteria: [How do we know it works?]
```

**Example:**
```
Feature: Speaker-Separated Transcription Download
Goal: Allow users to download transcripts with speaker labels
Users: Podcast editors, meeting participants
Success Criteria:
- Download button appears after transcription completes
- Document includes speaker labels (Speaker 1, Speaker 2, etc.)
- Timestamps formatted as HH:MM:SS
- File downloads as .txt or .docx
```

### Step 2: Identify Components

Break into:
- **UI Components** - What does the user see/interact with?
- **API Routes** - What backend endpoints are needed?
- **Database Changes** - What data needs to be stored?
- **External Services** - What third-party APIs are involved?

**Example:**
```
UI Components:
- Download button component
- Format selector (txt, docx, pdf)
- Progress indicator

API Routes:
- GET /api/transcribe/download?id=[transcription_id]&format=[format]

Database Changes:
- Add 'formatted_transcript' column to audio_transcriptions table

External Services:
- None (we already have transcript data from AssemblyAI)
```

### Step 3: Create Task List

Use `/tasks` or manually create a numbered list:

```
## Tasks

1. [ ] Add download button to transcription UI
   - Location: app/page.tsx around line 2800
   - Component: DownloadTranscriptButton

2. [ ] Create API route for download
   - File: app/api/transcribe/download/route.ts
   - Method: GET
   - Returns: File with appropriate Content-Type

3. [ ] Format transcript with speakers
   - Function: formatTranscriptWithSpeakers()
   - Input: Raw AssemblyAI data
   - Output: Formatted string

4. [ ] Add format options (txt, docx)
   - UI: Format selector dropdown
   - API: Accept format parameter

5. [ ] Test with real transcription
   - Verify speaker labels correct
   - Verify timestamps accurate
   - Verify file downloads properly

6. [ ] Update version and deploy
   - Bump minor version
   - Deploy to kimbleai.com
```

### Step 4: Identify Dependencies

**Critical Questions:**
- Does Task X need to complete before Task Y?
- Are there external dependencies (API keys, OAuth scopes)?
- What could block progress?

**Example:**
```
Dependencies:
- Task 3 must complete before Task 2 (need formatter before API)
- Task 1 depends on Task 2 (button needs API endpoint)
- No new OAuth scopes needed (already have Drive access)
- Potential blocker: File size limits for large transcripts
```

### Step 5: Implement Incrementally

**DON'T:** Try to build everything at once

**DO:** Build in small, testable increments

**Example:**
```
Increment 1: Basic text download
- Just get plain text downloading
- No formatting yet
- Test: Can I download a file?

Increment 2: Add speaker labels
- Format with "Speaker 1:", "Speaker 2:" etc.
- Test: Are speakers distinguished?

Increment 3: Add timestamps
- Include [HH:MM:SS] before each speaker segment
- Test: Are timestamps accurate?

Increment 4: Multiple formats
- Add docx, pdf options
- Test: Do all formats work?
```

### Step 6: Test Continuously

After EACH increment:
1. `npm run build` - Verify builds successfully
2. Manual test - Actually use the feature
3. Check logs - Look for errors
4. Deploy to production - Make it available

**Don't wait until "everything is done" to test!**

---

## Using AI Agents for Continuous Improvement

### The Right Way (Learned from Archie's Mistakes)

1. **Define Clear Goals**
   - File: `PROJECT_GOALS.md` or similar
   - Be specific about what "improvement" means
   - Set measurable targets

2. **Separate Insights from Tasks**
   - **Insights:** "Code could be more efficient here"
   - **Tasks:** "Refactor getUserData() to use caching"
   - Don't auto-convert insights to tasks

3. **Prioritize Intelligently**
   - Critical: Security vulnerabilities, crashes
   - High: Performance bottlenecks, data loss risks
   - Medium: Code quality, minor bugs
   - Low: Style improvements, documentation

4. **Execute Safely**
   - Always create a branch for agent changes
   - Require tests to pass before merging
   - Human review for critical changes
   - Rollback mechanism for failures

5. **Report Clearly**
   - **Bad:** "91 Improvement Suggestions completed"
   - **Good:** "Added error boundaries to 12 components, optimized 5 database queries, fixed 3 memory leaks"

### Example: Improved Archie-Style Agent

```typescript
// Instead of generic "Improvement Suggestion"

const task = {
  task_type: 'optimization',
  title: `Cache getUserProjects() to reduce DB calls by 80%`,
  description: `
    Current: Fetches projects on every page load (4ms per call, 100+ calls/day)
    Proposed: Add Redis cache with 5-minute TTL
    Impact: Reduce DB load by 80%, improve page load by 15ms
    Files: app/api/projects/route.ts, lib/cache.ts
    Estimated effort: 30 minutes
  `,
  priority: calculatePriority({
    impact: 'high',        // 80% reduction
    effort: 'low',         // 30 mins
    risk: 'low',           // Just caching
    user_facing: true      // Faster page loads
  }),
  metadata: {
    current_performance: '4ms per call',
    expected_improvement: '80% reduction',
    affected_endpoints: ['/api/projects'],
    test_criteria: 'Cache hit rate > 90% after 1 hour'
  }
};
```

---

## Planning Checklist

Before starting any feature:

- [ ] Feature clearly defined with success criteria
- [ ] UI mockup or description complete
- [ ] API endpoints identified
- [ ] Database schema changes planned
- [ ] External service requirements known
- [ ] Dependencies mapped out
- [ ] Tasks broken into small increments
- [ ] Test plan defined
- [ ] Rollback plan exists
- [ ] Version bump planned (patch/minor/major)

During implementation:

- [ ] Build after each change (`npm run build`)
- [ ] Test each increment before moving on
- [ ] Commit frequently with clear messages
- [ ] Update version.json changelog
- [ ] Deploy incrementally, not all at once

After completion:

- [ ] All tests pass
- [ ] Feature works on production
- [ ] Version indicator updated on www.kimbleai.com
- [ ] Documentation updated if needed
- [ ] User notified (if applicable)

---

## Example: Planning a New Feature End-to-End

**User Request:** "I want an autonomous agent that improves the site and features without me prompting"

### Step 1: Define Feature

```markdown
Feature: Self-Improving Site Agent
Goal: Continuously monitor, analyze, and improve kimbleai.com without manual intervention
Success Criteria:
- Agent runs automatically every 5 minutes
- Identifies performance issues, bugs, and improvement opportunities
- Makes safe, tested changes automatically
- Reports all changes with clear descriptions
- Can be paused/resumed by user
```

### Step 2: Learn from Archie

**Don't Repeat Archie's Mistakes:**
- ❌ Generic titles like "Improvement Suggestion"
- ❌ Creating fake tasks from analysis outputs
- ❌ No visibility into what's being worked on
- ❌ Too many task types without implementation

**Do Better:**
- ✅ Specific, actionable titles
- ✅ Only create tasks for executable actions
- ✅ Clear progress indicators
- ✅ Start with core functionality, expand gradually

### Step 3: Design System

```markdown
Components Needed:

1. Agent Core (lib/site-agent.ts)
   - Monitor errors and performance
   - Analyze code for improvements
   - Execute safe, tested changes
   - Generate reports

2. Database Tables:
   - site_agent_findings (analysis results)
   - site_agent_tasks (actionable work)
   - site_agent_reports (summaries)

3. API Routes:
   - POST /api/agent/trigger (run agent cycle)
   - GET /api/agent/status (check agent health)
   - GET /api/agent/tasks (view task queue)
   - POST /api/agent/pause (pause/resume)

4. UI Dashboard (app/agent/page.tsx)
   - Current status
   - Recent changes
   - Task queue
   - Performance metrics
   - Pause/resume controls

5. Cron Job (.github/workflows/trigger-agent.yml)
   - Runs every 5 minutes
   - Calls /api/agent/trigger
   - Logs output
```

### Step 4: Create Implementation Plan

```markdown
## Implementation Tasks

### Phase 1: Core Infrastructure (Day 1)
1. [ ] Create database tables for findings, tasks, reports
2. [ ] Build agent core with basic monitoring
3. [ ] Add API route for manual trigger
4. [ ] Test: Can agent run and log results?

### Phase 2: Safe Execution (Day 2)
5. [ ] Implement task queue with prioritization
6. [ ] Add git branch creation for changes
7. [ ] Implement automated testing before merge
8. [ ] Add rollback mechanism
9. [ ] Test: Can agent make a safe change?

### Phase 3: Automated Scheduling (Day 3)
10. [ ] Create GitHub Actions workflow
11. [ ] Configure cron schedule (every 5 minutes)
12. [ ] Add health checks and alerts
13. [ ] Test: Does agent run automatically?

### Phase 4: User Interface (Day 4)
14. [ ] Build dashboard page
15. [ ] Add pause/resume controls
16. [ ] Display recent changes
17. [ ] Show task queue
18. [ ] Test: Can user monitor and control agent?

### Phase 5: Refinement (Day 5)
19. [ ] Add performance metrics
20. [ ] Improve task descriptions (no generic titles!)
21. [ ] Add email notifications for critical issues
22. [ ] Test: Does everything work smoothly?

### Phase 6: Deploy (Day 6)
23. [ ] Final testing on staging
24. [ ] Bump minor version (1.X.0)
25. [ ] Deploy to production
26. [ ] Monitor for first 24 hours
27. [ ] Document usage in README
```

### Step 5: Execute and Monitor

**After Each Phase:**
- Run `npm run build` to verify
- Test manually
- Commit and push
- Monitor logs

**If Something Goes Wrong:**
- Pause agent immediately
- Review logs
- Fix issue
- Resume cautiously

---

**Last Updated:** 2025-10-23
**Version:** 1.0.0
