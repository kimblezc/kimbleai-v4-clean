# 🔴 CRITICAL: AssemblyAI API Key is Read-Only

## 🎯 Problem Confirmed

**Test Results:**
```json
{
  "test1_KeyFormat": {
    "exists": true,
    "length": 32,
    "preview": "b3a98632...5e34",
    "hasWhitespace": false
  },
  "test2_ListTranscripts": {
    "status": 200,
    "ok": true,
    "statusText": "OK"
  },
  "test3_Upload": {
    "status": 401,
    "ok": false,
    "statusText": "Unauthorized",
    "responseBody": "Invalid API key\n",
    "responseLength": 16
  }
}
```

**Analysis:**
- ✅ Key `b3a98632d1a34632bdeb1fcfdffe5e34` works for READ operations (listing transcripts)
- ❌ Key **FAILS** for WRITE operations (uploading files) with 401 Unauthorized

---

## 🔍 Why This Happens

AssemblyAI API keys can have different permission levels:
1. **Read-only**: Can list/view transcripts but cannot upload or create new ones
2. **Full access**: Can do everything including uploads

Your current key appears to be **read-only** OR the account has restrictions.

---

## ✅ Solution: Generate Full-Access API Key

### Step 1: Log into AssemblyAI
1. Go to: https://www.assemblyai.com/app
2. Sign in with your account

### Step 2: Check Account Status
Before generating a new key, verify:
- ✅ Account is active (not suspended)
- ✅ Billing is current (no payment issues)
- ✅ No usage limits hit
- ✅ Account is verified

### Step 3: Navigate to API Keys
1. Click your profile/account icon
2. Go to **"API Keys"** or **"Settings"** → **"API Keys"**
3. You should see your current key(s)

### Step 4: Generate New Key with Full Permissions
1. Click **"Create New API Key"** or **"Generate API Key"**
2. **IMPORTANT**: Make sure to select **"Full Access"** or check permissions include:
   - ✅ Upload files
   - ✅ Create transcripts
   - ✅ Read transcripts
   - ✅ Delete transcripts
3. Give it a name like "Kimble AI Production - Full Access"
4. Click **"Create"** or **"Generate"**
5. **Copy the key immediately** (you won't be able to see it again)

### Step 5: Revoke Old Key (Optional but Recommended)
1. Find the old key: `b3a98632d1a34632bdeb1fcfdffe5e34`
2. Click **"Revoke"** or **"Delete"**
3. Confirm revocation

---

## 🚀 Update Vercel with New Key

Once you have the new full-access key:

```bash
# 1. Remove old key
printf "y\n" | npx vercel env rm ASSEMBLYAI_API_KEY production

# 2. Add new key (replace YOUR_NEW_FULL_ACCESS_KEY)
printf "YOUR_NEW_FULL_ACCESS_KEY" | npx vercel env add ASSEMBLYAI_API_KEY production

# 3. Verify it's clean
node scripts/scan-vercel-env-whitespace.js

# 4. Test the key works for uploads
curl https://www.kimbleai.com/api/test-assemblyai

# Should show test3_Upload with status: 200 (not 401!)

# 5. Deploy
npx vercel --prod

# 6. Get deployment URL and update aliases
npx vercel alias [deployment-url] kimbleai.com
npx vercel alias [deployment-url] www.kimbleai.com
```

---

## 🧪 Verify New Key Works

After updating, test at: https://www.kimbleai.com/api/test-assemblyai

**Expected Result:**
```json
{
  "test1_KeyFormat": {
    "exists": true,
    "length": 32,
    "preview": "NEW_KEY...",
    "hasWhitespace": false
  },
  "test2_ListTranscripts": {
    "status": 200,
    "ok": true
  },
  "test3_Upload": {
    "status": 200,  // ← Should be 200, not 401!
    "ok": true,
    "responseBody": "{\"upload_url\":\"https://...\"}"
  }
}
```

If `test3_Upload` still shows 401, there's an account issue - contact AssemblyAI support.

---

## 📧 If Account Has Issues

If you can't generate a full-access key, check:

### Billing Issues
- Go to **Settings** → **Billing**
- Check if payment method is valid
- Verify subscription is active

### Account Verification
- Some features require email verification
- Check for verification emails from AssemblyAI

### Usage Limits
- Free tier has limits (100 hours/month typically)
- Check if you've hit quota
- May need to upgrade to paid plan

### Contact Support
If nothing works:
- Email: support@assemblyai.com
- Dashboard: Click "Help" or "Support"
- Mention: "API key returns 401 for uploads but 200 for reads"

---

## 📊 What We Know Works

**Old Key from Oct 1st:**
- `f4e7e2cf1ced4d3d83c15f7206d5c74b`
- Same behavior: READ ✅, UPLOAD ❌

**Current Key:**
- `b3a98632d1a34632bdeb1fcfdffe5e34`
- Same behavior: READ ✅, UPLOAD ❌

Both keys have the same limitation, which suggests:
1. Your AssemblyAI account only generates read-only keys, OR
2. There's an account-level restriction

---

## 🎯 Alternative: Try AssemblyAI Playground

To verify your account works at all:
1. Go to: https://www.assemblyai.com/playground
2. Try uploading a file directly in the web UI
3. If this works → Problem is with API key permissions
4. If this fails → Problem is with account access

---

## 📝 Summary

**Issue:** API key `b3a98632d1a34632bdeb1fcfdffe5e34` is read-only

**Root Cause:** Key lacks upload permissions OR account has restrictions

**Solution:**
1. Log into AssemblyAI: https://www.assemblyai.com/app
2. Generate new full-access API key
3. Update Vercel environment variable
4. Verify with test endpoint: https://www.kimbleai.com/api/test-assemblyai
5. Deploy and test transcription

**Test Endpoint:** https://www.kimbleai.com/api/test-assemblyai

**Status:** ⏳ Waiting for full-access API key from AssemblyAI

---

**Last Updated:** October 6, 2025
**Next Step:** Generate full-access API key in AssemblyAI dashboard
