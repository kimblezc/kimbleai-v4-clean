# Sync KimbleAI v4 to Your Laptop

Quick guide to sync this project to your other laptop (assumes you already have Node.js, Git, etc.)

---

## On Your Current PC (Do This First)

### 1. Push all changes to GitHub
```bash
# Make sure everything is committed and pushed
git status
git add .
git commit -m "sync: prepare for laptop transfer"
git push
```

### 2. Copy your .env.local file
The `.env.local` file contains all your secrets and is NOT in git. You need to transfer it manually.

**Option A: Copy to OneDrive/Google Drive**
```bash
# Copy to a synced location
cp .env.local ~/OneDrive/.env.local.backup
```

**Option B: Email it to yourself**
```bash
# Just email the contents of .env.local to yourself
cat .env.local
```

**Option C: Use the template below** and fill in values from Vercel/Supabase dashboards

---

## On Your Laptop

### 1. Clone the repository
```bash
git clone https://github.com/kimblezc/kimbleai-v4-clean.git
cd kimbleai-v4-clean
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create .env.local
Create `.env.local` in the project root with your environment variables:

```env
# Copy from your PC, or get from Vercel with:
# vercel env pull .env.local

NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
OPENAI_API_KEY=sk-proj-...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=[your-secret]
GOOGLE_CLIENT_ID=[your-id].apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
ARCHIE_TRIGGER_SECRET=[your-secret]
ASSEMBLYAI_API_KEY=[your-key]
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}
```

**Quick way to get env vars from Vercel:**
```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Login and link project
vercel login
vercel link

# Pull env vars
vercel env pull .env.local
```

### 4. Test everything works
```bash
# Start dev server
npm run dev

# In another terminal, check Archie status
npx tsx scripts/check-archie-status.ts

# Visit http://localhost:3000
```

---

## That's It!

Your laptop is now synced. Both machines will:
- Pull from the same GitHub repo
- Deploy to the same Vercel project
- Access the same Supabase database

---

## Daily Workflow (Using Both Machines)

### Before working on laptop:
```bash
git pull  # Get latest from PC
```

### After working on laptop:
```bash
git add .
git commit -m "your changes"
git push
```

### Back on PC:
```bash
git pull  # Get changes from laptop
```

---

## Quick Verification Script

Run this to verify everything is set up correctly:

```bash
npx tsx scripts/verify-setup.ts
```

It will check:
- ✅ All environment variables present
- ✅ Supabase connection
- ✅ OpenAI API access
- ✅ Database tables exist
- ✅ Archie can run

---

## Important Notes

1. **Both machines share the same database** - changes on one affect the other
2. **`.env.local` is NOT synced via git** - you must copy it manually
3. **GitHub Actions runs independently** - it will keep triggering Archie every 5 minutes regardless of which machine you're using
4. **Always `git pull` before starting work** to avoid merge conflicts

---

## Useful Commands

```bash
# Check what Archie is doing
npx tsx scripts/check-archie-status.ts

# Check task counts
npx tsx scripts/check-task-counts.ts

# Trigger Archie manually
curl "https://www.kimbleai.com/api/agent/trigger?trigger=archie-manual"

# View recent deployments
vercel ls

# View production logs
vercel logs https://www.kimbleai.com --since 1h
```
