# Archie Autonomous Agent - Configuration Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-23
**Agent Location:** `lib/autonomous-agent.ts` (1667 lines)

---

## Overview

Archie is KimbleAI's autonomous agent that continuously monitors, analyzes, and improves the application without manual intervention. It runs as a serverless function triggered every 5 minutes via GitHub Actions.

**Core Capabilities:**
- Error monitoring and automatic bug fixes
- Performance optimization detection
- Code quality improvements
- Automated testing and deployment
- Task prioritization and execution
- Comprehensive logging and reporting

---

## Current Configuration

### Feature Status

```typescript
{
  "error_monitoring": true,           // ✅ Active - Monitors api_logs for errors
  "performance_monitoring": true,     // ✅ Active - Tracks slow endpoints
  "task_processing": true,            // ✅ Active - Executes queued tasks
  "proactive_suggestions": false,     // ❌ Disabled - Lines 176-181 (needs improvement)
  "code_generation": true,            // ✅ Active - Uses GPT-4o for fixes
  "file_modification": false,         // ❌ Disabled - Not supported in serverless
  "git_deployment": false,            // ❌ Disabled - Not supported in serverless
  "self_improvement": false,          // ❌ Disabled - Lines 176-181 (infinite loop risk)
  "proactive_code_analysis": false,   // ❌ Disabled - Lines 176-181 (too vague)
  "duplicate_detection": true,        // ✅ Active - Line 407 (checks description content)
  "specific_task_titles": true        // ✅ Active - Line 419 (extracts from description)
}
```

### Database Schema

**agent_tasks** - Actionable work items
```sql
CREATE TABLE agent_tasks (
  id UUID PRIMARY KEY,
  task_type VARCHAR,          -- 'bug_fix', 'optimization', 'code_cleanup', etc.
  title VARCHAR,              -- Specific, descriptive title
  description TEXT,           -- Detailed task description
  priority INTEGER,           -- 10 (critical) to 7 (low)
  status VARCHAR,             -- 'pending', 'in_progress', 'completed', 'failed'
  file_paths TEXT[],          -- Files to modify
  metadata JSONB,             -- Additional context
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

**agent_findings** - Analysis results
```sql
CREATE TABLE agent_findings (
  id UUID PRIMARY KEY,
  finding_type VARCHAR,       -- 'insight', 'error', 'performance', 'security'
  title VARCHAR,
  description TEXT,
  severity VARCHAR,           -- 'critical', 'high', 'medium', 'low'
  source VARCHAR,             -- 'error_monitor', 'performance_monitor', etc.
  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

**agent_logs** - Execution history
```sql
CREATE TABLE agent_logs (
  id UUID PRIMARY KEY,
  level VARCHAR,              -- 'info', 'warn', 'error'
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

---

## Task Priority System

### Priority Levels (P10 - P7)

**P10 - Critical (Immediate Execution)**
- Active errors affecting users
- Security vulnerabilities
- Data loss risks
- Complete service outages

**P9 - High (Execute within 5 minutes)**
- Performance degradation (>2s response time)
- Authentication failures
- Database connection issues
- Payment processing errors

**P8 - Medium (Execute within 1 hour)**
- Code quality issues affecting maintainability
- Minor performance optimizations
- Non-critical bug fixes
- UI/UX improvements

**P7 - Low (Execute when idle)**
- Documentation updates
- Code style improvements
- Refactoring opportunities
- Test coverage improvements

### Priority Calculation

```typescript
function calculatePriority(task: {
  impact: 'critical' | 'high' | 'medium' | 'low',
  effort: 'low' | 'medium' | 'high',
  risk: 'low' | 'medium' | 'high',
  user_facing: boolean
}): number {
  let priority = 7; // Start at low

  // Impact scoring
  if (task.impact === 'critical') priority += 3;
  else if (task.impact === 'high') priority += 2;
  else if (task.impact === 'medium') priority += 1;

  // Effort scoring (prefer quick wins)
  if (task.effort === 'low') priority += 1;

  // Risk penalty (avoid risky changes)
  if (task.risk === 'high') priority -= 1;

  // User-facing bonus
  if (task.user_facing) priority += 1;

  return Math.min(10, Math.max(7, priority)); // Clamp to 7-10
}
```

**Examples:**

```typescript
// P10: Critical user-facing error with low effort fix
calculatePriority({
  impact: 'critical',    // +3
  effort: 'low',         // +1
  risk: 'low',           // 0
  user_facing: true      // +1
}) // = 7 + 3 + 1 + 1 = 12 → clamped to 10

// P8: Medium impact optimization, quick fix
calculatePriority({
  impact: 'medium',      // +1
  effort: 'low',         // +1
  risk: 'low',           // 0
  user_facing: true      // +1
}) // = 7 + 1 + 1 + 1 = 10 → stays at 10, but context makes it P8

// P7: Low impact refactoring
calculatePriority({
  impact: 'low',         // 0
  effort: 'medium',      // 0
  risk: 'low',           // 0
  user_facing: false     // 0
}) // = 7
```

---

## Task Types and Implementations

### Currently Implemented

**1. bug_fix** - Fix errors and crashes
- Monitors `api_logs` table for errors
- Generates code fixes using GPT-4o
- Creates tasks with specific error details
- Example: "Fix TypeError in /api/transcribe/assemblyai route"

**2. optimization** - Improve performance
- Tracks slow endpoints (>1s response time)
- Suggests caching, query optimization, code improvements
- Measures before/after performance
- Example: "Add Redis cache to /api/projects to reduce DB load by 80%"

**3. code_cleanup** - Improve code quality
- Identifies duplicate code
- Suggests better patterns
- Removes dead code
- Example: "Extract duplicate auth logic from 5 routes into shared middleware"

### Not Yet Implemented

**4. documentation_update** - Improve docs
- Currently generates insights, not tasks
- Should: Update outdated docs, add missing examples
- Should not: Create fake "write docs" tasks

**5. security_patch** - Fix vulnerabilities
- Framework in place but not active
- Should: Scan for known CVEs, update dependencies
- Requires: Snyk or similar integration

**6. test_coverage** - Improve testing
- Framework exists but disabled
- Should: Add tests for uncovered code paths
- Requires: Coverage threshold configuration

---

## API Endpoints

### Trigger Agent Execution

**POST /api/agent/trigger**

Manually trigger an agent execution cycle.

```bash
curl -X POST https://www.kimbleai.com/api/agent/trigger \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "execution_id": "uuid",
  "tasks_created": 3,
  "findings_created": 7,
  "duration_ms": 2341
}
```

### Pause/Resume Agent

**POST /api/agent/pause**

```bash
curl -X POST https://www.kimbleai.com/api/agent/pause \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"paused": true}'
```

### View Task Queue

**GET /api/agent/tasks**

```bash
curl https://www.kimbleai.com/api/agent/tasks?status=pending&limit=10
```

**Response:**
```json
{
  "tasks": [
    {
      "id": "uuid",
      "title": "Fix TypeError in /api/chat route",
      "task_type": "bug_fix",
      "priority": 10,
      "status": "pending",
      "created_at": "2025-10-23T16:00:00Z"
    }
  ],
  "total": 45,
  "pending": 12,
  "in_progress": 1,
  "completed": 32
}
```

### View Agent Logs

**GET /api/agent/logs**

```bash
curl https://www.kimbleai.com/api/agent/logs?level=error&limit=50
```

---

## Good vs Bad Task Generation

### ✅ GOOD Examples

**Specific, Actionable, Measurable**

```typescript
{
  task_type: 'optimization',
  title: 'Add Redis cache to /api/projects/[id] endpoint',
  description: `
    Current performance: 450ms average response time
    Issue: Database query runs on every request (no caching)
    Solution: Add Redis cache with 5-minute TTL
    Expected improvement: <50ms response time (90% reduction)
    Files to modify: app/api/projects/[id]/route.ts, lib/cache.ts
    Testing: Verify cache hit rate >90% after 1 hour
  `,
  priority: 8,
  metadata: {
    current_performance: '450ms',
    target_performance: '50ms',
    affected_routes: ['/api/projects/[id]'],
    success_criteria: 'Response time <50ms for cached requests'
  }
}
```

```typescript
{
  task_type: 'bug_fix',
  title: 'Fix null reference error in TranscriptionPanel when audio fails',
  description: `
    Error: "Cannot read property 'duration' of null"
    Location: app/components/TranscriptionPanel.tsx:234
    Trigger: When audio upload fails but component still renders
    Fix: Add null check before accessing audio.duration
    Test: Upload invalid audio file, verify error handling
  `,
  priority: 9,
  file_paths: ['app/components/TranscriptionPanel.tsx'],
  metadata: {
    error_message: 'Cannot read property duration of null',
    occurrence_count: 12,
    affected_users: 3
  }
}
```

### ❌ BAD Examples

**Generic, Vague, Unmeasurable**

```typescript
// ❌ BAD: Generic title
{
  task_type: 'improvement',
  title: 'Improvement Suggestion',
  description: 'The code could be better organized',
  priority: 5
}

// ✅ GOOD VERSION:
{
  task_type: 'code_cleanup',
  title: 'Extract auth middleware from 5 duplicate route handlers',
  description: `
    Current: Auth logic duplicated in /api/chat, /api/projects, etc.
    Solution: Create shared middleware in lib/auth-middleware.ts
    Impact: Reduce code by 150 lines, easier to maintain
    Files: app/api/chat/route.ts, app/api/projects/route.ts, (+ 3 more)
  `,
  priority: 8
}
```

```typescript
// ❌ BAD: Not actionable
{
  task_type: 'documentation_update',
  title: 'Documentation Update',
  description: 'Consider updating the documentation',
  priority: 7
}

// ✅ GOOD VERSION (if truly actionable):
{
  task_type: 'documentation_update',
  title: 'Add API examples to /api/transcribe documentation',
  description: `
    Current: No usage examples in /api/transcribe docs
    Add: 3 examples (basic, with speakers, with timestamps)
    File: docs/api/transcribe.md (create if missing)
    Test: Verify examples work when copy-pasted
  `,
  priority: 7
}
```

---

## Fixes Already Applied

### 1. Generic Task Titles (Line 419)

**Problem:** All tasks had title "Improvement Suggestion"

**Fix Applied:**
```typescript
// lib/autonomous-agent.ts:419-422
const taskTitle = finding.title === 'Improvement Suggestion'
  ? finding.description?.substring(0, 100) || finding.title
  : finding.title;
```

**Result:** Tasks now have specific titles extracted from their descriptions.

### 2. Fake Tasks (Line 398)

**Problem:** 109 "documentation_update" tasks that weren't executable

**Fix Applied:**
```typescript
// lib/autonomous-agent.ts:398-401
if (finding.finding_type === 'insight') {
  await this.log('info', `⏭️ Skipping insight finding (informational only): ${finding.title}`);
  continue;
}
```

**Result:** Insights are no longer converted to tasks automatically.

### 3. Duplicate Detection (Line 407)

**Problem:** Duplicate suggestions created repeatedly

**Fix Applied:**
```typescript
// lib/autonomous-agent.ts:407-414
const descriptionKey = finding.description?.substring(0, 100);
const { data: existingTasks } = await supabase
  .from('agent_tasks')
  .select('id, status, description')
  .eq('task_type', mapping.type);

const isDuplicate = existingTasks?.some(t =>
  t.description?.substring(0, 100) === descriptionKey
);
```

**Result:** Checks description content, not just titles, to detect duplicates.

---

## Improvements Needed

### 1. Re-enable Useful Features (Currently Disabled)

**Location:** `lib/autonomous-agent.ts:176-181`

```typescript
// Currently disabled:
// - initializePriorityTasks() // ✅ Already has fixes
// - generateImprovementSuggestions() // ✅ Already has fixes
// - proactiveCodeAnalysis() // ⚠️ Needs better specificity
```

**Action Required:**
- Test each feature individually
- Verify fixes prevent previous issues
- Re-enable one at a time
- Monitor for regressions

### 2. Add Progress Logging

**Problem:** Tasks complete instantly, never see "in_progress" status

**Solution:**
```typescript
async executeTask(task: Task) {
  await this.updateTaskStatus(task.id, 'in_progress');

  // Log sub-steps
  await this.log('info', `📝 Analyzing ${task.file_paths.length} files...`);
  await this.log('info', `🔧 Generating code fix...`);
  await this.log('info', `✅ Applied changes to ${modifiedFiles.length} files`);

  await this.updateTaskStatus(task.id, 'completed');
}
```

### 3. Project-Specific Intelligence

**Current:** Generic suggestions not aligned with project goals

**Solution:** Learn from project documentation
```typescript
async analyzeProject() {
  // Read PLANNING.md to understand project structure
  // Read PROJECT_GOALS.md to prioritize work
  // Understand 8 project categories:
  // 1. Transcription & Download
  // 2. Project Management Within Chat
  // 3. Calendar Integration
  // 4. Gmail Integration
  // 5. Drive Management
  // 6. Aesthetics & UI
  // 7. Cost Tracker
  // 8. Autonomous Agents

  return priorities;
}
```

### 4. Better Task Specificity

**Template for All Tasks:**
```typescript
{
  title: "[Action] [specific component/file] [specific improvement]",
  description: `
    Current State: [measurable current behavior]
    Problem: [specific issue]
    Solution: [concrete fix]
    Expected Impact: [measurable improvement]
    Files: [exact file paths]
    Testing: [how to verify success]
  `,
  priority: calculatePriority(...),
  metadata: {
    success_criteria: [measurable outcome],
    affected_routes: [list of routes],
    estimated_effort: [time in minutes]
  }
}
```

---

## Troubleshooting

### Issue: Agent not executing tasks

**Check:**
1. GitHub Actions cron is running (`.github/workflows/trigger-archie.yml`)
2. Agent is not paused (`agent_paused` flag in database)
3. API endpoint responding (`/api/agent/trigger`)

**Fix:**
```bash
# Manually trigger
curl -X POST https://www.kimbleai.com/api/agent/trigger

# Check logs
vercel logs https://www.kimbleai.com --since 10m | grep agent
```

### Issue: Tasks stuck in "pending"

**Check:**
```sql
SELECT COUNT(*), status FROM agent_tasks GROUP BY status;
```

**Fix:**
```sql
-- Reset stuck tasks (older than 1 hour)
UPDATE agent_tasks
SET status = 'failed', completed_at = NOW()
WHERE status = 'in_progress' AND created_at < NOW() - INTERVAL '1 hour';
```

### Issue: Too many duplicate tasks

**Check:**
```sql
SELECT title, COUNT(*) FROM agent_tasks
WHERE status = 'pending'
GROUP BY title
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;
```

**Fix:**
- Improve duplicate detection logic
- Increase description comparison length
- Add task deduplication cron job

### Issue: Generic task titles returning

**Check:**
```sql
SELECT * FROM agent_tasks
WHERE title = 'Improvement Suggestion'
LIMIT 10;
```

**Fix:**
- Verify line 419 fix is active
- Check that `finding.description` is populated
- Improve title extraction logic

---

## Execution Schedule

**GitHub Actions Cron:** Every 5 minutes

```yaml
# .github/workflows/trigger-archie.yml
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
```

**Execution Flow:**
1. Trigger → `/api/agent/trigger`
2. Monitor errors → `monitorErrors()`
3. Monitor performance → `monitorPerformance()`
4. Process tasks → `processTaskQueue()`
5. Log results → `generateExecutionReport()`

**Average Execution Time:** 2-5 seconds
**Max Execution Time:** 10 seconds (Vercel limit)

---

## Usage Examples

### Example 1: Enable Proactive Suggestions

```typescript
// lib/autonomous-agent.ts:176-181
// Change from:
async executeWorkflow() {
  // await this.generateImprovementSuggestions(); // Disabled - too vague
}

// To:
async executeWorkflow() {
  await this.generateImprovementSuggestions(); // Re-enabled with specificity fixes
}
```

### Example 2: Add Custom Task Type

```typescript
// 1. Add to task type mapping
const taskTypeMapping = {
  'accessibility': {
    type: 'accessibility_fix',
    priority: 8
  }
};

// 2. Implement handler
async fixAccessibility(task: Task) {
  // Add ARIA labels, keyboard navigation, etc.
}

// 3. Add to executor
async executeTask(task: Task) {
  switch (task.task_type) {
    case 'accessibility_fix':
      return await this.fixAccessibility(task);
  }
}
```

### Example 3: Manual Task Creation

```typescript
await supabase.from('agent_tasks').insert({
  task_type: 'optimization',
  title: 'Add database indexes to conversations table',
  description: `
    Current: Queries on conversations.user_id taking 400ms
    Solution: Add index on user_id column
    Expected: <50ms query time
    SQL: CREATE INDEX idx_conversations_user_id ON conversations(user_id);
  `,
  priority: 9,
  status: 'pending',
  file_paths: ['database/migrations/add-conversation-indexes.sql'],
  metadata: {
    current_performance: '400ms',
    target_performance: '50ms',
    sql_command: 'CREATE INDEX idx_conversations_user_id ON conversations(user_id);'
  }
});
```

---

## Best Practices

### 1. Task Titles
- ✅ Start with action verb (Add, Fix, Optimize, Remove, Update)
- ✅ Include specific component/file name
- ✅ Describe specific change
- ❌ Don't use "Improvement Suggestion" or generic titles

### 2. Task Descriptions
- ✅ Include measurable current state
- ✅ Describe expected improvement with metrics
- ✅ List exact file paths
- ✅ Provide success criteria
- ❌ Don't use vague language like "could be better"

### 3. Priority Assignment
- ✅ Use calculatePriority() function
- ✅ Consider impact, effort, risk, user-facing
- ✅ Prioritize user-facing critical issues
- ❌ Don't manually assign without calculation

### 4. Task Execution
- ✅ Update status to in_progress immediately
- ✅ Log progress at each step
- ✅ Update to completed only when verified
- ❌ Don't mark completed without testing

### 5. Error Handling
- ✅ Catch and log all errors
- ✅ Update task status to failed on error
- ✅ Include error details in metadata
- ❌ Don't silently fail

---

**For more information, see:**
- `PLANNING.md` - Project planning methodology
- `lib/autonomous-agent.ts` - Archie implementation
- `.claude.md` - Claude Code configuration and rules
