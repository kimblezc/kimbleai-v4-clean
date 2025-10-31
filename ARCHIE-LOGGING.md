# Archie Logging & Monitoring Guide

## 🦉 Where Does Archie Log Everything?

Archie logs to **4 different places**, each serving a specific purpose:

---

## 1. 📜 Git Commits (Permanent Record)

**Location**: Git repository history
**Format**: Human-readable commit messages
**Permanence**: ✅ Forever (unless you delete git history)

### What's Logged:
- Every fix Archie makes
- Which files were changed
- What type of issue was fixed (lint, dead code, type error, dependency)
- Timestamp of when it happened

### How to View:

```bash
# See all Archie commits
git log --author="Archie" --oneline

# See last 20 Archie commits with details
git log --author="Archie" -20 --pretty=format:"%h - %s (%ar)" --stat

# See Archie's work in the last 24 hours
git log --author="Archie" --since="24 hours ago"

# See a specific commit's changes
git show <commit-hash>
```

### Example Output:
```
a1b2c3d - chore: Archie automated maintenance (2 hours ago)

- lint: Fixed missing semicolon in app/page.tsx
- dead_code: Removed unused import in lib/utils.ts
- dependency: Update eslint from 8.45.0 to 8.45.1

🦉 Automated by Archie
🤖 Generated with Claude Code

Co-Authored-By: Archie <archie@kimbleai.com>
```

**Best for**: Historical record, seeing exactly what changed

---

## 2. 🌐 Dashboard UI (Human-Friendly)

**Location**: https://www.kimbleai.com/agent
**Format**: Styled web interface
**Refresh**: Server-side rendered on each page load

### What's Shown:
- Total number of fixes
- Last run time (relative, e.g., "2 hours ago")
- Run schedule (every hour)
- Recent activity feed (last 20 commits)
- Each commit shows:
  - Commit hash
  - Commit message
  - Timestamp
  - Full details

### How to Access:
1. **Option A**: Visit https://www.kimbleai.com/agent directly
2. **Option B**: Click the green 🦉 button in the sidebar

**Best for**: Quick check, visual overview, sharing with team

---

## 3. 📊 Console Output (Real-Time)

**Location**: Railway logs / Server console
**Format**: Plain text with emojis
**Permanence**: ⚠️ Temporary (only recent logs kept)

### What's Logged:
```
🦉 Archie starting maintenance run...
📊 Scanning codebase for issues...
🔧 Fixing top 5 issues...
  🔧 Fixing type_error: Property 'foo' does not exist on type 'Bar'
      🤖 Using AI to fix TypeScript error (attempt 1)...
      📝 Applied AI fix to app/page.tsx
      ✅ Fixed successfully (attempt 1)
  🔧 Fixing lint: Missing semicolon
      ✅ Fixed successfully (attempt 1)
✅ Fixed 2/5 issues: 1 type_error, 1 lint
```

### How to View:

**On Railway (Production):**
```bash
# Stream live logs
railway logs

# Filter for Archie only
railway logs | grep "Archie"

# Last 100 lines
railway logs -n 100
```

**Local Testing:**
```bash
# Run Archie locally and see output
npx tsx -e "import { archieAgent } from './lib/archie-agent.js'; archieAgent.run().then(console.log)"
```

**Best for**: Real-time debugging, seeing what's happening now

---

## 4. 🔌 API Response JSON (Detailed Data)

**Location**: `/api/archie/run?trigger=manual`
**Format**: JSON object
**Permanence**: ⚠️ Only during API call

### What's Returned:
```json
{
  "success": true,
  "timestamp": "2025-10-31T10:00:00.000Z",
  "tasksFound": 5,
  "tasksCompleted": 2,
  "tasksSkipped": 3,
  "improvements": [
    {
      "type": "type_error",
      "file": "app/page.tsx",
      "issue": "Property 'foo' does not exist",
      "priority": 7
    },
    {
      "type": "lint",
      "file": "lib/utils.ts",
      "issue": "Missing semicolon",
      "priority": 8
    }
  ],
  "errors": [],
  "commitHash": "a1b2c3d",
  "summary": "Fixed 2/5 issues: 1 type_error, 1 lint",
  "triggerType": "manual"
}
```

### How to Access:
```bash
# Manual trigger (browser or curl)
curl https://www.kimbleai.com/api/archie/run?trigger=manual

# Or visit in browser
https://www.kimbleai.com/api/archie/run?trigger=manual
```

**Best for**: Automation, programmatic access, detailed debugging

---

## 📋 What Information is Logged?

### For Each Run:
- ⏰ **Timestamp**: When Archie ran
- 🔍 **Tasks Found**: How many issues detected
- ✅ **Tasks Completed**: How many successfully fixed
- ⏭️ **Tasks Skipped**: How many couldn't be fixed
- 💾 **Commit Hash**: Git commit if changes were made
- 📝 **Summary**: Human-readable overview

### For Each Fix Attempt:
- 📂 **File**: Which file has the issue
- 🏷️ **Type**: lint, dead_code, type_error, dependency
- 📄 **Issue**: Description of the problem
- 🎯 **Priority**: How important (1-10)
- 🔄 **Attempt Number**: Which retry (1, 2, or 3)
- ✅/❌ **Result**: Success or failure
- 🔬 **Test Result**: Did the fix pass tests?

### For AI-Powered Fixes:
- 🤖 **Model Used**: GPT-4o or GPT-4o-mini
- 📖 **Context Provided**: Error message, file content, surrounding code
- 🎨 **Strategy**: Minimal, aggressive, or last-resort
- 📝 **Fix Applied**: What code was changed
- 🧪 **Verification**: Did tsc/lint pass?

---

## 🔍 How to Monitor Archie

### Daily Check (30 seconds):
```bash
# Quick check
git log --author="Archie" --since="24 hours ago" --oneline
```

### Weekly Review (2 minutes):
1. Visit https://www.kimbleai.com/agent
2. Review total fixes
3. Check if any errors occurred
4. Verify last run was recent

### Deep Dive (when needed):
```bash
# See detailed changes
git log --author="Archie" --since="1 week ago" --stat --pretty=format:"%h - %s (%ar)"

# View Railway logs
railway logs | grep -A 10 "Archie"

# Manual test run
curl https://www.kimbleai.com/api/archie/run?trigger=manual
```

---

## 🚨 What to Look For

### Good Signs ✅:
- Regular commits every hour (or when issues found)
- "Fixed X/Y issues" in commit messages
- Low skip rate (most fixes succeed)
- No error messages

### Warning Signs ⚠️:
- No commits for 24+ hours (Archie might be down)
- High skip rate (many fixes failing)
- Same issue appearing repeatedly (not actually fixed)
- Error messages in logs

### Critical Issues 🚨:
- Archie making breaking changes (shouldn't happen with safety limits)
- Failed builds after Archie commits
- Git conflicts
- API returning errors

---

## 💡 Pro Tips

1. **Bookmark the dashboard**: https://www.kimbleai.com/agent
2. **Set up git notifications**: Get email when Archie commits
3. **Check Railway dashboard**: See if Archie's cron is running
4. **Test manually first**: Use `?trigger=manual` to test changes
5. **Review git diffs**: Use `git show <hash>` to see exact changes

---

## 🎯 Quick Reference

| What You Want | Where to Look | Command/URL |
|---------------|---------------|-------------|
| Last 24 hours | Git log | `git log --author="Archie" --since="24 hours ago"` |
| Visual overview | Dashboard | https://www.kimbleai.com/agent |
| Real-time logs | Railway | `railway logs` |
| Manual test | API | https://www.kimbleai.com/api/archie/run?trigger=manual |
| Specific commit | Git show | `git show <hash>` |
| All Archie work | Git log | `git log --author="Archie" --oneline` |

---

## 📝 Summary

**Archie logs EVERYTHING** to ensure full transparency:

1. **Git** = Permanent record
2. **Dashboard** = Human-friendly view
3. **Console** = Real-time debugging
4. **API JSON** = Programmatic access

**No black boxes. Every change is tracked, logged, and reviewable.**

🦉 Archie works in the open, by design.
