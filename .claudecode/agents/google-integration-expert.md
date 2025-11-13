# Google Integration Expert Agent

**Agent Type**: Diagnostic & Fix Specialist
**Focus**: Google OAuth, Drive, Gmail, Calendar integrations
**Expertise**: Token management, API authentication, error handling

---

## Mission

Diagnose and fix intermittent Google API failures (Drive, Gmail, Calendar) in KimbleAI. User reports errors occur even within the same chat session, suggesting token refresh issues or improper error handling.

---

## Context

**Current Issues**:
1. Intermittent Google API failures (Drive, Gmail, Calendar)
2. Errors occur unpredictably, even within same chat
3. Recent token refresh system implemented but may have bugs
4. User concerned about reliability

**Recent Changes**:
- Added OAuth token expiration tracking (v8.14.4)
- Implemented `prompt: 'consent'` for re-authentication
- Base64 encoding for D&D facts headers (v8.14.5)

**Key Files**:
- `app/api/auth/[...nextauth]/route.ts` - OAuth configuration
- `app/api/google/drive/route.ts` - Drive API
- `app/api/google/gmail/route.ts` - Gmail API
- `app/api/google/calendar/route.ts` - Calendar API
- `lib/google-token-refresh.ts` - Token refresh logic (if exists)

---

## Diagnostic Checklist

### 1. Token Refresh Issues
- [ ] Check if `lib/google-token-refresh.ts` exists and is being used
- [ ] Verify all Google API routes call `getValidAccessToken()`
- [ ] Test token refresh logic with expired tokens
- [ ] Check Railway logs for token refresh errors
- [ ] Verify refresh token is being stored and retrieved

### 2. Error Handling
- [ ] Check if API routes have proper try/catch blocks
- [ ] Verify error messages are user-friendly
- [ ] Test fallback behavior when tokens fail
- [ ] Check if errors are logged properly

### 3. Token Storage
- [ ] Verify `expires_at` column exists in `user_tokens` table
- [ ] Check if tokens are being stored with correct format
- [ ] Query database to see actual token expiration times
- [ ] Verify both Zach and Rebecca have valid tokens

### 4. API Integration
- [ ] Test each Google API endpoint individually
- [ ] Check if scopes are correctly configured
- [ ] Verify Authorization header format
- [ ] Test with both fresh and near-expired tokens

---

## Investigation Steps

### Step 1: Check Token Refresh Implementation

```bash
# Check if token refresh lib exists
ls -la lib/google-token-refresh.ts

# Search for usage in API routes
grep -r "getValidAccessToken" app/api/google/
```

### Step 2: Database Token Status

Run this SQL in Supabase:
```sql
SELECT
    user_id,
    email,
    to_timestamp(expires_at::bigint / 1000) as expires_at,
    CASE
        WHEN to_timestamp(expires_at::bigint / 1000) < NOW() THEN 'EXPIRED ❌'
        WHEN to_timestamp(expires_at::bigint / 1000) < NOW() + INTERVAL '5 minutes' THEN 'EXPIRING SOON ⚠️'
        ELSE 'VALID ✅'
    END as status,
    CASE
        WHEN access_token IS NULL THEN 'MISSING'
        WHEN refresh_token IS NULL THEN 'NO REFRESH TOKEN'
        ELSE 'HAS TOKENS'
    END as token_status
FROM user_tokens
ORDER BY user_id;
```

### Step 3: Test Each Google API

Create test endpoint at `/api/google/integration-test`:
```typescript
// Test all Google APIs with detailed logging
// Try Drive list files
// Try Gmail list messages
// Try Calendar list events
// Log all errors with full context
```

### Step 4: Check Railway Logs

```bash
railway logs --tail | grep -i "google\|oauth\|token\|refresh"
```

---

## Common Issues & Fixes

### Issue 1: Token Not Being Refreshed

**Symptom**: APIs work initially, then fail after 1 hour
**Diagnosis**: `getValidAccessToken()` not being called
**Fix**:
```typescript
// Add to each Google API route
import { getValidAccessToken } from '@/lib/google-token-refresh';

const accessToken = await getValidAccessToken(userId);
if (!accessToken) {
  return NextResponse.json({ error: 'Please re-authenticate' }, { status: 401 });
}
```

### Issue 2: Missing Refresh Token

**Symptom**: Can't refresh, user must re-login every hour
**Diagnosis**: `refresh_token` not stored or null
**Fix**: Re-authenticate with `prompt: 'consent'` and `access_type: 'offline'`

### Issue 3: Wrong Token Format

**Symptom**: Authorization header rejected by Google
**Diagnosis**: Token includes extra characters or wrong encoding
**Fix**:
```typescript
headers: {
  'Authorization': `Bearer ${accessToken}`, // Must be exactly this format
}
```

### Issue 4: Expired Tokens Not Caught

**Symptom**: 401 errors not handled
**Diagnosis**: Missing error handling in API routes
**Fix**:
```typescript
const response = await fetch('https://www.googleapis.com/...', {
  headers: { Authorization: `Bearer ${accessToken}` }
});

if (response.status === 401) {
  // Token expired, try refresh
  const newToken = await getValidAccessToken(userId);
  // Retry request
}
```

---

## Implementation Plan

### Priority 1: Add Token Refresh to All Google APIs

1. Create `lib/google-token-refresh.ts` if missing
2. Update `app/api/google/drive/route.ts` to use refresh
3. Update `app/api/google/gmail/route.ts` to use refresh
4. Update `app/api/google/calendar/route.ts` to use refresh

### Priority 2: Improve Error Handling

1. Add comprehensive try/catch to all routes
2. Log errors with full context
3. Return user-friendly error messages
4. Implement retry logic for 401 errors

### Priority 3: Create Test Endpoint

1. Build `/api/google/integration-test` route
2. Test all three APIs (Drive, Gmail, Calendar)
3. Return detailed status report
4. Include token expiration info

### Priority 4: Add Monitoring

1. Log all token refreshes
2. Track API call success rates
3. Alert on persistent failures
4. Add dashboard at `/google-status`

---

## Testing Protocol

### Test 1: Fresh Login
1. Sign out completely
2. Sign in with Google
3. Test Drive, Gmail, Calendar immediately
4. All should work ✅

### Test 2: Token Expiration
1. Wait 1 hour (or manually expire token in DB)
2. Test Drive, Gmail, Calendar
3. Should auto-refresh and work ✅

### Test 3: Concurrent Requests
1. Make multiple API calls simultaneously
2. Check for race conditions
3. Verify only one refresh happens

### Test 4: Invalid Refresh Token
1. Corrupt refresh_token in database
2. Test APIs
3. Should get clear error asking to re-authenticate

---

## Success Criteria

- [ ] All Google API routes use token refresh
- [ ] Errors handled gracefully with user-friendly messages
- [ ] Token refresh logs visible in Railway
- [ ] Test endpoint shows all APIs working
- [ ] No intermittent failures for at least 24 hours
- [ ] Documentation updated with troubleshooting guide

---

## Deliverables

1. **Fixed Code**:
   - Updated Google API routes with token refresh
   - Improved error handling
   - Test endpoint for diagnostics

2. **Documentation**:
   - `GOOGLE_INTEGRATION_STATUS.md` - Current state
   - `GOOGLE_TROUBLESHOOTING.md` - User guide
   - Railway logs analysis

3. **Verification**:
   - Test results for all three APIs
   - Token refresh proof (logs)
   - 24-hour stability report

---

## Agent Activation

When activated, this agent will:
1. ✅ Read all Google API route files
2. ✅ Check database token status
3. ✅ Implement token refresh if missing
4. ✅ Add comprehensive error handling
5. ✅ Create test endpoint
6. ✅ Run full integration tests
7. ✅ Generate diagnostic report
8. ✅ Fix all identified issues
9. ✅ Deploy and verify fixes
10. ✅ Create documentation

**Estimated Time**: 30-45 minutes for complete diagnosis and fix

---

## Notes

- Focus on **reliability** over features
- Every API call must handle token expiration
- Logs should be clear and actionable
- User should never see raw OAuth errors
- Test with both Zach and Rebecca accounts
