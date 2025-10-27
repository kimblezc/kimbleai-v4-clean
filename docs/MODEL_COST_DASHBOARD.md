# AI Model Cost Comparison Dashboard

## Overview

The Model Cost Comparison Dashboard provides comprehensive analytics for tracking and comparing AI model costs across multiple providers (OpenAI, Anthropic, Google, etc.). This dashboard helps you understand spending patterns, identify cost-saving opportunities, and make data-driven decisions about which models to use.

## Features

### 1. Provider Comparison
- **Visual breakdown** of costs by provider (OpenAI, Anthropic, etc.)
- **Percentage distribution** showing which providers you spend the most on
- **Interactive pie chart** for easy visualization

### 2. Model-Level Analytics
- **Cost breakdown by specific models** (GPT-4o, Claude Sonnet, etc.)
- **Token usage statistics** (input/output tokens per model)
- **Average cost per API call** for each model
- **Bar chart visualization** of top 8 most expensive models

### 3. Time-Based Trends
- **Daily cost trends** over customizable time periods (7, 30, or 90 days)
- **Hourly cost tracking** for the last 24 hours
- **Multi-provider line chart** showing cost evolution over time

### 4. Savings Insights
- **Automated recommendations** for cost optimization
- **Potential savings calculations** if switching to cheaper models:
  - GPT-4o → GPT-4o-mini
  - Claude Sonnet → Claude Haiku
  - Cross-provider comparisons
- **Percentage savings** and dollar amounts clearly displayed

### 5. Top Expensive Calls
- **Detailed table** of the 10 most expensive API calls
- **Token counts** and exact costs for each call
- **Timestamp tracking** to identify when expensive calls occur
- **Endpoint visibility** to understand which features cost the most

### 6. Provider Deep Dive
- **Detailed cards** for each provider showing:
  - Total cost and call count
  - Average cost per call
  - Input/output token totals
  - List of models used
  - Color-coded for easy identification

## Database Schema

### Enhancement: Provider Field

The dashboard uses an enhanced version of the `api_cost_tracking` table with an added `provider` field:

```sql
-- Run this migration first
-- File: database/model-cost-comparison-enhancement.sql

ALTER TABLE api_cost_tracking ADD COLUMN IF NOT EXISTS provider TEXT;
CREATE INDEX IF NOT EXISTS idx_api_cost_tracking_provider ON api_cost_tracking(provider);
```

### Views Created

The migration creates several optimized views:

1. **cost_by_provider** - Aggregated costs by provider (last 30 days)
2. **cost_by_provider_model** - Costs grouped by provider and model
3. **daily_cost_by_provider** - Daily cost breakdown
4. **hourly_cost_trend** - Hourly trends (last 24 hours)
5. **most_expensive_conversations** - Most costly conversations
6. **monthly_spending_trend** - 12-month spending trends
7. **user_spending_leaderboard** - Top spenders by user

### Helper Functions

- `calculate_potential_savings()` - Calculates savings if switching models
- Auto-updates existing records to set provider based on model name

## API Endpoints

### GET /api/costs/models

Fetches comprehensive model cost data.

**Query Parameters:**
- `userId` (optional) - Filter by specific user
- `days` (default: 30) - Number of days to look back (7, 30, or 90)
- `groupBy` (default: 'provider') - Grouping method

**Response Format:**
```json
{
  "totalCost": 12.34,
  "totalCalls": 1523,
  "byProvider": {
    "openai": {
      "totalCost": 8.50,
      "totalCalls": 982,
      "avgCost": 0.0087,
      "models": ["gpt-4o", "gpt-4o-mini"],
      "inputTokens": 245000,
      "outputTokens": 89000
    },
    "anthropic": {
      "totalCost": 3.84,
      "totalCalls": 541,
      "avgCost": 0.0071,
      "models": ["claude-sonnet-4.5-20250929", "claude-3-haiku-20240307"],
      "inputTokens": 180000,
      "outputTokens": 65000
    }
  },
  "byModel": { /* ... */ },
  "byDay": [ /* ... */ ],
  "byHour": [ /* ... */ ],
  "topExpensive": [ /* ... */ ],
  "savings": [
    {
      "description": "Using GPT-4o-mini instead of GPT-4o",
      "actualCost": 6.20,
      "potentialCost": 0.45,
      "savings": 5.75,
      "percentage": 92.7
    }
  ],
  "summary": {
    "openai": { "cost": 8.50, "calls": 982, "percentage": 68.9 },
    "anthropic": { "cost": 3.84, "calls": 541, "percentage": 31.1 },
    "other": { "cost": 0, "calls": 0, "percentage": 0 }
  }
}
```

## Installation & Setup

### 1. Run Database Migration

```bash
# Connect to your Supabase database and run:
psql $DATABASE_URL -f database/model-cost-comparison-enhancement.sql
```

Or through Supabase SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Open `database/model-cost-comparison-enhancement.sql`
3. Run the SQL script

### 2. Install Chart.js Dependencies

```bash
npm install chart.js react-chartjs-2
```

### 3. Access the Dashboard

Navigate to: `https://your-domain.com/costs/models`

Or click the "Model Comparison" button on the main `/costs` page.

## Usage Guide

### Viewing Different Time Ranges

Use the dropdown at the top right to switch between:
- **Last 7 days** - Recent activity and trends
- **Last 30 days** - Monthly overview (default)
- **Last 90 days** - Quarterly analysis

### Understanding the Summary Cards

**Total Spent**: Overall cost for the selected time period

**OpenAI / Anthropic Breakdown**:
- Dollar amount spent
- Percentage of total costs
- Helps identify which provider you rely on most

**Total API Calls**: Total number of API requests made

**Avg Cost/Call**: Average cost per API call (helps identify expensive operations)

### Interpreting Charts

**Cost by Provider (Pie Chart)**:
- Hover over segments to see exact dollar amounts
- Larger segments = higher costs
- Colors: OpenAI (green), Anthropic (purple), Google (blue), etc.

**Cost by Model (Bar Chart)**:
- Shows top 8 most expensive models
- Color-coded by provider
- Hover for exact costs

**Daily Cost Trend (Line Chart)**:
- Multi-line chart showing each provider over time
- Identifies spending spikes
- Helps predict future costs

### Acting on Savings Insights

The dashboard automatically calculates potential savings:

1. **Review the green "Savings Opportunities" section**
2. **Identify high-savings recommendations** (e.g., "Save $5.75 by switching")
3. **Evaluate if the cheaper model meets your needs**:
   - GPT-4o-mini: Great for simple tasks, 94% cheaper
   - Claude Haiku: Fast and affordable, good for basic queries
4. **Update your application code** to use the recommended model
5. **Monitor the dashboard** to verify cost reductions

### Analyzing Top Expensive Calls

The "Most Expensive API Calls" table helps you:

1. **Identify cost outliers** - Calls that cost significantly more than average
2. **Find which endpoints** are most expensive (e.g., `/api/chat`, `/api/code`)
3. **Determine optimal models** for different use cases
4. **Optimize token usage** by seeing input/output token patterns

## Design Theme

The dashboard uses a **Dark D&D Theme** with:
- **Background**: Deep purple-black gradient (#1a0a2e → #0f0618)
- **Primary accent**: Purple-indigo gradient (#667eea → #764ba2)
- **Provider colors**:
  - OpenAI: Emerald (#10b981)
  - Anthropic: Purple (#8b5cf6)
  - Google: Blue (#3b82f6)
  - AssemblyAI: Amber (#f59e0b)
  - Other: Gray (#6b7280)
- **Cards**: Dark gradient with subtle shadows
- **Borders**: Color-coded by provider for easy scanning

## Best Practices

### 1. Regular Monitoring
- Check the dashboard **weekly** to stay on top of costs
- Set calendar reminders for monthly cost reviews
- Compare month-over-month trends

### 2. Cost Optimization Strategy
- Use **expensive models** (GPT-4o, Claude Opus) only when necessary
- Default to **mid-tier models** (Claude Sonnet) for most tasks
- Use **cheap models** (GPT-4o-mini, Claude Haiku) for simple operations
- Implement **model routing** based on task complexity

### 3. Budget Alerts
- Combine with the main `/costs` page for budget tracking
- Set up alert thresholds in `lib/cost-monitor.ts`
- Enable `HARD_STOP_AT_LIMIT` to prevent cost overruns

### 4. Team Visibility
- Share dashboard access with your team
- Discuss cost-saving opportunities in team meetings
- Create awareness about model costs

## Troubleshooting

### "No data available" in charts

**Cause**: No API calls recorded in the selected time period.

**Solutions**:
1. Increase the time range (try 90 days)
2. Verify API calls are being tracked in `api_cost_tracking` table
3. Check if `costMonitor.trackAPICall()` is being called in your API routes

### Provider field showing "unknown"

**Cause**: The provider field wasn't set correctly during migration.

**Solution**:
```sql
-- Re-run the provider update
UPDATE api_cost_tracking
SET provider = CASE
  WHEN model LIKE 'gpt%' THEN 'openai'
  WHEN model LIKE 'claude%' THEN 'anthropic'
  ELSE 'other'
END
WHERE provider IS NULL;
```

### Charts not rendering

**Cause**: Chart.js not properly installed or configured.

**Solution**:
```bash
# Reinstall dependencies
npm install chart.js react-chartjs-2
npm run build
```

### Savings calculations seem wrong

**Cause**: Pricing in `lib/cost-monitor.ts` may be outdated.

**Solution**:
1. Check OpenAI/Anthropic pricing pages for current rates
2. Update `API_PRICING` object in `lib/cost-monitor.ts`
3. Update pricing calculations in `app/api/costs/models/route.ts`

## Future Enhancements

### Planned Features
- [ ] Cost forecasting based on historical trends
- [ ] Budget allocation by project or feature
- [ ] Cost anomaly detection (automatic alerts for unusual spikes)
- [ ] Model performance metrics (cost vs quality)
- [ ] Export to CSV/PDF for reporting
- [ ] Conversation-level cost analysis
- [ ] Real-time cost tracking (WebSocket updates)
- [ ] Cost comparison with industry benchmarks

### Customization Options
- [ ] Custom date range selector
- [ ] Filterable by endpoint, user, or project
- [ ] Dark/light theme toggle
- [ ] Customizable chart types
- [ ] Downloadable reports

## Related Documentation

- [Cost Monitor System](../lib/cost-monitor.ts)
- [Budget Configuration](../database/api-cost-tracking.sql)
- [API Routes](../app/api/costs/README.md)
- [Main Cost Dashboard](../app/costs/page.tsx)

## Support

For issues or questions:
1. Check this documentation first
2. Review the database schema in `database/model-cost-comparison-enhancement.sql`
3. Examine the API route at `app/api/costs/models/route.ts`
4. Inspect browser console for errors
5. Check server logs for API failures

## Credits

Built for KimbleAI v4.3.0 as part of Phase 4 development.

**Technologies Used**:
- Next.js 15
- Chart.js 4.x
- React-Chartjs-2
- Supabase (PostgreSQL)
- TypeScript
- Tailwind CSS (inline styles)

---

**Last Updated**: October 2025
**Version**: 1.0.0
