# 🔧 ARCHIE FIX PLAN - Make Him Actually Useful

## Current State (Broken)

**What's Happening:**
- ✅ Archie runs every 5 minutes via GitHub Actions
- ❌ Creates same 3 tasks over and over (infinite loop)
- ❌ All tasks titled "Improvement Suggestion" (useless)
- ❌ 115 fake "documentation_update" tasks clogging the queue
- ❌ No real progress - just churning through duplicates
- ❌ Can't see what he's actually working on

## Root Causes

### 1. Duplicate Task Creation Loop

**File:** `lib/autonomous-agent.ts:404-410`

```typescript
const { data: existingTask } = await supabase
  .from('agent_tasks')
  .select('id')
  .eq('title', finding.title)  // ← PROBLEM: title is "Improvement Suggestion" for everything
  .eq('status', 'pending')
  .single();
```

**What happens:**
1. Finding created with title "Improvement Suggestion"
2. Converts to task with same title
3. Task completes
4. Next run: Finding still exists (no cleanup)
5. Duplicate check fails (title matches but status is 'completed', not 'pending')
6. Creates new identical task
7. LOOP FOREVER

### 2. Generic Titles

**File:** `lib/autonomous-agent.ts:355`

```typescript
title: 'Improvement Suggestion',  // ← All findings get same title
description: suggestion,          // ← Real info buried here
```

### 3. Findings Never Cleaned Up

After finding → task conversion, the finding stays in the database forever, creating duplicates on every run.

### 4. Fake Tasks

109-115 "documentation_update" tasks that are just analysis outputs, not executable work.

---

## The Fix - 5 Changes

### Fix #1: Use Description-Based Deduplication ✅ CRITICAL

**File:** `lib/autonomous-agent.ts:404-410`

**BEFORE:**
```typescript
const { data: existingTask } = await supabase
  .from('agent_tasks')
  .select('id')
  .eq('title', finding.title)
  .eq('status', 'pending')
  .single();
```

**AFTER:**
```typescript
// Check for duplicates using description hash or first 100 chars
const descriptionKey = finding.description?.substring(0, 100);
const { data: existingTasks } = await supabase
  .from('agent_tasks')
  .select('id, status, description')
  .eq('task_type', mapping.type)
  .in('status', ['pending', 'completed']); // Check both pending AND completed

const isDuplicate = existingTasks?.some(t =>
  t.description?.substring(0, 100) === descriptionKey
);

if (!isDuplicate) {
  // Create task...
}
```

**Impact:** Stops the infinite loop

---

### Fix #2: Better Titles ✅ CRITICAL

**File:** `lib/autonomous-agent.ts:355` (createFinding in proactiveCodeAnalysis)

**BEFORE:**
```typescript
title: 'Improvement Suggestion',
description: suggestion,
```

**AFTER:**
```typescript
title: suggestion.substring(0, 80), // Use first 80 chars as title
description: suggestion,
```

**AND in** `lib/autonomous-agent.ts:417` (when creating tasks from findings):

**BEFORE:**
```typescript
title: finding.title,
```

**AFTER:**
```typescript
title: finding.title === 'Improvement Suggestion'
  ? finding.description?.substring(0, 80) || finding.title
  : finding.title,
```

**Impact:** Readable task names

---

### Fix #3: Clean Up Old Findings ✅ IMPORTANT

**File:** `lib/autonomous-agent.ts` - Add to `cleanupOldRecords()`

**ADD:**
```typescript
// Clean up findings that have been converted to tasks
const { data: linkedFindings } = await supabase
  .from('agent_findings')
  .select('id, related_task_id')
  .not('related_task_id', 'is', null);

if (linkedFindings && linkedFindings.length > 0) {
  const taskIds = linkedFindings.map(f => f.related_task_id);

  // Check which tasks are completed
  const { data: completedTasks } = await supabase
    .from('agent_tasks')
    .select('id')
    .in('id', taskIds)
    .eq('status', 'completed');

  if (completedTasks && completedTasks.length > 0) {
    const completedTaskIds = completedTasks.map(t => t.id);

    // Delete findings for completed tasks
    await supabase
      .from('agent_findings')
      .delete()
      .in('related_task_id', completedTaskIds);

    await this.log('info', `🧹 Cleaned up ${completedTasks.length} processed findings`);
  }
}

// Also clean up old findings with no task link (older than 7 days)
await supabase
  .from('agent_findings')
  .delete()
  .is('related_task_id', null)
  .lt('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
```

**Impact:** Prevents duplicate creation

---

### Fix #4: Remove Fake Tasks ✅ ONE-TIME CLEANUP

**Run once to clean up database:**

```sql
-- Delete fake documentation_update tasks
DELETE FROM agent_tasks
WHERE task_type = 'documentation_update'
AND (
  description LIKE 'Archie analyzed the task%'
  OR description LIKE '### Analysis of Logs%'
  OR description LIKE 'Log analysis revealed%'
);
```

**OR via script:**
```bash
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanup() {
  const { data } = await supabase
    .from('agent_tasks')
    .delete()
    .eq('task_type', 'documentation_update')
    .or('description.like.%Archie analyzed the task%,description.like.%Analysis of Logs%');

  console.log('Deleted fake tasks');
}

cleanup();
"
```

**Impact:** Clears the queue

---

### Fix #5: Stop Creating Fake Tasks ✅ IMPORTANT

**File:** `lib/autonomous-agent.ts` around line 1000+ (analyzeLogs method)

Look for where it creates documentation_update tasks and either:
- Change task_type to something else
- OR stop creating tasks for log analysis (just create findings instead)

**Find and modify:**
```typescript
// BEFORE
await this.createTask({
  task_type: 'documentation_update',  // ← Creates fake tasks
  title: 'Log analysis revealed...',
  ...
});

// AFTER
await this.createFinding({  // ← Just create findings, don't make tasks
  finding_type: 'insight',
  title: 'Log analysis revealed...',
  ...
});
```

**Impact:** Stops creating fake tasks going forward

---

## Implementation Order

1. ✅ **Fix #4 first** - Clean up existing fake tasks (one-time)
2. ✅ **Fix #1** - Stop duplicate loop (most critical)
3. ✅ **Fix #2** - Better titles (visibility)
4. ✅ **Fix #3** - Clean up findings (maintenance)
5. ✅ **Fix #5** - Stop creating fake tasks (prevention)

---

## Expected Outcome

**After fixes:**
- ✅ No duplicate tasks
- ✅ Clear, descriptive task titles
- ✅ Empty queue = Archie looks for NEW work
- ✅ Can see what he's actually doing
- ✅ Findings get cleaned up after tasks complete
- ✅ Only real, executable tasks in the queue

**Archie will:**
1. Analyze code → find real issues
2. Create tasks with descriptive titles
3. Execute unique work (no duplicates)
4. Clean up after himself
5. Move on to NEW work when done

---

## Testing After Fixes

```bash
# 1. Check for duplicates
npx tsx scripts/whats-archie-doing.ts

# 2. Watch for a few cycles
# Wait 15 minutes (3 GitHub Action runs)

# 3. Verify no duplicates created
npx tsx scripts/check-task-counts.ts

# 4. Check dashboard
# Visit https://www.kimbleai.com/agent
```

**Success Criteria:**
- No duplicate task descriptions
- Titles are descriptive (not "Improvement Suggestion")
- Pending count decreases over time (not stuck)
- New, different tasks appear in the queue
