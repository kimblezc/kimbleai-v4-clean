# Zapier Automation Setup Guide for Archie & Guardian

Complete step-by-step guide to set up automated cron execution for Archie and Guardian agents using Zapier Pro.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Why Zapier?](#why-zapier)
4. [Quick Start Checklist](#quick-start-checklist)
5. [Setup: Guardian (Every 6 Hours)](#setup-guardian-every-6-hours)
6. [Setup: Archie (Every Hour)](#setup-archie-every-hour)
7. [Testing Your Zaps](#testing-your-zaps)
8. [Monitoring & Verification](#monitoring--verification)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Configuration](#advanced-configuration)

---

## Overview

**What You'll Build:**
- **Guardian Zap**: Runs every 6 hours, validates project/tag data integrity
- **Archie Zap**: Runs every hour, maintains code quality and fixes issues

**Time to Complete**: 10-15 minutes
**Difficulty**: Easy
**Cost**: Included in Zapier Pro subscription

### What Are These Agents?

#### Guardian 🛡️
- **Purpose**: Data integrity and API health watchdog
- **Schedule**: Every 6 hours
- **What it does**: Validates CRUD operations, fixes duplicates/orphans, commits fixes to git
- **Dashboard**: https://kimbleai.com/guardian

#### Archie 🦉
- **Purpose**: Autonomous code maintenance
- **Schedule**: Every hour
- **What it does**: Fixes lint errors, removes dead code, updates dependencies, commits fixes to git
- **Dashboard**: https://kimbleai.com/agent

---

## Prerequisites

### 1. Zapier Pro Account
- **Required**: Zapier Pro (or higher) for Schedule trigger
- **Free trial**: 14 days available
- **Cost**: $19.99/month (billed annually: $239.88/year)
- **Sign up**: https://zapier.com/pricing

> **Note**: The Free plan does NOT include the "Schedule by Zapier" trigger. You need Pro or higher.

### 2. Environment Configuration
Ensure your KimbleAI deployment has these environment variables set:

```bash
# Authentication secret for cron endpoints
CRON_SECRET=Y44DsLg+ITJIhiSSXIEWIgGms34hvRCKYVfJOwfMPbA=
```

**To verify on Railway:**
```bash
railway variables --kv | grep CRON_SECRET
```

**If not set, add it:**
```bash
railway variables set "CRON_SECRET=Y44DsLg+ITJIhiSSXIEWIgGms34hvRCKYVfJOwfMPbA="
```

### 3. API Endpoints Ready
- Guardian: `https://kimbleai.com/api/guardian/run`
- Archie: `https://kimbleai.com/api/archie/run`

---

## Why Zapier?

**Benefits of Zapier over other cron services:**

✅ **You already have it**: If you have Zapier Pro for other workflows, no additional cost
✅ **Reliable**: 99.99% uptime SLA
✅ **Easy monitoring**: Built-in execution history with logs
✅ **Error notifications**: Email alerts when Zaps fail
✅ **No maintenance**: Zapier handles infrastructure
✅ **Custom headers**: Full support for Authorization headers
✅ **Flexible scheduling**: Easy to change intervals
✅ **Integration ready**: Can chain actions (e.g., email reports, Slack notifications)

**Comparison with alternatives:**

| Feature | Zapier Pro | cron-job.org | EasyCron | Railway node-cron |
|---------|------------|--------------|----------|-------------------|
| Cost | $19.99/mo | Free | Free | Free |
| Setup time | 5 min | 5 min | 5 min | 30 min (coding) |
| Reliability | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★☆☆ |
| Monitoring | Built-in | Basic | Basic | Custom logging |
| Notifications | Yes | Limited | Limited | Manual setup |
| Custom headers | Yes | Yes | Yes | Yes |
| Other uses | Many | Cron only | Cron only | Cron only |

**Verdict**: If you already have Zapier Pro, it's the best option. Otherwise, cron-job.org is a great free alternative (see `CRON_SETUP_GUIDE.md`).

---

## Quick Start Checklist

Before you begin, make sure you have:

- [ ] Zapier Pro account (or free trial)
- [ ] CRON_SECRET environment variable set in Railway
- [ ] Access to https://kimbleai.com/api/guardian/run
- [ ] Access to https://kimbleai.com/api/archie/run
- [ ] 10-15 minutes of time

---

## Setup: Guardian (Every 6 Hours)

### Step 1: Create New Zap

1. Log into [Zapier](https://zapier.com)
2. Click **"Create Zap"** (top right or center button)
3. You'll see a blank Zap editor with:
   - **Trigger** (left) - When this happens...
   - **Action** (right) - Do this...

### Step 2: Configure Trigger (Schedule)

1. **Click "Trigger"** to select a trigger app
2. **Search for "Schedule"** in the app search box
3. **Select "Schedule by Zapier"** from results
   - Icon: Clock icon ⏰
   - Description: "Trigger on a recurring schedule"
4. **Click "Event"** dropdown
5. **Select "Every Hour"** (we'll customize this in the next step)
6. **Click "Continue"**

### Step 3: Set Schedule Interval

1. **Frequency**: Select **"Every Hour"**
2. **Hour**: Select **"Every 6 hours"** from dropdown
   - Options: 1, 2, 3, 4, 6, 8, 12, 24
   - Choose: **6**
3. **Minute**: Select **"0"** (top of the hour)
   - Guardian will run at: 12:00 AM, 6:00 AM, 12:00 PM, 6:00 PM

**Visual reference:**
```
┌─────────────────────────────────┐
│ Schedule by Zapier              │
├─────────────────────────────────┤
│ Frequency: Every Hour           │
│ Hour:      Every 6 hours    ▼   │
│ Minute:    0                ▼   │
└─────────────────────────────────┘
```

4. **Click "Continue"**
5. **Click "Test trigger"**
   - Should show: "We found a request!"
   - This generates a test timestamp
6. **Click "Continue with selected record"**

### Step 4: Configure Action (Webhook)

1. **Click "Action"** to select an action app
2. **Search for "Webhooks"** in the app search box
3. **Select "Webhooks by Zapier"** from results
   - Icon: Lightning bolt ⚡
   - Description: "Send data to any URL"
4. **Click "Event"** dropdown
5. **Select "GET"** (we're calling an HTTP GET endpoint)
6. **Click "Continue"**

### Step 5: Configure Webhook Settings

Now you'll configure the actual webhook request:

**URL:**
```
https://kimbleai.com/api/guardian/run
```

**Query String Params:**
- Leave empty (we'll use headers for authentication)

**Headers:**

Click **"Add header"** and enter:
- **Key**: `Authorization`
- **Value**: `Bearer Y44DsLg+ITJIhiSSXIEWIgGms34hvRCKYVfJOwfMPbA=`

> **Important**: Make sure you include the word "Bearer" followed by a space, then the CRON_SECRET.

**Visual reference:**
```
┌────────────────────────────────────────────────┐
│ Webhooks by Zapier - GET                      │
├────────────────────────────────────────────────┤
│ URL:                                           │
│ https://kimbleai.com/api/guardian/run         │
│                                                │
│ Query String Params: (empty)                   │
│                                                │
│ Headers:                                       │
│ ┌─────────────────────────────────────────┐   │
│ │ Authorization                            │   │
│ │ Bearer Y44DsLg+ITJIhiSSXIEWI...         │   │
│ └─────────────────────────────────────────┘   │
│                                                │
│ Wrap Request In Array:   No                    │
│ Unflatten:               No                    │
│ [Test action]                                  │
└────────────────────────────────────────────────┘
```

**Wrap Request In Array**: No
**Unflatten**: No

### Step 6: Test the Action

1. **Click "Test action"** button at bottom
2. Zapier will send a real request to your endpoint
3. **Expected response** (takes 2-3 minutes):

```json
{
  "success": true,
  "timestamp": "2025-10-31T12:00:00Z",
  "trigger": "scheduled",
  "projectsStatus": "healthy",
  "tagsStatus": "healthy",
  "issuesFound": 0,
  "fixesApplied": 0,
  "report": "All systems operational"
}
```

4. **If you see the above**: Success! ✅
5. **If you see an error**: See [Troubleshooting](#troubleshooting) section

### Step 7: Name and Publish

1. **Click the Zap name** at top (defaults to "Schedule by Zapier to Webhooks by Zapier")
2. **Rename to**: "KimbleAI Guardian - Every 6 Hours"
3. **Click "Publish"** button (top right)
4. **Turn the Zap ON** (toggle switch)

**Done!** Guardian will now run every 6 hours automatically.

---

## Setup: Archie (Every Hour)

Follow the same process as Guardian, with these differences:

### Key Differences

**Schedule:**
- **Frequency**: Every Hour
- **Hour**: Every 1 hour (default)
- **Minute**: 0

**URL:**
```
https://kimbleai.com/api/archie/run
```

**Headers:**
```
Authorization: Bearer Y44DsLg+ITJIhiSSXIEWIgGms34hvRCKYVfJOwfMPbA=
```
(Same as Guardian)

**Name:**
```
KimbleAI Archie - Every Hour
```

### Full Step-by-Step

1. **Create New Zap** → Click "Create Zap"
2. **Trigger**:
   - App: Schedule by Zapier
   - Event: Every Hour
   - Frequency: Every 1 hour
   - Minute: 0
   - Test trigger ✓
3. **Action**:
   - App: Webhooks by Zapier
   - Event: GET
   - URL: `https://kimbleai.com/api/archie/run`
   - Headers: `Authorization: Bearer Y44DsLg+ITJIhiSSXIEWIgGms34hvRCKYVfJOwfMPbA=`
   - Test action ✓
4. **Publish**: Name it "KimbleAI Archie - Every Hour"
5. **Turn ON**: Toggle switch to activate

**Expected test response** (takes 2-3 minutes):

```json
{
  "success": true,
  "timestamp": "2025-10-31T13:00:00Z",
  "issuesFound": 5,
  "issuesFixed": 3,
  "summary": "Fixed 3 lint errors, committed to git",
  "commitHash": "abc1234",
  "nextRun": "2025-10-31T14:00:00Z"
}
```

---

## Testing Your Zaps

### Manual Test (Recommended)

Test each Zap manually before relying on the schedule:

1. Go to **"My Zaps"** in Zapier dashboard
2. Find your Zap (Guardian or Archie)
3. Click the **"..."** menu (three dots)
4. Select **"Run Zap"**
5. Click **"Run"**
6. Wait 2-3 minutes for completion
7. Check the result

### Visual Test Flow

```
You → Click "Run Zap" → Zapier triggers immediately
                              ↓
                    Webhooks sends GET request
                              ↓
                    KimbleAI receives request
                              ↓
                    Agent runs (2-3 minutes)
                              ↓
                    Response returns to Zapier
                              ↓
              You see success/failure in Zap History
```

### Verify on KimbleAI Dashboards

After running each Zap, verify on the dashboards:

**Guardian Dashboard**: https://kimbleai.com/guardian
- Should show "Last Run: Just now"
- Should display any issues found
- Check "Next Run" time

**Archie Dashboard**: https://kimbleai.com/agent
- Should show "Last Run: Just now"
- Should list recent fixes
- View git commits by Archie

### Check Execution History

1. Go to Zapier dashboard
2. Click **"History"** in left sidebar
3. Filter by Zap name
4. View each execution:
   - ✅ Green checkmark = Success
   - 🔴 Red X = Failed
   - ⏱️ Clock = Running
5. Click any execution to see full request/response logs

---

## Monitoring & Verification

### Daily Checks (First Week)

For the first week, check daily:

1. **Zapier History**:
   - Go to https://zapier.com/app/history
   - Verify both Zaps are running on schedule
   - Check success rate (should be 100%)

2. **Guardian Dashboard**:
   - Visit https://kimbleai.com/guardian
   - Verify "Last Run" is within last 6 hours
   - Check for any critical issues

3. **Archie Dashboard**:
   - Visit https://kimbleai.com/agent
   - Verify "Last Run" is within last hour
   - Review recent commits

### Weekly Checks (Ongoing)

After the first week, check weekly:

1. **Success Rate**: Should be >95%
2. **Error Patterns**: Are the same errors repeating?
3. **Task Count**: Zapier task usage (check billing page)

### Set Up Notifications

Enable email notifications for failures:

1. Go to **Zap Settings** (gear icon)
2. Scroll to **"Error Notifications"**
3. **Enable**: "Send me an email when this Zap has an error"
4. **Frequency**: "Immediately" (or "Daily digest")
5. **Save**

Now you'll get emails if either Zap fails!

### Expected Schedule

**Guardian (Every 6 hours)**:
- 12:00 AM (midnight)
- 6:00 AM (morning)
- 12:00 PM (noon)
- 6:00 PM (evening)

**Archie (Every hour)**:
- Every hour at :00 (e.g., 1:00, 2:00, 3:00, etc.)

---

## Troubleshooting

### Issue: "This feature is only available on paid plans"

**Problem**: You're on Zapier Free, which doesn't include Schedule trigger.

**Solution**:
1. Upgrade to Zapier Pro ($19.99/mo)
2. Or start a 14-day free trial
3. Or use an alternative cron service (see `CRON_SETUP_GUIDE.md`)

---

### Issue: 401 Unauthorized Error

**Problem**: Authentication failed - Zapier can't authenticate with the endpoint.

**Symptoms**:
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Valid CRON_SECRET required"
}
```

**Solutions**:

1. **Check Authorization header format**:
   - Must be: `Bearer Y44DsLg+ITJIhiSSXIEWIgGms34hvRCKYVfJOwfMPbA=`
   - Include the word "Bearer"
   - Include the space after "Bearer"
   - Don't add extra quotes

2. **Verify CRON_SECRET in Railway**:
   ```bash
   railway variables --kv | grep CRON_SECRET
   ```
   Should output: `CRON_SECRET=Y44DsLg+ITJIhiSSXIEWIgGms34hvRCKYVfJOwfMPbA=`

3. **Check for copy-paste errors**:
   - Re-copy the CRON_SECRET from Railway
   - Paste into Zapier header
   - Make sure no extra spaces or characters

4. **Use manual trigger as fallback**:
   - Change URL to: `https://kimbleai.com/api/guardian/run?trigger=manual`
   - Remove Authorization header
   - Test (should work without auth)
   - This is less secure but good for testing

---

### Issue: Timeout / No Response

**Problem**: The Zap times out waiting for a response (especially Archie).

**Symptoms**:
- Zap shows "Timed out after 30 seconds"
- Or Zap runs for minutes with no response

**Why This Happens**:
- Archie can take 2-3 minutes to run
- Guardian can take 1-2 minutes
- Zapier's default timeout is 30 seconds

**Solutions**:

1. **Increase Zapier timeout** (Zapier Team plan required):
   - Go to Zap settings
   - Advanced settings
   - Increase timeout to 300 seconds (5 minutes)

2. **Accept the timeout** (Response still works):
   - Even if Zapier times out, the agent continues running
   - Check the dashboard to verify it completed
   - The timeout doesn't break anything

3. **Add retry logic**:
   - In Zap settings → "Advanced"
   - Enable "Retry on failure"
   - Set retry count to 1-2

4. **Don't worry too much**:
   - The agent runs successfully even if Zapier times out
   - Just verify on the dashboard that it completed

---

### Issue: 502 Bad Gateway

**Problem**: Railway server isn't responding.

**Symptoms**:
```
502 Bad Gateway
nginx
```

**Solutions**:

1. **Check Railway status**:
   ```bash
   railway status
   ```
   Should show: "Service is running"

2. **Check Railway logs**:
   ```bash
   railway logs --lines 50
   ```
   Look for error messages

3. **Test health endpoint**:
   ```bash
   curl https://kimbleai.com/api/health
   ```
   Should return: `{"status":"ok"}`

4. **Restart Railway service**:
   ```bash
   railway up --detach
   ```

5. **Check deployment**:
   - Go to Railway dashboard
   - Verify latest deployment succeeded
   - Check build logs for errors

---

### Issue: Zap Runs But Nothing Happens

**Problem**: Zap shows success, but agent doesn't run.

**Symptoms**:
- Zapier History shows green checkmark
- But dashboard shows old "Last Run" time
- No new commits from agent

**Solutions**:

1. **Check Zapier response**:
   - Open the execution in Zap History
   - View the response
   - Look for `"success": true`

2. **Verify URL is correct**:
   - Guardian: `https://kimbleai.com/api/guardian/run`
   - Archie: `https://kimbleai.com/api/archie/run`
   - No typos, no trailing slashes

3. **Check Railway logs**:
   ```bash
   railway logs --tail | grep -E "Guardian|Archie"
   ```
   Should show incoming requests

4. **Test manually**:
   ```bash
   curl -H "Authorization: Bearer Y44DsLg+ITJIhiSSXIEWIgGms34hvRCKYVfJOwfMPbA=" \
     https://kimbleai.com/api/guardian/run
   ```
   Should return success response

---

### Issue: "Could not load the request data"

**Problem**: Zapier can't connect to the URL.

**Solutions**:

1. **Check URL is accessible**:
   ```bash
   curl -I https://kimbleai.com/api/guardian/run
   ```
   Should return: `HTTP/2 200` or `401` (not 404 or connection error)

2. **Verify Railway is deployed**:
   ```bash
   railway status
   ```

3. **Check for typos in URL**

4. **Test in browser**:
   - Visit: `https://kimbleai.com/api/guardian/run?trigger=manual`
   - Should see JSON response (not error page)

---

### Issue: High Zapier Task Usage

**Problem**: Running Archie every hour uses lots of tasks.

**Math**:
- Archie: 24 tasks/day (once per hour)
- Guardian: 4 tasks/day (once per 6 hours)
- Total: 28 tasks/day × 30 days = **840 tasks/month**

**Zapier Pro Limit**: 750 tasks/month
- **You'll exceed the limit!** ⚠️

**Solutions**:

1. **Reduce Archie frequency**:
   - Change from "Every 1 hour" to "Every 2 hours"
   - New usage: 12/day × 30 = 360 tasks/month
   - Plus Guardian: 120 tasks/month
   - Total: 480 tasks/month ✅

2. **Upgrade to Team plan**:
   - Zapier Team: 2,000 tasks/month
   - Cost: $69/month

3. **Use free cron service for Archie**:
   - Keep Guardian on Zapier (important, runs 4×/day)
   - Move Archie to cron-job.org (free)
   - See `CRON_SETUP_GUIDE.md` for instructions

**Recommended Approach**:
- **Option 1**: Run Archie every 2 hours (stays under limit)
- **Option 2**: Use Zapier for Guardian only, cron-job.org for Archie

---

## Advanced Configuration

### Add Slack Notifications on Failure

Get notified in Slack when agents fail:

1. After the Webhook action, click **"+"** to add another action
2. Select **"Slack"**
3. Event: **"Send Channel Message"**
4. Choose your Slack workspace
5. Channel: Select channel (e.g., #alerts)
6. Message:
   ```
   🚨 Guardian failed to run!
   Error: {{zap_meta_human_readable_errors}}
   Time: {{zap_meta_utc_time}}
   ```
7. Only send on failure:
   - Click **"Filter"** between Webhook and Slack
   - Condition: `Webhook Status Code is not 200`

### Add Email Report After Each Run

Send yourself a summary email:

1. Add action after Webhook
2. Select **"Gmail"** (or "Email by Zapier")
3. Event: **"Send Email"**
4. To: Your email
5. Subject: `Guardian Report - {{zap_meta_utc_time}}`
6. Body:
   ```
   Guardian completed successfully!

   Issues Found: {{issuesFound}}
   Fixes Applied: {{fixesApplied}}
   Status: {{status}}

   View full report: https://kimbleai.com/guardian
   ```

### Schedule Archie for Business Hours Only

Run Archie only during work hours (9 AM - 5 PM):

1. Change Schedule trigger:
   - Instead of "Every Hour"
   - Select "Every Day"
2. Set Time: 9:00 AM
3. Add multiple actions (one per hour):
   - 9:00 AM
   - 10:00 AM
   - 11:00 AM
   - ... (up to 5:00 PM)

Or use a Filter:
1. Add Filter after Schedule trigger
2. Condition: `Hour is between 9 and 17`
3. Only continue if true

### Create a Daily Summary Zap

Combine both agents into a daily report:

1. **Trigger**: Schedule by Zapier (Every Day at 6 PM)
2. **Action 1**: Webhooks - GET `https://kimbleai.com/api/guardian/run`
3. **Action 2**: Webhooks - GET `https://kimbleai.com/api/archie/run`
4. **Action 3**: Gmail - Send Email
   - Subject: `Daily KimbleAI Maintenance Report`
   - Body:
     ```
     GUARDIAN:
     Issues Found: {{guardian_issuesFound}}
     Fixes Applied: {{guardian_fixesApplied}}

     ARCHIE:
     Issues Found: {{archie_issuesFound}}
     Fixes Applied: {{archie_issuesFixed}}

     Dashboards:
     https://kimbleai.com/guardian
     https://kimbleai.com/agent
     ```

---

## Summary

### What You Built

✅ **Guardian Zap**: Runs every 6 hours, validates data integrity
✅ **Archie Zap**: Runs every hour, maintains code quality
✅ **Monitoring**: Email notifications on failures
✅ **Dashboards**: Track activity at /guardian and /agent

### URLs You Need

**Endpoints:**
- Guardian: `https://kimbleai.com/api/guardian/run`
- Archie: `https://kimbleai.com/api/archie/run`

**Dashboards:**
- Guardian: https://kimbleai.com/guardian
- Archie: https://kimbleai.com/agent

**Authentication:**
- Header: `Authorization: Bearer Y44DsLg+ITJIhiSSXIEWIgGms34hvRCKYVfJOwfMPbA=`

### Estimated Setup Time

- **Guardian Zap**: 5 minutes
- **Archie Zap**: 5 minutes
- **Testing**: 5 minutes
- **Total**: 15 minutes

### Benefits of Using Zapier

1. ✅ **No additional infrastructure**: Zapier handles scheduling
2. ✅ **Reliable**: 99.99% uptime
3. ✅ **Easy monitoring**: Built-in execution history
4. ✅ **Notifications**: Email alerts on failures
5. ✅ **Flexibility**: Easy to change schedules
6. ✅ **Integration**: Can add Slack, email, etc.
7. ✅ **You already have it**: No extra cost if using Zapier Pro

### Cost Analysis

**Zapier Pro**: $19.99/month (or $239.88/year if billed annually)
- 750 tasks/month included
- Archie (hourly): 720 tasks/month
- Guardian (6 hours): 120 tasks/month
- **Total**: 840 tasks/month ⚠️ (exceeds limit by 90)

**Recommended**:
- Run Archie every 2 hours: 360 tasks/month
- Total with Guardian: 480 tasks/month ✅

**Alternative**:
- Use free cron-job.org for Archie (save 720 tasks)
- Use Zapier only for Guardian (120 tasks)
- Cost: $0/month for cron-job.org

---

## Next Steps

1. ✅ Create both Zaps (15 minutes)
2. ✅ Test manually (5 minutes)
3. ⏳ Monitor for 24 hours
4. ⏳ Check dashboards daily for first week
5. ⏳ Verify git commits by Archie/Guardian
6. ⏳ Set up failure notifications (optional)
7. ⏳ Add Slack/email reporting (optional)

---

## Support

**Documentation**:
- Archie: `ARCHIE.md`
- Guardian: `GUARDIAN.md`
- Alternative cron setup: `CRON_SETUP_GUIDE.md`

**Dashboards**:
- Guardian: https://kimbleai.com/guardian
- Archie: https://kimbleai.com/agent

**Manual Triggers** (for testing):
- Guardian: `https://kimbleai.com/api/guardian/run?trigger=manual`
- Archie: `https://kimbleai.com/api/archie/run?trigger=manual`

**Check Logs**:
```bash
# Railway logs
railway logs --tail | grep -E "Guardian|Archie"

# Git commits
git log --author="Guardian" --oneline -10
git log --author="Archie" --oneline -10
```

---

**Last Updated**: 2025-10-31
**Version**: 1.0.0
**Status**: Production Ready
