# Project-Tag Guardian

**Status**: ✅ Active (Runs every 6 hours)

## Overview

The **Project-Tag Guardian** is an autonomous agent that ensures projects and tags are properly functioning across kimbleai.com. Unlike Archie (which maintains code quality), Guardian focuses on data integrity, API health, and organizational structure.

## Philosophy

> "Projects and tags are a continual problem. Let Guardian handle it."

Guardian is a specialized watchdog that:
- **Validates** all CRUD operations work correctly
- **Detects** data integrity issues (orphans, duplicates, broken associations)
- **Auto-fixes** simple problems (missing tags, duplicates, orphans)
- **Reports** critical issues that need human attention
- **Logs** everything for full transparency

## What Guardian Does

Every 6 hours, Guardian:
1. Tests all Projects CRUD operations (Create, Read, Update, Delete)
2. Tests all Tags CRUD operations (Create, Read, Update, Delete)
3. Validates project-tag associations
4. Checks for orphaned records
5. Checks for duplicate tags
6. Verifies permissions are working
7. Auto-fixes any fixable issues
8. Commits fixes to git
9. Generates detailed report

## Auto-Fixes

Guardian automatically fixes:
- ✅ Missing tags (creates them if projects reference non-existent tags)
- ✅ Orphaned records (deletes tasks that reference deleted projects)
- ✅ Duplicate tags (keeps first, removes duplicates)
- ✅ Broken associations (repairs or removes)

## Doesn't Touch

Guardian does NOT:
- ❌ Modify production data without validation
- ❌ Delete projects or tags without confirmation
- ❌ Make breaking changes
- ❌ Touch anything requiring business logic decisions

## Implementation

### Files

**Core Logic:**
- `lib/project-tag-guardian.ts` - Main Guardian agent (500+ lines)
- `app/api/guardian/run/route.ts` - API endpoint

**Dashboard:**
- `app/guardian/page.tsx` - Web dashboard showing activity

**Configuration:**
- `vercel.json` - Cron schedule (every 6 hours)

### Schedule

**Cron**: `0 */6 * * *` (Every 6 hours, at minute 0)
- 12:00 AM
- 6:00 AM
- 12:00 PM
- 6:00 PM

**Manual trigger**: `/api/guardian/run?trigger=manual`

**Dashboard**: https://www.kimbleai.com/guardian

## Validation Checks

### 1. Projects CRUD

Tests all project operations:
```typescript
✓ GET /api/projects (list all projects)
✓ POST /api/projects (create new project)
✓ POST /api/projects (update project)
✓ POST /api/projects (delete project)
```

### 2. Tags CRUD

Tests all tag operations:
```typescript
✓ GET /api/tags (list all tags)
✓ POST /api/tags (create new tag)
✓ PUT /api/tags (update tag)
✓ DELETE /api/tags (delete tag)
```

### 3. Associations

Validates project-tag relationships:
- Projects only reference tags that exist
- Creates missing tags automatically
- Removes references to deleted tags

### 4. Orphans

Checks for orphaned records:
- Tasks without valid projects (auto-deleted)
- Tags not used anywhere (reported, not deleted)
- Broken foreign key relationships

### 5. Duplicates

Finds and merges duplicate tags:
- Same user + same tag name = duplicate
- Keeps the first, deletes the rest
- Preserves all associations

### 6. Permissions

Validates authorization:
- Unauthorized users can't delete projects
- Missing required fields are rejected
- Invalid user IDs return 404

## Issue Types

### Critical (🔴)
System is broken, needs immediate attention:
- CRUD operation failing completely
- API returning 500 errors
- Data corruption detected

### Warning (🟡)
Problem exists but system still works:
- Orphaned records found
- Duplicate tags exist
- Broken associations

### Info (🔵)
Informational, no action needed:
- Validation passed
- Auto-fix applied successfully
- Performance metrics

## Safety Features

### 1. Test Projects
Guardian creates test projects/tags during validation, then deletes them.
Never touches production data during tests.

### 2. Dry-Run Capability
Can run in read-only mode to detect issues without fixing.

### 3. Git Commits
Every fix is committed to git with full details.

### 4. Rollback
All changes are reversible via git.

### 5. Limited Scope
Only fixes obvious issues (duplicates, orphans).
Never modifies user content.

## Dashboard

Visit https://www.kimbleai.com/guardian to see:

### Stats
- **Last Run**: When Guardian last ran
- **Schedule**: "Every 6 hours"
- **Issues Found**: Total issues detected
- **Auto-Fixed**: Issues automatically repaired

### Issue List
Color-coded issues with:
- **Type**: Project, Tag, Association, Permission, Orphan, Duplicate
- **Severity**: Critical, Warning, Info
- **Entity**: What's affected
- **Issue**: Description of the problem
- **Fixable**: Whether Guardian can auto-fix

### Summary
Human-readable summary like:
```
✅ All systems operational - no issues found
```
or
```
Found 5 issues: 1 critical, 3 warnings, 1 info. Auto-fixed 3 issues.
```

## API Endpoint

### GET /api/guardian/run

**Parameters:**
- `trigger` (optional): "manual" or "scheduled" (default)

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-10-31T12:00:00.000Z",
  "issuesFound": 5,
  "issuesFixed": 3,
  "issues": [
    {
      "type": "duplicate",
      "severity": "warning",
      "entity": "Tag: react",
      "issue": "2 duplicate tags found",
      "fixable": true
    }
  ],
  "summary": "Found 5 issues: 1 critical, 3 warnings, 1 info. Auto-fixed 3 issues.",
  "triggerType": "manual"
}
```

## Manual Testing

### Run Guardian Locally

```bash
# Test Guardian without committing
npx tsx -e "import { projectTagGuardian } from './lib/project-tag-guardian.js'; projectTagGuardian.run('manual').then(console.log)"
```

### Test via API

```bash
# Manual trigger
curl https://www.kimbleai.com/api/guardian/run?trigger=manual

# View dashboard
open https://www.kimbleai.com/guardian
```

### Test Specific Validation

```typescript
// Test only Projects CRUD
await guardian.validateProjectsCRUD();

// Test only Tags CRUD
await guardian.validateTagsCRUD();

// Test only associations
await guardian.validateAssociations();
```

## Logs

Guardian logs to **3 locations**:

### 1. Git Commits
Every auto-fix is committed:
```bash
git log --author="Guardian" --oneline
```

### 2. Console Output
Real-time logs during run:
```
🛡️ Guardian starting validation run...
📋 Validating Projects CRUD operations...
🏷️ Validating Tags CRUD operations...
🔗 Validating project-tag associations...
🔍 Checking for orphaned records...
🔁 Checking for duplicate tags...
🔐 Validating permissions...
🔧 Auto-fixing issues...
  🔧 Fixing duplicate: 2 duplicate tags found
  ✅ Fixed successfully
✅ Guardian run completed
Found 5 issues: 3 warnings, 2 info. Auto-fixed 3 issues.
```

### 3. API Response
Detailed JSON report returned by API.

## Troubleshooting

### "Guardian run failed"
Check logs for specific error:
```bash
railway logs | grep "Guardian"
```

### "CRUD validation failed"
API endpoint may be down. Check:
```bash
curl https://www.kimbleai.com/api/projects
curl https://www.kimbleai.com/api/tags
```

### "Too many issues found"
May indicate systemic problem. Review issues list manually.

### "Auto-fix failed"
Some issues can't be fixed automatically. Manual intervention needed.

## Comparison: Guardian vs Archie

| Feature | Archie 🦉 | Guardian 🛡️ |
|---------|----------|-------------|
| **Focus** | Code quality | Data integrity |
| **Runs** | Every hour | Every 6 hours |
| **Fixes** | Lint, dead code, deps | Duplicates, orphans, associations |
| **Scope** | Source files | Database + APIs |
| **Git commits** | ✅ Yes | ✅ Yes |
| **Dashboard** | /agent | /guardian |
| **Auto-fix** | ✅ Yes | ✅ Yes |
| **Complexity** | Simple | Moderate |

## Why This Approach?

### Problem
Projects and tags were "a continual problem":
- CRUD operations would break
- Orphaned records accumulated
- Duplicate tags caused confusion
- No visibility into data health

### Solution
Guardian validates everything, auto-fixes what it can, and reports the rest.

### Success Criteria
- ✅ All CRUD operations work
- ✅ No orphaned records
- ✅ No duplicate tags
- ✅ All associations valid
- ✅ Permissions enforced
- ✅ Full transparency via logs

## Future Enhancements

Potential improvements:
- 📊 Store reports in database for history
- 📧 Email alerts for critical issues
- 🔄 Auto-merge similar tags
- 📈 Trend analysis (issues over time)
- 🧪 Synthetic monitoring (proactive checks)
- 🔗 Validate all foreign key relationships
- 🗂️ Auto-organize projects by tags

## Summary

**Guardian** = Autonomous data integrity agent

**Mission**: Ensure projects and tags are always working correctly

**Method**: Test, validate, fix, report, commit

**Frequency**: Every 6 hours

**Philosophy**: Automate the boring stuff, alert on the important stuff

🛡️ Guardian works in the background, keeping your data clean and organized.
