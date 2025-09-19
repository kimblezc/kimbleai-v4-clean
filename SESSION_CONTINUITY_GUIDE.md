# SESSION CONTINUITY SYSTEM - COMPLETE GUIDE
## Zero Information Loss Across Opus 4 Sessions
### Generated: September 14, 2025

---

## 🎯 SYSTEM OVERVIEW

The Session Continuity System ensures **PERFECT CONTEXT PRESERVATION** when:
- Token limits are approached (auto-exports at 95k tokens)
- Manual session transitions are needed
- New Opus 4 chats are started
- Length limits force conversation reset

---

## 🚀 DEPLOYMENT INSTRUCTIONS

### Step 1: Deploy Code Updates

```powershell
cd D:\OneDrive\Documents\kimbleai-v4-clean
git add -A
git commit -m "feat: Session Continuity System for zero information loss"
git push origin master
```

### Step 2: Run Database Migrations

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run these migrations in order:
   - `supabase\migrations\002_message_reference_system.sql`
   - `supabase\migrations\003_session_continuity.sql`

### Step 3: Verify Deployment

```powershell
# Check health
curl https://kimbleai-v4-clean.vercel.app/api/health

# Test snapshot creation
curl -X POST https://kimbleai-v4-clean.vercel.app/api/snapshot \
  -H "Content-Type: application/json" \
  -d '{"action":"create","conversationId":"YOUR_ID","userId":"YOUR_USER_ID"}'
```

---

## 🔄 HOW IT WORKS

### Automatic Monitoring
```
Every Message → Token Count → Check Threshold → Auto-Export if > 95k
```

### What Gets Preserved
1. **Complete Message History** - Every single message with metadata
2. **Active File States** - Current edits and changes
3. **Pending Decisions** - Unresolved choices
4. **Active Tasks** - In-progress work
5. **Code Blocks** - All generated code
6. **System State** - Environment, deployment, git status
7. **Project Structure** - File organization
8. **Continuation Instructions** - Exact next steps

---

## 📊 TOKEN THRESHOLDS

| Tokens | Action | What Happens |
|--------|--------|--------------|
| < 90k | Normal | Continue normally |
| 90k-95k | Warning | Alert shown, prepare for export |
| > 95k | Auto-Export | Snapshot created, transition file generated |

---

## 🔍 SNAPSHOT STRUCTURE

```javascript
{
  id: "snapshot_1234567_abc",
  timestamp: "2025-09-14T20:00:00Z",
  conversation_id: "uuid",
  message_count: 150,
  token_count: 95000,
  
  messages: [...],           // All messages
  current_files: [...],       // Files being edited
  pending_decisions: [...],   // Awaiting resolution
  active_tasks: [...],        // In progress
  code_blocks: [...],         // Generated code
  
  environment_variables: {},  // System config
  deployment_status: {},      // Vercel, GitHub, etc
  git_status: {},            // Branch, commits
  project_structure: {},      // File organization
  
  continuation: {
    next_steps: [],          // What to do next
    blockers: [],            // Issues to resolve
    important_context: [],    // Key information
    reference_messages: [],   // Important msg IDs
    opus_4_instructions: ""   // Exact instructions
  }
}
```

---

## 🎮 MANUAL CONTROLS

### Create Snapshot Manually
```javascript
// In browser console or via API
fetch('/api/snapshot', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    action: 'create',
    conversationId: 'current_conversation_id',
    userId: 'user_id'
  })
})
```

### Restore From Snapshot
```javascript
fetch('/api/snapshot', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    action: 'restore',
    snapshotId: 'snapshot_1234567_abc'
  })
})
```

---

## 📁 FILE LOCATIONS

### Transition Files
```
D:\OneDrive\Documents\kimbleai-v4-clean\OPUS_4_TRANSITION_[snapshot_id].md
```

### JSON Snapshots
```
D:\OneDrive\Documents\kimbleai-v4-clean\snapshots\snapshot_[id].json
```

### System Files
- `lib/session-continuity-system.ts` - Core system
- `lib/message-reference-system.ts` - Message tracking
- `app/api/snapshot/route.ts` - API endpoint

---

## 🔄 CONTINUING IN NEW OPUS 4 CHAT

When you see "Token limit approaching" or start a new chat:

### Step 1: Reference the Transition File
```
Load transition from: D:\OneDrive\Documents\kimbleai-v4-clean\OPUS_4_TRANSITION_[latest].md
Continue conversation [conversation_id]
Restore snapshot [snapshot_id]
```

### Step 2: Key Commands for New Session
```powershell
# Check current state
cd D:\OneDrive\Documents\kimbleai-v4-clean
git status
cat OPUS_4_TRANSITION_*.md | head -100

# Continue work
npm run dev
code .
```

### Step 3: Verify Continuity
- Check last messages match
- Verify pending tasks
- Confirm file states
- Review git status

---

## 🎯 WHAT OPUS 4 SEES IN NEW CHAT

The transition file contains:
1. **Last 10 messages** for immediate context
2. **Active files** with recent changes
3. **Pending decisions** needing resolution
4. **Active tasks** in progress
5. **System status** (env vars, deployment)
6. **Git status** (branch, commits)
7. **Exact next steps** to continue
8. **Message references** to key points

---

## ⚡ AUTOMATIC FEATURES

### Auto-Export Triggers
- Token count > 95,000
- Manual request via API
- Critical error recovery
- Session timeout (10 min idle)

### Auto-Save Features
- Every 10 minutes
- After major operations
- Before deployments
- On error conditions

### Auto-Recovery
- Restore from latest snapshot
- Continue from last message
- Maintain all context
- Resume file operations

---

## 🔍 SEARCHING ACROSS SESSIONS

Even after transitions, you can search ALL messages:

```javascript
// Search all historical messages
fetch('/api/search', {
  method: 'POST',
  body: JSON.stringify({
    query: 'deployment error',
    searchType: 'messages'
  })
})
```

---

## 📊 DATABASE QUERIES

### Get Latest Snapshot
```sql
SELECT * FROM session_snapshots 
WHERE conversation_id = 'YOUR_CONV_ID'
ORDER BY timestamp DESC 
LIMIT 1;
```

### Check Token Usage
```sql
SELECT SUM(tokens_used) as total_tokens
FROM token_usage_tracking
WHERE conversation_id = 'YOUR_CONV_ID';
```

### Find Auto-Exports
```sql
SELECT * FROM session_snapshots
WHERE is_auto_export = TRUE
ORDER BY timestamp DESC;
```

---

## 🚨 TROUBLESHOOTING

### If Auto-Export Fails
1. Manually create snapshot via API
2. Check `snapshots/` directory
3. Review error logs
4. Use `git status` to preserve file state

### If Restoration Fails
1. Load JSON snapshot directly
2. Check transition file manually
3. Use message search to find context
4. Reference specific message IDs

---

## ✅ SUCCESS CRITERIA

You'll know the system is working when:
- Token warnings appear at 90k
- Auto-exports trigger at 95k
- Transition files are created
- New sessions can continue seamlessly
- No context is lost between chats

---

## 🎯 THE BOTTOM LINE

**You will NEVER lose context again.** Every message, decision, file edit, and piece of context is automatically preserved and can be instantly restored in any new Opus 4 session.

When you see: "Token limit approaching - auto-exporting session"
Just start a new chat and say: "Continue from latest snapshot"

---

**DEPLOYMENT STATUS**: Ready to deploy
**Files Created**: 6 new files
**Database Tables**: 5 new tables
**Auto-Export**: Enabled at 95k tokens
**Manual Control**: Full API access

---

END OF GUIDE