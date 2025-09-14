# KIMBLEAI V4 CLEAN - SECURE DEPLOYMENT GUIDE
**Date:** September 14, 2025  
**Location:** D:\OneDrive\Documents\kimbleai-v4-clean  
**GitHub:** https://github.com/kimblezc/kimbleai-v4-clean  
**Security:** All API keys stored securely in .env.local (not in git)

## ENVIRONMENT VARIABLES LOCATION

Your API keys are stored in:
- **Local:** `.env.local` file (gitignored)
- **Google Drive:** [API Keys Document](https://docs.google.com/document/d/11TkeN5BkXejdnWsA9z6HrZiodH4pipTL4AzHbzB9nVo/edit)
- **Master Document:** Page 93+ (reference only, no actual keys)

## VERCEL DEPLOYMENT STEPS

### 1. Push Clean Code to GitHub
```powershell
cd D:\OneDrive\Documents\kimbleai-v4-clean
git add -A
git commit -m "security: Clean deployment without exposed keys"
git push origin master --force
```

### 2. Deploy to Vercel
```powershell
npx vercel --prod --force
```

### 3. Add Environment Variables in Vercel Dashboard

Go to: https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables

Add these variables (copy values from your .env.local file):

| Variable | Description | Source |
|----------|-------------|--------|
| OPENAI_API_KEY | OpenAI API key (sk-proj-...) | .env.local or Google Drive doc |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service key | .env.local |
| NEXT_PUBLIC_SUPABASE_URL | https://gbmefnaqsxtloseufjixp.supabase.co | Public - safe to share |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key | .env.local |
| ZAPIER_WEBHOOK_URL | https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/ | Public - safe to share |

## SECURITY CHECKLIST

✅ API keys ONLY in .env.local (never in git)  
✅ .env.local is in .gitignore  
✅ Documentation references keys without exposing them  
✅ GitHub push protection enabled  
✅ Vercel environment variables set via dashboard  

## PROJECT STATUS

| Component | Status | Notes |
|-----------|--------|-------|
| TypeScript Fixes | ✅ COMPLETE | Lines 458 & 526 fixed |
| Environment Variables | ✅ SECURE | In .env.local only |
| Git Repository | ✅ CLEAN | No exposed secrets |
| Documentation | ✅ SECURE | References only, no keys |
| Deployment | ⏳ READY | Awaiting push and Vercel config |

## QUICK REFERENCE

- **GitHub:** https://github.com/kimblezc/kimbleai-v4-clean
- **Vercel Project:** https://vercel.com/kimblezcs-projects/kimbleai-v4-clean
- **Master Document:** [Google Doc](https://docs.google.com/document/d/1cO3leN51GpVdsWOwVK1MtgkLCr_jpodXrpp18rhgCaI/edit)
- **API Keys Reference:** [Secure Google Doc](https://docs.google.com/document/d/11TkeN5BkXejdnWsA9z6HrZiodH4pipTL4AzHbzB9nVo/edit)
- **Webhook:** https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/

## RECOVERY KEYWORDS
kimbleai v4 clean secure deployment typescript fixed webhook zapier master document supabase gbmefnaqsxtloseufjixp
