# Continue KimbleAI Development on Laptop

## ✅ OneDrive Sync Confirmed

**Working Directory**: `D:\OneDrive\Documents\kimbleai-v4-clean`

All files are stored in OneDrive and will automatically sync to your laptop.

---

## 🚀 Quick Start on Laptop

### Step 1: Wait for OneDrive Sync
Check that OneDrive has synced the folder to your laptop. You should see the `kimbleai-v4-clean` folder in your OneDrive Documents.

### Step 2: Open in Claude Code
```bash
# Open folder in Claude Code
cd ~/OneDrive/Documents/kimbleai-v4-clean
code .
```

### Step 3: Use This Prompt in Claude Code

Copy and paste this into Claude Code:

---

**PROMPT FOR CLAUDE CODE:**

```
I'm continuing development of KimbleAI from my desktop session.

Context:
- Project: KimbleAI v4 (Next.js 15.5.3, TypeScript, Tailwind, Supabase)
- Location: ~/OneDrive/Documents/kimbleai-v4-clean
- Latest commit: 4995856
- Status: All UI improvements deployed to kimbleai.com

Recent changes (this session):
1. Complete ChatGPT-style UI redesign (reduced from 1348 to 442 lines)
2. Added Inter + Space Grotesk fonts (readable but distinctive)
3. Fixed D20 glow to radiate from center with soft gradient
4. Added personalized time-based greetings in CET timezone
5. Created automated session handoff system

Please:
1. Read SESSION_HANDOFF.md to understand the current state
2. Verify all changes are synced (git status should be clean)
3. Run a build test to ensure everything works: npm run build
4. Let me know we're ready to continue, and ask what I'd like to work on next

If there are any uncommitted changes or issues, help me resolve them.
```

---

## 📋 Alternative: Use the Sync Script

If you prefer automation:

```bash
cd ~/OneDrive/Documents/kimbleai-v4-clean

# Linux/Mac
./scripts/laptop-sync.sh

# Windows
.\scripts\laptop-sync.ps1
```

The sync script will:
- Pull latest changes from GitHub
- Install dependencies if needed
- Rebuild the project
- Show session handoff summary

---

## 📖 Key Files to Know

- `SESSION_HANDOFF.md` - Complete session state and changes
- `scripts/README.md` - Documentation for all scripts
- `app/page.tsx` - Main UI (442 lines, recently redesigned)
- `app/globals.css` - Global styles and fonts

---

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Test production build
npm run lint             # Run linter

# Git
git status               # Check current state
git log --oneline -10    # See recent commits
git pull origin master   # Pull latest changes

# Railway Deployment
railway up               # Deploy to production
railway logs             # View deployment logs
railway domain           # Show production URLs
```

---

## 🌐 Production URLs

- Primary: https://kimbleai.com
- Alternate: https://www.kimbleai.com
- Railway: https://kimbleai-production-efed.up.railway.app
- Health: https://kimbleai.com/api/health

---

## 📊 Current State

**Version**: v7.5.9
**Commit**: 4995856 (latest) / a515684 (UI changes deployed)
**Branch**: master
**Status**: Clean working tree, all deployed ✅

**What's Working:**
- Clean ChatGPT-style UI
- Personalized greetings by time
- Inter/Space Grotesk fonts
- Soft D20 glow effect
- All features functional

**What's Next:**
Whatever you want to work on! The codebase is clean and ready.

---

## ⚠️ Important Notes

1. **OneDrive Sync**: Files sync automatically, but git history requires manual pull
2. **Environment Variables**: `.env.local` may need to be recreated on laptop (not in git)
3. **Node Modules**: Will need `npm install` first time (not in OneDrive sync)
4. **Build Cache**: `.next` folder can be deleted and rebuilt

---

## 🆘 Troubleshooting

**If sync script fails:**
```bash
git fetch origin
git reset --hard origin/master
npm install
npm run build
```

**If build fails:**
```bash
rm -rf .next node_modules
npm install
npm run build
```

**If you need to restore old UI:**
```bash
git checkout app/page.tsx.backup-dnd-theme
```

---

**Ready to continue! Use the prompt above in Claude Code on your laptop.**
