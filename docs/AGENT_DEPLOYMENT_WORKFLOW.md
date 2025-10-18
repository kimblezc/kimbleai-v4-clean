# Autonomous Agent - Auto-Deployment Workflow

**Version:** 1.0
**Last Updated:** 2025-10-18
**Status:** Production Ready

---

## Overview

The autonomous agent can automatically deploy fixes to production after validation. This document defines the safe deployment workflow.

---

## 🚀 Deployment Workflow (10 Steps)

### Step 1: Issue Detection
**Trigger:** Agent detects an issue during monitoring

**Actions:**
- Parse error logs
- Identify error pattern
- Determine severity (critical/high/medium/low)
- Check if issue is auto-fixable

**Decision:** If auto-fixable → Proceed to Step 2

---

### Step 2: Create Fix Task
**Actions:**
- Create task in `agent_tasks` table
- Set priority based on severity
- Set status: 'in_progress'
- Log task creation in `agent_logs`

**Example:**
```typescript
{
  task_type: 'fix_bugs',
  priority: 9,
  title: 'Fix 504 timeout in /api/chat',
  description: 'Timeout occurring for queries > 30 seconds',
  file_paths: ['app/api/chat/route.ts']
}
```

---

### Step 3: Generate Fix Code
**Actions:**
- Analyze the issue
- Review relevant code files
- Generate fix code
- Write changes to files using Edit/Write tools

**Validation:**
- Ensure fix targets root cause
- Maintain backward compatibility
- Follow existing code patterns
- Add error handling

**Safety Rules:**
- Never modify authentication logic without review
- Never delete data without backup
- Never change database schema without migration
- Never modify environment variables

---

### Step 4: Type Checking
**Command:**
```bash
npx tsc --noEmit --skipLibCheck
```

**Actions:**
- Run TypeScript compiler
- Check for type errors
- If errors found → Fix and retry
- If errors persist after 3 attempts → Abort and log failure

**Success Criteria:**
- Zero type errors
- Exit code: 0

---

### Step 5: Run Tests (If Available)
**Command:**
```bash
npm test -- --related <changed-files>
```

**Actions:**
- Run tests related to changed files
- Check all tests pass
- If tests fail → Analyze failure
- If fix caused failure → Rollback changes and abort
- If pre-existing failure → Note in logs, continue

**Success Criteria:**
- All related tests pass
- No new test failures introduced

---

### Step 6: Git Commit
**Actions:**
- Stage changes: `git add .`
- Create detailed commit message
- Commit with agent signature

**Commit Message Format:**
```
fix: <concise description>

Issue: <what was broken>
Root Cause: <why it was broken>
Fix: <what was changed>
Impact: <affected files/features>
Testing: <validation performed>

Deployed automatically by Autonomous Agent
Task ID: <task_id>
Severity: <critical|high|medium|low>

🤖 Generated with Claude Code
Co-Authored-By: Autonomous Agent <agent@kimbleai.com>
```

**Example:**
```
fix: Resolve 504 timeout in /api/chat for complex queries

Issue: Complex queries exceeding 30s caused 504 Gateway Timeout
Root Cause: No timeout protection on OpenAI streaming responses
Fix: Added 25s timeout with graceful degradation
Impact: app/api/chat/route.ts
Testing: Type check passed, manual timeout test passed

Deployed automatically by Autonomous Agent
Task ID: 123e4567-e89b-12d3-a456-426614174000
Severity: high

🤖 Generated with Claude Code
Co-Authored-By: Autonomous Agent <agent@kimbleai.com>
```

---

### Step 7: Git Push (Trigger Deployment)
**Command:**
```bash
git push origin master
```

**Actions:**
- Push to GitHub
- Vercel auto-deployment triggered
- Log deployment initiation
- Record deployment start time

**Logging:**
```typescript
await logAgentAction({
  level: 'info',
  category: 'deployment',
  message: 'Deployment triggered',
  details: {
    commit: commitHash,
    files_changed: changedFiles,
    task_id: taskId,
    deployment_start: new Date()
  }
});
```

---

### Step 8: Monitor Deployment Status
**Actions:**
- Poll Vercel deployment status
- Check every 10 seconds
- Timeout after 5 minutes

**Commands:**
```bash
# Check deployment status
npx vercel ls

# Expected: Latest deployment shows "● Building" then "● Ready"
```

**Success Criteria:**
- Deployment status: ● Ready
- Build succeeded
- No build errors

**Failure Handling:**
- If deployment fails → Log error
- Mark task as 'failed'
- Create incident report
- **DO NOT ROLLBACK** (Vercel keeps previous deployment active)
- Alert via executive report

---

### Step 9: Verify Fix in Production
**Actions:**
- Wait 30 seconds for deployment to stabilize
- Test the fixed endpoint/feature
- Check error logs for new errors
- Compare error rates: before vs. after

**Verification Methods:**

**A. API Endpoint Fixes:**
```bash
# Test the endpoint
curl -s https://www.kimbleai.com/api/endpoint | jq

# Check for errors in logs
# (Query agent_logs for new errors in last 5 minutes)
```

**B. UI Fixes:**
```bash
# Check page loads
curl -I https://www.kimbleai.com/page

# Expected: 200 OK
```

**C. Error Rate Comparison:**
```sql
-- Errors before fix (last hour)
SELECT COUNT(*) FROM agent_logs
WHERE log_level = 'error'
  AND timestamp > NOW() - INTERVAL '1 hour'
  AND timestamp < (SELECT created_at FROM agent_tasks WHERE id = <task_id>);

-- Errors after fix (last 5 minutes)
SELECT COUNT(*) FROM agent_logs
WHERE log_level = 'error'
  AND timestamp > NOW() - INTERVAL '5 minutes';
```

**Success Criteria:**
- Endpoint responds correctly (if applicable)
- No new errors in logs
- Error rate decreased or stayed same
- No user reports of issues

---

### Step 10: Report & Cleanup
**Actions:**
- Mark task as 'completed'
- Update task metadata (duration, result)
- Log to `agent_logs`
- Create executive report entry
- Update agent_state metrics

**Executive Report Entry:**
```
DEPLOYMENT COMPLETE

Fixed: 504 timeout errors in /api/chat
Deployed: 2025-10-18 14:23:45 UTC
Build Time: 1m 23s
Verification: ✅ Passed
Impact: High-priority bug fix

The autonomous agent detected recurring 504 timeout errors affecting
complex queries. Root cause was lack of timeout protection on OpenAI
streaming responses. Fix adds 25-second timeout with graceful fallback.

Deployment verified successfully in production. Error rate decreased
from 15 errors/hour to 0 errors in the last 30 minutes.

Files Changed:
- app/api/chat/route.ts (timeout protection added)

Testing:
- Type checking: ✅ Passed
- Deployment: ✅ Successful
- Production verification: ✅ Passed
- Error rate: ✅ Improved (15/hr → 0/hr)

Commit: 9f8e7d6
Task ID: 123e4567-e89b-12d3-a456-426614174000
```

**Database Updates:**
```typescript
// Update task
UPDATE agent_tasks SET
  status = 'completed',
  completed_at = NOW(),
  duration_ms = <elapsed_time>,
  result = 'success',
  changes_made = ['app/api/chat/route.ts'],
  tests_passed = true
WHERE id = <task_id>;

// Update agent state
UPDATE agent_state
SET value = value::int + 1
WHERE key = 'total_tasks_completed';

UPDATE agent_state
SET value = value::int + 1
WHERE key = 'total_issues_fixed';
```

---

## 🔴 Rollback Procedure

**Trigger Conditions:**
- Deployment fails to build
- New critical errors appear in logs (> 10 errors/5min)
- Error rate increases > 50%
- Endpoint returns 500 errors
- User reports critical issues

**Rollback Steps:**

### 1. Detect Rollback Needed
```typescript
const shouldRollback =
  deploymentFailed ||
  newErrorRate > oldErrorRate * 1.5 ||
  criticalErrorsDetected;
```

### 2. Revert Git Commit
```bash
# Create revert commit
git revert HEAD --no-edit

# Push revert
git push origin master
```

### 3. Trigger New Deployment
- Vercel automatically deploys the revert
- Monitor new deployment status

### 4. Verify Rollback Success
- Check error rates return to baseline
- Verify endpoint functionality
- Confirm no new errors

### 5. Log Rollback
```typescript
await logAgentAction({
  level: 'warn',
  category: 'deployment',
  message: 'Deployment rolled back due to errors',
  details: {
    original_commit: badCommit,
    revert_commit: revertCommit,
    reason: 'Error rate increased 200%',
    task_id: taskId
  }
});
```

### 6. Create Incident Report
```typescript
await createAgentReport({
  report_type: 'incident_report',
  executive_summary: 'Deployment rolled back due to increased errors',
  critical_issues: ['Automatic deployment caused error rate spike'],
  recommendations: ['Manual review required before re-attempting fix']
});
```

### 7. Mark Task as Failed
```typescript
UPDATE agent_tasks SET
  status = 'failed',
  error_message = 'Deployment rolled back due to error rate increase',
  completed_at = NOW()
WHERE id = <task_id>;
```

---

## ⚠️ Safety Rules

### Never Auto-Deploy:
1. **Database schema changes** (require manual migration)
2. **Authentication/authorization changes** (security risk)
3. **Environment variable changes** (require Vercel dashboard)
4. **Breaking API changes** (could break client apps)
5. **Dependency updates** (could introduce vulnerabilities)
6. **Critical security fixes** (require manual review)

### Always Require Manual Review:
- Changes to payment processing
- Changes to user data handling
- Changes to encryption/decryption
- Changes to API rate limiting
- Changes to CORS policies

### Auto-Deploy Safe Categories:
- ✅ Bug fixes (non-security)
- ✅ Performance optimizations
- ✅ Error handling improvements
- ✅ Logging enhancements
- ✅ UI/UX fixes
- ✅ Documentation updates
- ✅ Code refactoring (no behavior change)

---

## 📊 Deployment Metrics

### Track for Each Deployment:
- Deployment duration
- Build time
- Verification time
- Error rate before/after
- Success/failure status
- Rollback required (yes/no)

### Success Rate Targets:
- Deployment success rate: > 95%
- Rollback rate: < 5%
- Average deployment time: < 3 minutes
- Average verification time: < 1 minute

### Alert Conditions:
- Deployment success rate < 90%
- Rollback rate > 10%
- Deployment time > 5 minutes
- Error rate increased > 50% post-deployment

---

## 🔔 Notification Protocol

### Deployment Success:
**Executive Report (user-facing):**
```
✅ DEPLOYMENT SUCCESSFUL

Fixed: [Issue description]
Time: [Timestamp]
Impact: [What improved]
Verification: ✅ Passed
```

### Deployment Failure:
**Executive Report (user-facing):**
```
⚠️ DEPLOYMENT FAILED

Attempted Fix: [Issue description]
Time: [Timestamp]
Failure Reason: [Build error/rollback reason]
Status: Rolled back to previous version
Action: Manual review required
```

### Technical Log (agent_logs):
```typescript
{
  log_level: 'info', // or 'error' if failed
  category: 'deployment',
  message: 'Deployment completed successfully',
  details: {
    commit: commitHash,
    task_id: taskId,
    duration_ms: deploymentDuration,
    files_changed: ['app/api/chat/route.ts'],
    verification: {
      type_check: 'passed',
      tests: 'passed',
      production_test: 'passed',
      error_rate: { before: 15, after: 0 }
    }
  }
}
```

---

## 🧪 Testing the Deployment Workflow

### Manual Test (One-Time Setup):
```bash
# 1. Make a small change
echo "// Test deployment" >> test-file.ts

# 2. Run the deployment workflow manually
npx tsx scripts/test-deployment-workflow.ts

# 3. Verify all steps execute correctly
# 4. Check logs in agent_logs table
# 5. Verify executive report created
```

### Automated Test (Agent Self-Test):
Agent should periodically test deployment workflow with no-op commits:
- Create test file
- Commit with "[test] Deployment workflow validation"
- Push and monitor
- Verify deployment succeeds
- Clean up test file
- Log test results

---

## 📝 Example Complete Workflow

**Scenario:** Agent detects 504 timeout errors

```
[14:00:00] 🔍 MONITORING: Detected 15 errors in /api/chat
[14:00:01] 🎯 TASK CREATED: Fix 504 timeout (Priority: 9)
[14:00:02] 🔧 GENERATING FIX: Analyzing route.ts...
[14:00:15] ✏️  CODE WRITTEN: Added timeout protection
[14:00:16] ✅ TYPE CHECK: Passed (0 errors)
[14:00:18] ✅ TESTS: Passed (all related tests green)
[14:00:20] 📝 GIT COMMIT: "fix: Resolve 504 timeout in /api/chat"
[14:00:21] 🚀 GIT PUSH: Triggered Vercel deployment
[14:00:22] ⏳ MONITORING: Waiting for deployment...
[14:01:45] ✅ DEPLOYMENT: ● Ready (Build time: 1m 23s)
[14:01:46] 🧪 VERIFYING: Testing production endpoint...
[14:02:15] ✅ VERIFIED: Error rate 15/hr → 0/hr
[14:02:16] 📊 REPORTING: Executive summary created
[14:02:17] ✅ COMPLETE: Task marked as completed

Total time: 2 minutes 17 seconds
Status: Success
Rollback: Not required
```

---

## 🎯 Success Metrics

After 30 days of auto-deployment:

**Target Metrics:**
- ✅ 50+ successful auto-deployments
- ✅ 95%+ deployment success rate
- ✅ < 5% rollback rate
- ✅ 0 broken deployments reaching production
- ✅ Average deployment time: < 3 minutes
- ✅ 30+ bugs auto-fixed and deployed

**User Impact:**
- ✅ Reduced time-to-fix: 24 hours → 1 hour
- ✅ Increased system stability
- ✅ Fewer manual interventions required
- ✅ Continuous improvement without user action

---

*This workflow ensures safe, validated, automatic deployments while maintaining system stability and user trust.*
