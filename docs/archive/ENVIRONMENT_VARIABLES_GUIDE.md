# Environment Variables - Best Practices Guide

**IMPORTANT:** This guide was created after the AssemblyAI newline bug incident that cost hours of debugging time. Please read carefully to avoid similar issues.

---

## The Hidden Character Bug (Newline Incident)

### What Happened

When adding the AssemblyAI API key to Vercel, this command was used:

```bash
# ❌ WRONG - Adds hidden newline character
echo "f4e7e2cf1ced4d3d83c15f7206d5c74b" | vercel env add ASSEMBLYAI_API_KEY
```

This stored: `f4e7e2cf1ced4d3d83c15f7206d5c74b\n` (with newline)

Which resulted in API calls sending: `Authorization: Bearer f4e7e2cf1ced4d3d83c15f7206d5c74b\n`

AssemblyAI rejected this as "Invalid API key" - but the error gave no indication that the key had a hidden newline character. Hours were wasted debugging.

---

## Safe Methods for Adding Environment Variables

### Method 1: Interactive Mode (RECOMMENDED)

```bash
vercel env add VARIABLE_NAME
# Paste value when prompted (no echo command)
```

**Why:** Direct paste avoids shell interpolation and hidden characters.

### Method 2: Using echo with -n flag

```bash
# ✅ CORRECT - No newline added
echo -n "value" | vercel env add VARIABLE_NAME
```

**Why:** The `-n` flag suppresses the trailing newline that `echo` normally adds.

### Method 3: Using printf (Alternative)

```bash
# ✅ CORRECT - printf doesn't add newline by default
printf "value" | vercel env add VARIABLE_NAME
```

### ❌ NEVER Do This

```bash
# ❌ WRONG - Adds newline
echo "value" | vercel env add VARIABLE_NAME

# ❌ WRONG - May include extra whitespace
cat file.txt | vercel env add VARIABLE_NAME

# ❌ WRONG - Shell expansion issues
vercel env add VARIABLE_NAME $VALUE
```

---

## Using Environment Variables in Code

### ❌ Old Way (Vulnerable to Hidden Characters)

```typescript
// ❌ BAD - No validation, no trimming
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY!;

// Results in: "Bearer key\n" if key has newline
'Authorization': `Bearer ${ASSEMBLYAI_API_KEY}`
```

### ✅ New Way (Safe and Validated)

```typescript
import { getEnv, validateApiKey } from '@/lib/env-utils';

// ✅ GOOD - Automatic trimming and validation
const ASSEMBLYAI_API_KEY = validateApiKey('ASSEMBLYAI_API_KEY', 'hex32');

// Always produces: "Bearer key" (no hidden characters)
'Authorization': `Bearer ${ASSEMBLYAI_API_KEY}`
```

---

## Common Environment Variable Patterns

### API Keys with Format Validation

```typescript
import { validateApiKey } from '@/lib/env-utils';

// AssemblyAI (32 hex characters)
const assemblyKey = validateApiKey('ASSEMBLYAI_API_KEY', 'hex32');

// OpenAI (starts with sk-)
const openaiKey = validateApiKey('OPENAI_API_KEY', 'sk-prefix');

// Supabase JWT tokens
const supabaseKey = validateApiKey('SUPABASE_SERVICE_ROLE_KEY', 'jwt');
```

### URLs with Pattern Validation

```typescript
import { getEnv } from '@/lib/env-utils';

const webhookUrl = getEnv('ZAPIER_WEBHOOK_URL', {
  required: true,
  pattern: /^https:\/\/hooks\.zapier\.com\//,
  errorMessage: 'Webhook URL must start with https://hooks.zapier.com/'
});
```

### Multiple Variables at Once

```typescript
import { getEnvs } from '@/lib/env-utils';

const env = getEnvs({
  OPENAI_API_KEY: {
    required: true,
    pattern: /^sk-/
  },
  SUPABASE_URL: {
    required: true,
    pattern: /^https:\/\//
  },
  ZAPIER_WEBHOOK_URL: {
    required: false,
    pattern: /^https:\/\//
  }
});
```

---

## Validation Scripts

### Pre-deployment Validation

Run before deploying to catch environment variable issues:

```bash
npm run validate-env
```

This checks:
- All required variables are set
- No hidden characters (newlines, tabs, etc.)
- Correct formats (API keys, URLs, JWTs)
- Length requirements

### Running Tests

```bash
npm run test:env
```

Tests include:
- Hidden character detection
- API key format validation
- Authorization header safety
- Real-world bug reproduction cases

---

## Required Environment Variables

### Production (Required)

| Variable | Format | Example | Validation |
|----------|--------|---------|------------|
| `ASSEMBLYAI_API_KEY` | 32 hex chars | `f4e7e2cf1ced...` | `validateApiKey('ASSEMBLYAI_API_KEY', 'hex32')` |
| `OPENAI_API_KEY` | sk-prefix | `sk-proj-abc...` | `validateApiKey('OPENAI_API_KEY', 'sk-prefix')` |
| `NEXT_PUBLIC_SUPABASE_URL` | HTTPS URL | `https://xxx.supabase.co` | Pattern: `^https://` |
| `SUPABASE_SERVICE_ROLE_KEY` | JWT | `eyJhbGc...` | `validateApiKey('...', 'jwt')` |
| `GOOGLE_CLIENT_ID` | OAuth ID | `xxx.apps.googleusercontent.com` | Pattern: `.apps.googleusercontent.com$` |
| `GOOGLE_CLIENT_SECRET` | OAuth secret | Min 20 chars | `minLength: 20` |
| `NEXTAUTH_URL` | HTTPS URL | `https://kimbleai.com` | Pattern: `^https://` |
| `NEXTAUTH_SECRET` | Random string | Min 32 chars | `minLength: 32` |

### Optional (Webhooks)

| Variable | Format | Example | Validation |
|----------|--------|---------|------------|
| `ZAPIER_WEBHOOK_URL` | Zapier URL | `https://hooks.zapier.com/...` | Pattern: `^https://hooks.zapier.com/` |
| `ZAPIER_MEMORY_WEBHOOK_URL` | Zapier URL | `https://hooks.zapier.com/...` | Pattern: `^https://hooks.zapier.com/` |
| `ZAPIER_WEBHOOK_SECRET` | String | Min 10 chars | `minLength: 10` |

---

## Troubleshooting

### Issue: "Invalid API key" errors

**Possible causes:**
1. Hidden newline character (the bug we had)
2. Extra spaces before/after the key
3. Wrong API key format
4. API key not set in Vercel

**How to fix:**
```bash
# 1. Check current value (in Vercel dashboard)
vercel env ls

# 2. Remove old value
vercel env rm VARIABLE_NAME production

# 3. Add new value correctly
vercel env add VARIABLE_NAME
# (paste value when prompted, no echo command)

# 4. Redeploy
vercel --prod

# 5. Verify with health check
curl https://kimbleai.com/api/health
```

### Issue: Environment variable detected as "not set"

**Possible causes:**
1. Variable truly not set
2. Variable set but value is only whitespace
3. Wrong environment (development vs production)

**How to fix:**
```bash
# Check which environments have the variable
vercel env ls

# Add to specific environment
vercel env add VARIABLE_NAME production
vercel env add VARIABLE_NAME preview
vercel env add VARIABLE_NAME development
```

### Issue: Validation script fails

**How to debug:**
```bash
# Run validation with verbose output
npx ts-node scripts/validate-env.ts

# The script will tell you:
# - Which variables are missing
# - Which have hidden characters
# - Which have invalid formats
# - Exact error messages for each issue
```

---

## Checklist for Adding New Environment Variables

- [ ] Choose appropriate validation (API key format, URL pattern, length)
- [ ] Add to `scripts/validate-env.ts`
- [ ] Use `getEnv()` or `validateApiKey()` in code (never `process.env.X!`)
- [ ] Add to `.env.local` for development
- [ ] Add to Vercel using interactive mode or `echo -n`
- [ ] Test with `npm run validate-env`
- [ ] Add to `app/api/health/route.ts` health check
- [ ] Document in this guide

---

## Code Migration Checklist

### Critical Priority (Do First)

- [ ] All AssemblyAI files (6 files)
- [ ] All OpenAI API calls (30+ files)
- [ ] All Supabase connections (10+ files)

### Example Migration

**Before:**
```typescript
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY!;
```

**After:**
```typescript
import { validateApiKey } from '@/lib/env-utils';
const ASSEMBLYAI_API_KEY = validateApiKey('ASSEMBLYAI_API_KEY', 'hex32');
```

---

## Additional Resources

- **Audit Report:** `HIDDEN_CHARACTER_BUGS_AUDIT.md` - Full incident analysis
- **Utility Code:** `lib/env-utils.ts` - Environment variable utilities
- **Validation Script:** `scripts/validate-env.ts` - Pre-deployment validation
- **Tests:** `tests/env-utils.test.ts` - Comprehensive test suite
- **Health Check:** `app/api/health/route.ts` - Runtime validation

---

## Summary: The 3 Rules

1. **NEVER use `echo` without `-n` flag when piping to vercel env add**
2. **ALWAYS use `getEnv()` or `validateApiKey()` instead of `process.env.X!`**
3. **ALWAYS run `npm run validate-env` before deploying**

Following these rules prevents hours of debugging hidden character bugs.

---

**Last Updated:** October 1, 2025
**Maintained by:** KimbleAI Development Team
