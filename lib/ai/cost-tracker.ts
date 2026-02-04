/**
 * Cost Tracking System - Real-time API usage monitoring
 *
 * Features:
 * - Real-time cost calculation
 * - Budget enforcement
 * - Usage analytics
 * - Cost alerts
 * - Monthly budget tracking
 */

import { createClient } from '@supabase/supabase-js';

export interface UsageMetrics {
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  durationMs: number;
  costUsd: number;
}

export interface CostBreakdown {
  provider: string;
  model: string;
  operation: string;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export interface BudgetStatus {
  monthlyBudget: number;
  currentSpend: number;
  remainingBudget: number;
  percentageUsed: number;
  isOverBudget: boolean;
  daysRemaining: number;
  dailyBudget: number;
}

export class CostTracker {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseClient: ReturnType<typeof createClient>) {
    this.supabase = supabaseClient;
  }

  /**
   * Calculate cost for OpenAI models
   * Updated 2026-02-04 with GPT-5.2 pricing
   */
  private calculateOpenAICost(
    model: string,
    inputTokens: number,
    outputTokens: number,
    cachedTokens: number = 0
  ): CostBreakdown {
    const pricing: Record<string, { input: number; output: number; cached: number }> = {
      // GPT-5.2 Series (December 2025)
      'gpt-5.2': {
        input: 1.75 / 1_000_000,
        output: 14.00 / 1_000_000,
        cached: 0.175 / 1_000_000,  // 90% discount on cached
      },
      'gpt-5.2-pro': {
        input: 5.00 / 1_000_000,
        output: 40.00 / 1_000_000,
        cached: 0.50 / 1_000_000,
      },
      'gpt-5.2-codex': {
        input: 2.50 / 1_000_000,
        output: 20.00 / 1_000_000,
        cached: 0.25 / 1_000_000,
      },
      // Legacy models (being deprecated)
      'gpt-4-turbo': {
        input: 10.00 / 1_000_000,
        output: 30.00 / 1_000_000,
        cached: 5.00 / 1_000_000,
      },
      'gpt-4o': {
        input: 2.50 / 1_000_000,
        output: 10.00 / 1_000_000,
        cached: 1.25 / 1_000_000,
      },
      'gpt-4o-mini': {
        input: 0.15 / 1_000_000,
        output: 0.60 / 1_000_000,
        cached: 0.075 / 1_000_000,
      },
      'gpt-4o-realtime-preview': {
        input: 32.00 / 1_000_000,   // Audio input tokens
        output: 64.00 / 1_000_000,  // Audio output tokens
        cached: 0.40 / 1_000_000,   // Cached audio
      },
      'text-embedding-3-small': {
        input: 0.02 / 1_000_000,
        output: 0,
        cached: 0,
      },
      'whisper-1': {
        input: 0.006 / 60,  // $0.006 per minute
        output: 0,
        cached: 0,
      },
      'tts-1': {
        input: 15.00 / 1_000_000,
        output: 0,
        cached: 0,
      },
      'tts-1-hd': {
        input: 30.00 / 1_000_000,
        output: 0,
        cached: 0,
      },
    };

    const modelPricing = pricing[model] || pricing['gpt-5.2'];

    const inputCost = (inputTokens - cachedTokens) * modelPricing.input;
    const cachedCost = cachedTokens * modelPricing.cached;
    const outputCost = outputTokens * modelPricing.output;

    return {
      provider: 'openai',
      model,
      operation: 'completion',
      inputCost: inputCost + cachedCost,
      outputCost,
      totalCost: inputCost + cachedCost + outputCost,
    };
  }

  /**
   * Calculate cost for Anthropic models
   * Updated 2026-02-04 with Claude 4.5 pricing
   */
  private calculateAnthropicCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): CostBreakdown {
    const pricing: Record<string, { input: number; output: number }> = {
      // Claude 4.5 Series
      'claude-sonnet-4-5-20250929': {
        input: 3.00 / 1_000_000,
        output: 15.00 / 1_000_000,
      },
      'claude-opus-4-5-20251101': {
        input: 5.00 / 1_000_000,
        output: 25.00 / 1_000_000,
      },
      'claude-haiku-4-5-20251101': {
        input: 1.00 / 1_000_000,
        output: 5.00 / 1_000_000,
      },
      // Aliases
      'claude-sonnet-4.5': {
        input: 3.00 / 1_000_000,
        output: 15.00 / 1_000_000,
      },
      'claude-opus-4.5': {
        input: 5.00 / 1_000_000,
        output: 25.00 / 1_000_000,
      },
      'claude-haiku-4.5': {
        input: 1.00 / 1_000_000,
        output: 5.00 / 1_000_000,
      },
    };

    const modelPricing = pricing[model] || pricing['claude-sonnet-4-5-20250929'];

    const inputCost = inputTokens * modelPricing.input;
    const outputCost = outputTokens * modelPricing.output;

    return {
      provider: 'anthropic',
      model,
      operation: 'completion',
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    };
  }

  /**
   * Calculate cost for Google models
   * Updated 2026-02-04 with Gemini 3 pricing
   */
  private calculateGoogleCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): CostBreakdown {
    const pricing: Record<string, { input: number; output: number }> = {
      // Gemini 3 Series
      'gemini-3-flash': {
        input: 1.00 / 1_000_000,
        output: 8.00 / 1_000_000,
      },
      'gemini-3-pro': {
        input: 2.50 / 1_000_000,
        output: 15.00 / 1_000_000,
      },
      // Legacy models
      'gemini-2.5-flash': {
        input: 1.25 / 1_000_000,
        output: 10.00 / 1_000_000,
      },
      'gemini-2.5-pro': {
        input: 2.50 / 1_000_000,
        output: 15.00 / 1_000_000,
      },
      'gemini-2.0-flash': {
        input: 1.25 / 1_000_000,
        output: 10.00 / 1_000_000,
      },
    };

    const modelPricing = pricing[model] || pricing['gemini-3-flash'];

    const inputCost = inputTokens * modelPricing.input;
    const outputCost = outputTokens * modelPricing.output;

    return {
      provider: 'google',
      model,
      operation: 'completion',
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    };
  }

  /**
   * Calculate cost for Deepgram transcription
   */
  private calculateDeepgramCost(
    _model: string,
    durationSeconds: number,
    _features: string[] = []
  ): CostBreakdown {
    const basePrice = 0.0043 / 60;  // $0.0043 per minute

    // Features are included (speaker diarization, punctuation, etc.)
    const cost = (durationSeconds / 60) * 60 * basePrice;

    return {
      provider: 'deepgram',
      model: 'nova-3',
      operation: 'transcription',
      inputCost: cost,
      outputCost: 0,
      totalCost: cost,
    };
  }

  /**
   * Calculate cost for any model
   */
  calculateCost(
    provider: string,
    model: string,
    metrics: Partial<UsageMetrics>
  ): CostBreakdown {
    const { tokensInput = 0, tokensOutput = 0, durationMs = 0 } = metrics;

    switch (provider) {
      case 'openai':
        return this.calculateOpenAICost(model, tokensInput, tokensOutput);

      case 'anthropic':
        return this.calculateAnthropicCost(model, tokensInput, tokensOutput);

      case 'google':
        return this.calculateGoogleCost(model, tokensInput, tokensOutput);

      case 'deepgram':
        return this.calculateDeepgramCost(model, durationMs / 1000);

      default:
        return {
          provider,
          model,
          operation: 'unknown',
          inputCost: 0,
          outputCost: 0,
          totalCost: 0,
        };
    }
  }

  /**
   * Log API usage to database
   * Non-blocking - errors are logged but don't break the chat flow
   */
  async logUsage(params: {
    userId: string;
    provider: string;
    model: string;
    operation: string;
    metrics: UsageMetrics;
    conversationId?: string;
    projectId?: string;
  }): Promise<void> {
    const { userId, provider, model, operation, metrics, conversationId, projectId } = params;

    try {
      const costBreakdown = this.calculateCost(provider, model, metrics);

      // Use api_cost_tracking table with correct column names
      await (this.supabase as any).from('api_cost_tracking').insert({
        user_id: userId,
        model,
        endpoint: operation,
        input_tokens: metrics.tokensInput,
        output_tokens: metrics.tokensOutput,
        cost_usd: costBreakdown.totalCost,
        cached: false,
        metadata: {
          provider,
          tokens_total: metrics.tokensTotal,
          duration_ms: metrics.durationMs,
          conversation_id: conversationId,
          project_id: projectId,
        },
      });
    } catch (error) {
      // Non-blocking - log error but don't throw
      console.warn('[CostTracker] Failed to log usage (non-blocking):', error);
    }
  }

  /**
   * Log model routing decision
   * NOTE: model_routing_log table doesn't exist in v5 - this is a no-op for now
   * Routing data is stored in api_cost_tracking.metadata instead
   */
  async logRouting(params: {
    userId: string;
    taskType: string;
    inputSize: number;
    selectedModel: string;
    selectionReason: string;
    wasManual: boolean;
    metrics?: Partial<UsageMetrics>;
    userRating?: number;
  }): Promise<void> {
    // Table doesn't exist in v5 schema - skip logging
    // Routing info is captured in api_cost_tracking.metadata instead
    console.debug('[CostTracker] Routing decision:', {
      model: params.selectedModel,
      reason: params.selectionReason,
      manual: params.wasManual,
    });
  }

  /**
   * Get current month's spending
   */
  async getMonthlySpending(userId: string): Promise<number> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await (this.supabase as any)
        .from('api_cost_tracking')
        .select('cost_usd')
        .eq('user_id', userId)
        .gte('timestamp', startOfMonth.toISOString());

      if (error) {
        console.warn('[CostTracker] Failed to get monthly spending:', error);
        return 0;
      }

      return (data as any)?.reduce((sum: number, row: any) => sum + parseFloat(row.cost_usd || '0'), 0) || 0;
    } catch (error) {
      console.warn('[CostTracker] Error getting monthly spending:', error);
      return 0;
    }
  }

  /**
   * Get budget status
   */
  async getBudgetStatus(userId: string): Promise<BudgetStatus> {
    // Get user's monthly budget
    const { data: user } = await this.supabase
      .from('users')
      .select('settings')
      .eq('id', userId)
      .single();

    const monthlyBudget = parseFloat(user?.settings?.monthlyBudget || '100');
    const currentSpend = await this.getMonthlySpending(userId);
    const remainingBudget = monthlyBudget - currentSpend;
    const percentageUsed = (currentSpend / monthlyBudget) * 100;

    // Calculate days remaining in month
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = lastDay.getDate() - now.getDate();

    // Calculate recommended daily budget
    const dailyBudget = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;

    return {
      monthlyBudget,
      currentSpend,
      remainingBudget,
      percentageUsed,
      isOverBudget: currentSpend > monthlyBudget,
      daysRemaining,
      dailyBudget,
    };
  }

  /**
   * Check if user is within budget
   */
  async checkBudget(userId: string, estimatedCost: number): Promise<boolean> {
    const status = await this.getBudgetStatus(userId);

    // If already over budget, block
    if (status.isOverBudget) {
      return false;
    }

    // If this request would exceed budget, block
    if (status.currentSpend + estimatedCost > status.monthlyBudget) {
      return false;
    }

    return true;
  }

  /**
   * Get cost breakdown by provider
   */
  async getCostBreakdownByProvider(userId: string, days: number = 30): Promise<Record<string, number>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('api_cost_tracking')
        .select('metadata, cost_usd')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString());

      if (error) {
        console.warn('[CostTracker] Failed to get cost breakdown by provider:', error);
        return {};
      }

      const breakdown: Record<string, number> = {};

      data?.forEach((row: any) => {
        const provider = row.metadata?.provider || 'unknown';
        const cost = parseFloat(row.cost_usd || '0');
        breakdown[provider] = (breakdown[provider] || 0) + cost;
      });

      return breakdown;
    } catch (error) {
      console.warn('[CostTracker] Error getting cost breakdown:', error);
      return {};
    }
  }

  /**
   * Get cost breakdown by model
   */
  async getCostBreakdownByModel(userId: string, days: number = 30): Promise<Record<string, number>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('api_cost_tracking')
        .select('model, cost_usd')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString());

      if (error) {
        console.warn('[CostTracker] Failed to get cost breakdown by model:', error);
        return {};
      }

      const breakdown: Record<string, number> = {};

      data?.forEach((row: any) => {
        const model = row.model;
        const cost = parseFloat(row.cost_usd || '0');
        breakdown[model] = (breakdown[model] || 0) + cost;
      });

      return breakdown;
    } catch (error) {
      console.warn('[CostTracker] Error getting model breakdown:', error);
      return {};
    }
  }

  /**
   * Get daily cost trend
   */
  async getDailyCostTrend(userId: string, days: number = 30): Promise<Array<{ date: string; cost: number }>> {
    const { data } = await this.supabase
      .rpc('daily_cost_analytics')
      .eq('user_id', userId)
      .limit(days)
      .order('date', { ascending: false });

    return data || [];
  }

  /**
   * Get model routing statistics
   * NOTE: model_routing_log doesn't exist - derive from api_cost_tracking instead
   */
  async getRoutingStats(userId: string, days: number = 30): Promise<Record<string, number>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('api_cost_tracking')
        .select('model')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString());

      if (error) {
        console.warn('[CostTracker] Failed to get routing stats:', error);
        return {};
      }

      const stats: Record<string, number> = {};

      data?.forEach((row: any) => {
        const model = row.model;
        stats[model] = (stats[model] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.warn('[CostTracker] Error getting routing stats:', error);
      return {};
    }
  }

  /**
   * Send budget alert
   */
  async sendBudgetAlert(userId: string, type: 'warning' | 'exceeded'): Promise<void> {
    const status = await this.getBudgetStatus(userId);

    // In a real implementation, this would send an email or push notification
    console.warn(`[BUDGET ALERT] User ${userId}:`, {
      type,
      percentageUsed: status.percentageUsed,
      currentSpend: status.currentSpend,
      monthlyBudget: status.monthlyBudget,
    });

    // You could integrate with services like:
    // - SendGrid for email
    // - Twilio for SMS
    // - Push notifications via Firebase
  }

  /**
   * Check and alert on budget thresholds
   */
  async checkAndAlertBudget(userId: string, newCost: number): Promise<void> {
    const status = await this.getBudgetStatus(userId);
    const newTotal = status.currentSpend + newCost;
    const newPercentage = (newTotal / status.monthlyBudget) * 100;

    // Alert at 80% threshold
    if (status.percentageUsed < 80 && newPercentage >= 80) {
      await this.sendBudgetAlert(userId, 'warning');
    }

    // Alert when exceeded
    if (newPercentage > 100) {
      await this.sendBudgetAlert(userId, 'exceeded');
    }
  }
}

// Export types
export type { CostBreakdown, UsageMetrics, BudgetStatus };
