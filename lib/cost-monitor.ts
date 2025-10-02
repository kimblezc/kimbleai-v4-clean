/**
 * Cost Monitor & Budget Enforcement System
 *
 * Prevents accidental API cost overruns by:
 * 1. Tracking all API calls in real-time
 * 2. Enforcing hard budget limits
 * 3. Sending alerts at threshold percentages
 * 4. Emergency shutoff when limit exceeded
 * 5. Per-user and per-day limits
 *
 * CRITICAL: This prevents $600+/month surprise bills
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ==================== BUDGET CONFIGURATION ====================

export const BUDGET_LIMITS = {
  // Monthly limits (USD)
  MONTHLY_TOTAL: parseFloat(process.env.MONTHLY_API_BUDGET || '500'), // Default: $500/month
  MONTHLY_PER_USER: parseFloat(process.env.MONTHLY_USER_BUDGET || '250'), // Default: $250/user/month

  // Daily limits (USD) - safety net to catch runaway costs
  DAILY_TOTAL: parseFloat(process.env.DAILY_API_BUDGET || '50'), // Default: $50/day
  DAILY_PER_USER: parseFloat(process.env.DAILY_USER_BUDGET || '25'), // Default: $25/user/day

  // Hourly limits (for emergency detection)
  HOURLY_TOTAL: parseFloat(process.env.HOURLY_API_BUDGET || '10'), // Default: $10/hour

  // Alert thresholds (percentage of monthly budget)
  ALERT_AT_50_PERCENT: true,
  ALERT_AT_75_PERCENT: true,
  ALERT_AT_90_PERCENT: true,
  ALERT_AT_100_PERCENT: true,

  // Emergency shutoff - ENABLED BY DEFAULT to prevent $600+ surprise bills
  HARD_STOP_AT_LIMIT: process.env.HARD_STOP_AT_BUDGET !== 'false', // Default: true (HARD STOP)
};

// ==================== PRICING (as of Oct 2025) ====================

export const API_PRICING = {
  // ===== OpenAI Models =====
  'gpt-5': {
    input: 10.00,  // $10 per 1M tokens
    output: 30.00, // $30 per 1M tokens
  },
  'gpt-4o': {
    input: 2.50,   // $2.50 per 1M tokens
    output: 10.00, // $10 per 1M tokens
  },
  'gpt-4o-mini': {
    input: 0.15,   // $0.15 per 1M tokens
    output: 0.60,  // $0.60 per 1M tokens
  },
  'gpt-4-turbo': {
    input: 10.00,  // $10 per 1M tokens
    output: 30.00, // $30 per 1M tokens
  },
  'gpt-4': {
    input: 30.00,  // $30 per 1M tokens
    output: 60.00, // $60 per 1M tokens
  },

  // ===== Claude Models =====
  'claude-sonnet-4.5-20250929': {
    input: 3.00,   // $3 per 1M tokens
    output: 15.00, // $15 per 1M tokens
  },
  'claude-3-5-sonnet-20241022': {
    input: 3.00,
    output: 15.00,
  },
  'claude-3-opus-20240229': {
    input: 15.00,
    output: 75.00,
  },
  'claude-3-sonnet-20240229': {
    input: 3.00,
    output: 15.00,
  },
  'claude-3-haiku-20240307': {
    input: 0.25,
    output: 1.25,
  },

  // ===== OpenAI Embeddings =====
  'text-embedding-3-small': {
    input: 0.02,   // $0.02 per 1M tokens
    output: 0,
  },
  'text-embedding-3-large': {
    input: 0.13,   // $0.13 per 1M tokens
    output: 0,
  },
  'text-embedding-ada-002': {
    input: 0.10,   // $0.10 per 1M tokens (legacy)
    output: 0,
  },

  // ===== Audio Transcription =====
  'assemblyai-transcription': {
    perHour: 0.41, // $0.41 per audio hour (includes speaker diarization)
  },
  'assemblyai-transcription-basic': {
    perHour: 0.25, // $0.25 per audio hour (no speaker diarization)
  },
  'whisper-1': {
    perMinute: 0.006, // OpenAI Whisper: $0.006 per minute
  },

  // ===== Google Cloud APIs =====
  'google-drive-api': {
    per1000Requests: 0.004, // $0.004 per 1000 requests (free quota: 1B requests/day)
  },
  'gmail-api': {
    per1000Requests: 0.004, // $0.004 per 1000 requests (free quota: 1B requests/day)
  },
  'google-calendar-api': {
    per1000Requests: 0.004, // $0.004 per 1000 requests (free quota: 1B requests/day)
  },
  'google-drive-storage': {
    perGB: 0.026, // $0.026 per GB/month (after 15GB free)
  },

  // ===== Supabase (Estimated) =====
  'supabase-database-query': {
    per1000Queries: 0.0001, // Negligible (free tier: 500MB, 2B rows)
  },
  'supabase-storage': {
    perGB: 0.021, // $0.021 per GB/month (after 1GB free)
  },

  // ===== Vercel (Estimated) =====
  'vercel-function-invocation': {
    per1000Invocations: 0.00, // $0 (free tier: 1M invocations/month)
  },
  'vercel-bandwidth': {
    perGB: 0.40, // $0.40 per GB (after 100GB free on Pro)
  },

  // ===== Image Generation (if used) =====
  'dall-e-3': {
    standard_1024: 0.040,  // $0.040 per image
    standard_1792: 0.080,  // $0.080 per image
    hd_1024: 0.080,        // $0.080 per image
    hd_1792: 0.120,        // $0.120 per image
  },
  'dall-e-2': {
    size_1024: 0.020,      // $0.020 per image
    size_512: 0.018,       // $0.018 per image
    size_256: 0.016,       // $0.016 per image
  },

  // ===== Zapier (if using premium features) =====
  'zapier-task': {
    perTask: 0.00,         // Free tier: 750 tasks/month, then ~$0.03-0.10 per task
  },
};

// ==================== COST TRACKING ====================

export interface APICallRecord {
  id?: string;
  user_id: string;
  model: string;
  endpoint: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  cached?: boolean;
  timestamp: string;
  metadata?: any;
}

/**
 * Track an API call and its cost
 */
export async function trackAPICall(record: APICallRecord): Promise<void> {
  try {
    // Store in database
    const { error } = await supabase
      .from('api_cost_tracking')
      .insert({
        user_id: record.user_id,
        model: record.model,
        endpoint: record.endpoint,
        input_tokens: record.input_tokens,
        output_tokens: record.output_tokens,
        cost_usd: record.cost_usd,
        cached: record.cached || false,
        timestamp: record.timestamp,
        metadata: record.metadata || {}
      });

    if (error) {
      console.error('[CostMonitor] Failed to track API call:', error);
    }

    // Check if we're approaching limits
    await checkBudgetLimits(record.user_id);

  } catch (error) {
    console.error('[CostMonitor] Error tracking API call:', error);
  }
}

/**
 * Calculate cost for a specific API call
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = API_PRICING[model as keyof typeof API_PRICING];

  if (!pricing) {
    console.warn(`[CostMonitor] Unknown model: ${model}, using GPT-5 pricing`);
    return calculateCost('gpt-5', inputTokens, outputTokens);
  }

  // Check pricing type and calculate accordingly
  if ('perHour' in pricing) {
    // Audio transcription pricing (per hour)
    return pricing.perHour;
  }

  if ('perMinute' in pricing) {
    // Per-minute pricing (Whisper)
    return pricing.perMinute;
  }

  if ('per1000Requests' in pricing) {
    // Per-request pricing (Google APIs)
    return pricing.per1000Requests;
  }

  if ('perGB' in pricing) {
    // Storage pricing
    return pricing.perGB;
  }

  if ('per1000Invocations' in pricing) {
    // Function invocations
    return pricing.per1000Invocations;
  }

  if ('standard_1024' in pricing) {
    // Image generation pricing (DALL-E)
    return pricing.standard_1024; // Default size
  }

  if ('perTask' in pricing) {
    // Zapier tasks
    return pricing.perTask;
  }

  // Default: Token-based pricing
  if ('input' in pricing && 'output' in pricing) {
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  // Unknown pricing model
  console.warn(`[CostMonitor] Unknown pricing model for ${model}`);
  return 0;
}

// ==================== BUDGET CHECKING ====================

export interface BudgetStatus {
  allowed: boolean;
  reason?: string;
  currentSpend: {
    hourly: number;
    daily: number;
    monthly: number;
  };
  limits: {
    hourly: number;
    daily: number;
    monthly: number;
  };
  percentUsed: {
    daily: number;
    monthly: number;
  };
  projectedMonthly: number;
  daysIntoMonth: number;
}

/**
 * Check if user/system is within budget limits
 */
export async function checkBudgetLimits(userId?: string): Promise<BudgetStatus> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

  // Calculate days into month for projection
  const daysIntoMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  try {
    // Get spending for different time periods
    const [hourlySpend, dailySpend, monthlySpend] = await Promise.all([
      getSpendingSince(hourStart, userId),
      getSpendingSince(dayStart, userId),
      getSpendingSince(monthStart, userId),
    ]);

    // Calculate projected monthly spend based on daily average
    const dailyAverage = monthlySpend / daysIntoMonth;
    const projectedMonthly = dailyAverage * daysInMonth;

    // Determine applicable limits
    const limits = {
      hourly: BUDGET_LIMITS.HOURLY_TOTAL,
      daily: userId ? BUDGET_LIMITS.DAILY_PER_USER : BUDGET_LIMITS.DAILY_TOTAL,
      monthly: userId ? BUDGET_LIMITS.MONTHLY_PER_USER : BUDGET_LIMITS.MONTHLY_TOTAL,
    };

    // Calculate percent used
    const percentUsed = {
      daily: (dailySpend / limits.daily) * 100,
      monthly: (monthlySpend / limits.monthly) * 100,
    };

    // Check if over limits
    let allowed = true;
    let reason: string | undefined;

    if (hourlySpend > limits.hourly) {
      allowed = BUDGET_LIMITS.HARD_STOP_AT_LIMIT ? false : true;
      reason = `Hourly limit exceeded: $${hourlySpend.toFixed(2)} / $${limits.hourly.toFixed(2)}`;
    } else if (dailySpend > limits.daily) {
      allowed = BUDGET_LIMITS.HARD_STOP_AT_LIMIT ? false : true;
      reason = `Daily limit exceeded: $${dailySpend.toFixed(2)} / $${limits.daily.toFixed(2)}`;
    } else if (monthlySpend > limits.monthly) {
      allowed = BUDGET_LIMITS.HARD_STOP_AT_LIMIT ? false : true;
      reason = `Monthly limit exceeded: $${monthlySpend.toFixed(2)} / $${limits.monthly.toFixed(2)}`;
    }

    const status: BudgetStatus = {
      allowed,
      reason,
      currentSpend: {
        hourly: hourlySpend,
        daily: dailySpend,
        monthly: monthlySpend,
      },
      limits,
      percentUsed,
      projectedMonthly,
      daysIntoMonth,
    };

    // Send alerts if approaching limits
    if (percentUsed.monthly >= 50 && percentUsed.monthly < 75 && BUDGET_LIMITS.ALERT_AT_50_PERCENT) {
      await sendBudgetAlert('warning', 50, status, userId);
    } else if (percentUsed.monthly >= 75 && percentUsed.monthly < 90 && BUDGET_LIMITS.ALERT_AT_75_PERCENT) {
      await sendBudgetAlert('warning', 75, status, userId);
    } else if (percentUsed.monthly >= 90 && percentUsed.monthly < 100 && BUDGET_LIMITS.ALERT_AT_90_PERCENT) {
      await sendBudgetAlert('critical', 90, status, userId);
    } else if (percentUsed.monthly >= 100 && BUDGET_LIMITS.ALERT_AT_100_PERCENT) {
      await sendBudgetAlert('emergency', 100, status, userId);
    }

    return status;

  } catch (error) {
    console.error('[CostMonitor] Error checking budget limits:', error);
    // Fail open (allow requests) but log error
    return {
      allowed: true,
      reason: 'Budget check failed',
      currentSpend: { hourly: 0, daily: 0, monthly: 0 },
      limits: { hourly: 0, daily: 0, monthly: 0 },
      percentUsed: { daily: 0, monthly: 0 },
      projectedMonthly: 0,
      daysIntoMonth,
    };
  }
}

/**
 * Get total spending since a specific date
 */
async function getSpendingSince(since: Date, userId?: string): Promise<number> {
  try {
    let query = supabase
      .from('api_cost_tracking')
      .select('cost_usd')
      .gte('timestamp', since.toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[CostMonitor] Error getting spending:', error);
      return 0;
    }

    return data?.reduce((sum, record) => sum + (record.cost_usd || 0), 0) || 0;

  } catch (error) {
    console.error('[CostMonitor] Error in getSpendingSince:', error);
    return 0;
  }
}

/**
 * Send budget alert via multiple channels
 */
async function sendBudgetAlert(
  severity: 'warning' | 'critical' | 'emergency',
  percentUsed: number,
  status: BudgetStatus,
  userId?: string
): Promise<void> {
  const emoji = {
    warning: '⚠️',
    critical: '🚨',
    emergency: '🔴',
  }[severity];

  const message = `${emoji} Budget Alert: ${percentUsed}% of ${userId ? 'user' : 'system'} monthly API budget used

Current Spend:
- Hourly: $${status.currentSpend.hourly.toFixed(2)} / $${status.limits.hourly.toFixed(2)}
- Daily: $${status.currentSpend.daily.toFixed(2)} / $${status.limits.daily.toFixed(2)}
- Monthly: $${status.currentSpend.monthly.toFixed(2)} / $${status.limits.monthly.toFixed(2)}

Projected Monthly: $${status.projectedMonthly.toFixed(2)}
Days into month: ${status.daysIntoMonth}

${status.reason || ''}`;

  console.log(`[CostMonitor] ${message}`);

  // Send email alert if configured
  const alertEmail = process.env.COST_ALERT_EMAIL;
  if (alertEmail) {
    try {
      await sendEmailAlert(alertEmail, severity, percentUsed, status, message);
    } catch (error) {
      console.error('[CostMonitor] Failed to send email alert:', error);
    }
  }

  // Send webhook alert if configured (Zapier, Slack, Discord, etc.)
  const alertWebhook = process.env.COST_ALERT_WEBHOOK;
  if (alertWebhook) {
    try {
      await fetch(alertWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          severity,
          percentUsed,
          message,
          status,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('[CostMonitor] Failed to send webhook alert:', error);
    }
  }

  // Store alert in database
  try {
    await supabase.from('budget_alerts').insert({
      severity,
      percent_used: percentUsed,
      message,
      user_id: userId,
      status: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CostMonitor] Failed to store alert:', error);
  }
}

/**
 * Send email alert using a simple email service
 */
async function sendEmailAlert(
  email: string,
  severity: 'warning' | 'critical' | 'emergency',
  percentUsed: number,
  status: BudgetStatus,
  message: string
): Promise<void> {
  // Use Zapier webhook to send email
  const zapierWebhook = process.env.ZAPIER_WEBHOOK_URL;

  if (!zapierWebhook) {
    console.warn('[CostMonitor] No Zapier webhook configured for email alerts');
    return;
  }

  const emailSubject = `${severity.toUpperCase()}: KimbleAI API Cost Alert - ${percentUsed}% Budget Used`;
  const emailBody = `
<h2>API Cost Alert</h2>
<p><strong>Severity:</strong> ${severity.toUpperCase()}</p>
<p><strong>Budget Usage:</strong> ${percentUsed}% of monthly limit</p>

<h3>Current Spending</h3>
<ul>
  <li>Hourly: $${status.currentSpend.hourly.toFixed(2)} / $${status.limits.hourly.toFixed(2)}</li>
  <li>Daily: $${status.currentSpend.daily.toFixed(2)} / $${status.limits.daily.toFixed(2)}</li>
  <li>Monthly: $${status.currentSpend.monthly.toFixed(2)} / $${status.limits.monthly.toFixed(2)}</li>
</ul>

<h3>Projections</h3>
<p><strong>Projected Monthly Cost:</strong> $${status.projectedMonthly.toFixed(2)}</p>
<p><strong>Days into Month:</strong> ${status.daysIntoMonth}</p>

${status.reason ? `<p><strong>Status:</strong> ${status.reason}</p>` : ''}

<p><strong>Hard Stop Enabled:</strong> ${BUDGET_LIMITS.HARD_STOP_AT_LIMIT ? 'YES - API calls will be blocked at limit' : 'NO - Only warnings'}</p>

<hr>
<p><small>This is an automated alert from KimbleAI Cost Monitor. Configure limits in your environment variables.</small></p>
`;

  try {
    await fetch(zapierWebhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'cost_alert',
        email: email,
        subject: emailSubject,
        body: emailBody,
        severity: severity,
        percentUsed: percentUsed,
        timestamp: new Date().toISOString(),
      }),
    });

    console.log(`[CostMonitor] Email alert sent to ${email}`);
  } catch (error) {
    console.error('[CostMonitor] Failed to send email via Zapier:', error);
  }
}

// ==================== MIDDLEWARE ====================

/**
 * Middleware to enforce budget limits before API calls
 */
export async function enforceApiCallBudget(
  userId: string,
  endpoint: string
): Promise<{ allowed: boolean; reason?: string }> {
  const status = await checkBudgetLimits(userId);

  if (!status.allowed) {
    console.error(`[CostMonitor] API call blocked: ${status.reason}`);
    return {
      allowed: false,
      reason: status.reason || 'Budget limit exceeded',
    };
  }

  return { allowed: true };
}

// ==================== USAGE ANALYTICS ====================

export interface UsageAnalytics {
  totalCost: number;
  totalCalls: number;
  costByModel: Record<string, number>;
  costByEndpoint: Record<string, number>;
  costByUser: Record<string, number>;
  topExpensiveCalls: Array<{
    model: string;
    endpoint: string;
    cost: number;
    timestamp: string;
  }>;
  dailyAverage: number;
  projectedMonthly: number;
}

/**
 * Get usage analytics for a time period
 */
export async function getUsageAnalytics(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<UsageAnalytics> {
  try {
    let query = supabase
      .from('api_cost_tracking')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error || !data) {
      throw error;
    }

    // Calculate totals
    const totalCost = data.reduce((sum, record) => sum + record.cost_usd, 0);
    const totalCalls = data.length;

    // Group by model
    const costByModel: Record<string, number> = {};
    data.forEach(record => {
      costByModel[record.model] = (costByModel[record.model] || 0) + record.cost_usd;
    });

    // Group by endpoint
    const costByEndpoint: Record<string, number> = {};
    data.forEach(record => {
      costByEndpoint[record.endpoint] = (costByEndpoint[record.endpoint] || 0) + record.cost_usd;
    });

    // Group by user
    const costByUser: Record<string, number> = {};
    data.forEach(record => {
      costByUser[record.user_id] = (costByUser[record.user_id] || 0) + record.cost_usd;
    });

    // Top expensive calls
    const topExpensiveCalls = data
      .sort((a, b) => b.cost_usd - a.cost_usd)
      .slice(0, 10)
      .map(record => ({
        model: record.model,
        endpoint: record.endpoint,
        cost: record.cost_usd,
        timestamp: record.timestamp,
      }));

    // Calculate daily average and projection
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyAverage = totalCost / days;
    const projectedMonthly = dailyAverage * 30;

    return {
      totalCost,
      totalCalls,
      costByModel,
      costByEndpoint,
      costByUser,
      topExpensiveCalls,
      dailyAverage,
      projectedMonthly,
    };

  } catch (error) {
    console.error('[CostMonitor] Error getting usage analytics:', error);
    return {
      totalCost: 0,
      totalCalls: 0,
      costByModel: {},
      costByEndpoint: {},
      costByUser: {},
      topExpensiveCalls: [],
      dailyAverage: 0,
      projectedMonthly: 0,
    };
  }
}

// ==================== EXPORT ====================

export const costMonitor = {
  trackAPICall,
  calculateCost,
  checkBudgetLimits,
  enforceApiCallBudget,
  getUsageAnalytics,
  BUDGET_LIMITS,
  API_PRICING,
};
