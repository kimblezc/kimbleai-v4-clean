// lib/cost-monitor.ts
// Comprehensive Cost Monitor Agent for KimbleAI system
// Prevents runaway API costs with real-time monitoring and automatic throttling

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// OpenAI API pricing (as of January 2025)
export const OPENAI_PRICING = {
  'gpt-4o': {
    input: 2.50 / 1000000,  // $2.50 per 1M input tokens
    output: 10.00 / 1000000, // $10.00 per 1M output tokens
  },
  'gpt-4o-mini': {
    input: 0.15 / 1000000,  // $0.15 per 1M input tokens
    output: 0.60 / 1000000, // $0.60 per 1M output tokens
  },
  'gpt-4-turbo': {
    input: 10.00 / 1000000, // $10.00 per 1M input tokens
    output: 30.00 / 1000000, // $30.00 per 1M output tokens
  },
  'gpt-3.5-turbo': {
    input: 0.50 / 1000000,  // $0.50 per 1M input tokens
    output: 1.50 / 1000000, // $1.50 per 1M output tokens
  },
  'text-embedding-3-small': {
    input: 0.02 / 1000000,  // $0.02 per 1M tokens
    output: 0, // No output cost for embeddings
  },
  'text-embedding-3-large': {
    input: 0.13 / 1000000,  // $0.13 per 1M tokens
    output: 0,
  },
  'text-embedding-ada-002': {
    input: 0.10 / 1000000,  // $0.10 per 1M tokens
    output: 0,
  },
  'whisper-1': {
    input: 0.006 / 60, // $0.006 per minute
    output: 0,
  },
  'tts-1': {
    input: 15.00 / 1000000, // $15.00 per 1M characters
    output: 0,
  },
  'tts-1-hd': {
    input: 30.00 / 1000000, // $30.00 per 1M characters
    output: 0,
  }
};

export interface UsageEntry {
  id?: string;
  userId: string;
  service: 'openai' | 'anthropic' | 'google' | 'other';
  model: string;
  operation: 'completion' | 'embedding' | 'transcription' | 'tts' | 'image' | 'other';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  duration?: number; // for audio/video
  characters?: number; // for TTS
  metadata: {
    conversation_id?: string;
    project_id?: string;
    endpoint?: string;
    user_agent?: string;
    [key: string]: any;
  };
  timestamp: Date;
}

export interface UsageLimits {
  daily: {
    cost: number;
    tokens: number;
    enabled: boolean;
  };
  weekly: {
    cost: number;
    tokens: number;
    enabled: boolean;
  };
  monthly: {
    cost: number;
    tokens: number;
    enabled: boolean;
  };
  perRequest: {
    maxCost: number;
    maxTokens: number;
    enabled: boolean;
  };
}

export interface AlertConfig {
  email: {
    enabled: boolean;
    recipients: string[];
    thresholds: number[]; // [50, 75, 90, 100] percent
  };
  dashboard: {
    enabled: boolean;
    severity: 'info' | 'warning' | 'error' | 'critical';
  };
  autoThrottle: {
    enabled: boolean;
    pauseAt: number; // percentage threshold
    resumeAfter: number; // minutes
  };
  webhook?: {
    enabled: boolean;
    url: string;
    secret?: string;
  };
}

export interface CostBreakdown {
  service: string;
  model: string;
  operation: string;
  cost: number;
  tokens: number;
  requests: number;
  percentage: number;
}

export interface CostTrends {
  period: 'daily' | 'weekly' | 'monthly';
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  projection: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export class CostMonitor {
  private static instance: CostMonitor;
  private emailTransporter: nodemailer.Transporter | null = null;

  private constructor() {
    this.initializeEmailTransporter();
  }

  public static getInstance(): CostMonitor {
    if (!CostMonitor.instance) {
      CostMonitor.instance = new CostMonitor();
    }
    return CostMonitor.instance;
  }

  private async initializeEmailTransporter() {
    try {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    } catch (error) {
      console.error('[COST-MONITOR] Failed to initialize email transporter:', error);
    }
  }

  // Record API usage
  async recordUsage(entry: Omit<UsageEntry, 'id' | 'timestamp'> & { timestamp?: Date }): Promise<string> {
    try {
      const usageEntry: UsageEntry = {
        ...entry,
        timestamp: entry.timestamp || new Date()
      };

      // Store in database
      const { data, error } = await supabase
        .from('api_usage_tracking')
        .insert(usageEntry)
        .select()
        .single();

      if (error) throw error;

      // Check limits after recording
      await this.checkLimitsAndAlert(entry.userId);

      return data.id;
    } catch (error) {
      console.error('[COST-MONITOR] Failed to record usage:', error);
      throw error;
    }
  }

  // Calculate cost for OpenAI API call
  calculateOpenAICost(model: string, inputTokens: number, outputTokens: number, duration?: number, characters?: number): { inputCost: number; outputCost: number; totalCost: number } {
    const pricing = OPENAI_PRICING[model as keyof typeof OPENAI_PRICING];

    if (!pricing) {
      console.warn(`[COST-MONITOR] Unknown model: ${model}, using default pricing`);
      return { inputCost: 0, outputCost: 0, totalCost: 0 };
    }

    let inputCost = 0;
    let outputCost = 0;

    if (model === 'whisper-1' && duration) {
      inputCost = (duration / 60) * (pricing.input as number);
    } else if (model.startsWith('tts-') && characters) {
      inputCost = characters * (pricing.input as number);
    } else {
      inputCost = inputTokens * (pricing.input as number);
      outputCost = outputTokens * (pricing.output as number);
    }

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }

  // Get current usage for a user
  async getCurrentUsage(userId: string, period: 'daily' | 'weekly' | 'monthly'): Promise<{
    cost: number;
    tokens: number;
    requests: number;
    periodStart: Date;
    periodEnd: Date;
  }> {
    const now = new Date();
    let periodStart: Date;

    switch (period) {
      case 'daily':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        const startOfWeek = now.getDate() - now.getDay();
        periodStart = new Date(now.getFullYear(), now.getMonth(), startOfWeek);
        break;
      case 'monthly':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const { data, error } = await supabase
      .from('api_usage_tracking')
      .select('*')
      .eq('userId', userId)
      .gte('timestamp', periodStart.toISOString())
      .lte('timestamp', now.toISOString());

    if (error) throw error;

    const cost = data?.reduce((sum, entry) => sum + entry.totalCost, 0) || 0;
    const tokens = data?.reduce((sum, entry) => sum + entry.totalTokens, 0) || 0;
    const requests = data?.length || 0;

    return {
      cost,
      tokens,
      requests,
      periodStart,
      periodEnd: now
    };
  }

  // Get user limits
  async getUserLimits(userId: string): Promise<UsageLimits> {
    const { data, error } = await supabase
      .from('user_cost_limits')
      .select('*')
      .eq('userId', userId)
      .single();

    if (error || !data) {
      // Return default limits
      return {
        daily: { cost: 50, tokens: 1000000, enabled: true },
        weekly: { cost: 200, tokens: 5000000, enabled: true },
        monthly: { cost: 500, tokens: 20000000, enabled: true },
        perRequest: { maxCost: 5, maxTokens: 100000, enabled: true }
      };
    }

    return data.limits;
  }

  // Update user limits
  async updateUserLimits(userId: string, limits: UsageLimits): Promise<void> {
    const { error } = await supabase
      .from('user_cost_limits')
      .upsert({
        userId,
        limits,
        updatedAt: new Date().toISOString()
      });

    if (error) throw error;
  }

  // Check limits and send alerts
  async checkLimitsAndAlert(userId: string): Promise<void> {
    const limits = await this.getUserLimits(userId);
    const alertConfig = await this.getAlertConfig(userId);

    for (const period of ['daily', 'weekly', 'monthly'] as const) {
      if (!limits[period].enabled) continue;

      const usage = await this.getCurrentUsage(userId, period);
      const costPercentage = (usage.cost / limits[period].cost) * 100;
      const tokenPercentage = (usage.tokens / limits[period].tokens) * 100;

      const maxPercentage = Math.max(costPercentage, tokenPercentage);

      // Check alert thresholds
      for (const threshold of alertConfig.email.thresholds) {
        if (maxPercentage >= threshold) {
          await this.sendAlert(userId, period, {
            percentage: maxPercentage,
            usage,
            limits: limits[period],
            threshold
          });
        }
      }

      // Auto-throttle if enabled and threshold reached
      if (alertConfig.autoThrottle.enabled && maxPercentage >= alertConfig.autoThrottle.pauseAt) {
        await this.pauseService(userId, 'openai', `Auto-paused: ${period} limit reached (${maxPercentage.toFixed(1)}%)`);
      }
    }
  }

  // Get alert configuration
  async getAlertConfig(userId: string): Promise<AlertConfig> {
    const { data, error } = await supabase
      .from('user_alert_config')
      .select('*')
      .eq('userId', userId)
      .single();

    if (error || !data) {
      // Return default alert config
      return {
        email: {
          enabled: true,
          recipients: ['zach@kimbleai.com'],
          thresholds: [50, 75, 90, 100]
        },
        dashboard: {
          enabled: true,
          severity: 'warning'
        },
        autoThrottle: {
          enabled: true,
          pauseAt: 95,
          resumeAfter: 60
        }
      };
    }

    return data.config;
  }

  // Configure alerts
  async configureAlerts(userId: string, config: AlertConfig): Promise<void> {
    const { error } = await supabase
      .from('user_alert_config')
      .upsert({
        userId,
        config,
        updatedAt: new Date().toISOString()
      });

    if (error) throw error;
  }

  // Send alert
  async sendAlert(userId: string, period: string, alertData: any): Promise<void> {
    try {
      // Store alert in database
      await supabase
        .from('cost_alerts')
        .insert({
          userId,
          period,
          alertType: 'threshold',
          data: alertData,
          timestamp: new Date().toISOString()
        });

      // Send email if configured
      const alertConfig = await this.getAlertConfig(userId);
      if (alertConfig.email.enabled && this.emailTransporter) {
        await this.sendEmailAlert(alertConfig.email.recipients, period, alertData);
      }

      // Send webhook if configured
      if (alertConfig.webhook?.enabled) {
        await this.sendWebhookAlert(alertConfig.webhook, alertData);
      }

    } catch (error) {
      console.error('[COST-MONITOR] Failed to send alert:', error);
    }
  }

  // Send email alert
  private async sendEmailAlert(recipients: string[], period: string, data: any): Promise<void> {
    if (!this.emailTransporter) return;

    const subject = `🚨 KimbleAI Cost Alert - ${period.toUpperCase()} limit reached (${data.percentage.toFixed(1)}%)`;

    const html = `
      <h2>🚨 Cost Monitor Alert</h2>
      <p><strong>Period:</strong> ${period}</p>
      <p><strong>Usage:</strong> ${data.percentage.toFixed(1)}% of limit reached</p>
      <p><strong>Current Cost:</strong> $${data.usage.cost.toFixed(2)}</p>
      <p><strong>Limit:</strong> $${data.limits.cost}</p>
      <p><strong>Tokens Used:</strong> ${data.usage.tokens.toLocaleString()}</p>
      <p><strong>Token Limit:</strong> ${data.limits.tokens.toLocaleString()}</p>
      <p><strong>Requests:</strong> ${data.usage.requests}</p>
      <hr>
      <p>Please review your usage and consider adjusting limits if necessary.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/cost-monitor">View Cost Dashboard</a></p>
    `;

    for (const recipient of recipients) {
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@kimbleai.com',
        to: recipient,
        subject,
        html
      });
    }
  }

  // Send webhook alert
  private async sendWebhookAlert(webhook: NonNullable<AlertConfig['webhook']>, data: any): Promise<void> {
    try {
      await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.secret && { 'X-Webhook-Secret': webhook.secret })
        },
        body: JSON.stringify({
          type: 'cost_alert',
          timestamp: new Date().toISOString(),
          data
        })
      });
    } catch (error) {
      console.error('[COST-MONITOR] Webhook alert failed:', error);
    }
  }

  // Get active alerts
  async getActiveAlerts(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('cost_alerts')
      .select('*')
      .eq('userId', userId)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get usage history
  async getUsageHistory(userId: string, period: 'daily' | 'weekly' | 'monthly', limit: number = 30): Promise<any[]> {
    const { data, error } = await supabase
      .from('api_usage_tracking')
      .select('*')
      .eq('userId', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // Get cost breakdown
  async getCostBreakdown(userId: string, period: 'daily' | 'weekly' | 'monthly'): Promise<CostBreakdown[]> {
    const usage = await this.getCurrentUsage(userId, period);
    const { data, error } = await supabase
      .from('api_usage_tracking')
      .select('*')
      .eq('userId', userId)
      .gte('timestamp', usage.periodStart.toISOString())
      .lte('timestamp', usage.periodEnd.toISOString());

    if (error) throw error;

    const breakdown = new Map<string, CostBreakdown>();

    data?.forEach(entry => {
      const key = `${entry.service}-${entry.model}-${entry.operation}`;
      const existing = breakdown.get(key) || {
        service: entry.service,
        model: entry.model,
        operation: entry.operation,
        cost: 0,
        tokens: 0,
        requests: 0,
        percentage: 0
      };

      existing.cost += entry.totalCost;
      existing.tokens += entry.totalTokens;
      existing.requests += 1;
      breakdown.set(key, existing);
    });

    const total = usage.cost;
    return Array.from(breakdown.values()).map(item => ({
      ...item,
      percentage: total > 0 ? (item.cost / total) * 100 : 0
    })).sort((a, b) => b.cost - a.cost);
  }

  // Get cost trends
  async getCostTrends(userId: string, period: 'daily' | 'weekly' | 'monthly'): Promise<CostTrends> {
    const current = await this.getCurrentUsage(userId, period);

    // Calculate previous period
    let previousStart: Date;
    const now = new Date();

    switch (period) {
      case 'daily':
        previousStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        previousStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
    }

    const { data: previousData, error } = await supabase
      .from('api_usage_tracking')
      .select('*')
      .eq('userId', userId)
      .gte('timestamp', previousStart.toISOString())
      .lt('timestamp', current.periodStart.toISOString());

    if (error) throw error;

    const previousCost = previousData?.reduce((sum, entry) => sum + entry.totalCost, 0) || 0;
    const change = current.cost - previousCost;
    const changePercent = previousCost > 0 ? (change / previousCost) * 100 : 0;

    // Simple projection based on current trend
    const projection = current.cost + (change * 0.5);

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (Math.abs(changePercent) > 10) {
      trend = changePercent > 0 ? 'increasing' : 'decreasing';
    }

    return {
      period,
      current: current.cost,
      previous: previousCost,
      change,
      changePercent,
      projection,
      trend
    };
  }

  // Pause service
  async pauseService(userId: string, service: string, reason: string): Promise<void> {
    await supabase
      .from('service_status')
      .upsert({
        userId,
        service,
        status: 'paused',
        reason,
        pausedAt: new Date().toISOString()
      });

    console.log(`[COST-MONITOR] Service ${service} paused for user ${userId}: ${reason}`);
  }

  // Resume service
  async resumeService(userId: string, service: string): Promise<void> {
    await supabase
      .from('service_status')
      .upsert({
        userId,
        service,
        status: 'active',
        reason: null,
        pausedAt: null,
        resumedAt: new Date().toISOString()
      });

    console.log(`[COST-MONITOR] Service ${service} resumed for user ${userId}`);
  }

  // Check if service is paused
  async isServicePaused(userId: string, service: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('service_status')
      .select('*')
      .eq('userId', userId)
      .eq('service', service)
      .single();

    if (error) return false;
    return data?.status === 'paused';
  }

  // Force usage check
  async forceUsageCheck(userId: string): Promise<any> {
    const daily = await this.getCurrentUsage(userId, 'daily');
    const weekly = await this.getCurrentUsage(userId, 'weekly');
    const monthly = await this.getCurrentUsage(userId, 'monthly');

    await this.checkLimitsAndAlert(userId);

    return { daily, weekly, monthly };
  }

  // Record manual usage
  async recordManualUsage(entry: Omit<UsageEntry, 'id'>): Promise<UsageEntry> {
    const { data, error } = await supabase
      .from('api_usage_tracking')
      .insert(entry)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete usage entry
  async deleteUsageEntry(userId: string, entryId: string): Promise<void> {
    const { error } = await supabase
      .from('api_usage_tracking')
      .delete()
      .eq('userId', userId)
      .eq('id', entryId);

    if (error) throw error;
  }

  // Clear usage history
  async clearUsageHistory(userId: string, period: string): Promise<number> {
    const now = new Date();
    let cutoffDate: Date;

    switch (period) {
      case 'daily':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        throw new Error('Invalid period');
    }

    const { data, error } = await supabase
      .from('api_usage_tracking')
      .delete()
      .eq('userId', userId)
      .lt('timestamp', cutoffDate.toISOString())
      .select();

    if (error) throw error;
    return data?.length || 0;
  }

  // Reset user limits to defaults
  async resetUserLimits(userId: string): Promise<void> {
    const defaultLimits: UsageLimits = {
      daily: { cost: 50, tokens: 1000000, enabled: true },
      weekly: { cost: 200, tokens: 5000000, enabled: true },
      monthly: { cost: 500, tokens: 20000000, enabled: true },
      perRequest: { maxCost: 5, maxTokens: 100000, enabled: true }
    };

    await this.updateUserLimits(userId, defaultLimits);
  }
}

export default CostMonitor;