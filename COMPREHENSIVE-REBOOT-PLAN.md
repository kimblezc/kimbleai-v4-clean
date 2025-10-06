# 🔄 Comprehensive Reboot Plan - October 6, 2025

## 🎯 Current Situation

**Issues Identified:**
1. ❌ Google Drive with M4A files not connected
2. ❌ AssemblyAI API key is READ-ONLY (can't upload files)
3. ✅ Environment variables clean (no whitespace issues)
4. ✅ Domain routing configured (kimbleai.com / www.kimbleai.com)
5. ✅ NEXTAUTH_URL set correctly
6. ✅ Latest code deployed

---

## 🚀 Action Plan

### Phase 1: Fix AssemblyAI API Key (5 minutes)

**Problem:** Current key `b3a98632...` is read-only (test shows 401 on uploads)

**Steps:**
1. Go to: https://www.assemblyai.com/app
2. Sign in to your account
3. Navigate to **API Keys**
4. Click **"Generate New API Key"**
5. **IMPORTANT:** Select **"Full Access"** (not read-only)
6. Copy the new key immediately
7. Run:
   ```bash
   # Remove old key
   printf "y\n" | npx vercel env rm ASSEMBLYAI_API_KEY production

   # Add new key (replace YOUR_NEW_KEY)
   printf "YOUR_NEW_KEY" | npx vercel env add ASSEMBLYAI_API_KEY production

   # Verify clean
   node scripts/scan-vercel-env-whitespace.js

   # Deploy
   npx vercel --prod

   # Update aliases (use the deployment URL from above)
   npx vercel alias [deployment-url] kimbleai.com
   npx vercel alias [deployment-url] www.kimbleai.com
   ```

8. **Verify:** https://www.kimbleai.com/api/test-assemblyai
   - `test3_Upload` should show `status: 200` (not 401!)

**Documents:** See `ASSEMBLYAI-KEY-READ-ONLY.md`

---

### Phase 2: Connect Google Drive (5 minutes)

**Problem:** Google Drive not connected / authorized

**Steps:**
1. Go to: https://www.kimbleai.com
2. Sign in with Google (account that has M4A files)
3. **IMPORTANT:** Grant ALL permissions when prompted:
   - ✅ View and manage Google Drive files
   - ✅ View and manage Calendar
   - ✅ Read and send email (Gmail)
   - ✅ Basic profile

4. If sign-in fails with "redirect_uri_mismatch":
   - Go to: https://console.cloud.google.com/apis/credentials
   - Find OAuth client: `968455155458-nuerqfbgqmdarn2hal4es081d9ut152t.apps.googleusercontent.com`
   - Add redirect URIs:
     ```
     https://www.kimbleai.com/api/auth/callback/google
     https://kimbleai.com/api/auth/callback/google
     ```
   - Save and try again

5. After sign-in, go to: https://www.kimbleai.com/transcribe
6. You should see Google Drive files listed
7. Navigate to folder with M4A files

**Documents:** See `GOOGLE-DRIVE-RECONNECT.md`

---

### Phase 3: Test Transcription (5 minutes)

**Steps:**
1. At https://www.kimbleai.com/transcribe:
   - Select a **small M4A file** (under 10MB for quick test)
   - Click "Transcribe"
   - Watch for errors

2. **Monitor in real-time:**
   ```bash
   # In terminal, watch logs
   npx vercel logs --follow
   ```

3. **Expected Success Flow:**
   - See `[DRIVE-ASSEMBLYAI] Request received`
   - See `[DRIVE-ASSEMBLYAI] Downloading from Google Drive...`
   - See `[DRIVE-ASSEMBLYAI] Uploading to AssemblyAI...`
   - See `[DRIVE-ASSEMBLYAI] Upload response status: 200`
   - See `[DRIVE-ASSEMBLYAI] Transcription job created: [job-id]`
   - UI shows "Transcription started"

4. **If it fails:**
   - Check error message
   - Check logs for diagnostic info
   - Share error details

---

## 🧪 Pre-Flight Checklist

Before testing transcription, verify:

### Environment
- [ ] ✅ Latest code deployed: `kimbleai-v4-clean-itro02wyx`
- [ ] ✅ Domain aliases updated
- [ ] ✅ `NEXTAUTH_URL` = https://www.kimbleai.com
- [ ] ⚠️ AssemblyAI key is **full-access** (not read-only)
- [ ] ⚠️ Google Drive connected and authorized

### Test Endpoints
```bash
# 1. AssemblyAI key test
curl https://www.kimbleai.com/api/test-assemblyai
# Expect: test3_Upload status 200

# 2. Transcription endpoint status
curl https://www.kimbleai.com/api/transcribe/drive-assemblyai
# Expect: {"status":"ready","apiKeyConfigured":true}

# 3. Debug environment
curl https://www.kimbleai.com/api/debug-env
# (Requires sign-in - will redirect)
```

### OAuth Configuration
- [ ] Redirect URIs added to Google Cloud Console
- [ ] Client ID: `968455155458-nuerqfbgqmdarn2hal4es081d9ut152t`
- [ ] Redirect URIs:
  - https://www.kimbleai.com/api/auth/callback/google
  - https://kimbleai.com/api/auth/callback/google

---

## 📊 What We Fixed

### Session 1: Environment Variables
- ✅ Created comprehensive whitespace scanner
- ✅ Found and fixed `\n` in ASSEMBLYAI_API_KEY and NEXTAUTH_URL
- ✅ Verified all env vars clean
- **Document:** `WHITESPACE-SCAN-GUIDE.md`

### Session 2: Domain Configuration
- ✅ Set up domain aliases (kimbleai.com / www.kimbleai.com)
- ✅ Updated NEXTAUTH_URL to main domain
- ✅ Fixed git config email
- **Document:** `DOMAIN-CONFIGURED.md`

### Session 3: API Key Discovery
- ✅ Identified AssemblyAI key is read-only
- ✅ Created test endpoint to verify
- ✅ Confirmed: READ works, UPLOAD fails with 401
- **Document:** `ASSEMBLYAI-KEY-READ-ONLY.md`

### Session 4: Google Drive (Current)
- ⏳ Identified Google Drive not connected
- ⏳ Created reconnection guide
- **Document:** `GOOGLE-DRIVE-RECONNECT.md`

---

## 🔍 Diagnostic Tools Available

### 1. AssemblyAI Key Test
**URL:** https://www.kimbleai.com/api/test-assemblyai
**Tests:**
- Key format and length
- List transcripts (READ)
- Upload test data (WRITE)

### 2. Transcription Endpoint Status
**URL:** https://www.kimbleai.com/api/transcribe/drive-assemblyai
**Shows:**
- Endpoint ready status
- API key configured
- API key length and preview

### 3. Environment Variable Scanner
**Command:** `node scripts/scan-vercel-env-whitespace.js`
**Detects:**
- Literal `\n` and `\r` characters
- Leading/trailing whitespace
- Tabs, unicode whitespace
- Non-printable characters

### 4. Live Logs
**Command:** `npx vercel logs --follow`
**Shows:**
- Real-time transcription attempts
- API key diagnostics
- Upload response status
- Error messages

---

## 🎯 Success Criteria

When everything works, you should see:

### 1. Sign-In Works
- ✅ No redirect_uri_mismatch error
- ✅ Google authorization screen appears
- ✅ Successfully signed in to kimbleai.com

### 2. Drive Access Works
- ✅ Can see Google Drive files at `/transcribe`
- ✅ Can navigate folders
- ✅ Can see M4A files

### 3. AssemblyAI Key Works
- ✅ Test endpoint shows `test3_Upload` status 200
- ✅ No "Invalid API key" errors

### 4. Transcription Works
- ✅ Can select M4A file
- ✅ Transcription starts without errors
- ✅ Logs show successful upload
- ✅ Job ID returned
- ✅ Can check status

---

## 📝 Current Status

### Deployment
- **URL:** https://kimbleai-v4-clean-itro02wyx-kimblezcs-projects.vercel.app
- **Domains:** https://www.kimbleai.com, https://kimbleai.com
- **Date:** October 6, 2025 05:27 UTC

### Environment Variables
- ✅ All clean (no whitespace)
- ⚠️ ASSEMBLYAI_API_KEY: `b3a98632...` (READ-ONLY - needs replacement)
- ✅ NEXTAUTH_URL: `https://www.kimbleai.com`

### Known Issues
1. ❌ AssemblyAI API key is read-only
2. ❌ Google Drive not connected
3. ✅ Everything else working

---

## 🚦 Step-by-Step Execution Order

**Execute in this exact order:**

### Step 1: Fix AssemblyAI Key
```bash
# 1a. Get new key from https://www.assemblyai.com/app
# 1b. Update Vercel
printf "y\n" | npx vercel env rm ASSEMBLYAI_API_KEY production
printf "NEW_KEY_HERE" | npx vercel env add ASSEMBLYAI_API_KEY production

# 1c. Verify and deploy
node scripts/scan-vercel-env-whitespace.js
npx vercel --prod

# 1d. Update aliases
npx vercel alias [deployment-url] kimbleai.com
npx vercel alias [deployment-url] www.kimbleai.com

# 1e. Test
curl https://www.kimbleai.com/api/test-assemblyai | grep "test3_Upload"
# Should show status: 200
```

### Step 2: Connect Google Drive
1. Go to https://www.kimbleai.com
2. Sign in with Google
3. Grant all permissions
4. Go to https://www.kimbleai.com/transcribe
5. Verify files visible

### Step 3: Test Transcription
1. Select small M4A file
2. Click "Transcribe"
3. Watch logs: `npx vercel logs --follow`
4. Verify success

---

## 📞 Support Resources

### AssemblyAI
- **Dashboard:** https://www.assemblyai.com/app
- **Support:** support@assemblyai.com
- **Docs:** https://www.assemblyai.com/docs

### Google Cloud
- **Console:** https://console.cloud.google.com
- **Credentials:** https://console.cloud.google.com/apis/credentials
- **OAuth Client ID:** 968455155458-nuerqfbgqmdarn2hal4es081d9ut152t

### Vercel
- **Dashboard:** https://vercel.com/kimblezcs-projects/kimbleai-v4-clean
- **Logs:** `npx vercel logs --follow`

---

## ✅ Ready to Begin

**Start Here:**
1. Generate new full-access AssemblyAI API key
2. Update Vercel environment variable
3. Deploy
4. Sign in and connect Google Drive
5. Test transcription

**Test URLs:**
- **Main:** https://www.kimbleai.com
- **Transcribe:** https://www.kimbleai.com/transcribe
- **API Test:** https://www.kimbleai.com/api/test-assemblyai

**Report:** Share any errors or issues you encounter!

---

**Last Updated:** October 6, 2025 05:27 UTC
**Status:** ⏳ Ready for comprehensive reboot
**Next:** Generate new AssemblyAI API key
