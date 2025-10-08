# 🔑 AssemblyAI API Key Fix Required

## 🚨 Issue Identified

**Current API Key:** `f4e7e2cf1ced4d3d83c15f7206d5c74b`
**Status:** ❌ Invalid for uploads (returns "Invalid API key" from AssemblyAI)

**Test Results:**
- ✅ Can list transcripts (read-only works)
- ❌ Cannot upload files (write operations fail)

**Diagnosis:** The API key is either:
1. Expired
2. Revoked
3. Read-only permissions
4. Invalid for the upload endpoint

---

## ✅ Solution: Generate New API Key

### Step 1: Get New AssemblyAI API Key

1. **Go to:** https://www.assemblyai.com/app/account
2. **Sign in** with your AssemblyAI account
3. **Navigate to:** API Keys section
4. **Click:** "Create new API key" or "Regenerate API key"
5. **Copy** the new API key (it will look like: `abc123def456...`)

### Step 2: Update Vercel Environment Variable

```bash
# Remove old key
printf "y\n" | npx vercel env rm ASSEMBLYAI_API_KEY production

# Add new key (replace YOUR_NEW_KEY_HERE with actual key)
printf "YOUR_NEW_KEY_HERE" | npx vercel env add ASSEMBLYAI_API_KEY production

# Verify it's clean
node scripts/scan-vercel-env-whitespace.js
```

### Step 3: Deploy

```bash
# Deploy to production
npx vercel --prod

# Get the deployment URL (e.g., kimbleai-v4-clean-xxxxx.vercel.app)
# Then update aliases:

npx vercel alias [deployment-url] kimbleai.com
npx vercel alias [deployment-url] www.kimbleai.com
```

### Step 4: Test

```bash
# Test the API key directly
curl -X POST https://api.assemblyai.com/v2/upload \
  -H "Authorization: Bearer YOUR_NEW_KEY_HERE" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @some-test-file.txt

# Should return upload URL, not "Invalid API key"
```

---

## 🧪 Quick Verification Commands

**Before deploying:**
```bash
# Test new key works for upload
echo "test" > test.txt
curl -X POST https://api.assemblyai.com/v2/upload \
  -H "Authorization: Bearer YOUR_NEW_KEY" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @test.txt
rm test.txt

# Should return: {"upload_url": "https://..."}
# NOT: "Invalid API key"
```

**After deploying:**
```bash
# Check endpoint status
curl https://www.kimbleai.com/api/transcribe/drive-assemblyai

# Should show:
# - apiKeyConfigured: true
# - apiKeyLength: [length of your new key]
# - status: "ready"
```

---

## 📋 Complete Fix Script

```bash
#!/bin/bash

# 1. Get your new API key from https://www.assemblyai.com/app/account
read -p "Enter your new AssemblyAI API key: " NEW_KEY

# 2. Test it works for upload
echo "Testing new API key..."
echo "test" > test.txt
RESULT=$(curl -s -X POST https://api.assemblyai.com/v2/upload \
  -H "Authorization: Bearer $NEW_KEY" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @test.txt)
rm test.txt

if [[ $RESULT == *"upload_url"* ]]; then
  echo "✅ API key is valid!"
else
  echo "❌ API key is invalid: $RESULT"
  exit 1
fi

# 3. Update Vercel environment variable
echo "Removing old key..."
printf "y\n" | npx vercel env rm ASSEMBLYAI_API_KEY production

echo "Adding new key..."
printf "$NEW_KEY" | npx vercel env add ASSEMBLYAI_API_KEY production

# 4. Verify clean
echo "Scanning for whitespace issues..."
node scripts/scan-vercel-env-whitespace.js

# 5. Deploy
echo "Deploying to production..."
DEPLOYMENT=$(npx vercel --prod 2>&1 | grep "https://kimbleai-v4-clean-" | head -1)

# Extract deployment URL
DEPLOYMENT_URL=$(echo $DEPLOYMENT | grep -o "https://kimbleai-v4-clean-[^/]*\.vercel\.app")

echo "Deployment: $DEPLOYMENT_URL"

# 6. Update aliases
echo "Updating domain aliases..."
npx vercel alias $DEPLOYMENT_URL kimbleai.com
npx vercel alias $DEPLOYMENT_URL www.kimbleai.com

echo ""
echo "✅ All done! Test transcription at: https://www.kimbleai.com/transcribe"
```

---

## 🎯 Why This Happened

**Root Cause:** The API key stored in Vercel environment variables is invalid for upload operations.

**Evidence:**
```bash
$ curl -X POST https://api.assemblyai.com/v2/upload \
  -H "Authorization: Bearer f4e7e2cf1ced4d3d83c15f7206d5c74b" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @test.txt

Invalid API key  # ❌ Fails
```

**vs.**

```bash
$ curl -H "Authorization: Bearer f4e7e2cf1ced4d3d83c15f7206d5c74b" \
  https://api.assemblyai.com/v2/transcript

{...transcripts...}  # ✅ Works (read-only)
```

**Conclusion:** The key works for read operations but not write operations. Need fresh key.

---

## 📝 What We Fixed So Far

✅ Environment variables are clean (no `\n` issues)
✅ NEXTAUTH_URL is correct (`https://www.kimbleai.com`)
✅ Domain aliases configured properly
✅ Endpoint responds correctly (GET returns status)
✅ Diagnostic logging added

**Remaining:** ⏳ Get valid AssemblyAI API key

---

**Date:** October 6, 2025
**Next Step:** Get new API key from https://www.assemblyai.com/app/account
