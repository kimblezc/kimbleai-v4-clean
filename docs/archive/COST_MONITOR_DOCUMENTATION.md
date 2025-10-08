# Cost Monitor Agent - Complete Documentation

## Overview

The Cost Monitor Agent is a comprehensive system designed to prevent runaway API costs for the KimbleAI system. It provides real-time monitoring, automatic throttling, intelligent alerts, and detailed analytics to protect against unexpected charges while maintaining system functionality.

## 🚀 Key Features

### Real-Time Cost Monitoring
- **OpenAI API Tracking**: Monitors all OpenAI services (GPT models, embeddings, Whisper, TTS)
- **Token Usage Tracking**: Detailed token consumption analysis
- **Request Monitoring**: Tracks API request frequency and patterns
- **Cost Calculation**: Accurate cost calculation based on latest OpenAI pricing

### Intelligent Limits & Throttling
- **Multi-Period Limits**: Daily, weekly, and monthly spending limits
- **Per-Request Limits**: Maximum cost and token limits per API call
- **Auto-Throttling**: Automatic service pause when limits are approached
- **Smart Recovery**: Configurable auto-resume after specified time

### Advanced Alert System
- **Email Notifications**: HTML and text email alerts with detailed usage information
- **Threshold Alerts**: Configurable percentage-based alert triggers (50%, 75%, 90%, 100%)
- **Emergency Contacts**: Critical alert escalation to designated personnel
- **Webhook Integration**: External system notifications via webhooks

### Comprehensive Analytics
- **Usage Trends**: Historical usage patterns and trend analysis
- **Cost Breakdown**: Detailed breakdown by service, model, and operation
- **Usage Patterns**: Peak hours, daily patterns, and seasonality analysis
- **Projections**: AI-powered cost projections and budget forecasting
- **Efficiency Metrics**: Cost-per-token, response times, and optimization recommendations

## 📁 File Structure

```
/app/api/agents/cost-monitor/
├── route.ts                 # Main API endpoint for cost monitoring operations

/lib/
├── cost-monitor.ts          # Core cost monitoring library
├── openai-cost-wrapper.ts   # OpenAI API wrapper with cost tracking
└── email-alert-system.ts   # Email notification system

/components/agents/
├── CostMonitorDashboard.tsx # Main dashboard component
├── CostMonitorConfig.tsx    # Configuration interface
└── CostAnalytics.tsx        # Analytics and reporting component

/sql/
└── cost_monitoring_schema.sql # Database schema for cost tracking
```

## 🛠️ Installation & Setup

### 1. Database Setup

Run the SQL schema to create the necessary tables:

```sql
-- Run this in your Supabase SQL Editor
\i cost_monitoring_schema.sql
```

Key tables created:
- `api_usage_tracking` - Main usage tracking table
- `user_cost_limits` - User-configurable limits
- `user_alert_config` - Alert configuration
- `cost_alerts` - Alert history
- `service_status` - Service pause/resume status

### 2. Environment Variables

Add these environment variables to your `.env.local`:

```env
# Email Configuration (required for alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@kimbleai.com

# OpenAI API (already configured)
OPENAI_API_KEY=your-openai-api-key

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL for email links
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Code Integration

The cost monitoring is automatically integrated into existing OpenAI API calls. The system uses a wrapper that:

1. **Checks service status** before API calls
2. **Validates per-request limits**
3. **Records actual usage** after API calls
4. **Triggers alerts** when thresholds are reached

## 🎯 Usage Guide

### Dashboard Access

The cost monitor can be accessed through three main components:

1. **Main Dashboard** (`/dashboard/cost-monitor`)
   - Real-time usage overview
   - Current limits and status
   - Service controls (pause/resume)

2. **Configuration Panel** (`/dashboard/cost-monitor/config`)
   - Set spending limits
   - Configure alert settings
   - Manage emergency contacts

3. **Analytics View** (`/dashboard/cost-monitor/analytics`)
   - Detailed usage analytics
   - Cost breakdowns and trends
   - Optimization recommendations

### API Endpoints

#### GET `/api/agents/cost-monitor`
Retrieve current usage statistics, limits, and alerts.

**Parameters:**
- `userId` - User ID (default: 'zach-admin-001')
- `period` - Time period ('daily', 'weekly', 'monthly')
- `service` - Filter by service ('openai', 'all')

**Response:**
```json
{
  "success": true,
  "data": {
    "currentUsage": {
      "cost": 45.67,
      "tokens": 892345,
      "requests": 1234,
      "periodStart": "2024-01-01T00:00:00Z",
      "periodEnd": "2024-01-02T00:00:00Z"
    },
    "limits": {
      "daily": { "cost": 50, "tokens": 1000000, "enabled": true },
      "weekly": { "cost": 200, "tokens": 5000000, "enabled": true },
      "monthly": { "cost": 500, "tokens": 20000000, "enabled": true }
    },
    "alerts": [...],
    "breakdown": [...],
    "trends": {...}
  }
}
```

#### POST `/api/agents/cost-monitor`
Update configuration or perform actions.

**Actions:**
- `update_limits` - Update spending limits
- `configure_alerts` - Configure alert settings
- `force_check` - Force usage check
- `pause_service` - Pause a service
- `resume_service` - Resume a service
- `reset_limits` - Reset to default limits

**Example:**
```json
{
  "action": "update_limits",
  "userId": "zach-admin-001",
  "limits": {
    "daily": { "cost": 100, "tokens": 2000000, "enabled": true }
  }
}
```

### Cost Monitoring Wrapper

The `CostMonitoredOpenAI` class automatically wraps OpenAI API calls:

```typescript
import { CostMonitoredOpenAI } from '@/lib/openai-cost-wrapper';

// Create cost-monitored client
const client = new CostMonitoredOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  userId: 'user-123',
  enforceThrottling: true,
  autoTrack: true
});

// Use exactly like normal OpenAI client
const completion = await client.chatCompletions({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }]
});

// Cost tracking happens automatically
```

## ⚙️ Configuration Options

### Spending Limits

Configure limits for different time periods:

```typescript
interface UsageLimits {
  daily: { cost: number; tokens: number; enabled: boolean };
  weekly: { cost: number; tokens: number; enabled: boolean };
  monthly: { cost: number; tokens: number; enabled: boolean };
  perRequest: { maxCost: number; maxTokens: number; enabled: boolean };
}
```

**Default Limits:**
- Daily: $50, 1M tokens
- Weekly: $200, 5M tokens
- Monthly: $500, 20M tokens
- Per-Request: $5, 100K tokens

### Alert Configuration

Configure when and how to receive alerts:

```typescript
interface AlertConfig {
  email: {
    enabled: boolean;
    recipients: string[];
    thresholds: number[]; // [50, 75, 90, 100] percentage
  };
  dashboard: {
    enabled: boolean;
    severity: 'info' | 'warning' | 'error' | 'critical';
  };
  autoThrottle: {
    enabled: boolean;
    pauseAt: number; // percentage
    resumeAfter: number; // minutes
  };
  webhook?: {
    enabled: boolean;
    url: string;
    secret?: string;
  };
}
```

### Emergency Controls

- **Maintenance Mode**: Pause all API services immediately
- **Emergency Contacts**: Escalate critical alerts
- **Service Override**: Manual service control regardless of limits

## 📊 Analytics & Reporting

### Available Metrics

1. **Usage Metrics**
   - Total cost by period
   - Token consumption
   - Request volume
   - Service distribution

2. **Efficiency Metrics**
   - Cost per token
   - Tokens per request
   - Average response time
   - Error rates

3. **Trend Analysis**
   - Usage growth patterns
   - Cost trends over time
   - Peak usage identification
   - Seasonality detection

4. **Projections**
   - Daily/weekly/monthly projections
   - Budget burn rate
   - Optimization opportunities

### Export Options

Data can be exported in multiple formats:
- **CSV**: Raw data for spreadsheet analysis
- **JSON**: Structured data for external systems
- **PDF**: Formatted reports for sharing

## 🔧 Advanced Features

### Pricing Engine

The system includes a comprehensive pricing engine that stays current with OpenAI pricing:

```typescript
export const OPENAI_PRICING = {
  'gpt-4o': {
    input: 2.50 / 1000000,  // $2.50 per 1M input tokens
    output: 10.00 / 1000000, // $10.00 per 1M output tokens
  },
  'gpt-4o-mini': {
    input: 0.15 / 1000000,  // $0.15 per 1M input tokens
    output: 0.60 / 1000000, // $0.60 per 1M output tokens
  },
  // ... more models
};
```

### Anomaly Detection

The system includes basic anomaly detection that identifies:
- Unusual spending spikes
- Abnormal token consumption
- Request pattern changes
- Error rate increases

### Webhook Integration

Configure webhooks to integrate with external systems:

```typescript
// Webhook payload example
{
  "type": "cost_alert",
  "timestamp": "2024-01-01T12:00:00Z",
  "userId": "user-123",
  "alert": {
    "period": "daily",
    "percentage": 85.5,
    "usage": { "cost": 42.75, "tokens": 855000 },
    "limits": { "cost": 50, "tokens": 1000000 }
  }
}
```

## 🛡️ Security Features

### Row Level Security (RLS)

All cost monitoring tables implement RLS policies:
- Users can only access their own data
- Admins can access all data
- Service accounts have limited access

### Data Privacy

- No sensitive user data is stored in cost tracking
- Only usage metrics and metadata are recorded
- Email addresses are stored securely for notifications

### Access Control

- API endpoints require proper authentication
- Admin functions are restricted to admin users
- Emergency controls have additional safeguards

## 🔍 Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check SMTP configuration
   - Verify email credentials
   - Test with `/api/agents/cost-monitor/test-email`

2. **Costs not tracking**
   - Ensure OpenAI wrapper is being used
   - Check database connectivity
   - Verify user ID is correct

3. **Throttling not working**
   - Check if throttling is enabled in config
   - Verify limits are set correctly
   - Review service status table

4. **Missing analytics data**
   - Ensure sufficient data exists
   - Check date range selection
   - Verify database permissions

### Debug Endpoints

- `GET /api/agents/cost-monitor/debug` - System status
- `POST /api/agents/cost-monitor/test-email` - Test email system
- `GET /api/agents/cost-monitor/health` - Health check

## 📈 Performance Considerations

### Database Optimization

- Indexes are created for common query patterns
- Partitioning by date for large datasets
- Regular cleanup of old data (90-day retention)

### API Performance

- Connection pooling for email transport
- Async processing for non-critical operations
- Caching for frequently accessed data

### Monitoring Overhead

The cost monitoring adds minimal overhead:
- ~5ms per API call for tracking
- Async processing for alerts
- Batched database operations

## 🔄 Maintenance

### Regular Tasks

1. **Weekly**: Review alert configurations
2. **Monthly**: Clean up old usage data
3. **Quarterly**: Update pricing information
4. **Annually**: Review and update limits

### Data Retention

- Usage data: 90 days (configurable)
- Alert history: 30 days for acknowledged alerts
- Configuration changes: Permanent audit log

### Updates

When updating the system:
1. Backup existing configuration
2. Test new features in development
3. Update pricing data if needed
4. Migrate configuration schema if required

## 🆘 Emergency Procedures

### Cost Overrun Response

1. **Immediate**: Enable maintenance mode to pause all services
2. **Short-term**: Review usage patterns and identify cause
3. **Medium-term**: Adjust limits and improve monitoring
4. **Long-term**: Implement additional safeguards

### System Recovery

If the cost monitoring system fails:
1. API calls will continue without tracking
2. Manual usage review required
3. Restore from backup configuration
4. Verify all tracking is working

## 📞 Support & Contact

For issues with the Cost Monitor Agent:

1. **Technical Issues**: Check logs and debug endpoints
2. **Configuration Help**: Review this documentation
3. **Emergency**: Use emergency contacts configured in system
4. **Updates**: Monitor OpenAI pricing changes and system updates

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Compatible with**: KimbleAI v4.0+