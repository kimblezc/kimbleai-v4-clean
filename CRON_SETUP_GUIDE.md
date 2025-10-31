# Cron Setup Guide for Archie and Guardian

This guide explains how to set up automated cron execution for Archie and Guardian agents using external cron services.

## ⭐ Recommended: Use Zapier Pro

**If you already have Zapier Pro**, use that instead of this guide!

👉 **See `ZAPIER_AUTOMATION_SETUP.md` for complete Zapier setup instructions.**

**Benefits of Zapier Pro:**
- ✅ You already pay for it
- ✅ Built-in monitoring and error notifications
- ✅ Easy to change schedules
- ✅ No additional infrastructure
- ✅ 99.99% uptime SLA

**If you don't have Zapier Pro**, continue with this guide for free alternatives.

---

## Overview

Since Railway doesn't have built-in cron scheduling (unlike Vercel), we use external cron services to trigger our agents on schedule.

## Agents

### 1. Guardian (Project-Tag Validator)
- **Endpoint**: `https://kimbleai.com/api/guardian/run`
- **Schedule**: Every 6 hours
- **Purpose**: Validates project and tag functionality, auto-fixes issues

### 2. Archie (Autonomous Maintenance)
- **Endpoint**: `https://kimbleai.com/api/archie/run`
- **Schedule**: Every 1 hour
- **Purpose**: Code analysis, self-improvement, task detection

## Authentication Methods

All endpoints support THREE authentication methods:

### Method 1: Manual Trigger (No Auth Required)
```bash
curl "https://kimbleai.com/api/guardian/run?trigger=manual"
curl "https://kimbleai.com/api/archie/run?trigger=manual"
```

### Method 2: Authorization Header (Recommended for cron services)
```bash
curl -H "Authorization: Bearer Y44DsLg+ITJIhiSSXIEWIgGms34hvRCKYVfJOwfMPbA=" \
  "https://kimbleai.com/api/guardian/run"
```

### Method 3: Query Parameter (For services that don't support custom headers)
```bash
curl "https://kimbleai.com/api/guardian/run?secret=Y44DsLg%2BITJIhiSSXIEWIgGms34hvRCKYVfJOwfMPbA%3D"
```

**Note**: When using query parameter, the CRON_SECRET must be URL-encoded:
- `+` becomes `%2B`
- `=` becomes `%3D`

## CRON_SECRET

The secret is stored in Railway environment variables:
```
CRON_SECRET=Y44DsLg+ITJIhiSSXIEWIgGms34hvRCKYVfJOwfMPbA=
```

To view or update:
```bash
railway variables --kv | grep CRON_SECRET
railway variables --set "CRON_SECRET=new-value-here"
```

## Option 1: cron-job.org (Recommended)

**Why**: Free, reliable, supports custom headers, good UI

### Setup Steps:

1. **Sign up**: Go to https://cron-job.org and create a free account

2. **Create Guardian Job**:
   - Click "Create Cron Job"
   - Title: "KimbleAI Guardian"
   - URL: `https://kimbleai.com/api/guardian/run`
   - Schedule: Every 6 hours (0 */6 * * *)
   - Request Method: GET
   - Custom Headers:
     - Name: `Authorization`
     - Value: `Bearer Y44DsLg+ITJIhiSSXIEWIgGms34hvRCKYVfJOwfMPbA=`
   - Save execution history: Yes (optional)
   - Save

3. **Create Archie Job**:
   - Click "Create Cron Job"
   - Title: "KimbleAI Archie"
   - URL: `https://kimbleai.com/api/archie/run`
   - Schedule: Every hour (0 * * * *)
   - Request Method: GET
   - Custom Headers:
     - Name: `Authorization`
     - Value: `Bearer Y44DsLg+ITJIhiSSXIEWIgGms34hvRCKYVfJOwfMPbA=`
   - Save execution history: Yes (optional)
   - Save

4. **Test**: Use the "Execute now" button to test each job

### Cron Schedule Reference (cron-job.org format)
- Every hour: `0 * * * *`
- Every 6 hours: `0 */6 * * *`
- Every day at midnight: `0 0 * * *`
- Every Monday at 9am: `0 9 * * 1`

## Option 2: EasyCron (Alternative)

**Why**: Also free, simple UI, supports headers

### Setup Steps:

1. Sign up at https://www.easycron.com
2. Create cron job
3. URL: Same as above
4. Cron Expression: `0 */6 * * *` (Guardian) or `0 * * * *` (Archie)
5. HTTP Headers: `Authorization: Bearer CRON_SECRET`

## Option 3: Zapier Pro (Recommended if you have it)

**Why**: You may already have Zapier for other workflows

**⭐ For complete Zapier setup instructions, see: `ZAPIER_AUTOMATION_SETUP.md`**

### Quick Setup:

1. Create new Zap
2. Trigger: Schedule by Zapier
   - Interval: Every Hour (for Archie) or Every 6 Hours (for Guardian)
   - **Note**: Requires Zapier Pro or higher (Free plan doesn't include Schedule trigger)
3. Action: Webhooks by Zapier
   - Method: GET
   - URL: `https://kimbleai.com/api/guardian/run`
   - Headers:
     - `Authorization`: `Bearer Y44DsLg+ITJIhiSSXIEWIgGms34hvRCKYVfJOwfMPbA=`
4. Test & Turn On

**Full guide with screenshots and troubleshooting**: `ZAPIER_AUTOMATION_SETUP.md`

## Option 4: In-Process Node-Cron (Not Recommended)

We could use `node-cron` to schedule jobs within the Railway app, but this has drawbacks:
- Single point of failure (if app crashes, cron stops)
- Harder to monitor/debug
- Requires code changes for schedule updates

If needed:
```bash
npm install node-cron
```

Then create `lib/cron-scheduler.ts`:
```typescript
import cron from 'node-cron';
import { projectTagGuardian } from './project-tag-guardian';
import { archieAgent } from './archie-agent';

// Guardian: Every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('Running Guardian...');
  await projectTagGuardian.run('scheduled');
});

// Archie: Every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running Archie...');
  await archieAgent.run();
});
```

## Monitoring

### Check if crons are running:

1. **Guardian Dashboard**: https://kimbleai.com/guardian
   - Shows last run time and issues found

2. **Archie Dashboard**: https://kimbleai.com/archie
   - Shows recent tasks and findings

3. **Railway Logs**:
   ```bash
   railway logs --lines 100 | grep -E "Guardian|Archie"
   ```

4. **Manual Test**:
   ```bash
   # Test Guardian
   curl "https://kimbleai.com/api/guardian/run?trigger=manual"

   # Test Archie
   curl "https://kimbleai.com/api/archie/run?trigger=manual"
   ```

## Troubleshooting

### 401 Unauthorized
- Check CRON_SECRET is set in Railway: `railway variables --kv | grep CRON`
- Verify Authorization header format: `Bearer CRON_SECRET`
- If using query param, ensure it's URL-encoded

### 502 Bad Gateway
- Check Railway logs: `railway logs --lines 50`
- Verify app is running: `railway status`
- Check health endpoint: `curl https://kimbleai.com/api/health`

### Cron not executing
- Check cron service execution history
- Verify URL is correct (https://kimbleai.com)
- Check Railway logs for incoming requests

### Timeout (Archie)
- Archie may take 2-3 minutes to run
- Increase timeout in cron service settings (5 minutes recommended)
- This is normal behavior for comprehensive code analysis

## Security Notes

- CRON_SECRET is 32 bytes (256 bits) of cryptographic randomness
- Stored in Railway environment variables (encrypted at rest)
- Never commit CRON_SECRET to git
- Rotate periodically if compromised:
  ```bash
  NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  railway variables --set "CRON_SECRET=$NEW_SECRET"
  ```
- Update all cron services with new secret

## Current Status

- **CRON_SECRET**: Set in Railway ✅
- **Guardian Endpoint**: Working ✅
- **Archie Endpoint**: Working (but slow) ✅
- **Middleware**: Both endpoints public with auth ✅
- **External Cron**: Not yet configured ⏳

## Next Steps

1. ✅ Set up CRON_SECRET authentication
2. ✅ Deploy to Railway
3. ✅ Test both endpoints
4. ⏳ Configure cron-job.org for automated execution
5. ⏳ Monitor for 24 hours to ensure stability

---

**Last Updated**: 2025-10-31
**Version**: v6.1.1
**Commit**: 9cbcfe9
