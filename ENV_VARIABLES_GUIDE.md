# ENVIRONMENT VARIABLES REFERENCE
**SECURITY NOTE:** Never commit actual API keys to git. Keep them in .env.local only.

## Required Environment Variables for Vercel

Copy these from your `.env.local` file to Vercel Dashboard:
https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables

1. **OPENAI_API_KEY**
   - Source: .env.local
      - Format: <OPENAI_KEY_PLACEHOLDER>
   - Required for: AI chat functionality

2. **SUPABASE_SERVICE_ROLE_KEY**
   - Source: .env.local  
   - Format: eyJ[...]
   - Required for: Database operations

3. **NEXT_PUBLIC_SUPABASE_URL**
   - Value: https://gbmefnaqsxtloseufjixp.supabase.co
   - Required for: Database connection

4. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Value: Can be shared (public key)
   - Required for: Client-side database access

5. **ZAPIER_WEBHOOK_URL**
   - Value: https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/
   - Required for: Master document logging

## Security Best Practices

- ✅ Keep sensitive keys in .env.local only
- ✅ Never commit .env.local to git
- ✅ Use Vercel's environment variables for production
- ✅ Rotate keys regularly
- ❌ Never expose keys in documentation or logs
