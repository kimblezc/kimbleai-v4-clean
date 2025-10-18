# Deploy Autonomous Agent - Quick Start Guide

## ✅ Status: Code Deployed

Your autonomous agent code is now deployed to Vercel! Follow these steps to activate it.

---

## Step 1: Deploy Database Schema

The agent needs 5 tables in your Supabase database.

### Option A: Supabase SQL Editor (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your `kimbleai` project
3. Click "SQL Editor" in the left sidebar
4. Click "+ New query"
5. Copy the entire contents of `database/autonomous-agent-schema.sql`
6. Paste into the SQL editor
7. Click "Run" (or press Ctrl+Enter)

You should see:
```
Success. No rows returned
```

### Option B: Command Line (If psql is available)

```bash
# Get your database URL from Supabase dashboard
# Under Settings > Database > Connection string

psql "postgresql://postgres:[YOUR-PASSWORD]@db.gbmefnaqsxtoseufjixp.supabase.co:5432/postgres" \
  -f database/autonomous-agent-schema.sql
```

---

## Step 2: Verify Deployment

### Check Vercel Deployment

1. Go to https://vercel.com/dashboard
2. Find your `kimbleai-v4-clean` project
3. Check latest deployment status (should show "Ready")
4. Cron job should be visible under "Cron Jobs" tab

### Test API Endpoints

```bash
# Test agent status endpoint
curl https://kimbleai.com/api/agent/status?view=summary
```

**Expected response:**
```json
{
  "success": true,
  "agent_state": {
    "agent_enabled": true,
    ...
  },
  "statistics": {...}
}
```

---

## Step 3: View Dashboard

Access the Autonomous Agent Dashboard:

**https://kimbleai.com/agent**

You should see:
- System health status
- Recent activity
- Statistics (tasks, findings, logs)
- Executive summary

---

## Step 4: Trigger First Run (Optional)

The agent runs automatically every hour via cron. To test immediately:

```bash
# Manual trigger (requires CRON_SECRET from environment)
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://kimbleai.com/api/agent/cron
```

Or just wait for the next hour and it will run automatically!

---

## Verification Checklist

- [ ] Database schema deployed (5 tables created)
- [ ] Vercel deployment successful
- [ ] `/api/agent/status` returns data
- [ ] `/agent` dashboard loads
- [ ] Cron job configured in Vercel
- [ ] First agent execution completes

---

## What Happens Next

### Automatic Monitoring (Every Hour)

The agent will:
1. **Scan** for API errors, performance issues, security problems
2. **Detect** patterns and anomalies
3. **Create** fix tasks in the queue
4. **Execute** automated fixes
5. **Report** results in both technical logs and executive summaries

### View Activity

**Executive Summary** (for you):
```bash
curl https://kimbleai.com/api/agent/status?view=reports | jq
```

**Technical Logs** (for debugging):
```bash
curl https://kimbleai.com/api/agent/status?view=logs&level=error | jq
```

**Recent Tasks**:
```bash
curl https://kimbleai.com/api/agent/status?view=tasks | jq
```

**Detected Issues**:
```bash
curl https://kimbleai.com/api/agent/status?view=findings | jq
```

---

## Troubleshooting

### Agent Not Running

**Check agent is enabled:**
```sql
SELECT * FROM agent_state WHERE key = 'agent_enabled';
-- Should return: {"value": true}
```

**If disabled, enable it:**
```sql
UPDATE agent_state SET value = 'true' WHERE key = 'agent_enabled';
```

### No Data in Dashboard

**Wait for first cron execution** (runs at top of each hour)

Or **manually trigger**:
```bash
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://kimbleai.com/api/agent/cron
```

### Database Tables Missing

Run the schema deployment again (Step 1)

### Cron Not Configured

Check `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/agent/cron",
      "schedule": "0 * * * *"  // Every hour
    }
  ]
}
```

Redeploy if missing:
```bash
git push origin master
```

---

## Success Indicators

After 1 hour, you should see:

✅ Agent logs in `agent_logs` table
✅ First report in `agent_reports` table
✅ System health displayed on dashboard
✅ No critical issues detected (or auto-fixed)

---

## What the Agent Does

### 1. Error Monitoring
- Scans API logs for 500/504 errors
- Identifies recurring patterns
- Auto-creates fix tasks for known issues

### 2. Performance Monitoring
- Tracks endpoint response times
- Detects slow queries (>5s)
- Creates optimization tasks

### 3. Log Analysis
- Uses AI to analyze system logs
- Identifies anomalies and patterns
- Generates insights and recommendations

### 4. Automated Fixes
- Applies known error patterns fixes
- Implements performance optimizations
- Updates configurations automatically

### 5. Comprehensive Reporting
- **Technical Logs**: Full details for debugging
- **Executive Reports**: High-level summaries for you

---

## Example: First Agent Run

**What you'll see after the first hour:**

### In Dashboard (https://kimbleai.com/agent):

```
System Health: Excellent

Recent Activity:
✅ Completed error monitoring (0 issues found)
✅ Completed performance check (no slow endpoints)
✅ Analyzed 45 log entries
ℹ️  Generated daily summary report

Latest Report:
"In the past 24 hours, the autonomous agent completed 3 tasks,
detected 0 issues, and successfully resolved 0 problems.
System health is excellent."
```

### In Technical Logs:

```
[INFO] 🤖 Autonomous Agent starting execution
[INFO] 🔍 Starting monitoring phase
[INFO] ✅ No API errors detected in the last hour
[INFO] ✅ No performance issues detected
[INFO] 📊 Daily report generated
[INFO] ✅ Autonomous Agent completed successfully
```

---

## Documentation

**Full Guide**: `docs/AUTONOMOUS_AGENT.md`

**Quick Links**:
- API Reference: See `docs/AUTONOMOUS_AGENT.md#api-endpoints`
- Configuration: See `docs/AUTONOMOUS_AGENT.md#configuration`
- Troubleshooting: See `docs/AUTONOMOUS_AGENT.md#troubleshooting`

---

## Support

**Check Status**: https://kimbleai.com/api/agent/status?view=summary

**View Logs**: https://kimbleai.com/api/agent/status?view=logs

**View Reports**: https://kimbleai.com/api/agent/status?view=reports

**Dashboard**: https://kimbleai.com/agent

---

## Summary

🎉 **Congratulations!** You now have a fully autonomous, self-healing system that:

- 🔍 Monitors 24/7 for issues
- 🔧 Fixes problems automatically
- 📊 Reports everything clearly
- 🌐 Runs in the cloud (survives reboots)
- 📝 Logs both technical details and executive summaries

**Just deploy the database schema and you're done!**

The agent will start working at the next hour (e.g., if it's 10:45 now, it will run at 11:00).

---

*Last updated: January 18, 2025*
