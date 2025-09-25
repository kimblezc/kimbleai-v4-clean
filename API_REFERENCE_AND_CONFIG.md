# 🔧 KimbleAI v4 - API Reference & Configuration Guide

**Created:** September 24, 2025
**Purpose:** Complete reference for API endpoints and configuration without exposing secrets

---

## 📋 **ENVIRONMENT VARIABLES CHECKLIST**

### **Required in Vercel Production:**
```env
# OpenAI (Check: sk-proj-... format, ~100 chars)
OPENAI_API_KEY=<SECRET>

# Supabase (Check: URLs and keys match Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://gbmefnaqsxtoseufjixp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<PUBLIC_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SECRET>

# Google OAuth (Check: matches Google Cloud Console exactly)
GOOGLE_CLIENT_ID=968455155458-nuerqfbgqmdarn2hal4es081d9ut152t.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<STARTS_WITH_GOCSPX->

# NextAuth (Check: URL matches domain, secret is secure string)
NEXTAUTH_URL=https://www.kimbleai.com
NEXTAUTH_SECRET=<SECURE_STRING>

# Webhooks (Optional)
ZAPIER_WEBHOOK_URL=<WEBHOOK_URL>
ZAPIER_WEBHOOK_SECRET=<SECRET>
```

### **Local .env.local (for development):**
Same as above but with `NEXTAUTH_URL=http://localhost:3000`

---

## 🌐 **API ENDPOINTS REFERENCE**

### **Authentication APIs:**
- `GET  /api/auth/providers` - List OAuth providers
- `GET  /api/auth/signin` - Sign-in page
- `GET  /api/auth/signin/google` - Google OAuth flow
- `GET  /api/auth/callback/google` - OAuth callback
- `GET  /api/auth/session` - Current session
- `POST /api/auth/signout` - Sign out

### **Core Application APIs:**
- `GET  /api/conversations?userId=<user>` - Get chat history
- `POST /api/chat` - Send chat message
- `POST /api/upload` - Upload and process files
- `GET  /api/knowledge/search` - Search uploaded content
- `DELETE /api/projects/delete` - Delete project

### **Google Integration APIs (Require Auth):**
- `GET  /api/google/gmail` - Search Gmail
- `GET  /api/google/drive` - Search Google Drive
- `GET  /api/google/calendar` - Get calendar events

### **Audio Processing:**
- `POST /api/audio/transcribe` - Whisper transcription

### **Debug/Test APIs:**
- `GET  /api/debug-env` - Check environment variables (production)

---

## 🔧 **GOOGLE CLOUD CONSOLE CONFIGURATION**

### **Project:** `kimbleai-v4`
### **OAuth Client ID:** `968455155458-nuerqfbgqmdarn2hal4es081d9ut152t.apps.googleusercontent.com`

### **Required Settings:**
```
OAuth Consent Screen:
✅ App name: KimbleAI
✅ User support email: zach.kimble@gmail.com
✅ Publishing status: In production
✅ User type: External

Authorized JavaScript Origins:
✅ https://www.kimbleai.com
✅ https://kimbleai.com

Authorized Redirect URIs:
✅ https://www.kimbleai.com/api/auth/callback/google
✅ https://kimbleai.com/api/auth/callback/google

Required Scopes (for full functionality):
- openid
- email
- profile
- https://www.googleapis.com/auth/drive.readonly
- https://www.googleapis.com/auth/gmail.readonly
- https://www.googleapis.com/auth/calendar
```

---

## 🏗️ **SUPABASE CONFIGURATION**

### **Project URL:** `https://gbmefnaqsxtoseufjixp.supabase.co`

### **Required Tables:**
```sql
-- Conversations table (existing)
conversations (
  id, user_id, title, project_id, created_at, updated_at, message_count, last_message
)

-- Messages table (existing)
messages (
  id, conversation_id, role, content, timestamp, model_info
)

-- Knowledge table (existing)
knowledge (
  id, user_id, content, file_name, project_id, created_at
)

-- User tokens table (MISSING - needs creation)
user_tokens (
  user_id TEXT PRIMARY KEY,
  email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  updated_at TIMESTAMP
)
```

---

## 🧪 **TESTING CHECKLIST**

### **Environment Verification:**
- [ ] Visit `/api/debug-env` - all variables show as present
- [ ] Visit `/api/auth/providers` - shows Google provider
- [ ] Visit `/api/conversations?userId=zach` - returns conversations

### **OAuth Testing:**
- [ ] Click Google OAuth button - no 400 error
- [ ] Complete Google auth flow - returns to app
- [ ] Session shows authenticated user

### **Google Integration Testing (after OAuth):**
- [ ] Ask "Search my Gmail" - returns results
- [ ] Ask "Show my Google Drive files" - returns results
- [ ] Ask "What meetings do I have?" - returns calendar

### **Core Functionality:**
- [ ] File upload works and files are searchable
- [ ] Cross-conversation memory works
- [ ] Project creation/deletion works
- [ ] Multi-user isolation (Zach/Rebecca) works

---

## 🔄 **API REGENERATION GUIDE**

### **If APIs Need Regeneration:**

**OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Update in Vercel environment variables

**Google OAuth Credentials:**
1. Go to https://console.cloud.google.com/apis/credentials?project=kimbleai-v4
2. Create new OAuth 2.0 Client ID (or use existing)
3. Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel

**Supabase Keys:**
1. Go to Supabase project settings
2. Copy anon/service keys
3. Update SUPABASE keys in Vercel

**NextAuth Secret:**
1. Generate secure random string: `openssl rand -base64 32`
2. Update NEXTAUTH_SECRET in Vercel

---

## 🚨 **CURRENT ISSUE TRACKING**

### **OAuth 400 Error - Current Status:**
- ✅ Environment variables: All set correctly
- ✅ Google Cloud Console: Properly configured
- ✅ OAuth consent screen: Published to production
- ❌ **ISSUE**: 400 error persists in OAuth callback

### **Next Steps:**
1. Deploy minimal NextAuth configuration
2. Test basic OAuth flow
3. Add back extended scopes if basic works
4. Create missing `user_tokens` table in Supabase

---

**This file provides complete reference without exposing secrets. Update as configurations change.**