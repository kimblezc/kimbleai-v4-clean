# Cost Tracking Agent - Comprehensive Specification

**Agent Name**: Cost Tracker 💰
**Status**: ✅ Active
**Purpose**: Monitor, analyze, and report API usage costs with budget enforcement and savings recommendations

---

## Overview

The Cost Tracking Agent is a comprehensive autonomous system that monitors all API usage across KimbleAI, tracks costs in real-time, enforces budget limits, and provides actionable insights for cost optimization.

**Philosophy**: "If you can't measure it, you can't manage it."

---

## Core Capabilities

### 1. Real-Time Cost Tracking
- **Tracks every API call** across all providers (OpenAI, Anthropic, Google, AssemblyAI)
- **Token-level precision** - Input/output tokens counted separately
- **Multi-model pricing** - GPT-5, GPT-4o, Claude Sonnet 4.5, Claude Haiku, etc.
- **Automatic cost calculation** using current provider pricing
- **Database persistence** - All calls logged to `api_cost_tracking` table

### 2. Budget Enforcement
- **Three-tier budget system**:
  - **Hourly**: $10 system-wide hard limit
  - **Daily**: $25 per user limit
  - **Monthly**: $500 system-wide limit
- **Alert thresholds**: 50%, 75%, 90%, 100%
- **Hard stop mode**: Emergency shutoff when limits exceeded
- **Email alerts**: Via Zapier webhook when thresholds hit
- **Budget recommendations**: Suggests adjustments based on usage patterns

### 3. Cost Analytics
- **Usage trends**: Hourly, daily, monthly breakdowns
- **Model comparison**: Cost by provider and model
- **Savings opportunities**: Identifies expensive patterns (e.g., GPT-4o → GPT-4o-mini)
- **Top spenders**: Conversation-level cost analysis
- **Provider breakdown**: OpenAI vs Anthropic vs Google costs
- **Historical trends**: 12-month spending history

### 4. Autonomous Monitoring
- **Auto-refresh**: Dashboard updates every 30 seconds
- **Proactive alerts**: Warns before budget limits hit
- **Smart recommendations**: Suggests cheaper models for simple tasks
- **Trend analysis**: Detects unusual spending patterns
- **ROI tracking**: Cost per conversation, cost per feature

---

## Implementation Architecture

### Backend Components

**`lib/cost-monitor.ts`** (756 lines) - Core monitoring system
```typescript
// Key functions:
- trackAPICall(userId, model, endpoint, tokens, cost)
- calculateCost(model, inputTokens, outputTokens)
- checkBudgetLimits(userId)
- enforceApiCallBudget(userId, estimatedCost)
- getUsageAnalytics(userId, timeRange)
```

**Pricing Configuration**:
```typescript
const PRICING = {
  // OpenAI
  'gpt-5': { input: 0.000075, output: 0.0003 },
  'gpt-4o': { input: 0.0000025, output: 0.00001 },
  'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },

  // Anthropic
  'claude-sonnet-4-5': { input: 0.000003, output: 0.000015 },
  'claude-opus-4': { input: 0.000015, output: 0.000075 },
  'claude-haiku-3-5': { input: 0.0000008, output: 0.000004 },

  // Google
  'gemini-2.0-flash-exp': { input: 0.0, output: 0.0 },

  // Audio
  'assemblyai-universal-2': { per_minute: 0.0037 },
};
```

**Budget Limits**:
```typescript
const BUDGET_LIMITS = {
  hourly: 10.00,      // $10/hour system-wide
  daily: 25.00,       // $25/day per user
  monthly: 500.00,    // $500/month system-wide
};
```

### API Endpoints

**`/api/costs`** - Main cost analytics endpoint
- **Actions**:
  - `summary` - Hourly/daily/monthly budget status
  - `analytics` - Detailed usage breakdown
  - `budget` - Budget configuration and recommendations
  - `alerts` - Budget alert history

**`/api/costs/models`** - Model comparison data
- Provider-level grouping (OpenAI, Anthropic, Google)
- Model-level breakdown with token counts
- Daily/hourly cost trends
- Savings opportunity calculations

### Database Schema

**Tables**:
1. **`api_cost_tracking`** - Main tracking table
   ```sql
   - id (uuid)
   - user_id (uuid, FK to users)
   - model (text)
   - provider (text) - OpenAI/Anthropic/Google/AssemblyAI
   - endpoint (text)
   - input_tokens (int)
   - output_tokens (int)
   - cost (numeric)
   - timestamp (timestamptz)
   ```

2. **`budget_alerts`** - Alert history
   ```sql
   - id (uuid)
   - user_id (uuid)
   - alert_type (text) - warning/critical/emergency
   - threshold (numeric)
   - current_usage (numeric)
   - message (text)
   - timestamp (timestamptz)
   ```

3. **`budget_config`** - Per-user budget settings
   ```sql
   - user_id (uuid, PK)
   - daily_limit (numeric)
   - monthly_limit (numeric)
   - alert_at_50_percent (boolean)
   - alert_at_75_percent (boolean)
   - alert_at_90_percent (boolean)
   ```

**Views** (Materialized for performance):
- `daily_cost_summary` - Daily rollups
- `monthly_cost_summary` - Monthly totals
- `cost_by_model` - Grouped by model
- `cost_by_provider` - Grouped by provider
- `hourly_cost_trend` - Last 24 hours
- `most_expensive_conversations` - Top costly chats

**Functions**:
- `get_spending_since(user_id, since_timestamp)` - Usage since time
- `get_monthly_spending(user_id)` - Current month total
- `get_daily_spending(user_id)` - Today's total
- `get_top_expensive_calls(user_id, limit)` - Most costly calls
- `calculate_potential_savings(user_id)` - Model swap savings

### Frontend Dashboards

**`/costs`** - Main dashboard (304 lines)
- **Real-time stats**: Hourly/daily/monthly usage with progress bars
- **Recent calls table**: Last 50 API calls with model, tokens, cost
- **Budget alerts**: Color-coded warnings (green/blue/yellow/red)
- **Auto-refresh**: Updates every 30 seconds
- **Responsive design**: Mobile-optimized

**`/costs/models`** - Analytics dashboard (514 lines)
- **Charts**:
  - Doughnut chart: Cost by provider
  - Bar chart: Cost by model
  - Line chart: Daily cost trend (7/30/90 days)
- **Savings opportunities**: Lists potential optimizations
- **Provider breakdown**: OpenAI vs Anthropic vs Google
- **Top expensive calls**: Most costly API calls
- **Time range selector**: 7/30/90 day views

---

## Integration Points

### Chat API Integration
**`app/api/chat/route.ts`** (lines 742-761)
```typescript
// After every chat completion
await costMonitor.trackAPICall(
  userId,
  model,
  '/api/chat',
  {
    input: promptTokens,
    output: completionTokens,
  },
  cost
);
```

### Transcription API Integration
**`app/api/transcribe/assemblyai/route.ts`**
```typescript
// Track audio transcription costs
await costMonitor.trackAPICall(
  userId,
  'assemblyai-universal-2',
  '/api/transcribe/assemblyai',
  { input: 0, output: durationMinutes },
  cost
);
```

### OpenAI Wrapper
**`lib/openai-cost-wrapper.ts`**
- Wraps all OpenAI API calls
- Automatically calculates and logs costs
- Enforces budget limits before API calls

---

## Alert System

### Email Alerts (via Zapier)
Triggered when budget thresholds hit:
- **50% warning**: "You've used 50% of your daily budget"
- **75% warning**: "You've used 75% of your daily budget - consider reviewing usage"
- **90% critical**: "You've used 90% of your daily budget - approaching limit"
- **100% emergency**: "Budget limit reached - API calls blocked until reset"

### Webhook Payload
```json
{
  "alert_type": "warning|critical|emergency",
  "threshold": 50|75|90|100,
  "current_usage": 18.75,
  "limit": 25.00,
  "percentage": 75,
  "user_email": "user@example.com",
  "timestamp": "2025-11-12T14:30:00Z"
}
```

---

## Savings Recommendations

### Model Swap Opportunities
```typescript
// Example output:
{
  "potential_savings": 127.50,
  "recommendations": [
    {
      "current_model": "gpt-4o",
      "suggested_model": "gpt-4o-mini",
      "current_cost": 150.00,
      "suggested_cost": 22.50,
      "savings": 127.50,
      "use_cases": "Simple queries, quick responses, non-critical tasks"
    },
    {
      "current_model": "claude-sonnet-4-5",
      "suggested_model": "claude-haiku-3-5",
      "current_cost": 85.00,
      "suggested_cost": 17.00,
      "savings": 68.00,
      "use_cases": "Fast responses, simple analysis, code formatting"
    }
  ]
}
```

### Task Complexity Analysis
Automatically recommends cheaper models for:
- **Simple tasks**: GPT-4o-mini, Claude Haiku
- **Medium tasks**: GPT-4o, Claude Sonnet
- **Complex tasks**: GPT-5, Claude Opus

---

## Monitoring & Access

### Dashboard Access
- **Main dashboard**: https://www.kimbleai.com/costs
- **Analytics dashboard**: https://www.kimbleai.com/costs/models
- **Sidebar button**: 💰 "Costs" button in navigation

### Manual Queries
```sql
-- Check current spending
SELECT
  DATE_TRUNC('day', timestamp) as day,
  SUM(cost) as total_cost,
  COUNT(*) as call_count
FROM api_cost_tracking
WHERE user_id = 'your-user-id'
GROUP BY day
ORDER BY day DESC
LIMIT 30;

-- Find most expensive calls
SELECT
  model,
  endpoint,
  input_tokens + output_tokens as total_tokens,
  cost,
  timestamp
FROM api_cost_tracking
WHERE user_id = 'your-user-id'
ORDER BY cost DESC
LIMIT 20;

-- Provider breakdown
SELECT
  provider,
  COUNT(*) as calls,
  SUM(cost) as total_cost,
  AVG(cost) as avg_cost
FROM api_cost_tracking
WHERE user_id = 'your-user-id'
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY provider
ORDER BY total_cost DESC;
```

---

## Safety Features

1. **Hard budget limits** - API calls blocked when limit hit
2. **Rate limiting** - Max calls per minute per user
3. **Cost estimation** - Checks budget before expensive calls
4. **Automatic rollback** - Reverts failed budget updates
5. **Audit trail** - Every cost tracked in database
6. **User isolation** - RLS policies prevent cross-user data access
7. **Email alerts** - Proactive warnings before limits hit

---

## Usage Scenarios

### Scenario 1: Developer Testing
- **Problem**: Accidentally ran 1000 API calls in a loop
- **Solution**: Hourly limit ($10) hit after ~500 calls, system auto-stopped
- **Alert**: Email sent with "Emergency: Hourly budget exceeded"
- **Result**: Prevented $200+ in unexpected costs

### Scenario 2: Model Selection
- **Problem**: Using GPT-4o for simple queries
- **Insight**: Dashboard shows 80% of queries could use GPT-4o-mini
- **Action**: Switch simple queries to mini model
- **Result**: 85% cost reduction on those queries ($150 → $22.50/month)

### Scenario 3: Budget Planning
- **Problem**: Need to forecast next month's costs
- **Solution**: Use 12-month trend chart to see patterns
- **Insight**: Costs spike on Mondays (project kickoffs)
- **Action**: Adjust budget allocation, pre-approve Monday spending
- **Result**: Better budget predictability

---

## Minimalist Widget (Main Page)

### Design Specification
Location: Top-right corner of chat interface, next to user avatar

**Components**:
```
┌─────────────────────────┐
│ 💰 $12.45 / $25.00     │ ← Daily spending
│ ▓▓▓▓▓▓░░░░ 49%         │ ← Progress bar
│ ⚡ Low | 📊 Details     │ ← Status + Link
└─────────────────────────┘
```

**Color Coding**:
- **Green** (0-50%): "Low" - Safe usage
- **Blue** (50-75%): "Moderate" - Normal usage
- **Yellow** (75-90%): "High" - Approaching limit
- **Red** (90-100%): "Critical" - Near/at limit

**Click Behavior**:
- Widget expands to show hourly/daily/monthly breakdown
- "Details" link → `/costs` full dashboard

**Auto-refresh**: Every 30 seconds (matches main dashboard)

---

## Future Enhancements

### Planned Features
1. **Cost prediction**: ML model to forecast next month's costs
2. **Anomaly detection**: Auto-detect unusual spending patterns
3. **Budget optimization**: AI suggests optimal budget allocation
4. **Team budgets**: Per-project or per-team budget limits
5. **Cost attribution**: Tag API calls by feature/project
6. **Export reports**: PDF/CSV monthly cost reports
7. **Slack integration**: Budget alerts via Slack webhooks
8. **Custom thresholds**: User-configurable alert levels

### Under Consideration
- **Cost-based rate limiting**: Slower for expensive models
- **Prepaid credits**: Buy API credits in advance
- **Volume discounts**: Lower rates for high-volume users
- **Smart model routing**: Auto-select cheapest model for task
- **A/B cost testing**: Compare costs of different models

---

## Documentation & Support

### Files
- `COST_TRACKING_AGENT.md` - This document
- `ARCHIE.md` - Archie agent (code maintenance)
- `GUARDIAN.md` - Guardian agent (data integrity)
- `CLAUDE.md` - Main project rules (includes cost tracking section)

### Troubleshooting

**Dashboard shows $0**:
1. Check user ID lookup (see `COST_TRACKING_STATUS.md`)
2. Verify `api_cost_tracking` has data: `SELECT COUNT(*) FROM api_cost_tracking;`
3. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'api_cost_tracking';`
4. Run migration: `database/fix-cost-tracking-user-id-CORRECTED.sql`

**Alerts not sending**:
1. Verify Zapier webhook URL in `.env`
2. Check webhook secret matches
3. Test webhook: `curl -X POST $ZAPIER_WEBHOOK_URL -d '{"test": true}'`
4. Review `budget_alerts` table for alert history

**Budget limits not enforcing**:
1. Check `HARD_STOP_AT_LIMIT` in `lib/cost-monitor.ts`
2. Verify `enforceApiCallBudget()` is called before API calls
3. Review `budget_config` table for user settings

---

## Comparison: Cost Tracker vs Archie vs Guardian

| Feature | Cost Tracker 💰 | Archie 🦉 | Guardian 🛡️ |
|---------|-----------------|-----------|-------------|
| **Focus** | API cost monitoring | Code quality | Data integrity |
| **Runs** | Real-time (every API call) | Every hour | Every 6 hours |
| **Auto-fixes** | Budget alerts, auto-stop | Lint, dead code, types | Duplicates, orphans |
| **Scope** | API costs + budgets | Source files | Database + APIs |
| **Dashboard** | /costs, /costs/models | /agent | /guardian |
| **Git commits** | ❌ No | ✅ Yes | ✅ Yes |
| **Alerts** | ✅ Email + Webhook | ❌ No | ✅ Git commits |
| **User-facing** | ✅ Yes (widget + dashboard) | ❌ No (admin only) | ❌ No (admin only) |

---

## Success Metrics

**Current Status** (as of v8.8.0):
- ✅ Real-time cost tracking across all providers
- ✅ Budget enforcement with hard limits
- ✅ Two dashboards (main + analytics)
- ✅ Email alerts via Zapier
- ✅ Model comparison and savings recommendations
- ✅ 10+ database views for fast queries
- ✅ Mobile-responsive design

**Needs**:
- ⚠️ Sidebar navigation button (not linked)
- ⚠️ Minimalist widget for main page (not created)
- ⚠️ User ID lookup fix (dashboard may show $0)

---

## Conclusion

The Cost Tracking Agent is a **fully implemented, production-ready** system that provides comprehensive API cost monitoring, budget enforcement, and actionable insights. It integrates seamlessly with all KimbleAI APIs and provides both detailed analytics dashboards and (planned) a minimalist main-page widget.

**Philosophy**: "Know your costs, control your spend, optimize relentlessly."

---

**Version**: v8.8.0
**Last Updated**: 2025-11-12
**Status**: ✅ Active (needs sidebar link + minimalist widget)
**Maintainer**: Zach Kimble
