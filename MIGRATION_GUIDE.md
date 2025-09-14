# MIGRATION GUIDE - V3 to V4

## Quick Migration (5 minutes)

### Step 1: Get Your Keys from Old Project
```powershell
# Run in PowerShell
cd D:\OneDrive\Documents\kimbleai
cat .env.local
```

Copy these values:
- OPENAI_API_KEY=sk-proj-...
- SUPABASE_SERVICE_ROLE_KEY=eyJ...

### Step 2: Run Clean Setup
```powershell
cd D:\OneDrive\Documents\kimbleai-v4
.\INITIALIZE_CLEAN_V4.ps1
```

### Step 3: Add Your Keys
Edit `.env.local` and add your keys from Step 1

### Step 4: Deploy
```powershell
./deploy.ps1 "Initial V4 deployment"
```

## What Gets Migrated
✅ OpenAI configuration  
✅ Supabase database (same instance)
✅ User conversations (preserved in Supabase)
✅ Vercel deployment settings

## What Gets Removed
❌ 100+ batch files
❌ Multiple version folders
❌ Debug scripts
❌ Status documents
❌ Test files
❌ Archive folders

## File Count Comparison
- **Old Project:** 799 files
- **New Project:** ~20 files
- **Reduction:** 97.5%

## Zapier Migration
Your existing Zapier account ($240/year) will work with V4:

1. Update webhook URLs to new deployment:
   - Old: kimbleai-fresh.vercel.app/api/zapier
   - New: kimbleai-v4.vercel.app/api/zapier

2. Keep same Zap logic, just change URLs

## GitHub Migration
1. Create new repository: kimbleai-v4
2. Old repository becomes archive
3. Clean commit history starts fresh

## Database (No Migration Needed)
Same Supabase instance - all data preserved:
- Conversations
- Messages  
- Memories
- Projects
- Tags

## Cost Remains Same
- Vercel: Free tier
- Supabase: $25/month (optimize to free tier later)
- OpenAI: ~$5/month usage
- Zapier: $20/month (finally being used)

## Version Control Best Practices Going Forward

### Every Change:
```powershell
git add -A
git commit -m "feat: description"  # or fix:, docs:, refactor:
git push origin main
```

### Commit Message Format:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code improvement
- `deploy:` Deployment change

### Branch Strategy:
- `main` - Production
- `develop` - Testing (if needed)
- No feature branches for 2-person team

### What NOT to Commit:
- .env files
- node_modules
- .next build folder
- Batch files
- Status documents
- Log files

## Final Cleanup of Old Project
After V4 is working:
```powershell
# Archive old project
cd D:\OneDrive\Documents
Compress-Archive -Path kimbleai -DestinationPath kimbleai_v3_archive.zip

# Then delete original
# Remove-Item -Path kimbleai -Recurse -Force  # Only after confirming V4 works!
```

## Success Metrics
- ✅ Deployment in < 5 minutes
- ✅ No TypeScript errors
- ✅ Chat works with memory
- ✅ Under 25 files total
- ✅ Git commits work smoothly
