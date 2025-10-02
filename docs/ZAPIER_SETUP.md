# Zapier Integration Setup Guide

Complete guide to activating and configuring Zapier integration for KimbleAI v4.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Zap Configuration](#zap-configuration)
5. [Event Types](#event-types)
6. [Webhook Payloads](#webhook-payloads)
7. [Testing](#testing)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Configuration](#advanced-configuration)

---

## Overview

KimbleAI's Zapier integration enables automatic workflow automation by sending webhooks when key events occur:

- **Conversation Saved**: After each chat interaction
- **Transcription Complete**: When audio transcription finishes
- **Photo Uploaded**: After photo analysis
- **Urgent Notifications**: When urgent content is detected
- **Daily Summary**: End-of-day activity report

### Current Status
- **Plan**: Free (750 tasks/month)
- **Daily Limit**: 30 tasks/day
- **Active Zaps**: Ready to activate (currently 0/750 used)

---

## Prerequisites

### 1. Zapier Account
- Sign up at [zapier.com](https://zapier.com)
- Free plan provides 750 tasks/month
- Pro plan recommended for production use

### 2. Environment Variables
Ensure these are set in your `.env.local`:

```bash
# Zapier webhook URLs
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/YOUR_ID/YOUR_HOOK/
ZAPIER_MEMORY_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/YOUR_ID/YOUR_MEMORY_HOOK/

# Security
ZAPIER_WEBHOOK_SECRET=your-secret-key-here

# Supabase (required for logging)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Database Setup
Create the logging table in Supabase:

```sql
CREATE TABLE zapier_webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  success BOOLEAN NOT NULL,
  webhook_called BOOLEAN NOT NULL,
  webhook_id TEXT,
  error TEXT,
  payload_preview TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_zapier_logs_event_type ON zapier_webhook_logs(event_type);
CREATE INDEX idx_zapier_logs_user_id ON zapier_webhook_logs(user_id);
CREATE INDEX idx_zapier_logs_timestamp ON zapier_webhook_logs(timestamp DESC);
CREATE INDEX idx_zapier_logs_success ON zapier_webhook_logs(success);
```

---

## Quick Start

### Step 1: Create Your First Zap

1. Log into [Zapier](https://zapier.com)
2. Click "Create Zap"
3. Configure trigger:
   - **App**: Webhooks by Zapier
   - **Event**: Catch Hook
   - **Copy the webhook URL** (we'll use this)

### Step 2: Add Webhook URL to Environment

```bash
# Add to .env.local
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/YOUR_ID/YOUR_HOOK/
```

### Step 3: Test the Connection

```bash
# Send a test webhook
curl -X POST http://localhost:3000/api/zapier/monitor \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "conversation_saved",
    "userId": "zach",
    "testData": {
      "test": true,
      "message": "Testing Zapier integration"
    }
  }'
```

### Step 4: Configure Zap Action

In Zapier, add an action after the webhook trigger:
- **Examples**: Gmail (send email), Slack (post message), Google Sheets (add row), etc.
- Map webhook data to action fields
- Test the Zap
- **Turn it on!**

---

## Zap Configuration

### Recommended Zaps to Create

#### 1. Conversation Auto-Organizer
**Trigger**: Webhook (`conversation_saved`)
**Actions**:
- Google Sheets: Add row with conversation details
- Gmail: Send summary email (if important)
- Notion: Create page in conversation log

#### 2. Transcription Notification
**Trigger**: Webhook (`transcription_complete`)
**Actions**:
- Slack: Post message with action items
- Trello: Create card for each action item
- Google Calendar: Schedule follow-up if needed

#### 3. Photo Analysis Alert
**Trigger**: Webhook (`photo_uploaded`)
**Actions**:
- Google Drive: Save analysis to folder
- Email: Send analysis report
- Airtable: Log photo metadata

#### 4. Urgent Notification System
**Trigger**: Webhook (`urgent_notification`)
**Filter**: Only if `priority = "urgent"`
**Actions**:
- SMS: Send text message
- Slack: Post to #urgent channel with @channel
- PagerDuty: Create incident

#### 5. Daily Summary Report
**Trigger**: Webhook (`daily_summary`)
**Actions**:
- Gmail: Send daily report email
- Google Docs: Append to daily log
- Slack: Post summary to #daily-updates

---

## Event Types

### 1. Conversation Saved

**Trigger**: After each chat interaction
**Frequency**: ~5-20/day per user
**Priority**: Low

**Payload**:
```json
{
  "eventType": "conversation_saved",
  "userId": "zach",
  "priority": "low",
  "timestamp": "2025-10-01T12:00:00Z",
  "data": {
    "conversationId": "conv-abc123",
    "messageCount": 2,
    "lastMessage": "What's the weather like today?",
    "metadata": {
      "storageLocation": "google-drive",
      "knowledgeItemsFound": 5,
      "factsExtracted": 2,
      "modelUsed": "gpt-4o"
    }
  }
}
```

### 2. Transcription Complete

**Trigger**: After audio transcription finishes
**Frequency**: ~1-5/day per user
**Priority**: Medium

**Payload**:
```json
{
  "eventType": "transcription_complete",
  "userId": "zach",
  "priority": "medium",
  "timestamp": "2025-10-01T14:30:00Z",
  "data": {
    "transcriptionId": "trans-xyz789",
    "textPreview": "Meeting notes from today's standup...",
    "fullTextLength": 2500,
    "actionItems": [
      "Review pull request #123",
      "Schedule follow-up with client",
      "Update documentation"
    ],
    "tags": ["meeting", "standup", "action-items"],
    "metadata": {
      "filename": "meeting-recording.mp3",
      "duration": 1800,
      "speakers": 3,
      "projectCategory": "work",
      "importanceScore": 0.85
    }
  }
}
```

### 3. Photo Uploaded

**Trigger**: After photo analysis completes
**Frequency**: ~2-10/day per user
**Priority**: Low (High if urgent tag detected)

**Payload**:
```json
{
  "eventType": "photo_uploaded",
  "userId": "zach",
  "priority": "low",
  "timestamp": "2025-10-01T16:00:00Z",
  "data": {
    "photoId": "photo_1696176000_abc123",
    "analysisPreview": "D&D character sheet showing level 5 wizard...",
    "tags": ["dnd", "character-sheet", "wizard"],
    "metadata": {
      "fileName": "character.jpg",
      "fileSize": 2048576,
      "fileType": "image/jpeg",
      "analysisType": "dnd",
      "projectCategory": "gaming",
      "vectorSearchEnabled": true
    }
  }
}
```

### 4. Urgent Notification

**Trigger**: When urgent content is detected
**Frequency**: ~0-2/day per user
**Priority**: Urgent

**Payload**:
```json
{
  "eventType": "urgent_notification",
  "userId": "zach",
  "priority": "urgent",
  "timestamp": "2025-10-01T09:00:00Z",
  "data": {
    "title": "Urgent Transcription Detected",
    "message": "Transcription contains urgent items: Fix production bug ASAP, Call client immediately",
    "source": "transcription",
    "metadata": {
      "transcriptionId": "trans-urgent-123",
      "filename": "urgent-meeting.mp3"
    }
  }
}
```

### 5. Daily Summary

**Trigger**: End of day (can be scheduled)
**Frequency**: 1/day per user
**Priority**: Low

**Payload**:
```json
{
  "eventType": "daily_summary",
  "userId": "zach",
  "priority": "low",
  "timestamp": "2025-10-01T23:00:00Z",
  "data": {
    "conversationCount": 15,
    "transcriptionCount": 3,
    "photoCount": 7,
    "actionItems": [
      "Review project proposal",
      "Schedule team meeting",
      "Update documentation"
    ],
    "topTopics": ["work", "meetings", "deadlines", "development"]
  }
}
```

---

## Webhook Payloads

### Common Fields

All webhooks include:
- `eventType`: Type of event (see Event Types)
- `userId`: User who triggered the event
- `priority`: Event priority (low, medium, high, urgent)
- `timestamp`: ISO 8601 timestamp
- `data`: Event-specific data

### Headers

```
Content-Type: application/json
Authorization: Bearer YOUR_WEBHOOK_SECRET
```

---

## Testing

### 1. Manual Test via Monitoring Endpoint

```bash
# Test conversation webhook
curl -X POST http://localhost:3000/api/zapier/monitor \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "conversation_saved",
    "userId": "zach",
    "testData": {
      "conversationId": "test-conv-123",
      "messageCount": 2,
      "lastMessage": "Test message"
    }
  }'
```

### 2. Run Automated Tests

```bash
# Run test suite
npm test tests/zapier-integration-test.ts

# Run specific test
npm test tests/zapier-integration-test.ts -t "should send conversation saved webhook"
```

### 3. Test via API Routes

```bash
# Test conversation webhook (real chat)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello, test message"}],
    "userId": "zach"
  }'

# Check if webhook was sent
curl http://localhost:3000/api/zapier/monitor?userId=zach
```

### 4. Verify in Zapier

1. Go to your Zap
2. Click "Zap History"
3. Check recent runs
4. Verify payload data

---

## Monitoring

### Usage Dashboard

Access the monitoring endpoint:

```bash
# Get overall stats
curl http://localhost:3000/api/zapier/monitor

# Get user-specific stats
curl http://localhost:3000/api/zapier/monitor?userId=zach

# Get specific event type stats
curl http://localhost:3000/api/zapier/monitor?eventType=transcription_complete&days=7
```

### Response Example

```json
{
  "success": true,
  "timestamp": "2025-10-01T12:00:00Z",
  "currentUsage": {
    "dailyCount": 12,
    "dailyLimit": 30,
    "date": "2025-10-01",
    "percentOfDailyLimit": 40
  },
  "planLimits": {
    "plan": "Free",
    "monthlyLimit": 750,
    "dailyLimit": 30,
    "estimatedMonthlyUsage": 360,
    "percentUsed": 48
  },
  "analytics": {
    "totalCalls": 125,
    "successfulCalls": 122,
    "failedCalls": 3,
    "successRate": 97.6,
    "averageCallsPerDay": 17.86,
    "peakHour": "14:00"
  },
  "summary": {
    "healthStatus": "excellent",
    "mostActiveUser": "zach",
    "mostCommonEventType": "conversation_saved"
  }
}
```

### Key Metrics to Monitor

1. **Success Rate**: Should be >95%
2. **Daily Usage**: Should stay under 30/day
3. **Monthly Projection**: Should stay under 750/month
4. **Failed Webhooks**: Investigate if >5% failure rate

---

## Troubleshooting

### Webhooks Not Being Sent

**Check 1: Environment Variables**
```bash
# Verify webhook URLs are set
echo $ZAPIER_WEBHOOK_URL
echo $ZAPIER_MEMORY_WEBHOOK_URL
```

**Check 2: Check Logs**
```bash
# Check application logs
tail -f logs/application.log | grep Zapier

# Check monitoring endpoint
curl http://localhost:3000/api/zapier/monitor
```

**Check 3: Test Webhook Manually**
```bash
curl -X POST http://localhost:3000/api/zapier/monitor \
  -H "Content-Type: application/json" \
  -d '{"eventType":"conversation_saved","userId":"zach","testData":{"test":true}}'
```

### Webhooks Failing

**Error: "Webhook failed after retries"**
- Check Zapier webhook URL is correct
- Verify Zapier Zap is turned on
- Check Zapier Zap history for errors
- Test webhook URL with curl directly

**Error: "Daily webhook limit reached"**
- Current limit: 30/day (Free plan)
- Upgrade to Zapier Pro for higher limits
- Optimize which events trigger webhooks
- Disable less important event types temporarily

**Error: "Webhooks not configured"**
- Add ZAPIER_WEBHOOK_URL to .env.local
- Restart development server
- Verify environment variables loaded

### Database Issues

**Error: "Failed to track webhook call"**
- Verify zapier_webhook_logs table exists
- Check Supabase connection
- Verify SUPABASE_SERVICE_ROLE_KEY is set

```sql
-- Verify table exists
SELECT * FROM zapier_webhook_logs LIMIT 1;

-- Check recent logs
SELECT * FROM zapier_webhook_logs
ORDER BY timestamp DESC
LIMIT 10;
```

### Performance Issues

**Slow webhook sending**
- Webhooks are async (don't block responses)
- Check network latency to Zapier
- Verify timeout settings (10 seconds default)

**High failure rate**
- Check Zapier service status
- Verify webhook URLs
- Review retry configuration

---

## Advanced Configuration

### Custom Event Types

Add custom event types to `lib/zapier-client.ts`:

```typescript
export interface ZapierEvent {
  eventType: 'conversation_saved'
    | 'transcription_complete'
    | 'photo_uploaded'
    | 'urgent_notification'
    | 'daily_summary'
    | 'action_items'
    | 'custom_event'; // Add your custom event
  userId: string;
  data: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  retryOnFailure?: boolean;
}
```

### Per-User Configuration

Enable/disable webhooks per user:

```typescript
// In lib/zapier-client.ts, add user preferences check:
const { data: userPrefs } = await supabase
  .from('user_preferences')
  .select('zapier_enabled')
  .eq('user_id', userId)
  .single();

if (!userPrefs?.zapier_enabled) {
  console.log('Zapier disabled for user:', userId);
  return { success: false, webhookCalled: false };
}
```

### Webhook Filtering

Filter which webhooks are sent based on conditions:

```typescript
// Only send if important
if (event.priority === 'urgent' || importanceScore > 0.8) {
  await zapierClient.sendEvent(event);
}

// Only send during business hours
const hour = new Date().getHours();
if (hour >= 9 && hour <= 17) {
  await zapierClient.sendEvent(event);
}
```

### Batch Webhooks

Send multiple events in a single webhook:

```typescript
// Collect events throughout the day
const batchedEvents = [];
batchedEvents.push(event);

// Send batch at end of day
if (shouldSendBatch()) {
  await zapierClient.sendEvent({
    eventType: 'daily_batch',
    userId,
    data: { events: batchedEvents }
  });
}
```

### Custom Retry Logic

Modify retry behavior in `lib/zapier-client.ts`:

```typescript
// Current: 3 retries with exponential backoff
// Custom: 5 retries with custom delays
const maxRetries = 5;
const retryDelays = [1000, 2000, 5000, 10000, 30000]; // ms

for (let attempt = 0; attempt < maxRetries; attempt++) {
  try {
    // Send webhook
    if (response.ok) break;
  } catch (error) {
    if (attempt < maxRetries - 1) {
      await new Promise(resolve =>
        setTimeout(resolve, retryDelays[attempt])
      );
    }
  }
}
```

### Webhook Signing

Add webhook signature verification:

```typescript
import crypto from 'crypto';

// Generate signature
const signature = crypto
  .createHmac('sha256', ZAPIER_WEBHOOK_SECRET!)
  .update(JSON.stringify(payload))
  .digest('hex');

// Add to headers
headers: {
  'X-Webhook-Signature': signature,
  'Authorization': `Bearer ${ZAPIER_WEBHOOK_SECRET}`
}
```

---

## Production Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] Database table created
- [ ] All Zaps created and turned on
- [ ] Webhook URLs tested
- [ ] Monitoring endpoint accessible
- [ ] Error handling tested
- [ ] Daily limits configured
- [ ] Urgent notification Zap tested
- [ ] Success rate monitoring enabled
- [ ] Backup webhook URLs configured (optional)

---

## Support

### Resources
- [Zapier Webhooks Documentation](https://zapier.com/help/create/code-webhooks/trigger-zaps-from-webhooks)
- [KimbleAI API Documentation](../README.md)
- [Monitoring Endpoint](http://localhost:3000/api/zapier/monitor)

### Common Questions

**Q: How many webhooks can I send per month?**
A: Free plan: 750/month. Pro plan: 20,000+/month. We've implemented a 30/day soft limit.

**Q: What happens if I exceed the limit?**
A: Webhooks are queued and sent the next day. No data is lost.

**Q: Can I send to multiple Zaps?**
A: Yes! Create multiple Zaps with the same webhook URL, or use different URLs for different event types.

**Q: Are webhooks synchronous or asynchronous?**
A: Asynchronous. They don't block API responses. Failures are logged but don't affect user experience.

**Q: How do I debug failed webhooks?**
A: Check the monitoring endpoint, Zapier Zap history, and application logs.

---

## Examples

### Example 1: Send Email on Urgent Transcription

**Zap Configuration:**
1. Trigger: Webhooks by Zapier (Catch Hook)
2. Filter: Only if `data.metadata.hasUrgentTag` is `true`
3. Action: Gmail - Send Email
   - To: your-email@example.com
   - Subject: `Urgent: {{data.actionItems.0}}`
   - Body: `Action items: {{data.actionItems}}`

### Example 2: Log All Conversations to Google Sheets

**Zap Configuration:**
1. Trigger: Webhooks by Zapier (Catch Hook)
2. Filter: Only if `eventType` is `conversation_saved`
3. Action: Google Sheets - Create Spreadsheet Row
   - Spreadsheet: Conversation Log
   - Worksheet: Sheet1
   - Fields:
     - Date: `{{timestamp}}`
     - User: `{{userId}}`
     - Message: `{{data.lastMessage}}`
     - Model: `{{data.metadata.modelUsed}}`

### Example 3: Post Transcription Summary to Slack

**Zap Configuration:**
1. Trigger: Webhooks by Zapier (Catch Hook)
2. Filter: Only if `eventType` is `transcription_complete`
3. Action: Slack - Send Channel Message
   - Channel: #transcriptions
   - Message:
     ```
     New transcription completed!
     File: {{data.metadata.filename}}
     Duration: {{data.metadata.duration}}s
     Action Items:
     {{data.actionItems}}
     ```

---

**Last Updated**: October 1, 2025
**Version**: 1.0
**Status**: Active Integration Ready
