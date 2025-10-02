// lib/email-alert-system.ts
// Email alert system for cost monitoring and other notifications

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface EmailAlert {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  template: 'cost_alert' | 'service_paused' | 'limit_exceeded' | 'weekly_report' | 'custom';
  data: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  userId?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailAlertSystem {
  private static instance: EmailAlertSystem;
  private transporter: nodemailer.Transporter | null = null;
  private initialized = false;

  private constructor() {
    this.initializeTransporter();
  }

  public static getInstance(): EmailAlertSystem {
    if (!EmailAlertSystem.instance) {
      EmailAlertSystem.instance = new EmailAlertSystem();
    }
    return EmailAlertSystem.instance;
  }

  private async initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // Use TLS
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
        pool: true, // Enable connection pooling
        maxConnections: 5,
        maxMessages: 100,
      });

      // Test the connection
      await this.transporter.verify();
      this.initialized = true;
      console.log('[EMAIL] SMTP transporter initialized successfully');
    } catch (error) {
      console.error('[EMAIL] Failed to initialize SMTP transporter:', error);
      this.initialized = false;
    }
  }

  // Send email alert
  async sendAlert(alert: EmailAlert): Promise<boolean> {
    if (!this.initialized || !this.transporter) {
      console.error('[EMAIL] Transporter not initialized');
      return false;
    }

    try {
      const template = this.getTemplate(alert.template, alert.data);

      const mailOptions = {
        from: {
          name: 'KimbleAI Cost Monitor',
          address: process.env.SMTP_FROM || 'noreply@kimbleai.com'
        },
        to: alert.to,
        cc: alert.cc,
        bcc: alert.bcc,
        subject: template.subject,
        html: template.html,
        text: template.text,
        priority: alert.priority === 'critical' ? 'high' : 'normal',
        headers: {
          'X-Priority': alert.priority === 'critical' ? '1' : '3',
          'X-MSMail-Priority': alert.priority === 'critical' ? 'High' : 'Normal',
          'X-KimbleAI-Alert-Type': alert.template,
          'X-KimbleAI-User-ID': alert.userId || 'unknown'
        }
      };

      const result = await this.transporter.sendMail(mailOptions);

      // Log the sent email
      await this.logEmailSent(alert, result.messageId);

      console.log(`[EMAIL] Alert sent successfully: ${result.messageId}`);
      return true;
    } catch (error) {
      console.error('[EMAIL] Failed to send alert:', error);
      await this.logEmailError(alert, error);
      return false;
    }
  }

  // Send batch alerts
  async sendBatchAlerts(alerts: EmailAlert[]): Promise<{ sent: number; failed: number }> {
    const results = await Promise.allSettled(
      alerts.map(alert => this.sendAlert(alert))
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failed = results.length - sent;

    return { sent, failed };
  }

  // Get email template
  private getTemplate(templateType: EmailAlert['template'], data: Record<string, any>): EmailTemplate {
    switch (templateType) {
      case 'cost_alert':
        return this.getCostAlertTemplate(data);
      case 'service_paused':
        return this.getServicePausedTemplate(data);
      case 'limit_exceeded':
        return this.getLimitExceededTemplate(data);
      case 'weekly_report':
        return this.getWeeklyReportTemplate(data);
      case 'custom':
        return this.getCustomTemplate(data);
      default:
        return this.getGenericTemplate(data);
    }
  }

  // Cost alert template
  private getCostAlertTemplate(data: any): EmailTemplate {
    const { percentage, period, usage, limits, threshold, userName } = data;

    const subject = `🚨 KimbleAI Cost Alert - ${period.toUpperCase()} usage at ${percentage.toFixed(1)}%`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
        .alert-critical { border-left: 5px solid #dc3545; }
        .alert-warning { border-left: 5px solid #ffc107; }
        .alert-info { border-left: 5px solid #17a2b8; }
        .stats { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .progress-bar { width: 100%; background: #e9ecef; border-radius: 4px; height: 20px; }
        .progress-fill { height: 100%; border-radius: 4px; }
        .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header ${percentage >= 90 ? 'alert-critical' : percentage >= 75 ? 'alert-warning' : 'alert-info'}">
        <h1>🚨 Cost Monitor Alert</h1>
        <p><strong>Your ${period} API usage has reached ${percentage.toFixed(1)}% of your limit</strong></p>
    </div>

    <div class="stats">
        <h3>Usage Statistics</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;"><strong>Period:</strong></td>
                <td style="padding: 8px;">${period.charAt(0).toUpperCase() + period.slice(1)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;"><strong>Current Cost:</strong></td>
                <td style="padding: 8px;">$${usage.cost.toFixed(4)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;"><strong>Cost Limit:</strong></td>
                <td style="padding: 8px;">$${limits.cost}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;"><strong>Tokens Used:</strong></td>
                <td style="padding: 8px;">${usage.tokens.toLocaleString()}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;"><strong>Token Limit:</strong></td>
                <td style="padding: 8px;">${limits.tokens.toLocaleString()}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;"><strong>API Requests:</strong></td>
                <td style="padding: 8px;">${usage.requests.toLocaleString()}</td>
            </tr>
        </table>

        <div style="margin: 20px 0;">
            <p><strong>Cost Usage Progress:</strong></p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%; background: ${percentage >= 90 ? '#dc3545' : percentage >= 75 ? '#ffc107' : '#28a745'};"></div>
            </div>
            <small>${percentage.toFixed(1)}% of ${period} limit used</small>
        </div>
    </div>

    ${percentage >= 90 ? `
    <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4>⚠️ Critical Warning</h4>
        <p>You are approaching your ${period} limit. Services may be automatically paused if usage continues to increase.</p>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/cost-monitor" class="btn">View Cost Dashboard</a>
    </div>

    <hr style="margin: 30px 0;">
    <small>
        <p>This alert was triggered because your usage reached the ${threshold}% threshold.</p>
        <p>To manage your limits and alert settings, visit the <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/cost-monitor">Cost Monitor Dashboard</a>.</p>
        <p>Time: ${new Date().toLocaleString()}</p>
    </small>
</body>
</html>`;

    const text = `
KimbleAI Cost Alert

Your ${period} API usage has reached ${percentage.toFixed(1)}% of your limit.

Usage Statistics:
- Period: ${period.charAt(0).toUpperCase() + period.slice(1)}
- Current Cost: $${usage.cost.toFixed(4)}
- Cost Limit: $${limits.cost}
- Tokens Used: ${usage.tokens.toLocaleString()}
- Token Limit: ${limits.tokens.toLocaleString()}
- API Requests: ${usage.requests.toLocaleString()}

${percentage >= 90 ? 'WARNING: You are approaching your limit. Services may be automatically paused.' : ''}

View your cost dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/cost-monitor

This alert was triggered at the ${threshold}% threshold.
Time: ${new Date().toLocaleString()}
`;

    return { subject, html, text };
  }

  // Service paused template
  private getServicePausedTemplate(data: any): EmailTemplate {
    const { service, reason, userId, resumeUrl } = data;

    const subject = `🔴 KimbleAI Service Paused - ${service.toUpperCase()}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px; }
        .alert { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .btn { display: inline-block; padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔴 Service Paused</h1>
        <p><strong>${service.toUpperCase()} API access has been temporarily paused</strong></p>
    </div>

    <div class="alert">
        <h3>Service Interruption Notice</h3>
        <p><strong>Service:</strong> ${service.toUpperCase()}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>User:</strong> ${userId}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    </div>

    <p>Your ${service.toUpperCase()} API access has been automatically paused to prevent exceeding your cost limits.</p>

    <h3>What this means:</h3>
    <ul>
        <li>New API requests to ${service} will be blocked</li>
        <li>Existing processes may fail or timeout</li>
        <li>You will not incur additional charges for this service</li>
    </ul>

    <h3>How to resume service:</h3>
    <ol>
        <li>Review your usage and adjust limits if needed</li>
        <li>Visit the cost monitor dashboard</li>
        <li>Manually resume the service or wait for automatic resume</li>
    </ol>

    <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/cost-monitor" class="btn">Manage Services</a>
    </div>

    <hr style="margin: 30px 0;">
    <small>
        <p>This is an automated safety measure to protect against runaway API costs.</p>
        <p>For immediate assistance, contact support or review your cost settings.</p>
    </small>
</body>
</html>`;

    const text = `
KimbleAI Service Paused

${service.toUpperCase()} API access has been temporarily paused.

Details:
- Service: ${service.toUpperCase()}
- Reason: ${reason}
- User: ${userId}
- Time: ${new Date().toLocaleString()}

Your service was paused to prevent exceeding cost limits.

To resume service, visit: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/cost-monitor

This is an automated safety measure to protect against runaway API costs.
`;

    return { subject, html, text };
  }

  // Limit exceeded template
  private getLimitExceededTemplate(data: any): EmailTemplate {
    const { period, usage, limits } = data;

    const subject = `🚨 CRITICAL: KimbleAI ${period.toUpperCase()} limit exceeded`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px; }
        .critical { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px; margin: 20px 0; border: 2px solid #dc3545; }
        .btn { display: inline-block; padding: 10px 20px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚨 CRITICAL ALERT</h1>
        <p><strong>Your ${period} spending limit has been exceeded</strong></p>
    </div>

    <div class="critical">
        <h3>⚠️ Immediate Action Required</h3>
        <p>Your ${period} API usage has exceeded the configured limits:</p>
        <ul>
            <li><strong>Current Cost:</strong> $${usage.cost.toFixed(4)} (Limit: $${limits.cost})</li>
            <li><strong>Current Tokens:</strong> ${usage.tokens.toLocaleString()} (Limit: ${limits.tokens.toLocaleString()})</li>
            <li><strong>Overage:</strong> $${(usage.cost - limits.cost).toFixed(4)}</li>
        </ul>
    </div>

    <h3>Actions Taken:</h3>
    <ul>
        <li>All API services have been automatically paused</li>
        <li>No new requests will be processed</li>
        <li>Cost monitoring alerts are active</li>
    </ul>

    <h3>Next Steps:</h3>
    <ol>
        <li>Review your usage patterns and identify the cause</li>
        <li>Adjust your spending limits if appropriate</li>
        <li>Manually resume services when ready</li>
        <li>Consider implementing stricter controls</li>
    </ol>

    <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/cost-monitor" class="btn">Emergency Dashboard</a>
    </div>

    <hr style="margin: 30px 0;">
    <small>
        <p><strong>This is a critical system alert.</strong></p>
        <p>Time: ${new Date().toLocaleString()}</p>
    </small>
</body>
</html>`;

    const text = `
CRITICAL ALERT: KimbleAI spending limit exceeded

Your ${period} API usage has exceeded configured limits:

Current Usage:
- Cost: $${usage.cost.toFixed(4)} (Limit: $${limits.cost})
- Tokens: ${usage.tokens.toLocaleString()} (Limit: ${limits.tokens.toLocaleString()})
- Overage: $${(usage.cost - limits.cost).toFixed(4)}

Actions Taken:
- All API services have been paused
- No new requests will be processed

Immediate action required. Visit: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/cost-monitor

Time: ${new Date().toLocaleString()}
`;

    return { subject, html, text };
  }

  // Weekly report template
  private getWeeklyReportTemplate(data: any): EmailTemplate {
    const { usage, trends, topModels, userName } = data;

    const subject = `📊 KimbleAI Weekly Usage Report - $${usage.totalCost.toFixed(2)}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; flex: 1; margin: 0 10px; }
        .trend-up { color: #dc3545; }
        .trend-down { color: #28a745; }
        .trend-stable { color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Weekly Usage Report</h1>
        <p>Your KimbleAI usage summary for the week</p>
    </div>

    <div class="stats">
        <div class="stat-card">
            <h3>Total Cost</h3>
            <p style="font-size: 24px; margin: 0;"><strong>$${usage.totalCost.toFixed(2)}</strong></p>
        </div>
        <div class="stat-card">
            <h3>Total Tokens</h3>
            <p style="font-size: 24px; margin: 0;"><strong>${usage.totalTokens.toLocaleString()}</strong></p>
        </div>
        <div class="stat-card">
            <h3>API Requests</h3>
            <p style="font-size: 24px; margin: 0;"><strong>${usage.totalRequests.toLocaleString()}</strong></p>
        </div>
    </div>

    <h3>Weekly Trends</h3>
    <p class="${trends.cost > 0 ? 'trend-up' : trends.cost < 0 ? 'trend-down' : 'trend-stable'}">
        Cost: ${trends.cost > 0 ? '+' : ''}${trends.cost.toFixed(2)}% vs last week
    </p>

    <h3>Top Models Used</h3>
    <ul>
        ${topModels.map((model: any) => `
            <li><strong>${model.name}:</strong> $${model.cost.toFixed(4)} (${model.requests} requests)</li>
        `).join('')}
    </ul>

    <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/cost-monitor" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">View Detailed Analytics</a>
    </div>

    <hr style="margin: 30px 0;">
    <small>
        <p>This is your automated weekly usage report.</p>
        <p>To adjust report frequency or unsubscribe, visit your dashboard settings.</p>
    </small>
</body>
</html>`;

    const text = `
KimbleAI Weekly Usage Report

Total Cost: $${usage.totalCost.toFixed(2)}
Total Tokens: ${usage.totalTokens.toLocaleString()}
API Requests: ${usage.totalRequests.toLocaleString()}

Weekly Trends:
Cost: ${trends.cost > 0 ? '+' : ''}${trends.cost.toFixed(2)}% vs last week

Top Models:
${topModels.map((model: any) => `- ${model.name}: $${model.cost.toFixed(4)} (${model.requests} requests)`).join('\n')}

View detailed analytics: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/cost-monitor
`;

    return { subject, html, text };
  }

  // Custom template
  private getCustomTemplate(data: any): EmailTemplate {
    return {
      subject: data.subject || 'KimbleAI Notification',
      html: data.html || `<p>${data.message || 'Custom notification from KimbleAI'}</p>`,
      text: data.text || data.message || 'Custom notification from KimbleAI'
    };
  }

  // Generic template
  private getGenericTemplate(data: any): EmailTemplate {
    return {
      subject: data.subject || 'KimbleAI Notification',
      html: `<p>${data.message || 'Notification from KimbleAI'}</p>`,
      text: data.message || 'Notification from KimbleAI'
    };
  }

  // Log sent email
  private async logEmailSent(alert: EmailAlert, messageId: string): Promise<void> {
    try {
      await supabase.from('email_logs').insert({
        user_id: alert.userId,
        recipients: alert.to,
        subject: alert.subject,
        template: alert.template,
        priority: alert.priority,
        message_id: messageId,
        status: 'sent',
        sent_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('[EMAIL] Failed to log sent email:', error);
    }
  }

  // Log email error
  private async logEmailError(alert: EmailAlert, error: any): Promise<void> {
    try {
      await supabase.from('email_logs').insert({
        user_id: alert.userId,
        recipients: alert.to,
        subject: alert.subject,
        template: alert.template,
        priority: alert.priority,
        status: 'failed',
        error_message: error.message || 'Unknown error',
        sent_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error('[EMAIL] Failed to log email error:', logError);
    }
  }

  // Test email configuration
  async testConfiguration(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('[EMAIL] Configuration test failed:', error);
      return false;
    }
  }

  // Send test email
  async sendTestEmail(to: string[]): Promise<boolean> {
    const testAlert: EmailAlert = {
      to,
      subject: 'KimbleAI Email Test',
      template: 'custom',
      data: {
        subject: 'KimbleAI Email System Test',
        html: `
          <h2>✅ Email System Test</h2>
          <p>This is a test email from the KimbleAI email alert system.</p>
          <p>If you received this, your email configuration is working correctly!</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        `,
        text: `KimbleAI Email System Test

This is a test email from the KimbleAI email alert system.
If you received this, your email configuration is working correctly!

Time: ${new Date().toLocaleString()}`
      },
      priority: 'normal'
    };

    return await this.sendAlert(testAlert);
  }
}

export default EmailAlertSystem;