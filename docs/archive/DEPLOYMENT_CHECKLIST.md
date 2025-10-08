# Cost Monitoring Deployment Checklist

## Pre-Deployment (5 minutes)

### 1. Database Migration
- [ ] Open Supabase Dashboard: https://supabase.com/dashboard/project/gbmefnaqsxtoseufjixp/sql
- [ ] Copy contents of `database/api-cost-tracking.sql`
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Verify success message
- [ ] Check tables created: `api_cost_tracking`, `budget_alerts`, `budget_config`

### 2. Environment Variables (Already Set in .env.local)
```env
DAILY_API_BUDGET=50.00
DAILY_USER_BUDGET=25.00
MONTHLY_API_BUDGET=500.00
MONTHLY_USER_BUDGET=250.00
HOURLY_API_BUDGET=10.00
HARD_STOP_AT_BUDGET=true
COST_ALERT_EMAIL=zach.kimble@gmail.com
```

### 3. Verify Code Changes
- [ ] `lib/cost-monitor.ts` - Hard limits enabled
- [ ] `app/api/chat/route.ts` - Cost tracking added
- [ ] `app/api/transcribe/assemblyai/route.ts` - Cost tracking added
- [ ] `.env.local` - Budget limits configured

---

## Deployment (2 minutes)

### Option A: Via Vercel Dashboard
1. [ ] Go to https://vercel.com/dashboard
2. [ ] Select kimbleai-v4 project
3. [ ] Click "Settings" → "Environment Variables"
4. [ ] Add variables from .env.local (if not already synced)
5. [ ] Go to "Deployments" tab
6. [ ] Click "Redeploy" on latest deployment

### Option B: Via Git Push
```bash
git add .
git commit -m "feat: Add comprehensive cost monitoring with hard limits"
git push origin main
```

### Option C: Via Vercel CLI
```bash
vercel --prod
```

---

## Post-Deployment Verification (3 minutes)

### 1. Check API Health
```bash
curl https://kimbleai.com/api/costs
```
**Expected**: JSON response with service info

### 2. Check Budget Status
```bash
curl "https://kimbleai.com/api/costs?action=summary&userId=zach"
```
**Expected**: Current spending, limits, and budget status

### 3. Test Chat API (with tracking)
```bash
curl -X POST https://kimbleai.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "userId": "zach"
  }'
```
**Expected**: Normal response + cost logged in database

### 4. Verify Database Tracking
- [ ] Open Supabase Dashboard
- [ ] Go to Table Editor
- [ ] Open `api_cost_tracking` table
- [ ] Verify recent entries exist
- [ ] Check cost_usd values are reasonable

---

## Testing (5 minutes)

### Run Test Suite
```bash
npx ts-node scripts/test-cost-limits.ts
```

**Expected Results**:
- ✅ Test 1: Initial budget status (healthy)
- ✅ Test 2: Moderate spending (50% threshold)
- ✅ Test 3: High spending (90% threshold)
- ✅ Test 4: Hard stop enabled verification
- ✅ Test 5: Over-limit blocking works
- ✅ Test 6: Cost calculations accurate
- ✅ Test 7: Analytics working

### Manual Test: Budget Block
1. Set a very low limit temporarily: `DAILY_API_BUDGET=0.01`
2. Try to make API call
3. **Expected**: Error 429 "Daily spending limit reached"
4. Restore normal limit: `DAILY_API_BUDGET=50.00`

---

## Monitoring Setup (Optional)

### 1. Set Up Alert Webhook
- [ ] Create Zapier zap to send emails
- [ ] Set webhook URL in environment: `COST_ALERT_WEBHOOK=https://...`
- [ ] Test by triggering 50% threshold

### 2. Add Dashboard to Bookmarks
- [ ] https://kimbleai.com/api/costs?action=summary
- [ ] https://kimbleai.com/api/costs?action=analytics&days=7

### 3. Schedule Daily Check
- [ ] Add calendar reminder to review costs
- [ ] Check for unusual spending patterns
- [ ] Review top expensive calls

---

## Rollback Plan (Emergency)

### If something goes wrong:

#### 1. Disable Hard Stop (allows API calls again)
```bash
# Via Vercel dashboard
HARD_STOP_AT_BUDGET=false

# Or in .env.local
HARD_STOP_AT_BUDGET=false

# Redeploy
vercel --prod
```

#### 2. Increase Limits Temporarily
```bash
DAILY_API_BUDGET=100.00
MONTHLY_API_BUDGET=1000.00
```

#### 3. Revert Code Changes
```bash
git revert HEAD
git push origin main
```

---

## Success Criteria

### ✅ Deployment Successful If:
1. Database migration ran without errors
2. `/api/costs` endpoint returns data
3. Chat API calls are tracked in database
4. Cost calculations are accurate (within 1%)
5. Budget limits block calls when exceeded
6. Email alerts configured (optional)

### ⚠️  Warning Signs:
- Costs not being tracked in database
- API calls allowed beyond limit
- Incorrect cost calculations
- Database connection errors

### 🚨 Critical Issues:
- All API calls blocked (check limits are reasonable)
- Database migration failed (check Supabase logs)
- Environment variables not set (check Vercel dashboard)

---

## Quick Reference

### Current Limits
| Limit | Value | Purpose |
|-------|-------|---------|
| Hourly | $10 | Emergency detection (infinite loops) |
| Daily | $50 | Primary safety net |
| Monthly | $500 | Budget control |
| Per User Daily | $25 | User-specific limits |
| Per User Monthly | $250 | User budget allocation |

### Alert Thresholds
| Threshold | Action | Email |
|-----------|--------|-------|
| 50% | Warning | ⚠️ Yes |
| 75% | Warning | ⚠️ Yes |
| 90% | Critical | 🚨 Yes |
| 100% | BLOCKED | 🔴 Yes |

### API Routes Tracked
| Route | Status | Cost Model |
|-------|--------|-----------|
| `/api/chat` | ✅ Live | Token-based |
| `/api/transcribe/assemblyai` | ✅ Live | Per-hour |
| `/api/costs` | ✅ Live | N/A (free) |
| `/api/google/*` | 🔲 Pending | Per-request |
| `/api/knowledge/*` | 🔲 Pending | Token-based |

---

## Support

### Need Help?
- **Documentation**: `COST_MONITORING_IMPLEMENTATION.md`
- **Test Script**: `scripts/test-cost-limits.ts`
- **Email**: zach.kimble@gmail.com

### Common Commands
```bash
# Check current spending
curl "https://kimbleai.com/api/costs?action=summary&userId=zach"

# View analytics
curl "https://kimbleai.com/api/costs?action=analytics&days=30"

# Check budget status
curl "https://kimbleai.com/api/costs?action=budget&userId=zach"

# Run tests
npx ts-node scripts/test-cost-limits.ts
```

---

**FINAL CHECK**: Hard stop is ENABLED by default. This will BLOCK API calls at budget limit.
**Estimated deployment time**: 15 minutes total
**Protection level**: 🟢 MAXIMUM (prevents $600+ bills)
