# KimbleAI v4 - Production Monitoring Guide

**Last Updated:** October 27, 2025
**Purpose:** Comprehensive monitoring and alerting strategy

---

## Monitoring Overview

KimbleAI monitoring strategy uses multiple layers:
1. **Vercel Analytics** - Performance and usage
2. **Supabase Dashboard** - Database and API health
3. **Application Logs** - Runtime errors and debugging
4. **Cost Tracking** - AI API spending
5. **Custom Alerts** - Budget and error thresholds

---

## 1. Vercel Monitoring

### 1.1 Enable Vercel Analytics

**Setup:**
1. Go to Vercel Dashboard > Your Project > Analytics
2. Enable **Web Analytics** (free)
3. Enable **Speed Insights** (included with Hobby plan)

**What you get:**
- Page view tracking
- User sessions
- Geographic distribution
- Device/browser breakdown
- Referral sources

### 1.2 Deployment Monitoring

**Monitor:**
- Deployment success/failure rate
- Build times
- Preview deployment status

**Alerts:**
1. Project Settings > Notifications
2. Enable:
   - Deployment Failed
   - Build Failed
   - Performance Degradation

### 1.3 Runtime Logs

**Access logs:**
```
Vercel Dashboard > Deployments > Latest > Runtime Logs
```

**Filter logs:**
- By severity: Info, Warning, Error
- By function: Select API route
- By time range: Last hour, day, week

**Key things to monitor:**
- 5xx errors (server errors)
- API timeout errors
- Database connection failures
- Out of memory errors

### 1.4 Function Metrics

**Monitor per function:**
- Execution count
- Avg execution time
- Error rate
- Memory usage

**Critical functions to watch:**
- `/api/chat/route` - Main chat endpoint
- `/api/agent/cron` - Autonomous agent
- `/api/transcribe/*` - Transcription endpoints
- `/api/backup/cron` - Backup process

**Alert thresholds:**
- Error rate > 5%
- Execution time > 10s (for chat)
- Memory usage > 80%

---

## 2. Supabase Monitoring

### 2.1 Database Health

**Dashboard metrics:**
1. Go to Supabase Dashboard > Reports
2. Monitor:
   - Database size (stay under plan limit)
   - Connection pool usage
   - Query performance
   - Storage usage

**Key queries to monitor:**

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('postgres')) as database_size;

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Active connections
SELECT count(*) as active_connections FROM pg_stat_activity;

-- Slow queries (last 24 hours)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 2.2 API Usage

**Monitor:**
- API requests per day
- Bandwidth usage
- Auth requests
- Storage API calls

**Alerts:**
- Near plan limits
- Unusual spikes in traffic

### 2.3 Storage Monitoring

```sql
-- Storage usage by bucket
SELECT
  bucket_id,
  COUNT(*) as file_count,
  pg_size_pretty(SUM(metadata->>'size')::bigint) as total_size
FROM storage.objects
GROUP BY bucket_id
ORDER BY SUM(metadata->>'size')::bigint DESC;

-- Recent uploads
SELECT
  bucket_id,
  name,
  created_at,
  pg_size_pretty((metadata->>'size')::bigint) as size
FROM storage.objects
ORDER BY created_at DESC
LIMIT 20;
```

---

## 3. Application-Level Monitoring

### 3.1 Cost Tracking Dashboard

**Monitor daily:**

```sql
-- Today's costs
SELECT SUM(cost_usd) as today_cost
FROM api_cost_tracking
WHERE timestamp::date = CURRENT_DATE;

-- This month's costs
SELECT SUM(cost_usd) as month_cost
FROM api_cost_tracking
WHERE timestamp >= date_trunc('month', CURRENT_DATE);

-- Costs by model (last 7 days)
SELECT
  model,
  COUNT(*) as calls,
  SUM(total_tokens) as total_tokens,
  SUM(cost_usd) as total_cost,
  AVG(cost_usd) as avg_cost_per_call
FROM api_cost_tracking
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY model
ORDER BY total_cost DESC;

-- Top spenders
SELECT
  user_id,
  COUNT(*) as api_calls,
  SUM(cost_usd) as total_spent
FROM api_cost_tracking
WHERE timestamp >= date_trunc('month', CURRENT_DATE)
GROUP BY user_id
ORDER BY total_spent DESC;
```

### 3.2 Budget Alert Monitoring

```sql
-- Recent budget alerts
SELECT
  user_id,
  alert_type,
  threshold_pct,
  amount_spent_usd,
  limit_usd,
  email_sent,
  created_at
FROM budget_alerts
ORDER BY created_at DESC
LIMIT 10;

-- Current budget status
SELECT
  b.user_id,
  b.daily_limit_usd,
  b.monthly_limit_usd,
  COALESCE(d.daily_spent, 0) as today_spent,
  COALESCE(m.monthly_spent, 0) as month_spent,
  ROUND((COALESCE(d.daily_spent, 0) / b.daily_limit_usd * 100), 2) as daily_pct_used,
  ROUND((COALESCE(m.monthly_spent, 0) / b.monthly_limit_usd * 100), 2) as monthly_pct_used
FROM budget_config b
LEFT JOIN (
  SELECT user_id, SUM(cost_usd) as daily_spent
  FROM api_cost_tracking
  WHERE timestamp::date = CURRENT_DATE
  GROUP BY user_id
) d ON b.user_id = d.user_id
LEFT JOIN (
  SELECT user_id, SUM(cost_usd) as monthly_spent
  FROM api_cost_tracking
  WHERE timestamp >= date_trunc('month', CURRENT_DATE)
  GROUP BY user_id
) m ON b.user_id = m.user_id;
```

### 3.3 Agent Activity Monitoring

```sql
-- Agent task status
SELECT
  status,
  COUNT(*) as count,
  MAX(created_at) as last_created
FROM agent_tasks
GROUP BY status;

-- Recent agent findings
SELECT
  finding_type,
  title,
  confidence,
  actionable,
  created_at
FROM agent_findings
ORDER BY created_at DESC
LIMIT 20;

-- Agent execution success rate
SELECT
  agent_name,
  COUNT(*) as total_executions,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  ROUND(SUM(CASE WHEN success THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as success_rate_pct
FROM agent_execution_log
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY agent_name
ORDER BY total_executions DESC;
```

### 3.4 User Activity Monitoring

```sql
-- Daily active users
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(*) as total_actions
FROM activity_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Activity by type (last 7 days)
SELECT
  action_type,
  resource_type,
  COUNT(*) as count
FROM activity_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY action_type, resource_type
ORDER BY count DESC;

-- Recent user activity
SELECT
  user_id,
  action_type,
  resource_type,
  resource_name,
  created_at
FROM activity_logs
ORDER BY created_at DESC
LIMIT 50;
```

---

## 4. Error Monitoring

### 4.1 Application Errors

**Monitor in Vercel Logs:**
- Filter by severity: Error
- Look for patterns
- Track frequency

**Critical errors to watch:**
- Database connection timeouts
- API rate limits exceeded
- Authentication failures
- File upload failures

### 4.2 Database Error Tracking

```sql
-- API errors (if api_logs table exists)
SELECT
  endpoint,
  status_code,
  COUNT(*) as error_count,
  MAX(created_at) as last_occurrence
FROM api_logs
WHERE status_code >= 400
  AND created_at >= CURRENT_DATE - INTERVAL '24 hours'
GROUP BY endpoint, status_code
ORDER BY error_count DESC;

-- Failed transcriptions
SELECT
  filename,
  error_message,
  service_used,
  created_at
FROM audio_transcriptions
WHERE status = 'error'
ORDER BY created_at DESC
LIMIT 10;

-- Failed backups
SELECT
  backup_type,
  error_message,
  created_at
FROM backups
WHERE status = 'failed'
ORDER BY created_at DESC;
```

---

## 5. Performance Monitoring

### 5.1 API Response Times

**If model_performance_metrics table exists:**

```sql
-- Average response times by model
SELECT
  model_name,
  COUNT(*) as calls,
  ROUND(AVG(response_time_ms), 2) as avg_response_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms), 2) as p95_response_ms
FROM model_performance_metrics
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY model_name
ORDER BY calls DESC;

-- Slow API calls (> 5 seconds)
SELECT
  model_name,
  task_type,
  response_time_ms,
  created_at
FROM model_performance_metrics
WHERE response_time_ms > 5000
ORDER BY created_at DESC
LIMIT 20;
```

### 5.2 Database Query Performance

```sql
-- Enable pg_stat_statements (if not already)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Slowest queries
SELECT
  SUBSTRING(query, 1, 100) as query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) as avg_ms,
  ROUND(total_exec_time::numeric, 2) as total_ms
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## 6. Custom Alerts Setup

### 6.1 Budget Alert Triggers

Already implemented in application. Monitor:

```sql
-- Check if budget alerts are firing
SELECT * FROM budget_alerts
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

**Trigger conditions:**
- Daily spending > 80% of limit
- Monthly spending > 80% of limit
- User-specific thresholds

### 6.2 Email Alert Configuration

**For budget alerts:**
- Configured in `lib/budget-monitor.ts`
- Sends via SendGrid or SMTP
- Recipients: User's email from users table

**Test alert:**
```sql
-- Manually trigger alert (for testing)
INSERT INTO budget_alerts (user_id, alert_type, threshold_pct, amount_spent_usd, limit_usd)
VALUES ('user_zach', 'daily', 80, 8.50, 10.00);
```

### 6.3 Slack/Discord Webhooks (Optional)

**Add to cron jobs:**

```typescript
// In api/cron/monitoring/route.ts
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

async function sendSlackAlert(message: string) {
  if (!SLACK_WEBHOOK_URL) return;

  await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message })
  });
}

// Call on critical errors
await sendSlackAlert('🚨 Critical: Database backup failed!');
```

---

## 7. Monitoring Dashboards

### 7.1 Create Daily Monitoring Dashboard

**URL:** `/dashboard` or `/admin/monitoring`

**Widgets to display:**
1. **Today's Costs** - Total AI API spending
2. **Active Users** - Who's been active today
3. **API Call Volume** - Calls per hour chart
4. **Error Rate** - Percentage of failed requests
5. **Agent Status** - Which agents are running
6. **Recent Alerts** - Latest budget/error alerts
7. **Storage Usage** - GB used vs plan limit
8. **Top Models** - Most used AI models today

### 7.2 Cost Dashboard

Already implemented at `/costs`:
- Daily cost trend
- Monthly cost projection
- Cost by model
- Cost by user
- Budget status

### 7.3 Agent Dashboard

Already implemented at `/agent`:
- Agent status (active/inactive)
- Recent findings
- Task queue status
- Execution logs

---

## 8. Monitoring Schedule

### Daily (Every Morning)
- [ ] Check Vercel deployment status
- [ ] Review yesterday's costs in `/costs`
- [ ] Check for budget alerts
- [ ] Review error logs (any 5xx errors?)
- [ ] Verify all cron jobs ran

### Weekly (Every Monday)
- [ ] Review week's total costs
- [ ] Check database size growth
- [ ] Review slow query report
- [ ] Check storage usage
- [ ] Review agent findings
- [ ] Test backup restore

### Monthly (First of Month)
- [ ] Review month's total costs vs budget
- [ ] Analyze cost trends (increasing?)
- [ ] Review user activity stats
- [ ] Check for unused resources
- [ ] Update cost model pricing (if changed)
- [ ] Review and archive old data

---

## 9. Alert Thresholds

### Critical Alerts (Immediate Action Required)
- 5xx error rate > 5%
- Database connection failures
- Backup failed
- Monthly cost > 100% of budget
- Disk space > 90%

### Warning Alerts (Check Soon)
- Daily cost > 80% of budget
- API response time > 5s
- Agent task failure rate > 10%
- Database query time > 1s

### Info Alerts (Monitor)
- New user sign up
- Large file upload (> 100MB)
- Unusual API usage pattern

---

## 10. Monitoring Tools Integration

### 10.1 Sentry (Error Tracking) - Optional

```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

### 10.2 LogTail/Better Stack - Optional

For centralized log aggregation:
- Collect all Vercel logs
- Search across deployments
- Set up custom alerts
- Track trends over time

### 10.3 UptimeRobot - Optional

**Free tier monitoring:**
- HTTP(S) monitoring
- Keyword monitoring
- 5-minute checks
- Email/SMS alerts

**Monitor endpoints:**
- `https://your-app.vercel.app` (home page)
- `https://your-app.vercel.app/api/health`
- `https://your-app.vercel.app/api/status`

---

## 11. Health Check Endpoints

### Create Health Check API

**File:** `app/api/health/route.ts`

```typescript
export async function GET() {
  try {
    // Check database
    const { data, error } = await supabase.from('users').select('count');
    if (error) throw error;

    // Check OpenAI
    // (optional: ping OpenAI API)

    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        api: 'ok'
      }
    });
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 500 });
  }
}
```

---

## 12. Monitoring Checklist

### Setup (One-Time)
- [ ] Vercel Analytics enabled
- [ ] Supabase monitoring reviewed
- [ ] Budget alerts configured
- [ ] Error tracking setup
- [ ] Health check endpoint created
- [ ] Monitoring dashboard accessible
- [ ] Alert recipients configured

### Daily Checks
- [ ] Review costs
- [ ] Check error logs
- [ ] Verify cron jobs ran
- [ ] Review agent activity

### Weekly Checks
- [ ] Review performance metrics
- [ ] Check database growth
- [ ] Review user activity
- [ ] Test backup restore

---

## Support

- **Vercel Status:** https://www.vercel-status.com
- **Supabase Status:** https://status.supabase.com
- **OpenAI Status:** https://status.openai.com
- **Project Issues:** zach.kimble@gmail.com

---

**End of Monitoring Guide**
