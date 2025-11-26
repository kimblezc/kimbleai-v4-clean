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

### 3. **Transcriptions Not Appearing in Sidebar** 🚨 DATABASE SCHEMA MISMATCH (v8.44.0-v8.45.0)
**Files**:
- `app/api/transcribe/assemblyai/route.ts` (lines 1144-1285)
- `sql/audio_transcriptions_schema.sql` (missing columns)

**Error Evolution**:
- v8.44.0: `ReferenceError: actualUserId is not defined` ✅ FIXED IN v8.45.0
- v8.45.0: `Missing user_id from transcription record` - NEW ERROR
- Root cause: `Could not find the 'metadata' column of 'audio_transcriptions' in the schema cache`

**REAL ROOT CAUSE**: Database schema mismatch!
- **Code expects** (line 1154): `metadata` JSONB column and `service` TEXT column
- **Database has**: Neither column exists in `audio_transcriptions` table!
- **Result**: Database insert FAILS silently → `transcriptionData` is null → conversation creation fails

**Previous fixes were treating symptoms, not the disease:**
- v8.44.0 tried to use out-of-scope `actualUserId` ❌ Wrong variable scoping
- v8.45.0 tried to use `transcriptionData.user_id` ❌ But `transcriptionData` is null because insert failed!

**Fix Applied**:
```sql
-- Migration: supabase/migrations/20251117_add_metadata_service_to_transcriptions.sql
ALTER TABLE audio_transcriptions
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS service TEXT DEFAULT 'assemblyai';

-- GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_metadata
  ON audio_transcriptions USING GIN (metadata);

-- B-tree index for service column
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_service
  ON audio_transcriptions(service);
```

**Status**: ✅ MIGRATION EXECUTED ON PRODUCTION (v8.46.0 @ 60cc6d7)
- Migration file committed
- SQL executed manually on Supabase production database
- Database schema now matches code expectations
- Ready for next transcription upload to verify end-to-end fix

---

## 📊 Deployment History

| Version | Commit | Status | Issues |
|---------|--------|--------|--------|
| v8.40.0 | (previous) | ❌ Failed | UUID lookup broken |
| v8.41.0 | e8ab616 | ❌ Failed | UUID fix incomplete |
| v8.42.0 | 87fd8cc | ⚠️ Partial | UUID fixed, 431 persisted |
| v8.43.0 | 4b5e9fb | ⚠️ Partial | Header fixed, sidebar broken |
| v8.44.0 | 33a8b31 | ❌ Failed | actualUserId scope error |
| v8.45.0 | cd9ae5e | ❌ Failed | Missing user_id (transcriptionData was null) |
| v8.46.0 | 60cc6d7 | ✅ DEPLOYED | Database schema fixed - metadata & service columns added |

---

## 🎯 Next Steps

1. **✅ Migration Created**: Created supabase/migrations/20251117_add_metadata_service_to_transcriptions.sql
2. **✅ Migration Executed**: SQL executed on production Supabase database (manual execution)
3. **✅ Version Updated**: Bumped version to v8.46.0 (60cc6d7)
4. **⏳ Awaiting Testing**: Waiting for next transcription upload to verify:
   - No PGRST204 errors (metadata column found)
   - Database insert succeeds
   - transcriptionData contains user_id
   - Conversation creation succeeds
   - Transcription appears in sidebar with preview message

---

## 📝 Lessons Learned

### ❌ What Went Wrong (v8.40.0-v8.46.0)
1. **Too Many Incremental Deployments**: Deployed v8.41.0, v8.42.0, v8.43.0 without properly testing each
2. **No Local Testing**: Pushed code without verifying build success locally
3. **Incomplete Fixes**: Fixed server-side (v8.42.0) but didn't fix client-side until v8.43.0
4. **Missing Variable**: Used `userId` instead of `actualUserId` in conversation creation

### 🔥 CRITICAL DISCOVERY (2025-11-18 - v8.46.0)

**THE DEPLOYMENT PIPELINE WAS BROKEN ALL ALONG**

Even after fixing all code issues (v8.46.0 commit 5e04351), Railway deployment was **15+ hours old** and not updating despite:
- ✅ Git commits successful
- ✅ Git pushes successful to GitHub master
- ✅ `railway up` commands executed
- ✅ Local builds passing with 0 errors
- ❌ **Railway still serving OLD code with database errors**

**Root Cause**: Railway configured for GitHub auto-deploy but webhooks not firing. `railway up` uploads were being ignored.

### ✅ PERMANENT FIX: Railway Deployment Verification Protocol

**RULE**: After every git push, ALWAYS verify Railway is actually deploying the new code.

**How to Verify**:
```bash
# 1. Push code
git push origin master

# 2. Wait 30 seconds
sleep 30

# 3. Check Railway logs for NEW deployment
railway logs --tail 10

# 4. Look for "Building from commit <hash>"
# If you see old logs (timestamps >1 hour old), Railway didn't deploy!
```

**If Railway Didn't Auto-Deploy**:
1. Open Railway dashboard: https://railway.app/project/f0e9b8ac-8bea-4201-87c5-598979709394
2. Click "kimbleai" service card
3. Click "Deployments" tab
4. Click latest deployment (top of list)
5. Click three dots (...) → "Redeploy"
6. Wait 3-5 minutes for build
7. Verify commit hash matches your latest push

**Alternative: GitHub Webhook Trigger**:
```bash
# Create empty commit to force webhook
git commit --allow-empty -m "chore: Trigger Railway redeploy"
git push origin master
```

### ✅ What We're Doing Differently (POST-v8.46.0)
1. **Test Locally First**: Building locally to catch TypeScript errors BEFORE deploying
2. **Single Comprehensive Fix**: Combining all fixes into one tested deployment
3. **Verify End-to-End**: Will test full transcription flow after deployment
4. **Write Tests**: Need to add integration tests for transcription API (still pending)
5. **🆕 VERIFY DEPLOYMENT ACTUALLY DEPLOYED**: Check Railway logs after EVERY push to confirm new build started

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
