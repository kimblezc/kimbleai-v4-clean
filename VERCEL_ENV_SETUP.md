# VERCEL ENVIRONMENT VARIABLES SETUP

## How to Add Environment Variables in Vercel:

1. Go to: https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables
   OR
   - Click "Settings" tab (top of page)
   - Click "Environment Variables" in left sidebar

2. For each variable below, click "Add Variable" and enter:
   - Key: The variable name
   - Value: Copy from your .env.local file
   - Environment: Select all (Production, Preview, Development)

## Required Variables:

### Variable 1: OPENAI_API_KEY
- Type: Secret
- Value: Your OpenAI API key (example: <OPENAI_KEY_PLACEHOLDER>)
- Get from: .env.local file

### Variable 2: SUPABASE_SERVICE_ROLE_KEY  
- Type: Secret
- Value: Your Supabase service role key (long JWT token)
- Get from: .env.local file

### Variable 3: NEXT_PUBLIC_SUPABASE_URL
- Type: Plain
- Value: https://gbmefnaqsxtloseufjixp.supabase.co
- This is public, safe to share

### Variable 4: NEXT_PUBLIC_SUPABASE_ANON_KEY
- Type: Plain  
- Value: Your Supabase anon key (long JWT token)
- Get from: .env.local file

### Variable 5: ZAPIER_WEBHOOK_URL
- Type: Plain
- Value: https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/
- This is your webhook URL

## After Adding All Variables:

1. Click "Save" for each variable
2. Go back to Deployments tab
3. Click the three dots menu on the failed deployment
4. Select "Redeploy"

## Alternative: Use Vercel CLI

If you can't find the UI, use PowerShell:

```powershell
cd D:\OneDrive\Documents\kimbleai-v4-clean

# List current environment variables
npx vercel env ls

# Pull down production environment
npx vercel env pull
```

Then manually add to Vercel dashboard or use:

```powershell
npx vercel env add OPENAI_API_KEY production
# (paste your key when prompted)

npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
# (paste your key when prompted)

# etc for each variable
```
