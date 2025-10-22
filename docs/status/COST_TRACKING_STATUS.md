# Cost Tracking Investigation

## Current Status

### ✅ What's Implemented

1. **Cost Monitor System** (`lib/cost-monitor.ts`)
   - Properly configured with all model pricing
   - Budget limits set ($500/month, $25/day per user)
   - Alert thresholds at 50%, 75%, 90%, 100%

2. **Cost Tracking in Chat API** (`app/api/chat/route.ts:742-761`)
   ```typescript
   // This code DOES run after every chat completion
   const cost = costMonitor.calculateCost(selectedModel.model, inputTokens, outputTokens);
   await costMonitor.trackAPICall({
     user_id: userData.id,
     model: selectedModel.model,
     endpoint: '/api/chat',
     input_tokens: inputTokens,
     output_tokens: outputTokens,
     cost_usd: cost,
     // ...
   });
   ```

3. **Cost API** (`app/api/costs/route.ts`)
   - Summary endpoint exists
   - Returns daily/monthly/hourly stats
   - Requires userId parameter

### ⚠️ Why Dashboard Shows $0

**Main Page Cost Fetching** (`app/page.tsx:125-146`)
```typescript
// Tries to get user ID first
const userResponse = await fetch(`/api/users?email=${session.user.email}`);
const userData = await userResponse.json();
if (!userData.success || !userData.user?.id) return; // ← May be failing here

// Then fetches costs for that user
const response = await fetch(`/api/costs?action=summary&userId=${userData.user.id}`);
```

**Possible Issues:**
1. `/api/users` endpoint may not be returning user ID correctly
2. User email in session doesn't match email in database
3. Costs are being tracked but under wrong user ID
4. Database query failing silently

## Recommended Fixes

### Fix #1: Add Debug Logging

Add to `app/page.tsx` around line 128:

```typescript
const userResponse = await fetch(`/api/users?email=${encodeURIComponent(session.user.email)}`);
const userData = await userResponse.json();
console.log('[CostDebug] User lookup:', {
  email: session.user.email,
  userData
});

if (!userData.success || !userData.user?.id) {
  console.error('[CostDebug] Failed to get user ID');
  return;
}

const response = await fetch(`/api/costs?action=summary&userId=${userData.user.id}`);
const data = await response.json();
console.log('[CostDebug] Cost data:', data);
```

### Fix #2: Check Database Directly

Run this to verify costs are being tracked:

```sql
-- Check if costs exist
SELECT COUNT(*) as total_costs FROM api_cost_tracking;

-- Check recent costs
SELECT
  timestamp,
  user_id,
  model,
  cost_usd,
  input_tokens,
  output_tokens
FROM api_cost_tracking
ORDER BY timestamp DESC
LIMIT 10;

-- Check users table
SELECT id, email, name FROM users;
```

### Fix #3: Verify User ID Match

The chat API gets userId from request body (default: 'zach'):
```typescript
const { messages, userId = 'zach', conversationId = 'default' } = requestData;
```

But the dashboard looks up user by email. These might not match.

**Solution:** Ensure the userId sent in chat requests matches the user ID in the users table.

## Quick Test

1. Open browser console on main page
2. Look for `[CostDebug]` logs
3. Check if user ID is found
4. Check if cost data is returned

If user ID is null/undefined → Fix `/api/users` endpoint
If cost data is empty → Costs aren't being tracked OR user ID mismatch
