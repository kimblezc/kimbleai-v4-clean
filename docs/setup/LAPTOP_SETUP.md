# KimbleAI v4 - New Laptop Setup Guide

Complete setup instructions for moving development to a new laptop.

---

## Prerequisites

Install these on your new laptop:

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **Git**
   - Download: https://git-scm.com/
   - Verify: `git --version`

3. **Code Editor** (VS Code recommended)
   - Download: https://code.visualstudio.com/

---

## Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/kimblezc/kimbleai-v4-clean.git

# Navigate to project
cd kimbleai-v4-clean

# Verify you're on master branch
git branch
```

---

## Step 2: Install Dependencies

```bash
# Install all npm packages
npm install

# This will install:
# - Next.js 15
# - Supabase client
# - OpenAI SDK
# - All other dependencies
```

---

## Step 3: Environment Variables

Create `.env.local` file in the project root:

```bash
# Copy template
cp .env.local.template .env.local
```

Then edit `.env.local` with your actual values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Archie Trigger
ARCHIE_TRIGGER_SECRET=your_archie_trigger_secret

# Optional: Other services
ASSEMBLYAI_API_KEY=your_assemblyai_key
GOOGLE_SERVICE_ACCOUNT=your_google_service_account_json
```

**Where to find these values:**
- Supabase: https://supabase.com/dashboard/project/[your-project]/settings/api
- OpenAI: https://platform.openai.com/api-keys
- Google OAuth: https://console.cloud.google.com/apis/credentials
- NextAuth Secret: Generate with `openssl rand -base64 32`

---

## Step 4: Install Vercel CLI

```bash
# Install globally
npm install -g vercel

# Login to Vercel
vercel login

# Link to project
vercel link
# Select: kimblezcs-projects
# Project: kimbleai-v4-clean
```

---

## Step 5: Verify Setup

Run the verification script:

```bash
# Check all environment variables and connections
npx tsx scripts/verify-setup.ts
```

This will verify:
- ✅ All required environment variables present
- ✅ Supabase connection working
- ✅ OpenAI API key valid
- ✅ Database tables accessible
- ✅ Archie agent can run

---

## Step 6: Test Local Development

```bash
# Start development server
npm run dev

# Visit: http://localhost:3000
# You should see the app running
```

Test these pages:
- `/` - Main chat interface
- `/agent` - Archie dashboard
- `/api/health` - Health check (should return 200)

---

## Step 7: Verify Archie Works

```bash
# Check Archie status
npx tsx scripts/check-archie-status.ts

# Test task processing
npx tsx scripts/test-task-processing.ts

# Manually trigger Archie (local)
curl "http://localhost:3000/api/agent/trigger?trigger=archie-manual"
```

---

## Quick Reference Commands

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
```

### Deployment
```bash
vercel               # Deploy to preview
vercel --prod        # Deploy to production
vercel logs          # View deployment logs
```

### Archie Management
```bash
# Check status
npx tsx scripts/check-archie-status.ts

# Check task counts
npx tsx scripts/check-task-counts.ts

# Trigger manually (production)
curl "https://www.kimbleai.com/api/agent/trigger?trigger=archie-manual"
```

### Git Workflow
```bash
git status           # Check changes
git add .            # Stage all changes
git commit -m "msg"  # Commit changes
git push             # Push to GitHub
```

---

## GitHub Actions (Auto-runs every 5 minutes)

The workflow `.github/workflows/trigger-archie.yml` automatically triggers Archie every 5 minutes.

**To manually trigger:**
1. Go to: https://github.com/kimblezc/kimbleai-v4-clean/actions
2. Click "Trigger Archie Autonomous Agent"
3. Click "Run workflow" button

---

## Troubleshooting

### Error: "supabaseUrl is required"
- Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`
- Restart dev server after adding env vars

### Error: "Cannot connect to Supabase"
- Verify Supabase project is active
- Check service role key is correct
- Verify IP is allowed in Supabase dashboard

### Error: "OpenAI API key invalid"
- Generate new key at https://platform.openai.com/api-keys
- Update `OPENAI_API_KEY` in `.env.local`

### Vercel deployment fails
- Run `vercel env pull` to sync environment variables
- Check all env vars are set in Vercel dashboard
- Verify build succeeds locally: `npm run build`

### Archie not processing tasks
- Check GitHub Actions is running: https://github.com/kimblezc/kimbleai-v4-clean/actions
- Verify trigger endpoint works: `curl "https://www.kimbleai.com/api/agent/trigger?trigger=archie-manual"`
- Check database logs: `npx tsx scripts/check-archie-status.ts`

---

## Project Structure

```
kimbleai-v4-clean/
├── app/                    # Next.js 15 App Router
│   ├── api/               # API routes
│   │   ├── agent/        # Archie endpoints
│   │   │   ├── cron/     # Cron endpoint (Vercel)
│   │   │   └── trigger/  # Manual trigger (GitHub Actions)
│   │   └── chat-stream/  # Chat API
│   ├── agent/            # Archie dashboard UI
│   └── page.tsx          # Main chat interface
├── lib/
│   └── autonomous-agent.ts  # Archie core logic
├── scripts/              # Utility scripts
│   ├── check-archie-status.ts
│   ├── check-task-counts.ts
│   └── test-task-processing.ts
├── .github/
│   └── workflows/
│       └── trigger-archie.yml  # Auto-trigger every 5 min
├── middleware.ts         # Auth & security
├── .env.local           # Environment variables (local)
└── vercel.json          # Vercel config
```

---

## Important Files

### Configuration
- `.env.local` - Local environment variables (DO NOT COMMIT)
- `vercel.json` - Vercel deployment config
- `middleware.ts` - Authentication & public paths
- `next.config.ts` - Next.js configuration

### Archie Core
- `lib/autonomous-agent.ts` - Main autonomous agent logic
- `app/api/agent/cron/route.ts` - Vercel Cron endpoint
- `app/api/agent/trigger/route.ts` - Manual trigger endpoint
- `.github/workflows/trigger-archie.yml` - GitHub Actions scheduler

### Dashboard
- `app/agent/page.tsx` - Archie dashboard (public, read-only)

---

## Security Notes

1. **Never commit `.env.local`** - It contains secrets
2. **Authorized emails** are in `middleware.ts` (lines 6-9)
3. **Public paths** are in `middleware.ts` (lines 12-39)
4. **Trigger endpoint** has dual auth:
   - Query param: `?trigger=archie-manual` (for testing)
   - Header: `Authorization: Bearer ${ARCHIE_TRIGGER_SECRET}` (for production)

---

## Database Tables

The Supabase database has these tables:

- `agent_tasks` - Archie's task queue
- `agent_findings` - Issues/suggestions Archie discovers
- `agent_logs` - Archie's activity logs
- `agent_state` - Archie's configuration state
- `conversations` - Chat conversations
- `messages` - Chat messages
- `costs` - API cost tracking

---

## Next Steps After Setup

1. ✅ Verify all scripts run without errors
2. ✅ Test local dev server works
3. ✅ Check Archie dashboard shows current data
4. ✅ Confirm GitHub Actions workflow is running
5. ✅ Make a test change and deploy with Vercel

---

## Getting Help

- **Docs**: See `CURRENT_STATE.md` for project status
- **Archie Logs**: `npx tsx scripts/check-archie-status.ts`
- **Vercel Logs**: `vercel logs https://www.kimbleai.com`
- **GitHub Actions**: https://github.com/kimblezc/kimbleai-v4-clean/actions

---

## Summary

After completing this setup:
- ✅ Repository cloned and dependencies installed
- ✅ Environment variables configured
- ✅ Vercel CLI linked to project
- ✅ Local development server working
- ✅ Archie agent verified and running
- ✅ GitHub Actions auto-triggering Archie every 5 minutes

You're now ready to develop on your new laptop!
