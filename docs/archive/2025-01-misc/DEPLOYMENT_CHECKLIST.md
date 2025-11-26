# KimbleAI v4 - Production Deployment Checklist

**Last Updated:** October 27, 2025
**Target Platform:** Vercel
**Database:** Supabase PostgreSQL
**Status:** Pre-Deployment Review

---

## Table of Contents

1. [Required Environment Variables](#required-environment-variables)
2. [Optional Environment Variables](#optional-environment-variables)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Database Setup](#database-setup)
5. [External Services Configuration](#external-services-configuration)
6. [Vercel Configuration](#vercel-configuration)
7. [Post-Deployment Verification](#post-deployment-verification)

---

## Required Environment Variables

### Database (Required)

#### NEXT_PUBLIC_SUPABASE_URL
- **Purpose:** Supabase project URL for database and storage
- **Where to get it:** Supabase Dashboard > Project Settings > API
- **Format:** `https://your-project-id.supabase.co`
- **Security Level:** Public (Safe to expose in browser)
- **Default:** None - MUST be set
- **Example:** `https://abcdefghijk.supabase.co`

#### SUPABASE_SERVICE_ROLE_KEY
- **Purpose:** Service role key for server-side database operations (bypasses RLS)
- **Where to get it:** Supabase Dashboard > Project Settings > API > service_role secret
- **Security Level:** CRITICAL - Server-side only, full database access
- **Default:** None - MUST be set
- **Warning:** Never expose this in client-side code

### AI Services (Required)

#### OPENAI_API_KEY
- **Purpose:** OpenAI API access for GPT-4o, GPT-4 Turbo, text-embedding-3-small
- **Where to get it:** https://platform.openai.com/api-keys
- **Security Level:** HIGH - Server-side only
- **Default:** None - MUST be set
- **Format:** `sk-proj-...` or `sk-...`
- **Cost Impact:** Primary cost driver (chat, embeddings, vision)
- **Usage:** Chat completion, embeddings, image analysis, code generation

#### ANTHROPIC_API_KEY
- **Purpose:** Anthropic Claude API access for Claude 3.5 Sonnet, Claude 3 Opus
- **Where to get it:** https://console.anthropic.com/
- **Security Level:** HIGH - Server-side only
- **Default:** None - MUST be set for Phase 4+ features
- **Format:** `sk-ant-api03-...`
- **Cost Impact:** Alternative to OpenAI for specific tasks
- **Usage:** Advanced reasoning, code analysis, long-context tasks

### Google OAuth (Required for Google Workspace)

#### GOOGLE_CLIENT_ID
- **Purpose:** Google OAuth 2.0 client ID
- **Where to get it:** https://console.cloud.google.com/apis/credentials
- **Security Level:** Public
- **Default:** None - Required for Gmail/Drive/Calendar
- **Format:** `xxxxx.apps.googleusercontent.com`

#### GOOGLE_CLIENT_SECRET
- **Purpose:** Google OAuth 2.0 client secret
- **Where to get it:** https://console.cloud.google.com/apis/credentials
- **Security Level:** HIGH - Server-side only
- **Default:** None - Required for Google services

#### GOOGLE_REDIRECT_URI
- **Purpose:** OAuth callback URL
- **Production Value:** `https://your-domain.vercel.app/api/auth/callback/google`
- **Development Value:** `http://localhost:3000/api/auth/callback/google`
- **Important:** MUST match exactly what's configured in Google Cloud Console

### Authentication (Required)

#### NEXTAUTH_URL
- **Purpose:** Base URL for NextAuth.js
- **Production Value:** `https://your-domain.vercel.app`
- **Development Value:** `http://localhost:3000`
- **Security Level:** Medium
- **Default:** Auto-detected in development
- **Important:** MUST be set in production

#### NEXTAUTH_SECRET
- **Purpose:** Encryption key for NextAuth.js sessions
- **How to generate:** `openssl rand -base64 32`
- **Security Level:** CRITICAL - Never share or commit
- **Default:** None - MUST be set
- **Format:** Base64 string (32+ characters recommended)
- **Example:** `your-randomly-generated-secret-here-minimum-32-chars`

### User Configuration (Required)

#### ZACH_USER_ID
- **Purpose:** Primary user identifier for Zach
- **Default:** `user_zach`
- **Format:** String matching database users table
- **Usage:** Cost tracking, authentication, file ownership

#### REBECCA_USER_ID
- **Purpose:** Secondary user identifier for Rebecca
- **Default:** `user_rebecca`
- **Format:** String matching database users table
- **Usage:** Cost tracking, authentication, file ownership

---

## Optional Environment Variables

### Transcription Services

#### ASSEMBLYAI_API_KEY
- **Purpose:** High-quality audio transcription with speaker diarization
- **Where to get it:** https://www.assemblyai.com/dashboard
- **Security Level:** HIGH - Server-side only
- **Default:** Falls back to OpenAI Whisper if not set
- **Cost Impact:** $0.25-$1.50 per hour of audio
- **Features:** Speaker diarization, sentiment analysis, auto chapters
- **Recommendation:** HIGHLY RECOMMENDED for professional transcription

### Cost Optimization

#### HELICONE_API_KEY
- **Purpose:** LLM request caching to reduce OpenAI/Anthropic costs
- **Where to get it:** https://www.helicone.ai
- **Security Level:** Medium - Server-side
- **Default:** None - Caching disabled without this
- **Cost Impact:** Can reduce API costs by 20-50% through caching
- **Recommendation:** Recommended for production

### Web Search (Choose One)

#### ZAPIER_SEARCH_WEBHOOK_URL
- **Purpose:** Web search via Zapier webhook (recommended if you have Zapier Pro)
- **Where to get it:** Create webhook in Zapier dashboard
- **Security Level:** Medium
- **Default:** None
- **Cost:** Included with Zapier Pro subscription

#### GOOGLE_CUSTOM_SEARCH_API_KEY
- **Purpose:** Google Custom Search API
- **Where to get it:** https://developers.google.com/custom-search
- **Security Level:** Medium
- **Default:** None
- **Cost:** Free tier: 100 queries/day

#### GOOGLE_CUSTOM_SEARCH_ENGINE_ID
- **Purpose:** Search engine ID for Google Custom Search
- **Where to get it:** https://programmablesearchengine.google.com/
- **Required with:** GOOGLE_CUSTOM_SEARCH_API_KEY

#### BING_SEARCH_API_KEY
- **Purpose:** Bing Web Search API
- **Where to get it:** https://azure.microsoft.com/en-us/products/cognitive-services/bing-web-search-api
- **Cost:** Free tier: 1,000 queries/month

#### TAVILY_API_KEY
- **Purpose:** AI-optimized search API
- **Where to get it:** https://tavily.com
- **Cost:** Paid service (~$50/month)
- **Recommendation:** Not recommended for 2-user systems

### Agent Observability

#### LANGCHAIN_TRACING_V2
- **Purpose:** Enable LangSmith tracing
- **Value:** `true` to enable
- **Default:** `false`
- **Recommendation:** Overkill for 2-user systems

#### LANGCHAIN_API_KEY
- **Purpose:** LangSmith API key
- **Where to get it:** https://smith.langchain.com
- **Required with:** LANGCHAIN_TRACING_V2=true

#### LANGCHAIN_PROJECT
- **Purpose:** LangSmith project name
- **Default:** `kimbleai-v4`
- **Required with:** LANGCHAIN_TRACING_V2=true

#### LANGCHAIN_ENDPOINT
- **Purpose:** LangSmith endpoint URL
- **Default:** `https://api.smith.langchain.com`

### Development & Debugging

#### DEBUG
- **Purpose:** Enable verbose logging
- **Values:** `true` or `false`
- **Default:** `false`
- **Recommendation:** `false` in production

#### LOG_LEVEL
- **Purpose:** Logging verbosity
- **Values:** `error`, `warn`, `info`, `verbose`, `debug`
- **Default:** `info`
- **Recommendation:** `info` or `warn` in production

#### NEXT_PUBLIC_APP_URL
- **Purpose:** Public-facing app URL
- **Production:** `https://your-domain.vercel.app`
- **Development:** `http://localhost:3000`
- **Usage:** Used in emails, webhooks, absolute URLs

### Workflow Automation

#### N8N_API_KEY
- **Purpose:** n8n workflow automation API key
- **Where to get it:** n8n instance settings
- **Default:** None - n8n integration disabled

#### N8N_WEBHOOK_URL
- **Purpose:** n8n webhook endpoint
- **Format:** `https://your-n8n-instance.com/webhook`
- **Required with:** N8N_API_KEY

### Serverless Compute

#### MODAL_TOKEN_ID
- **Purpose:** Modal.com token ID for serverless functions
- **Where to get it:** https://modal.com
- **Default:** None - Modal integration disabled

#### MODAL_TOKEN_SECRET
- **Purpose:** Modal.com token secret
- **Required with:** MODAL_TOKEN_ID

### Database (Optional)

#### DATABASE_URL
- **Purpose:** Direct PostgreSQL connection string
- **Where to get it:** Supabase Dashboard > Project Settings > Database > Connection String
- **Format:** `postgresql://postgres:[password]@[host]:5432/postgres`
- **Security Level:** CRITICAL - Full database access
- **Default:** Not needed if using Supabase client
- **Usage:** Direct database queries, migrations, MCP server integration

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] No console.log statements in production code
- [ ] Environment variables validated (`npm run validate-env`)
- [ ] Build completes successfully (`npm run build`)

### Testing
- [ ] All unit tests passing (`npm run test:unit`)
- [ ] All integration tests passing (`npm run test:integration`)
- [ ] All API routes tested (`npm run test:api`)
- [ ] Security tests passing (`npm run test:security`)

### Database
- [ ] Migrations run in correct order
- [ ] RLS policies enabled on all tables
- [ ] Indexes created for performance
- [ ] Storage buckets created
- [ ] Test data cleaned up

### Security
- [ ] All secrets in environment variables (not in code)
- [ ] API keys rotated from development
- [ ] Google OAuth redirect URIs updated
- [ ] CORS policies reviewed
- [ ] Rate limiting configured

### Documentation
- [ ] README.md updated
- [ ] API documentation current
- [ ] Deployment guide reviewed
- [ ] Rollback procedure documented

---

## Database Setup

### 1. Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose organization and name your project
4. Set strong database password (save it securely)
5. Choose region closest to users

### 2. Run Migrations
See `database/MIGRATION_ORDER.md` for detailed migration sequence.

Quick start:
```sql
-- In Supabase SQL Editor, run:
-- 1. database/run-all-migrations.sql (master file)
```

### 3. Create Storage Buckets
In Supabase Dashboard > Storage, create buckets:
- `audio-files` (public: false)
- `thumbnails` (public: true)
- `gmail-attachments` (public: false)
- `documents` (public: false)

### 4. Configure RLS Policies
RLS policies are included in migration files. Verify they're enabled:
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;
```

Should return no rows (all tables have RLS enabled).

---

## External Services Configuration

### Google Cloud Console
1. **Create Project**
   - Go to https://console.cloud.google.com
   - Create new project: "KimbleAI Production"

2. **Enable APIs**
   - Gmail API
   - Google Drive API
   - Google Calendar API
   - Google People API (for contacts)

3. **Create OAuth Credentials**
   - APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID
   - Application type: Web application
   - Name: "KimbleAI Production"
   - Authorized JavaScript origins: `https://your-domain.vercel.app`
   - Authorized redirect URIs: `https://your-domain.vercel.app/api/auth/callback/google`

4. **Configure OAuth Consent Screen**
   - User Type: Internal (if Google Workspace) or External
   - App name: KimbleAI
   - User support email: your-email@gmail.com
   - Scopes: Add Gmail, Drive, Calendar scopes
   - Test users: Add zach.kimble@gmail.com, becky.aza.kimble@gmail.com

### OpenAI Platform
1. Go to https://platform.openai.com
2. Create new API key for production
3. Set usage limits (recommended: $100/month cap)
4. Enable monthly billing notifications

### Anthropic Console
1. Go to https://console.anthropic.com
2. Create new API key for production
3. Set budget alerts

### AssemblyAI (Optional)
1. Go to https://www.assemblyai.com/dashboard
2. Create API key
3. No usage limits needed (pay-per-use)

---

## Vercel Configuration

### 1. Connect Repository
1. Go to https://vercel.com
2. Import Git Repository
3. Connect GitHub/GitLab account
4. Select kimbleai-v4 repository

### 2. Configure Build Settings
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`
- **Node Version:** 20.x

### 3. Set Environment Variables
In Vercel Dashboard > Project > Settings > Environment Variables:

**Production Environment:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-production-key
ANTHROPIC_API_KEY=sk-ant-api03-your-production-key
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.vercel.app/api/auth/callback/google
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-randomly-generated-secret-here-minimum-32-chars
ZACH_USER_ID=user_zach
REBECCA_USER_ID=user_rebecca
ASSEMBLYAI_API_KEY=your-assemblyai-key (optional)
HELICONE_API_KEY=your-helicone-key (optional)
```

### 4. Configure Cron Jobs
Cron jobs are defined in `vercel.json`:
- `/api/backup/cron` - Daily at 2 AM UTC (database backups)
- `/api/index/cron` - Every 6 hours (knowledge base indexing)
- `/api/cron/index-attachments` - Every 4 hours (Gmail attachment indexing)
- `/api/agent/cron` - Every 5 minutes (autonomous agent)
- `/api/cron/archie-utility` - Every 15 minutes (utility agent)
- `/api/cron/drive-intelligence` - Every 6 hours (drive organization)
- `/api/cron/device-sync` - Every 2 minutes (device sync)
- `/api/cron/mcp-health` - Every 15 minutes (MCP health checks)

**Verify cron is enabled:**
- Vercel Dashboard > Project > Settings > Cron
- Ensure Hobby or Pro plan (cron not available on Free tier)

### 5. Configure Domains
1. Add custom domain (optional)
2. Update NEXTAUTH_URL and GOOGLE_REDIRECT_URI if using custom domain

---

## Post-Deployment Verification

### Automated Checks
Run `PRODUCTION_TESTING_CHECKLIST.md` tests:
- [ ] Home page loads
- [ ] Authentication works
- [ ] API health endpoint responds
- [ ] Database connection verified
- [ ] All 12 AI models accessible

### Manual Verification
1. **Sign In Test**
   - Visit production URL
   - Sign in with Google (Zach and Rebecca accounts)
   - Verify tokens stored in database

2. **Chat Test**
   - Send test message
   - Verify GPT-4o responds
   - Check cost tracking recorded

3. **File Upload Test**
   - Upload test image
   - Verify processing completes
   - Check file stored in Supabase

4. **Google Integration Test**
   - Test Gmail access
   - Test Drive file listing
   - Test Calendar event creation

5. **Transcription Test**
   - Upload short audio file
   - Verify transcription completes
   - Check AssemblyAI API called (if configured)

### Monitoring Setup
See `MONITORING_GUIDE.md` for:
- Vercel Analytics configuration
- Error tracking setup
- Cost monitoring alerts
- Performance dashboards

---

## Environment Variables Summary

| Variable | Required | Security | Default | Where Used |
|----------|----------|----------|---------|------------|
| NEXT_PUBLIC_SUPABASE_URL | Yes | Public | None | All pages |
| SUPABASE_SERVICE_ROLE_KEY | Yes | Critical | None | API routes |
| OPENAI_API_KEY | Yes | High | None | Chat, embeddings |
| ANTHROPIC_API_KEY | Yes* | High | None | Claude models |
| GOOGLE_CLIENT_ID | Yes** | Public | None | OAuth |
| GOOGLE_CLIENT_SECRET | Yes** | High | None | OAuth |
| GOOGLE_REDIRECT_URI | Yes** | Medium | None | OAuth |
| NEXTAUTH_URL | Yes | Medium | Auto | NextAuth |
| NEXTAUTH_SECRET | Yes | Critical | None | NextAuth |
| ZACH_USER_ID | Yes | Low | user_zach | Auth, costs |
| REBECCA_USER_ID | Yes | Low | user_rebecca | Auth, costs |
| ASSEMBLYAI_API_KEY | No | High | None | Transcription |
| HELICONE_API_KEY | No | Medium | None | Cost optimization |
| DATABASE_URL | No | Critical | None | Direct DB access |

\* Required for Phase 4+ (Claude integration)
** Required for Google Workspace features

---

## Quick Reference Commands

```bash
# Validate environment variables
npm run validate-env

# Run production build
npm run build

# Run all tests
npm test

# Deploy to Vercel
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs
```

---

## Support & Troubleshooting

### Common Issues

**Build fails with "Module not found"**
- Run `npm install` to ensure all dependencies installed
- Check Node version is 20.x

**Environment variable not defined**
- Verify variable is set in Vercel Dashboard
- Check variable name spelling (case-sensitive)
- Re-deploy after adding variables

**Database connection fails**
- Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct
- Check Supabase project is not paused
- Verify RLS policies allow access

**Google OAuth fails**
- Verify redirect URI matches exactly
- Check test users are added in Google Console
- Ensure scopes are approved

### Emergency Rollback

If deployment fails:
```bash
# Rollback to previous deployment
vercel rollback

# Or specify deployment ID
vercel rollback [deployment-id]
```

### Getting Help

- **Vercel Support:** https://vercel.com/support
- **Supabase Support:** https://supabase.com/support
- **Project Issues:** zach.kimble@gmail.com

---

**End of Deployment Checklist**
