# Security Configuration for KimbleAI

## CRITICAL: Your API Keys are Exposed!

Your OpenAI API key (example: <OPENAI_KEY_PLACEHOLDER>) must never be committed. This is a security risk.

## Immediate Actions Required:

### 1. Regenerate your OpenAI API key
Go to: https://platform.openai.com/api-keys
- Delete the current key
- Generate a new one
- Save it securely

### 2. Check if keys were committed to Git
```bash
git log -p | grep "<OPENAI_KEY_PLACEHOLDER>"
```

If found, you need to:
- Remove from git history
- Force push cleaned history
- Regenerate ALL keys

### 3. Secure Key Storage

## For Local Development (.env.local)
```
# NEVER commit this file
OPENAI_API_KEY=your-new-key-here
NEXT_PUBLIC_SUPABASE_URL=https://gbmefnaqsxtloseufjixp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## For Vercel Production
Set via Vercel CLI or Dashboard, NEVER in code:
```bash
npx vercel env add OPENAI_API_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

## Security Rules:
1. NEVER commit API keys to git
2. Add .env.local to .gitignore
3. Use environment variables in Vercel
4. Rotate keys regularly
5. Use least-privilege keys when possible
