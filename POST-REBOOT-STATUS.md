# 🚨 Post-Reboot Transcription Bug Fixes

**Date**: 2025-11-17
**Session**: Major debugging session after multiple failed deployments
**Status**: ⏳ In Progress - Build & test phase

---

## 🐛 Bugs Fixed This Session

###1. **User UUID Lookup Query Bug** ✅ FIXED (v8.42.0)
**File**: `app/api/transcribe/assemblyai/route.ts` (lines 343-367, 470-495)
**Error**: `invalid input syntax for type uuid: "zach"`
**Root Cause**: Supabase `.or()` query tried to match string "zach" against UUID column
**Fix**: Added UUID format detection, split into two query paths:
- UUID format → query by `id.eq.${userId}`
- String format → query by `name.ilike.${userId},email.ilike.${userId}`

```typescript
// Check if userId is a valid UUID
const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

if (isUUID) {
  // Query by UUID
  const result = await supabase.from('users').select('id, name, email').eq('id', userId).single();
} else {
  // Query by name or email
  const result = await supabase.from('users').select('id, name, email').or(`name.ilike.${userId},email.ilike.${userId}`).single();
}
```

---

### 2. **DnD Facts 431 Error (Header Size Mismatch)** ✅ FIXED (v8.43.0)
**Files**:
- `hooks/useDndFacts.ts` (line 91)
- `app/api/dnd-facts/route.ts` (line 177)

**Error**: `431 Request Header Fields Too Large` (repeated)
**Root Cause**: Client/server header size threshold mismatch:
- **Client**: Checked `> 7000` bytes before truncating
- **Server**: Rejected headers `> 8000` bytes
- **Gap**: Headers between 7KB-8KB caused failures

**Fix**: Changed client threshold from `7000` to `6000` bytes (2KB safety buffer):

```typescript
// hooks/useDndFacts.ts (line 91)
const sessionData = encoded.length > 6000  // CHANGED FROM 7000
  ? btoa(encodeURIComponent(session.shownFacts.slice(-50).join(',')))
  : encoded;
```

---

### 3. **Transcriptions Not Appearing in Sidebar** ⏳ IN PROGRESS (v8.44.0)
**File**: `app/api/transcribe/assemblyai/route.ts` (line 1285)
**Error**: `null value in column "id" of relation "conversations" violates not-null constraint`
**Root Cause**: Conversation insert used `userId` (string) instead of `actualUserId` (UUID)

**Fix Applied**:
```typescript
// Line 1285 - FIXED
const { data: conversation, error: convError } = await supabase
  .from('conversations')
  .insert({
    user_id: actualUserId,  // CHANGED FROM: userId
    title: conversationTitle,
    project_id: validProjectId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .select()
  .single();
```

**Status**: Code fixed, building locally, needs testing

---

## 📊 Deployment History

| Version | Commit | Status | Issues |
|---------|--------|--------|--------|
| v8.40.0 | (previous) | ❌ Failed | UUID lookup broken |
| v8.41.0 | e8ab616 | ❌ Failed | UUID fix incomplete |
| v8.42.0 | 87fd8cc | ⚠️ Partial | UUID fixed, 431 persisted |
| v8.43.0 | 4b5e9fb | ⚠️ Partial | Header fixed, sidebar broken |
| v8.44.0 | TBD | ⏳ Building | All fixes combined |

---

## 🎯 Next Steps

1. **⏳ Build Verification**: Local build running to verify all TypeScript compiles
2. **⏳ Commit Changes**: Single commit with all fixes (v8.44.0)
3. **⏳ Deploy to Railway**: Push to master, trigger Railway deployment
4. **⏳ Integration Testing**: Upload audio file, verify:
   - No UUID errors
   - No 431 errors
   - Transcription appears in sidebar with preview message

---

## 📝 Lessons Learned

### ❌ What Went Wrong
1. **Too Many Incremental Deployments**: Deployed v8.41.0, v8.42.0, v8.43.0 without properly testing each
2. **No Local Testing**: Pushed code without verifying build success locally
3. **Incomplete Fixes**: Fixed server-side (v8.42.0) but didn't fix client-side until v8.43.0
4. **Missing Variable**: Used `userId` instead of `actualUserId` in conversation creation

### ✅ What We're Doing Differently
1. **Test Locally First**: Building locally to catch TypeScript errors BEFORE deploying
2. **Single Comprehensive Fix**: Combining all fixes into one tested deployment (v8.44.0)
3. **Verify End-to-End**: Will test full transcription flow after deployment
4. **Write Tests**: Need to add integration tests for transcription API (still pending)

---

## 🔍 How to Verify Success

After v8.44.0 deploys to Railway:

```bash
# 1. Check Railway logs for clean startup
railway logs --tail 50

# 2. Hard refresh browser (clear cache)
# Press: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

# 3. Upload test audio file
# - Go to https://www.kimbleai.com
# - Upload small .m4a file
# - Watch for errors in browser console

# 4. Expected success indicators:
# ✅ No UUID errors in Railway logs
# ✅ No 431 errors in browser console
# ✅ Transcription completes successfully
# ✅ New conversation appears in sidebar
# ✅ Conversation shows preview message with file details
```

---

## 📄 Related Documentation

- `CLAUDE.md` - Project rules and deployment process
- `version.json` - Current version tracking
- `tests/api/transcribe.test.ts` - Existing transcription tests (need expansion)

---

**Current Status**: Building locally, will commit and deploy once build succeeds with 0 errors.
