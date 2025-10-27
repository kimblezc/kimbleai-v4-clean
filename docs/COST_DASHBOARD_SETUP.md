# Cost Dashboard Quick Setup Guide

## Quick Start (5 minutes)

### Step 1: Run Database Migration

Connect to your Supabase database and run the enhancement SQL:

```bash
# Option A: Via psql
psql $DATABASE_URL -f database/model-cost-comparison-enhancement.sql

# Option B: Via Supabase Dashboard
# 1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
# 2. Copy contents of database/model-cost-comparison-enhancement.sql
# 3. Paste and click "Run"
```

### Step 2: Verify Installation

The dependencies (chart.js, react-chartjs-2) are already installed. If needed:

```bash
npm install chart.js react-chartjs-2
```

### Step 3: Access the Dashboard

Navigate to one of these URLs:

- **Model Comparison**: `http://localhost:3000/costs/models`
- **Budget Tracking**: `http://localhost:3000/costs`

Or click the "Model Comparison" button on the main costs page.

## What You Get

### 1. Budget Tracking (`/costs`)
- Hourly, daily, and monthly budget limits
- Real-time usage tracking
- Budget alerts (50%, 75%, 90%, 100%)
- Recent API calls table
- Emergency hard stop at limit

### 2. Model Cost Comparison (`/costs/models`)
- Provider comparison (OpenAI vs Anthropic)
- Cost breakdown by model
- Daily/hourly trends
- Savings opportunities
- Top expensive calls
- Beautiful visualizations

## Key Features

### Provider Analytics
```
╔═══════════════════════════════════╗
║  OpenAI:     $8.50 (69%)          ║
║  Anthropic:  $3.84 (31%)          ║
╚═══════════════════════════════════╝
```

### Savings Insights
```
💡 Save $5.75 (93%) by using GPT-4o-mini instead of GPT-4o
💡 Save $2.20 (73%) by using Claude Haiku instead of Claude Sonnet
```

### Model Breakdown
```
╔═══════════════════════════════════╗
║  GPT-4o:            $6.20         ║
║  Claude Sonnet 4.5: $3.00         ║
║  GPT-4o-mini:       $2.30         ║
║  Claude Haiku 4.5:  $0.84         ║
╚═══════════════════════════════════╝
```

## Configuration

### Set Budget Limits

Edit `.env` or `.env.local`:

```env
# Monthly Limits
MONTHLY_API_BUDGET=500       # $500/month total
MONTHLY_USER_BUDGET=250      # $250/month per user

# Daily Limits (safety net)
DAILY_API_BUDGET=50          # $50/day total
DAILY_USER_BUDGET=25         # $25/day per user

# Hourly Limits (emergency detection)
HOURLY_API_BUDGET=10         # $10/hour

# Hard Stop (ENABLED by default)
HARD_STOP_AT_BUDGET=true     # false to only warn

# Alert Webhooks (optional)
COST_ALERT_EMAIL=your@email.com
COST_ALERT_WEBHOOK=https://hooks.zapier.com/hooks/catch/...
```

### Update Pricing

If model prices change, update `lib/cost-monitor.ts`:

```typescript
export const API_PRICING = {
  'gpt-4o': {
    input: 2.50,   // $ per 1M tokens
    output: 10.00,
  },
  'claude-sonnet-4.5-20250929': {
    input: 3.00,
    output: 15.00,
  },
  // Add new models here
};
```

## Database Schema

The dashboard uses the existing `api_cost_tracking` table with one enhancement:

```sql
-- Added provider field
ALTER TABLE api_cost_tracking ADD COLUMN provider TEXT;

-- Created indexes for performance
CREATE INDEX idx_api_cost_tracking_provider ON api_cost_tracking(provider);
CREATE INDEX idx_api_cost_provider_time ON api_cost_tracking(provider, timestamp DESC);

-- Auto-populated provider based on model name
UPDATE api_cost_tracking SET provider =
  CASE
    WHEN model LIKE 'gpt%' THEN 'openai'
    WHEN model LIKE 'claude%' THEN 'anthropic'
    ELSE 'other'
  END
WHERE provider IS NULL;
```

## API Integration

### Track API Calls Automatically

The cost monitor is already integrated. Every API call should include:

```typescript
import { costMonitor } from '@/lib/cost-monitor';

// In your API route
await costMonitor.trackAPICall({
  user_id: userId,
  model: 'gpt-4o',
  endpoint: '/api/chat',
  input_tokens: 1500,
  output_tokens: 800,
  cost_usd: 0.0325,
  timestamp: new Date().toISOString(),
  metadata: { conversation_id: 'conv_123' }
});
```

### Check Budget Before API Calls

```typescript
// Enforce budget limits
const budgetCheck = await costMonitor.enforceApiCallBudget(userId, '/api/chat');

if (!budgetCheck.allowed) {
  return NextResponse.json(
    { error: 'Budget limit exceeded', reason: budgetCheck.reason },
    { status: 429 }
  );
}
```

## Usage Tips

### 1. Choose the Right Model

| Task Complexity | OpenAI Model | Anthropic Model | Cost |
|----------------|--------------|-----------------|------|
| Simple queries | GPT-4o-mini | Claude Haiku | $ |
| Standard tasks | GPT-4o | Claude Sonnet | $$ |
| Complex analysis | GPT-4o | Claude Opus | $$$ |

### 2. Monitor Regularly

- **Daily**: Check for unusual spikes
- **Weekly**: Review savings opportunities
- **Monthly**: Analyze trends and adjust budgets

### 3. Optimize Costs

- Use cheaper models for simple tasks
- Implement prompt caching where possible
- Reduce token usage with concise prompts
- Batch similar requests together

### 4. Set Alerts

The system automatically sends alerts at:
- 50% budget usage (warning)
- 75% budget usage (warning)
- 90% budget usage (critical)
- 100% budget usage (emergency)

Configure webhooks for Slack/Discord/Email notifications.

## Troubleshooting

### Dashboard shows $0.00

**Problem**: No API calls tracked yet, or tracking is disabled.

**Solution**:
1. Make some API calls to chat/code endpoints
2. Verify `costMonitor.trackAPICall()` is being called
3. Check Supabase `api_cost_tracking` table has data

### Charts not appearing

**Problem**: Chart.js not loaded or React error.

**Solution**:
1. Check browser console for errors
2. Reinstall: `npm install chart.js react-chartjs-2`
3. Clear Next.js cache: `rm -rf .next && npm run build`

### Provider showing as "unknown"

**Problem**: Provider field not populated.

**Solution**:
Run the SQL update in Supabase:
```sql
UPDATE api_cost_tracking
SET provider = CASE
  WHEN model LIKE 'gpt%' THEN 'openai'
  WHEN model LIKE 'claude%' THEN 'anthropic'
  ELSE 'other'
END
WHERE provider IS NULL OR provider = 'unknown';
```

### Budget not enforcing

**Problem**: `HARD_STOP_AT_BUDGET` is disabled.

**Solution**:
Set in `.env.local`:
```env
HARD_STOP_AT_BUDGET=true
```

## File Locations

```
kimbleai-v4-clean/
├── app/
│   ├── costs/
│   │   ├── page.tsx              # Budget tracking dashboard
│   │   └── models/
│   │       └── page.tsx          # Model comparison dashboard ⭐
│   └── api/
│       └── costs/
│           ├── route.ts          # Budget API
│           └── models/
│               └── route.ts      # Model comparison API ⭐
├── database/
│   ├── api-cost-tracking.sql    # Original schema
│   └── model-cost-comparison-enhancement.sql  # New enhancement ⭐
├── lib/
│   └── cost-monitor.ts           # Cost tracking logic
└── docs/
    ├── MODEL_COST_DASHBOARD.md   # Full documentation ⭐
    └── COST_DASHBOARD_SETUP.md   # This file ⭐
```

## Next Steps

1. ✅ Run database migration
2. ✅ Access `/costs/models` dashboard
3. ✅ Review current spending
4. ✅ Identify savings opportunities
5. ✅ Optimize model usage
6. ✅ Set budget alerts
7. ✅ Monitor weekly

## Support

Need help? Check these resources:

1. **Full Documentation**: `docs/MODEL_COST_DASHBOARD.md`
2. **Cost Monitor Code**: `lib/cost-monitor.ts`
3. **API Routes**: `app/api/costs/models/route.ts`
4. **Database Schema**: `database/model-cost-comparison-enhancement.sql`

---

**Ready to save money on AI costs?** Head to `/costs/models` and start exploring!
