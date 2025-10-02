# Environment Variable Migration Guide

**Purpose:** Fix all 86 vulnerable locations identified in the hidden character bug audit.

**Estimated Time:** 2-4 hours total
**Priority:** Critical for AssemblyAI (6 files), High for OpenAI (30+ files)

---

## Quick Start: Fix The Critical Bug NOW

**The AssemblyAI files that already broke production:**

### 1-Minute Fix for Each File:

```typescript
// Add this import at the top
import { validateApiKey } from '@/lib/env-utils';

// Replace this line:
- const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY!;
// With this:
+ const ASSEMBLYAI_API_KEY = validateApiKey('ASSEMBLYAI_API_KEY', 'hex32');
```

### Files to Fix (6 total):
1. `app/api/transcribe/assemblyai/route.ts` - Line 15
2. `app/api/transcribe/start/route.ts` - Line 6
3. `app/api/transcribe/status/route.ts` - Line 6
4. `app/api/transcribe/upload-stream/route.ts` - Line 6
5. `app/api/transcribe/stream-upload/route.ts` - Line 6
6. `app/api/transcribe/upload-url/route.ts` - Line 6

**Time:** 30 minutes for all 6 files
**Impact:** Fixes production transcription failures

---

## Migration Patterns by Use Case

### Pattern 1: API Keys in Constants

**For AssemblyAI (32 hex chars):**
```typescript
import { validateApiKey } from '@/lib/env-utils';
const ASSEMBLYAI_API_KEY = validateApiKey('ASSEMBLYAI_API_KEY', 'hex32');
```

**For OpenAI (sk- prefix):**
```typescript
import { validateApiKey } from '@/lib/env-utils';
const OPENAI_API_KEY = validateApiKey('OPENAI_API_KEY', 'sk-prefix');
```

**For Supabase/JWT tokens:**
```typescript
import { validateApiKey } from '@/lib/env-utils';
const SUPABASE_KEY = validateApiKey('SUPABASE_SERVICE_ROLE_KEY', 'jwt');
```

### Pattern 2: Direct Usage in Constructors

**Before:**
```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});
```

**After:**
```typescript
import { validateApiKey } from '@/lib/env-utils';
const openai = new OpenAI({
  apiKey: validateApiKey('OPENAI_API_KEY', 'sk-prefix')
});
```

### Pattern 3: URLs and Generic Strings

**Before:**
```typescript
const URL = process.env.WEBHOOK_URL!;
```

**After:**
```typescript
import { getEnv } from '@/lib/env-utils';
const URL = getEnv('WEBHOOK_URL', {
  required: true,
  pattern: /^https:\/\//,
  errorMessage: 'Webhook URL must be HTTPS'
});
```

### Pattern 4: Multiple Variables

**Before:**
```typescript
const URL1 = process.env.URL1;
const URL2 = process.env.URL2;
const SECRET = process.env.SECRET;
```

**After:**
```typescript
import { getEnvs } from '@/lib/env-utils';
const { URL1, URL2, SECRET } = getEnvs({
  URL1: { pattern: /^https:\/\// },
  URL2: { pattern: /^https:\/\// },
  SECRET: { required: true, minLength: 10 }
});
```

---

## Files by Priority

### Critical (Do First - This Week)

**AssemblyAI files (6) - ALREADY BROKE PRODUCTION:**
- `app/api/transcribe/assemblyai/route.ts`
- `app/api/transcribe/start/route.ts`
- `app/api/transcribe/status/route.ts`
- `app/api/transcribe/upload-stream/route.ts`
- `app/api/transcribe/stream-upload/route.ts`
- `app/api/transcribe/upload-url/route.ts`

**Core OpenAI files (5):**
- `app/api/chat/route.ts`
- `lib/background-indexer.ts`
- `lib/auto-reference-butler.ts`
- `scripts/backfill-embeddings.ts`
- `app/api/upload/route.ts`

**Health check (1):**
- `app/api/health/route.ts`

### High Priority (Next Week)

**Remaining OpenAI files (25+):**
See Section 2.1 in HIDDEN_CHARACTER_BUGS_AUDIT.md for complete list

**Supabase files (10+):**
See Section 2.2 in HIDDEN_CHARACTER_BUGS_AUDIT.md for complete list

### Medium Priority (Week 3)

**Google OAuth (2):**
- `app/api/verify-credentials/route.ts`

**Zapier webhooks (3):**
- `lib/zapier-client.ts`

**Documentation (5):**
- `TRANSCRIPTION_TROUBLESHOOTING.md`
- `PERSISTENT_MEMORY_ANALYSIS.md`
- `docs/ZAPIER_SETUP.md`
- `ZAPIER_QUICK_REFERENCE.md`
- `ZAPIER_ACTIVATION_REPORT.md`

---

## Testing After Each Change

```bash
# 1. Validate environment variables
npm run validate-env

# 2. Run env-specific tests
npm run test:env

# 3. Run all tests
npm run test

# 4. Test locally
npm run dev

# 5. Deploy to preview
vercel

# 6. Test preview
curl https://your-preview-url.vercel.app/api/health

# 7. Deploy to production
vercel --prod

# 8. Test production
curl https://kimbleai.com/api/health
```

---

## Rollout Schedule

### Monday: AssemblyAI (Critical)
- Fix all 6 AssemblyAI files
- Test thoroughly
- Deploy to production
- Monitor for issues

### Tuesday: Core OpenAI
- Fix 5 core OpenAI files
- Update health check
- Test and deploy

### Wednesday-Thursday: Remaining OpenAI
- Fix remaining 25+ OpenAI files
- 10 files per day
- Test each batch

### Friday: Supabase
- Fix all 10+ Supabase files
- Test database connections
- Deploy

### Next Week: Polish
- Fix Google OAuth
- Fix Zapier webhooks
- Update documentation
- Final testing

---

## Quick Reference

### Import Statement
```typescript
import { validateApiKey, getEnv, getEnvs } from '@/lib/env-utils';
```

### API Key Formats
| Type | Format | Example Usage |
|------|--------|---------------|
| AssemblyAI | `hex32` | `validateApiKey('ASSEMBLYAI_API_KEY', 'hex32')` |
| OpenAI | `sk-prefix` | `validateApiKey('OPENAI_API_KEY', 'sk-prefix')` |
| Supabase | `jwt` | `validateApiKey('SUPABASE_SERVICE_ROLE_KEY', 'jwt')` |
| Generic | `getEnv` | `getEnv('VAR', { required: true })` |

---

## Common Issues

### Issue: Import error
```
Cannot find module '@/lib/env-utils'
```
**Fix:** Make sure `lib/env-utils.ts` exists

### Issue: Validation fails
```
API key must be 32 hexadecimal characters
```
**Fix:** Check if actual key matches expected format

### Issue: Tests fail
```
Environment variable not set
```
**Fix:** Update `tests/setup.ts` with test values

---

## Resources

- **Full audit:** `HIDDEN_CHARACTER_BUGS_AUDIT.md`
- **Best practices:** `ENVIRONMENT_VARIABLES_GUIDE.md`
- **Quick reference:** `QUICK_REFERENCE_ENV_VARS.md`
- **Utility code:** `lib/env-utils.ts`
- **Tests:** `tests/env-utils.test.ts`

---

**Start now!** The AssemblyAI files already broke production. Fix them first.
