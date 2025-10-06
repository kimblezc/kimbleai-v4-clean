# 🔄 Google Drive Reconnection & Full System Test

## 🎯 Issue Identified

**Problem:** Google Drive with M4A files isn't connected
**Root Cause:** Google OAuth authorization may have expired or was never connected
**Solution:** Reconnect Google Drive and test full transcription flow

---

## ✅ Step-by-Step Reconnection

### Step 1: Sign In to Kimble AI
1. Go to: **https://www.kimbleai.com**
2. You should be redirected to sign-in (or click "Sign In")
3. Click **"Sign in with Google"**
4. Select your Google account (the one with the M4A files)
5. **IMPORTANT**: You'll see Google authorization screen asking for permissions

### Step 2: Grant Google Drive Permissions
When Google asks for permissions, you MUST allow:
- ✅ **View and manage Google Drive files** - CRITICAL
- ✅ **View and manage Google Calendar events**
- ✅ **Read, compose, send, and manage email** (Gmail)
- ✅ **Basic profile information**

**If you don't see Drive permissions:** OAuth configuration might be wrong. Let me know.

### Step 3: Verify OAuth Redirect URIs (If Sign-In Fails)
If sign-in fails with "redirect_uri_mismatch", you need to add redirect URIs:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find OAuth 2.0 Client ID: `968455155458-nuerqfbgqmdarn2hal4es081d9ut152t.apps.googleusercontent.com`
3. Under "Authorized redirect URIs", ADD:
   ```
   https://www.kimbleai.com/api/auth/callback/google
   https://kimbleai.com/api/auth/callback/google
   ```
4. Click **"Save"**
5. Try signing in again

### Step 4: Access Transcribe Page
1. After signing in, go to: **https://www.kimbleai.com/transcribe**
2. You should see the transcription interface
3. You should see a list of Google Drive files OR a "Connect Google Drive" button

### Step 5: Connect Google Drive (If Needed)
If you see "Connect Google Drive":
1. Click the button
2. Select your Google account
3. Grant permissions
4. You should now see your Drive files

### Step 6: Find Your M4A Files
1. Look for files ending in `.m4a`
2. Navigate to the folder where they're stored
3. Common locations:
   - "My Drive" → "Recordings"
   - "My Drive" → "Audio"
   - Shared folders

### Step 7: Test Transcription
1. Select a **small M4A file first** (under 10MB for quick test)
2. Click "Transcribe" or "Start Transcription"
3. Watch for progress
4. Check for errors

---

## 🧪 Full System Test Checklist

### Test 1: Authentication
- [ ] Can sign in with Google
- [ ] No "redirect_uri_mismatch" error
- [ ] Successfully redirected to https://www.kimbleai.com after sign-in

### Test 2: Google Drive Access
- [ ] Can see list of Drive files
- [ ] Can navigate folders
- [ ] Can see M4A files

### Test 3: AssemblyAI API Key
```bash
# Run this to verify API key
curl https://www.kimbleai.com/api/test-assemblyai
```

**Expected:**
- `test2_ListTranscripts`: status 200 ✅
- `test3_Upload`: status should be 200 (if still 401, need new key)

### Test 4: Transcription Flow
- [ ] Select M4A file from Drive
- [ ] Click "Transcribe"
- [ ] No HTTP 500 error
- [ ] No "Invalid API key" error
- [ ] Transcription job starts
- [ ] Can see transcription ID
- [ ] Can check status

---

## 🔍 Common Issues & Fixes

### Issue 1: "redirect_uri_mismatch"
**Fix:** Add redirect URIs to Google Cloud Console (Step 3 above)

### Issue 2: Can't see Google Drive files
**Possible causes:**
- Google Drive not authorized
- Wrong Google account signed in
- Files in different account

**Fix:**
1. Go to: https://www.kimbleai.com/drive
2. Click "Reconnect Google Drive"
3. Make sure to select correct account

### Issue 3: "Invalid API key" on transcription
**Cause:** AssemblyAI API key is read-only
**Fix:** See `ASSEMBLYAI-KEY-READ-ONLY.md` for full solution

### Issue 4: HTTP 500 errors
**Check logs:**
```bash
npx vercel logs --follow
```

Watch for:
- `[DRIVE-ASSEMBLYAI] ...` messages
- Error stack traces
- "Invalid API key" messages

---

## 📊 What Should Work Now

### Current Deployment
- **URL:** https://kimbleai-v4-clean-itro02wyx-kimblezcs-projects.vercel.app
- **Domain:** https://www.kimbleai.com
- **Alt Domain:** https://kimbleai.com

### Environment Variables
- ✅ `NEXTAUTH_URL`: https://www.kimbleai.com
- ✅ `ASSEMBLYAI_API_KEY`: b3a98632... (32 chars, clean)
- ⚠️ **AssemblyAI Key Status:** READ-ONLY (can list but can't upload)

### Endpoints
- ✅ `/api/auth/callback/google` - OAuth callback
- ✅ `/api/transcribe/drive-assemblyai` - Transcription endpoint
- ✅ `/api/google/drive` - Drive file listing
- ✅ `/api/test-assemblyai` - API key diagnostics

---

## 🎯 Expected Full Flow

When everything works:

1. **Sign In**
   - User goes to kimbleai.com
   - Clicks "Sign in with Google"
   - Authorizes Google Drive access
   - Redirected to dashboard

2. **Navigate to Transcribe**
   - Go to `/transcribe`
   - See list of Google Drive files
   - Browse to M4A file

3. **Start Transcription**
   - Select M4A file
   - Click "Transcribe"
   - Backend downloads from Drive
   - Backend uploads to AssemblyAI
   - AssemblyAI job ID returned
   - User sees "Transcription started"

4. **Check Status**
   - Poll `/api/transcribe/status?jobId=...`
   - See progress updates
   - Get transcript when complete

---

## 🚨 Critical Blockers

### 1. AssemblyAI API Key (HIGH PRIORITY)
**Status:** ⚠️ READ-ONLY
**Test:** https://www.kimbleai.com/api/test-assemblyai
**Fix:** Generate new full-access key at https://www.assemblyai.com/app

### 2. Google OAuth Redirect URIs
**Status:** ❓ Unknown (test by signing in)
**Fix:** Add to Google Cloud Console if sign-in fails

### 3. Google Drive Authorization
**Status:** ❓ Unknown (test by accessing `/transcribe`)
**Fix:** Grant permissions when prompted

---

## 📝 Quick Test Commands

```bash
# 1. Test AssemblyAI key
curl https://www.kimbleai.com/api/test-assemblyai

# 2. Test transcription endpoint (GET)
curl https://www.kimbleai.com/api/transcribe/drive-assemblyai

# 3. Check deployment status
npx vercel ls

# 4. Watch logs in real-time
npx vercel logs --follow

# 5. Verify environment variables
node scripts/scan-vercel-env-whitespace.js
```

---

## 🎯 Next Steps

1. **Immediate:** Sign in to https://www.kimbleai.com
2. **Authorize:** Grant Google Drive permissions
3. **Navigate:** Go to `/transcribe` and check if files visible
4. **Test:** Select small M4A file and try transcription
5. **Report:** Share any error messages you see

**If transcription fails with "Invalid API key":**
- Go to https://www.assemblyai.com/app
- Generate new full-access API key
- Update Vercel environment variable
- Redeploy

---

**Last Updated:** October 6, 2025
**Current Deployment:** kimbleai-v4-clean-itro02wyx
**Status:** ⏳ Waiting for Google Drive reconnection test

**Test Now:** https://www.kimbleai.com/transcribe
