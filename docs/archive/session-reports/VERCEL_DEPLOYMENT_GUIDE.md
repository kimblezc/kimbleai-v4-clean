# KimbleAI v4 - Vercel Deployment Guide

**Last Updated:** October 27, 2025
**Platform:** Vercel
**Estimated Time:** 30 minutes

---

## Pre-Deployment Checklist

Before starting deployment, ensure you have:

- [ ] GitHub/GitLab repository with latest code
- [ ] Supabase project created and configured
- [ ] All API keys ready (OpenAI, Anthropic, AssemblyAI, Google OAuth)
- [ ] Google Cloud OAuth configured
- [ ] `DEPLOYMENT_CHECKLIST.md` reviewed
- [ ] Build passing locally (`npm run build`)
- [ ] All environment variables documented

---

## Step 1: Prepare Supabase Database

### 1.1 Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Enter project details:
   - **Name:** kimbleai-production
   - **Database Password:** (generate strong password - save it!)
   - **Region:** Choose closest to your users (e.g., us-east-1)
4. Wait for project creation (2-3 minutes)

### 1.2 Run Database Migrations

1. Navigate to SQL Editor in Supabase Dashboard
2. Copy contents of `database/run-all-migrations.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Verify no errors (check migration_history table)

```sql
-- Verify migrations ran successfully
SELECT * FROM migration_history ORDER BY applied_at DESC;

-- Check table count (should have 30+ tables)
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';
```

### 1.3 Create Storage Buckets

Go to Storage > Create Bucket and create:

1. **audio-files**
   - Public: NO
   - File size limit: 2GB
   - Allowed MIME types: audio/*

2. **thumbnails**
   - Public: YES
   - File size limit: 10MB
   - Allowed MIME types: image/*

3. **gmail-attachments**
   - Public: NO
   - File size limit: 100MB
   - Allowed MIME types: * (all)

4. **documents**
   - Public: NO
   - File size limit: 100MB
   - Allowed MIME types: application/pdf, application/msword, etc.

### 1.4 Get Supabase Credentials

Navigate to Project Settings > API:

- **Project URL:** Copy `https://xxxxx.supabase.co`
- **anon public key:** (you won't need this)
- **service_role key:** Copy this (CRITICAL - keep secure!)

---

## Step 2: Configure Google Cloud OAuth

### 2.1 Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Create new project: "KimbleAI Production"
3. Enable required APIs:
   - Gmail API
   - Google Drive API
   - Google Calendar API
   - Google People API

### 2.2 Create OAuth Credentials

1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Configure OAuth consent screen first (if prompted):
   - User Type: External
   - App name: KimbleAI
   - User support email: your-email@gmail.com
   - Scopes: Add Gmail, Drive, Calendar scopes
   - Test users: Add zach.kimble@gmail.com, becky.aza.kimble@gmail.com

4. Create OAuth Client:
   - Application type: Web application
   - Name: KimbleAI Production
   - Authorized JavaScript origins:
     - `https://your-app.vercel.app`
   - Authorized redirect URIs:
     - `https://your-app.vercel.app/api/auth/callback/google`

5. Save **Client ID** and **Client Secret**

**IMPORTANT:** You'll update these URIs after getting your Vercel URL.

---

## Step 3: Deploy to Vercel

### 3.1 Connect Repository

1. Go to https://vercel.com/new
2. Import Git Repository
3. Select your kimbleai-v4 repository
4. Click "Import"

### 3.2 Configure Build Settings

Vercel auto-detects Next.js. Verify:

- **Framework Preset:** Next.js
- **Root Directory:** ./
- **Build Command:** `npm run build`
- **Output Directory:** .next
- **Install Command:** `npm install`

### 3.3 Set Environment Variables

Click "Environment Variables" and add ALL of these:

**Database:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**AI Services:**
```
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-api03-your-anthropic-key
ASSEMBLYAI_API_KEY=your-assemblyai-key
```

**Google OAuth:**
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/callback/google
```

**NextAuth:**
```
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
```

**User IDs:**
```
ZACH_USER_ID=user_zach
REBECCA_USER_ID=user_rebecca
```

**Optional (Cost Optimization):**
```
HELICONE_API_KEY=your-helicone-key
```

**Note:** Replace `your-app.vercel.app` with your actual Vercel URL (you'll update these after first deployment).

### 3.4 Deploy

1. Click "Deploy"
2. Wait for build (3-5 minutes)
3. Note your deployment URL: `https://your-app.vercel.app`

---

## Step 4: Update OAuth Redirect URIs

### 4.1 Update Google Cloud Console

1. Go back to Google Cloud Console > Credentials
2. Edit your OAuth Client
3. Update redirect URIs with actual Vercel URL:
   - `https://your-actual-app.vercel.app/api/auth/callback/google`
4. Save

### 4.2 Update Vercel Environment Variables

1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Edit these variables with actual URL:
   - `NEXTAUTH_URL`
   - `GOOGLE_REDIRECT_URI`
3. Redeploy: Deployments tab > Click "..." > Redeploy

---

## Step 5: Configure Cron Jobs

Vercel automatically configures cron jobs from `vercel.json`, but verify:

1. Go to Project Settings > Cron Jobs
2. Verify these are scheduled:
   - `/api/backup/cron` - Daily at 2 AM UTC
   - `/api/index/cron` - Every 6 hours
   - `/api/cron/index-attachments` - Every 4 hours
   - `/api/agent/cron` - Every 5 minutes
   - `/api/cron/archie-utility` - Every 15 minutes
   - `/api/cron/drive-intelligence` - Every 6 hours
   - `/api/cron/device-sync` - Every 2 minutes
   - `/api/cron/mcp-health` - Every 15 minutes

**Important:** Cron requires Hobby ($20/month) or Pro plan.

---

## Step 6: Post-Deployment Verification

### 6.1 Test Home Page

1. Visit `https://your-app.vercel.app`
2. Verify page loads without errors
3. Check browser console for errors

### 6.2 Test Authentication

1. Click "Sign In"
2. Sign in with Google (Zach's account)
3. Verify successful authentication
4. Check Supabase `user_tokens` table:

```sql
SELECT * FROM user_tokens WHERE user_id = 'user_zach';
```

Should show access_token and refresh_token.

### 6.3 Test Chat Functionality

1. Send a test message: "Hello, this is a test"
2. Verify GPT-4o responds
3. Check `api_cost_tracking` table:

```sql
SELECT * FROM api_cost_tracking ORDER BY timestamp DESC LIMIT 1;
```

Should show the API call logged.

### 6.4 Test File Upload

1. Navigate to Files page
2. Upload a small test image
3. Verify processing completes
4. Check `files` table

### 6.5 Test Google Integration

**Gmail Test:**
1. Open Gmail integration
2. List recent emails
3. Verify emails load

**Drive Test:**
1. Open Drive integration
2. List files
3. Verify files load

**Calendar Test:**
1. Open Calendar
2. List events
3. Verify events load

### 6.6 Check Logs

Go to Vercel Dashboard > Deployments > Latest > Runtime Logs

Look for:
- No critical errors
- Successful API calls
- Database connections working

---

## Step 7: Create Initial Users in Database

If not already done, insert user records:

```sql
INSERT INTO users (id, email, name)
VALUES
  ('user_zach', 'zach.kimble@gmail.com', 'Zach Kimble'),
  ('user_rebecca', 'becky.aza.kimble@gmail.com', 'Rebecca Kimble')
ON CONFLICT (id) DO NOTHING;

-- Create default budget config
INSERT INTO budget_config (user_id, daily_limit_usd, monthly_limit_usd, alert_threshold_pct)
VALUES
  ('user_zach', 10.00, 200.00, 80),
  ('user_rebecca', 5.00, 100.00, 80)
ON CONFLICT (user_id) DO NOTHING;
```

---

## Step 8: Configure Monitoring

### 8.1 Enable Vercel Analytics

1. Go to Project Settings > Analytics
2. Enable Web Analytics (free)
3. Enable Speed Insights (free on Hobby+)

### 8.2 Set Up Email Notifications

1. Project Settings > Notifications
2. Enable:
   - Deployment errors
   - Build failures
   - Performance degradation

### 8.3 Configure Budget Alerts

In Supabase, verify budget alerts are configured:

```sql
SELECT * FROM budget_config;
```

---

## Step 9: Custom Domain (Optional)

### 9.1 Add Custom Domain

1. Project Settings > Domains
2. Add your domain: `kimbleai.com`
3. Update DNS records as instructed by Vercel

### 9.2 Update Environment Variables

If using custom domain, update:
- `NEXTAUTH_URL=https://kimbleai.com`
- `GOOGLE_REDIRECT_URI=https://kimbleai.com/api/auth/callback/google`

Then redeploy.

---

## Troubleshooting

### Build Fails

**Check build logs:**
1. Vercel Dashboard > Deployments > Failed deployment
2. Review error messages
3. Common issues:
   - Missing environment variables
   - TypeScript errors
   - Dependency issues

**Solution:** Fix issues locally, test `npm run build`, then push.

### Environment Variables Not Working

**Verify:**
1. Variables are set in Vercel (check spelling)
2. Redeploy after adding new variables
3. Variables don't have trailing spaces

### Google OAuth Fails

**Check:**
1. Redirect URI matches exactly (including https://)
2. Test users added in Google Console
3. OAuth consent screen configured
4. Scopes approved

### Database Connection Fails

**Verify:**
1. Supabase project is running (not paused)
2. `SUPABASE_SERVICE_ROLE_KEY` is correct
3. RLS policies allow access

### Cron Jobs Not Running

**Requirements:**
1. Hobby or Pro plan (not Free tier)
2. Cron jobs appear in Project Settings
3. Check runtime logs for cron execution

---

## Rollback Procedure

If deployment has critical issues:

### Option 1: Rollback in Vercel

1. Go to Deployments tab
2. Find last working deployment
3. Click "..." > Promote to Production

### Option 2: Redeploy Previous Commit

```bash
git revert HEAD
git push origin master
```

Vercel will auto-deploy the reverted version.

---

## Next Steps

After successful deployment:

1. **Run production tests:** See `PRODUCTION_TESTING_CHECKLIST.md`
2. **Set up monitoring:** See `MONITORING_GUIDE.md`
3. **Security audit:** See `SECURITY_CHECKLIST.md`
4. **Performance review:** See `PERFORMANCE_REPORT.md`

---

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Project Issues:** zach.kimble@gmail.com

---

**Deployment Complete!** Your KimbleAI instance is now live in production.
