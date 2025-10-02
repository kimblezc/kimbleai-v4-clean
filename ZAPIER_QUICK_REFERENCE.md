# Zapier Integration - Quick Reference Card

**Status**: ✅ Active and Ready | **Usage**: 0/750 tasks | **Daily Limit**: 30/day

---

## Quick Setup (5 Minutes)

### 1. Create Database Table
```sql
-- Run in Supabase SQL Editor
-- See: database/zapier-webhook-logs.sql
CREATE TABLE zapier_webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2. Create Your First Zap
1. Go to [zapier.com](https://zapier.com)
2. Create Zap → Webhooks by Zapier → Catch Hook
3. Use URL from `.env.local`: `ZAPIER_WEBHOOK_URL`
4. Add action (Gmail, Slack, Sheets, etc.)
5. Turn it on!

### 3. Test It
```bash
curl -X POST http://localhost:3000/api/zapier/monitor \
  -H "Content-Type: application/json" \
  -d '{"eventType":"conversation_saved","userId":"zach"}'
```

---

## Event Types

| Event | When | Priority | Frequency |
|-------|------|----------|-----------|
| `conversation_saved` | After chat | Low | 10-20/day |
| `transcription_complete` | After audio | Medium | 1-3/day |
| `photo_uploaded` | After photo | Low | 2-5/day |
| `urgent_notification` | Urgent detected | Urgent | 0-2/day |
| `daily_summary` | End of day | Low | 1/day |

---

## Monitoring Dashboard

```bash
# View all stats
curl http://localhost:3000/api/zapier/monitor

# Filter by user
curl http://localhost:3000/api/zapier/monitor?userId=zach

# Filter by event type
curl http://localhost:3000/api/zapier/monitor?eventType=transcription_complete

# Test webhook manually
curl -X POST http://localhost:3000/api/zapier/monitor \
  -H "Content-Type: application/json" \
  -d '{"eventType":"conversation_saved","userId":"zach"}'
```

---

## Key Metrics to Watch

✅ **Success Rate**: Should be >95%
✅ **Daily Usage**: Keep under 30/day
✅ **Monthly Usage**: Stay under 750/month
⚠️ **Failed Webhooks**: Investigate if >5%

---

## Common Issues & Fixes

### "Webhooks not being sent"
```bash
# Check environment
echo $ZAPIER_WEBHOOK_URL

# Check logs
curl http://localhost:3000/api/zapier/monitor
```

### "Daily limit exceeded"
- Current limit: 30/day
- Solution: Upgrade to Zapier Pro or optimize events

### "Webhook failed"
- Check Zap is turned on
- Verify webhook URL
- Check Zapier Zap History

---

## Quick Commands

```bash
# Check TypeScript types
npx tsc --noEmit lib/zapier-client.ts

# Run tests
npm test tests/zapier-integration-test.ts

# View logs
tail -f logs/application.log | grep Zapier
```

---

## Files Created

```
lib/zapier-client.ts                    # Webhook client
app/api/zapier/monitor/route.ts        # Dashboard
tests/zapier-integration-test.ts       # Tests
docs/ZAPIER_SETUP.md                   # Full guide
database/zapier-webhook-logs.sql       # DB setup
ZAPIER_ACTIVATION_REPORT.md           # This report
```

---

## Code Usage

```typescript
// In any API route
import { zapierClient } from '@/lib/zapier-client';

// Send conversation webhook
await zapierClient.sendConversationSaved(userId, convId, messages, metadata);

// Send transcription webhook
await zapierClient.sendTranscriptionComplete(
  userId, transId, text, actionItems, tags, metadata
);

// Send photo webhook
await zapierClient.sendPhotoUploaded(
  userId, photoId, analysis, tags, hasUrgent, metadata
);

// Send urgent notification
await zapierClient.sendUrgentNotification(
  userId, title, message, source, metadata
);

// Get usage stats
const stats = zapierClient.getUsageStats();
console.log(`Daily usage: ${stats.dailyCount}/${stats.dailyLimit}`);
```

---

## Recommended Zaps

### 1. Conversation Logger
- **Trigger**: `conversation_saved`
- **Action**: Google Sheets - Add Row

### 2. Transcription Alerts
- **Trigger**: `transcription_complete`
- **Action**: Slack - Post Message

### 3. Urgent Notifications
- **Trigger**: `urgent_notification`
- **Filter**: `priority = "urgent"`
- **Action**: SMS + Slack @channel

### 4. Daily Report
- **Trigger**: `daily_summary`
- **Action**: Gmail - Send Email

---

## Environment Variables

```bash
# Required in .env.local
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/YOUR_ID/YOUR_HOOK/
ZAPIER_WEBHOOK_SECRET=your-secret-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Urgent Tag Detection

Automatic detection of urgent content:
- **Keywords**: urgent, asap, critical, emergency, immediate, deadline
- **Location**: Text content and tags
- **Action**: Sends urgent notification webhook automatically

---

## Usage Estimates

- **Daily**: 14-31 webhooks
- **Monthly**: 420-930 webhooks
- **Plan**: Free (750/month) - sufficient for now
- **Upgrade at**: 700+/month

---

## Support

- **Full Guide**: `docs/ZAPIER_SETUP.md`
- **Report**: `ZAPIER_ACTIVATION_REPORT.md`
- **Tests**: `tests/zapier-integration-test.ts`
- **Dashboard**: http://localhost:3000/api/zapier/monitor

---

**Last Updated**: October 1, 2025 | **Status**: Production Ready ✅
