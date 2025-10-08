# Security Perimeter Agent - Configuration and User Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [API Documentation](#api-documentation)
6. [Dashboard Usage](#dashboard-usage)
7. [Security Features](#security-features)
8. [Monitoring and Alerts](#monitoring-and-alerts)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## Overview

The Security Perimeter Agent is a comprehensive security monitoring and threat detection system designed to protect kimbleai.com from various security threats while maintaining seamless access for legitimate users. It provides multi-tier authentication, real-time threat analysis, intelligent rate limiting, and comprehensive security analytics.

### Key Features

- **Multi-tier Authentication**: Guest, authenticated, and premium user tiers with different access levels
- **Real-time Threat Detection**: AI-powered analysis of request patterns, user agents, and behavior
- **Intelligent Rate Limiting**: Dynamic rate limiting based on user tier and behavior
- **DDoS Protection**: Automatic detection and mitigation of distributed denial-of-service attacks
- **Behavior Analytics**: User behavior analysis and risk scoring
- **Security Dashboard**: Real-time monitoring and management interface
- **Comprehensive Logging**: Detailed security event logging and audit trails

## Architecture

### Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Middleware    │    │ Security Agent  │    │    Database     │
│                 │────│                 │────│                 │
│ - Request       │    │ - Threat        │    │ - Events        │
│   Monitoring    │    │   Analysis      │    │ - Sessions      │
│ - Rate Limiting │    │ - Risk Scoring  │    │ - IP Reputation │
│ - Header        │    │ - Behavior      │    │ - Policies      │
│   Validation    │    │   Analysis      │    │ - Alerts        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Dashboard     │
                    │                 │
                    │ - Analytics     │
                    │ - Monitoring    │
                    │ - Management    │
                    │ - Alerts        │
                    └─────────────────┘
```

### Data Flow

1. **Request Processing**: Every request passes through the security middleware
2. **Threat Analysis**: The security agent analyzes request patterns and behavior
3. **Risk Assessment**: Risk scores are calculated based on multiple factors
4. **Decision Making**: Allow/block decisions are made based on risk thresholds
5. **Logging**: All security events are logged to the database
6. **Dashboard Updates**: Real-time updates are pushed to the security dashboard

## Installation

### Prerequisites

- Next.js 13+ application
- Supabase database
- NextAuth.js for authentication
- Node.js 18+

### Step 1: Database Setup

Run the security schema SQL file to create the necessary tables:

```sql
-- Run this in your Supabase SQL Editor
\i sql/security_perimeter_schema.sql
```

### Step 2: Environment Variables

Add the following environment variables to your `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NextAuth Configuration
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=your_app_url

# Security Configuration
SECURITY_PERIMETER_ENABLED=true
SECURITY_LOG_LEVEL=info
SECURITY_BLOCK_THRESHOLD=0.8
```

### Step 3: Integration

The security system is automatically integrated through the middleware. No additional setup is required if the files are in place:

- `lib/security-perimeter.ts` - Core security logic
- `middleware/security-monitoring.ts` - Request monitoring
- `middleware.ts` - Main middleware integration
- `app/api/agents/security-perimeter/route.ts` - API endpoints
- `components/agents/SecurityDashboard.tsx` - Management interface

## Configuration

### Security Thresholds

Default risk score thresholds can be adjusted in the security configuration:

```typescript
export const SECURITY_CONFIG = {
  THREAT_THRESHOLDS: {
    SUSPICIOUS_ACTIVITY: 0.7,  // 70% risk score
    HIGH_RISK: 0.8,           // 80% risk score
    CRITICAL_THREAT: 0.9,     // 90% risk score
  },
};
```

### Rate Limits

Configure rate limits for different user tiers:

```typescript
RATE_LIMITS: {
  GUEST: { requests: 10, window: 60000 },        // 10 req/min
  AUTHENTICATED: { requests: 100, window: 60000 }, // 100 req/min
  PREMIUM: { requests: 1000, window: 60000 },     // 1000 req/min
},
```

### Session Security

Configure session timeout and security settings:

```typescript
SESSION_SECURITY: {
  MAX_IDLE_TIME: 30 * 60 * 1000,        // 30 minutes
  TOKEN_ROTATION_INTERVAL: 15 * 60 * 1000, // 15 minutes
  MAX_CONCURRENT_SESSIONS: 5,            // Max sessions per user
},
```

### DDoS Protection

Configure DDoS protection thresholds:

```typescript
DDOS_PROTECTION: {
  MAX_REQUESTS_PER_SECOND: 20,
  BURST_THRESHOLD: 50,
  BLOCK_DURATION: 5 * 60 * 1000, // 5 minutes
},
```

## API Documentation

### GET /api/agents/security-perimeter

#### Get Security Status
```http
GET /api/agents/security-perimeter?action=status
```

Returns the current security system status (public endpoint).

#### Get Security Analytics
```http
GET /api/agents/security-perimeter?action=analytics&timeRange=24h
```

**Parameters:**
- `timeRange`: `1h`, `24h`, `7d`, `30d`

**Response:**
```json
{
  "success": true,
  "analytics": {
    "totalEvents": 1234,
    "threatEvents": 56,
    "blockedRequests": 12,
    "uniqueIPs": 89,
    "threatRate": 0.045
  }
}
```

#### Get Active Sessions
```http
GET /api/agents/security-perimeter?action=sessions
```

Returns list of active security sessions.

#### Get Recent Threats
```http
GET /api/agents/security-perimeter?action=threats
```

Returns recent high-risk security events.

### POST /api/agents/security-perimeter

#### Terminate Session
```http
POST /api/agents/security-perimeter
Content-Type: application/json

{
  "action": "terminate_session",
  "sessionId": "session_id_here"
}
```

#### Block IP Address
```http
POST /api/agents/security-perimeter
Content-Type: application/json

{
  "action": "block_ip",
  "ip": "192.168.1.100",
  "duration": 300000
}
```

#### Generate Security Report
```http
POST /api/agents/security-perimeter
Content-Type: application/json

{
  "action": "generate_report",
  "reportType": "security_summary",
  "timeRangeHours": 24
}
```

## Dashboard Usage

### Accessing the Dashboard

The Security Dashboard is available to admin users at `/dashboard/security` (you'll need to create the route):

```tsx
import SecurityDashboard from '@/components/agents/SecurityDashboard';

export default function SecurityPage() {
  return <SecurityDashboard />;
}
```

### Dashboard Features

#### Overview Tab
- **Key Metrics**: Total events, threats, blocked requests, unique IPs
- **Severity Breakdown**: Visual breakdown of event severity levels
- **Top Threats**: Most common threat types detected

#### Threats Tab
- **Recent Events**: Detailed list of security events
- **Risk Scores**: Color-coded risk levels
- **Event Details**: Expandable threat information

#### Sessions Tab
- **Active Sessions**: Real-time session monitoring
- **User Tiers**: Visual tier indicators
- **Session Actions**: Terminate suspicious sessions

#### Configuration Tab
- **System Status**: Current security system state
- **Rate Limits**: Current rate limiting configuration
- **Threat Thresholds**: Risk score thresholds

### Real-time Updates

The dashboard automatically refreshes every 30 seconds to provide real-time security monitoring.

## Security Features

### Threat Detection

The system analyzes multiple factors to detect threats:

1. **User Agent Analysis**
   - Bot detection patterns
   - Unusual browser signatures
   - Missing standard headers

2. **Request Path Analysis**
   - SQL injection patterns
   - XSS attempt detection
   - Directory traversal attempts
   - Admin path access without auth

3. **Header Analysis**
   - Missing standard headers
   - Suspicious proxy chains
   - Automation tool detection

4. **Behavioral Analysis**
   - Request frequency patterns
   - Pattern diversity analysis
   - Escalating risk scores

5. **Geolocation Analysis**
   - IP reputation checking
   - Geographic anomaly detection
   - VPN/proxy detection

### Risk Scoring

Each request receives a risk score from 0.0 to 1.0:

- **0.0 - 0.3**: Low risk (normal traffic)
- **0.3 - 0.7**: Medium risk (monitor closely)
- **0.7 - 0.8**: High risk (suspicious activity)
- **0.8 - 0.9**: Critical risk (likely threat)
- **0.9 - 1.0**: Maximum risk (block immediately)

### User Tiers

The system supports three user tiers with different permissions:

#### Guest Users
- Rate limit: 10 requests/minute
- Permissions: Read public content only
- Additional security checks applied

#### Authenticated Users
- Rate limit: 100 requests/minute
- Permissions: Read/write own content
- Reduced security friction

#### Premium Users
- Rate limit: 1000 requests/minute
- Permissions: Full access to features
- Minimal security friction

## Monitoring and Alerts

### Automatic Alerts

The system automatically creates alerts for:

- **Critical Security Events**: Risk score ≥ 0.9
- **DDoS Attempts**: Burst threshold exceeded
- **Authentication Anomalies**: Multiple failed logins
- **Service Degradation**: High block rates

### Alert Severity Levels

- **Low**: Informational events
- **Medium**: Suspicious activity requiring monitoring
- **High**: Threats requiring investigation
- **Critical**: Immediate threats requiring action

### Notification Channels

Configure notification channels in the dashboard:

- **Email Alerts**: Send to admin email addresses
- **Dashboard Notifications**: Real-time in-app alerts
- **Webhook Integration**: External system notifications

## Troubleshooting

### Common Issues

#### False Positives

**Symptom**: Legitimate users being blocked
**Solution**:
1. Check user agent patterns
2. Adjust threat thresholds
3. Whitelist specific IPs if needed
4. Review rate limiting settings

#### High Resource Usage

**Symptom**: Increased server load
**Solution**:
1. Enable request caching
2. Optimize database queries
3. Adjust cleanup intervals
4. Consider Redis for session storage

#### Missing Security Events

**Symptom**: Expected events not appearing in logs
**Solution**:
1. Check middleware configuration
2. Verify database permissions
3. Review RLS policies
4. Check error logs

### Debug Mode

Enable debug mode for detailed logging:

```env
SECURITY_LOG_LEVEL=debug
```

This will log additional information about security decisions and risk calculations.

### Performance Monitoring

Monitor these metrics for optimal performance:

- **Request Processing Time**: Should be < 50ms
- **Database Query Time**: Should be < 10ms
- **Memory Usage**: Monitor for leaks
- **CPU Usage**: Should remain stable

## Best Practices

### Security Configuration

1. **Regular Updates**: Review and update threat patterns monthly
2. **Threshold Tuning**: Adjust thresholds based on actual traffic patterns
3. **Whitelist Management**: Maintain clean whitelists for known good IPs
4. **Alert Management**: Regularly review and close resolved alerts

### Database Maintenance

1. **Regular Cleanup**: Archive old security events (>30 days)
2. **Index Optimization**: Monitor query performance and optimize indexes
3. **Backup Strategy**: Include security tables in backup procedures
4. **Capacity Planning**: Monitor database growth and plan scaling

### Incident Response

1. **Response Procedures**: Document incident response procedures
2. **Escalation Paths**: Define clear escalation procedures
3. **Communication Plans**: Prepare communication templates
4. **Recovery Procedures**: Document system recovery steps

### Compliance

1. **Data Retention**: Follow data retention policies
2. **Privacy Protection**: Ensure PII is properly handled
3. **Audit Requirements**: Maintain compliance with audit requirements
4. **Legal Considerations**: Consider legal implications of blocking users

## Advanced Configuration

### Custom Threat Patterns

Add custom threat patterns to the database:

```sql
INSERT INTO threat_intelligence (
  threat_type, indicator, indicator_type, severity, source, description
) VALUES (
  'custom_pattern', 'your_regex_pattern', 'regex', 'medium', 'custom', 'Custom threat pattern'
);
```

### Integration with External Services

Integrate with external threat intelligence feeds:

```typescript
// Example: VirusTotal API integration
async function checkIPReputation(ip: string) {
  // Implement external API call
  // Update IP reputation based on results
}
```

### Custom Risk Scoring

Implement custom risk scoring algorithms:

```typescript
function calculateCustomRiskScore(request: SecurityRequest): number {
  // Implement custom risk calculation
  // Return score between 0.0 and 1.0
}
```

## Support and Maintenance

### Regular Maintenance Tasks

- **Weekly**: Review security alerts and metrics
- **Monthly**: Update threat patterns and thresholds
- **Quarterly**: Security configuration review
- **Annually**: Full security audit and penetration testing

### Monitoring Checklist

- [ ] Security event volume trends
- [ ] False positive rates
- [ ] System performance metrics
- [ ] Alert response times
- [ ] Database performance
- [ ] User experience impact

### Support Contacts

- **Technical Issues**: Check error logs and troubleshooting guide
- **Security Incidents**: Follow incident response procedures
- **Configuration Help**: Review this documentation
- **Feature Requests**: Document and prioritize requests

---

## Appendix

### Security Event Types

| Event Type | Description | Typical Risk Score |
|------------|-------------|-------------------|
| request | Normal request processing | 0.0 - 0.3 |
| login | User authentication | 0.0 - 0.2 |
| logout | User logout | 0.0 |
| threat_detected | Automated threat detection | 0.7 - 1.0 |
| rate_limit_exceeded | Rate limit violation | 0.6 - 0.8 |
| ddos_attempt | DDoS attack detection | 0.9 - 1.0 |
| suspicious_activity | Unusual behavior pattern | 0.5 - 0.8 |
| authentication_failure | Failed login attempt | 0.3 - 0.7 |
| authorization_failure | Access denied | 0.2 - 0.5 |

### Default Security Headers

```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Database Schema Summary

- **security_events**: Main event logging table
- **security_sessions**: Active session tracking
- **ip_reputation**: IP address reputation scoring
- **rate_limits**: Rate limiting counters
- **threat_intelligence**: Threat patterns and indicators
- **security_policies**: Security policy definitions
- **security_alerts**: Alert management
- **security_configurations**: System configuration
- **security_audit_log**: Audit trail

This completes the Security Perimeter Agent system documentation and configuration guide.