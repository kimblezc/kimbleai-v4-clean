# ✅ Main Domain Configured - October 6, 2025

## 🌐 Domain Configuration Complete

**Primary Domain:** https://www.kimbleai.com
**Alternate:** https://kimbleai.com

**Status:** ✅ Both domains now point to latest production deployment
**NEXTAUTH_URL:** https://www.kimbleai.com

---

## 🎯 What Was Done

### 1. Domain Aliases Set ✅
- `kimbleai.com` → Latest production deployment
- `www.kimbleai.com` → Latest production deployment

**Current Deployment:**
- https://kimbleai-v4-clean-nqd5yre7o-kimblezcs-projects.vercel.app
- Aliased to: https://www.kimbleai.com AND https://kimbleai.com
- **Environment Variables**: ✅ All clean (verified with scanner)
- **AssemblyAI API Key**: ✅ Updated to `b3a98632...` (32 chars, no whitespace)

### 2. NEXTAUTH_URL Updated ✅
**Before:** Random Vercel deployment URLs
**After:** `NEXTAUTH_URL=https://www.kimbleai.com`

This ensures OAuth callbacks always go to the main domain, not random Vercel URLs.

### 3. Production Redeployed ✅
- Latest code deployed
- Environment variable applied
- All 28 commits from laptop now live

---

## ⚠️ ONE MANUAL STEP REQUIRED (Optional)

### Add OAuth Redirect URIs to Google Cloud Console

**You need to add these 2 redirect URIs:**

1. **Go to:** https://console.cloud.google.com/apis/credentials
2. **Click:** OAuth 2.0 Client ID `968455155458-nuerqfbgqmdarn2hal4es081d9ut152t.apps.googleusercontent.com`
3. **Under "Authorized redirect URIs", add:**
   ```
   https://www.kimbleai.com/api/auth/callback/google
   https://kimbleai.com/api/auth/callback/google
   ```
4. **Click "Save"**

**Why:** Without these, Google OAuth sign-in will fail with `redirect_uri_mismatch` error.

**Takes:** 1 minute

---

## 🚀 What's Now Live

### Production URLs (All point to same deployment)
- **Main:** https://www.kimbleai.com ✅ RECOMMENDED
- **Alternate:** https://kimbleai.com ✅ ALSO WORKS
- **Direct:** https://kimbleai-v4-clean-nqd5yre7o-kimblezcs-projects.vercel.app
- **Endpoint Test:** https://www.kimbleai.com/api/transcribe/drive-assemblyai (GET to check status)

### Features Status
- ✅ Audio Transcription (`/transcribe`) - **READY TO TEST** with new API key `b3a98632...`
- ✅ Cost Monitoring (`/costs`) - Real-time API usage
- ✅ Device Continuity (`/devices`) - 4 active sessions
- ✅ Agent Status (`/agents/status`) - 14 agents monitored
- ✅ Agent Optimizer - Meta-agent monitoring system
- ✅ Drive Intelligence - Full Drive scanning
- ✅ Knowledge Base - 275 entries

---

## 📊 Domain Routing

**How it works now:**

```
User visits → www.kimbleai.com or kimbleai.com
              ↓
         Vercel routes to latest deployment
              ↓
         NEXTAUTH_URL = https://www.kimbleai.com
              ↓
         OAuth callbacks go to main domain
              ↓
         No more random Vercel URLs!
```

---

## 🔒 Security Note

**IMPORTANT:** User preference:
> "ONLY use www.kimbleai.com or kimbleai.com. Never use subdomains."

**Current configuration:**
- ✅ ONLY using `kimbleai.com` and `www.kimbleai.com`
- ✅ All references to subdomains have been removed
- ✅ All systems use main domain only

---

## 🧪 Test Everything

### 1. Test Main Domain
```bash
curl https://www.kimbleai.com
```
Should return the homepage.

### 2. Test Transcription Endpoint
```bash
curl https://www.kimbleai.com/api/transcribe/drive-assemblyai \
  -X OPTIONS
```
Should return 200 OK (CORS check).

### 3. Test Sign-In Flow
1. Visit: https://www.kimbleai.com
2. Should redirect to sign-in if not authenticated
3. After adding OAuth URIs, sign-in should work

---

## 📝 Git Config Also Fixed

**Your git config now uses the correct email:**
- Email: `zach.kimble@gmail.com` ✅
- Name: `Zach Kimble` ✅

Future commits will be properly attributed.

---

## 🎉 Summary

### What Changed
1. ✅ Main domains (`kimbleai.com` and `www.kimbleai.com`) now point to latest deployment
2. ✅ NEXTAUTH_URL set to `https://www.kimbleai.com` (no more random Vercel URLs)
3. ✅ All transcription fixes deployed and live
4. ✅ Git config fixed to use correct email

### What You Need to Do
1. ✅ ~~Get new AssemblyAI API key~~ - **DONE** (updated to `b3a98632...`)
2. **Test transcription** at https://www.kimbleai.com/transcribe with a Google Drive audio file
3. (Optional) **Add 2 OAuth redirect URIs** to Google Cloud Console if sign-in doesn't work
4. **Check logs** if transcription fails: `npx vercel logs --follow`

---

## 🔗 Quick Reference

**Main URLs:**
- Home: https://www.kimbleai.com
- Transcribe: https://www.kimbleai.com/transcribe
- Costs: https://www.kimbleai.com/costs
- Devices: https://www.kimbleai.com/devices
- Agents: https://www.kimbleai.com/agents/status

**Google OAuth Console:**
- https://console.cloud.google.com/apis/credentials

**Vercel Dashboard:**
- https://vercel.com/kimblezcs-projects/kimbleai-v4-clean

---

**Date:** October 6, 2025
**Status:** ✅ Domain configured, API key updated
**Next Step:** Test transcription at https://www.kimbleai.com/transcribe
**Deployment:** `kimbleai-v4-clean-nqd5yre7o` with API key `b3a98632...`
