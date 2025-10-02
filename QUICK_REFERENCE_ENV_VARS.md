# Environment Variables - Quick Reference Card

## The One Thing You Must Remember

**NEVER USE `echo` WITHOUT `-n` WHEN PIPING TO VERCEL ENV ADD**

```bash
# ❌ WRONG - Adds hidden \n
echo "value" | vercel env add VAR

# ✅ CORRECT - No newline
echo -n "value" | vercel env add VAR
```

---

## Quick Usage Guide

### Adding Environment Variables

```bash
# Method 1: Interactive (SAFEST)
vercel env add VARIABLE_NAME
# Paste value when prompted

# Method 2: echo with -n flag
echo -n "your_api_key_here" | vercel env add API_KEY

# Method 3: printf (no newline by default)
printf "your_api_key_here" | vercel env add API_KEY
```

### Using in Code

```typescript
import { validateApiKey, getEnv } from '@/lib/env-utils';

// API Keys
const assemblyKey = validateApiKey('ASSEMBLYAI_API_KEY', 'hex32');
const openaiKey = validateApiKey('OPENAI_API_KEY', 'sk-prefix');
const supabaseKey = validateApiKey('SUPABASE_SERVICE_ROLE_KEY', 'jwt');

// URLs
const webhook = getEnv('ZAPIER_WEBHOOK_URL', {
  pattern: /^https:\/\//,
  errorMessage: 'Must be HTTPS'
});

// Generic with validation
const secret = getEnv('SECRET_KEY', {
  required: true,
  minLength: 32
});
```

---

## Validation Formats

| Format | Pattern | Used For | Example |
|--------|---------|----------|---------|
| `hex32` | `[a-f0-9]{32}` | AssemblyAI | `f4e7e2cf...` |
| `hex40` | `[a-f0-9]{40}` | SHA-1 keys | `a94a8fe5...` |
| `sk-prefix` | `sk-[a-zA-Z0-9_-]{32,}` | OpenAI | `sk-proj-abc...` |
| `jwt` | `xxx.yyy.zzz` | Supabase, JWTs | `eyJhbG...` |

---

## Pre-deployment Checklist

```bash
# 1. Validate all environment variables
npm run validate-env

# 2. Run env-specific tests
npm run test:env

# 3. Check health endpoint
curl https://kimbleai.com/api/health

# 4. Deploy
vercel --prod
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `echo "val" \| vercel env add` | `echo -n "val" \| vercel env add` |
| `process.env.KEY!` | `validateApiKey('KEY', 'hex32')` |
| No validation before deploy | `npm run validate-env` |
| Missing required vars | Check `scripts/validate-env.ts` |

---

## If Something Breaks

1. **Check environment variables first**
   ```bash
   vercel env ls
   ```

2. **Look for "Invalid API key" errors**
   - Likely cause: Hidden newline character
   - Fix: Re-add the variable using `echo -n` or interactive mode

3. **Validate locally**
   ```bash
   npm run validate-env
   ```

4. **Check health endpoint**
   ```bash
   curl https://kimbleai.com/api/health
   ```

---

## Files to Reference

- **Full Audit:** `HIDDEN_CHARACTER_BUGS_AUDIT.md`
- **Best Practices:** `ENVIRONMENT_VARIABLES_GUIDE.md`
- **Summary:** `AUDIT_SUMMARY.md`
- **Utility Code:** `lib/env-utils.ts`
- **Validation Script:** `scripts/validate-env.ts`

---

## The Bug That Started It All

```
What was stored: "f4e7e2cf1ced4d3d83c15f7206d5c74b\n"
What was sent:   "Bearer f4e7e2cf1ced4d3d83c15f7206d5c74b\n"
API response:    "Invalid API key"
Hours wasted:    8-10 hours
```

**Don't let this happen again.** Use the utilities and validation scripts.
