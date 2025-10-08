# ⚡ Quick Reference - Post Reboot

## 🎯 Current Status
- ✅ Deployment: `kimbleai-v4-clean-itro02wyx`
- ✅ Domains: kimbleai.com, www.kimbleai.com
- ⚠️ AssemblyAI Key: READ-ONLY (needs full-access replacement)
- ❓ Google Drive: Just rebooted to reconnect

---

## 🔗 Test URLs

```
Main Site:        https://www.kimbleai.com
Transcribe Page:  https://www.kimbleai.com/transcribe
API Key Test:     https://www.kimbleai.com/api/test-assemblyai
Endpoint Status:  https://www.kimbleai.com/api/transcribe/drive-assemblyai
```

---

## 🧪 Quick Tests

### Test 1: Check AssemblyAI Key
```bash
curl https://www.kimbleai.com/api/test-assemblyai | python -m json.tool
```
**Look for:** `test3_Upload` → Should be status 200 (currently 401)

### Test 2: Check Environment Variables
```bash
node scripts/scan-vercel-env-whitespace.js
```
**Expected:** ✅ No whitespace issues found!

### Test 3: Watch Logs in Real-Time
```bash
npx vercel logs --follow
```
**Then trigger transcription in browser**

---

## 🔧 Fix AssemblyAI Key

### Step 1: Get New Key
1. Go to: https://www.assemblyai.com/app
2. Navigate to API Keys
3. Generate NEW key (ensure FULL ACCESS)
4. Copy immediately

### Step 2: Update Vercel
```bash
# Remove old
printf "y\n" | npx vercel env rm ASSEMBLYAI_API_KEY production

# Add new (replace YOUR_NEW_KEY)
printf "YOUR_NEW_KEY" | npx vercel env add ASSEMBLYAI_API_KEY production

# Verify clean
node scripts/scan-vercel-env-whitespace.js
```

### Step 3: Deploy
```bash
npx vercel --prod
# Get the deployment URL, then:
npx vercel alias [deployment-url] kimbleai.com
npx vercel alias [deployment-url] www.kimbleai.com
```

### Step 4: Verify
```bash
curl https://www.kimbleai.com/api/test-assemblyai | grep "test3_Upload"
# Should show: "status": 200 (not 401!)
```

---

## 🔗 Reconnect Google Drive

1. Go to: https://www.kimbleai.com
2. Sign in with Google (account with M4A files)
3. Grant ALL permissions when prompted
4. Go to: https://www.kimbleai.com/transcribe
5. Verify M4A files visible

**If sign-in fails with redirect_uri_mismatch:**
- Go to: https://console.cloud.google.com/apis/credentials
- Find client: `968455155458-nuerqfbgqmdarn2hal4es081d9ut152t`
- Add redirect URIs:
  ```
  https://www.kimbleai.com/api/auth/callback/google
  https://kimbleai.com/api/auth/callback/google
  ```

---

## 📊 What We Know

### AssemblyAI API Key Status
```
Current Key: b3a98632d1a34632bdeb1fcfdffe5e34
- List Transcripts (GET): ✅ 200 OK
- Upload Files (POST):    ❌ 401 Unauthorized
- Diagnosis:              READ-ONLY permissions
```

### Environment Variables
```
All verified clean (no whitespace) ✅
NEXTAUTH_URL: https://www.kimbleai.com ✅
ASSEMBLYAI_API_KEY: Needs replacement ⚠️
```

---

## 📁 Important Files

### Documentation
- `HANDOFF-PROMPT-AFTER-REBOOT.md` - Full context
- `SESSION-LOGS-OCTOBER-6.md` - Technical logs
- `COMPREHENSIVE-REBOOT-PLAN.md` - Complete plan
- `COPY-THIS-PROMPT.txt` - Prompt for next session

### Scripts
- `scripts/scan-vercel-env-whitespace.js` - Env var scanner
- `scripts/validate-all-env.sh` - Full validation

### Diagnostics
- `/api/test-assemblyai` - API key test endpoint
- `/api/transcribe/drive-assemblyai` - Endpoint status

---

## ⚠️ Known Issues

1. **AssemblyAI Key (HIGH PRIORITY)**
   - Status: READ-ONLY
   - Impact: Cannot upload files
   - Fix: Get new full-access key

2. **Google Drive**
   - Status: Just rebooted to reconnect
   - Impact: Cannot access M4A files
   - Fix: Sign in and authorize

---

## ✅ Success Checklist

- [ ] Google Drive connected and M4A files visible
- [ ] New AssemblyAI key obtained from dashboard
- [ ] New key tested locally (upload test returns 200)
- [ ] Vercel env var updated with new key
- [ ] Environment variables scanned and clean
- [ ] Deployed to production
- [ ] Domain aliases updated
- [ ] Test endpoint shows upload status 200
- [ ] Test transcription with small M4A file
- [ ] Monitor logs during transcription
- [ ] Verify transcription job created successfully

---

## 🆘 Quick Support

- **AssemblyAI:** https://www.assemblyai.com/app
- **Google Cloud:** https://console.cloud.google.com/apis/credentials
- **Vercel:** https://vercel.com/kimblezcs-projects/kimbleai-v4-clean

---

**Last Updated:** Oct 6, 2025 05:30 UTC
**Next:** Verify Drive connection → Fix API key → Test transcription
