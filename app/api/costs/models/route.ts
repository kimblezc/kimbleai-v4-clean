/**
 * Model Cost Comparison API
 *
 * Provides detailed cost analytics comparing different AI models and providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/costs/models - Get model comparison data
 *
 * Query params:
 * - userId: optional user filter
 * - days: number of days back (default: 30)
 * - groupBy: 'provider' | 'model' | 'day' | 'hour'
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || undefined;
    const days = parseInt(searchParams.get('days') || '30');
    const groupBy = searchParams.get('groupBy') || 'provider';

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build base query
    let query = supabase
      .from('api_cost_tracking')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error('[ModelCostAPI] Error fetching data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cost data', details: error.message },
        { status: 500 }
      );
    }

    if (!records || records.length === 0) {
      return NextResponse.json({
        totalCost: 0,
        totalCalls: 0,
        byProvider: {},
        byModel: {},
        byDay: [],
        byHour: [],
        topExpensive: [],
        savings: [],
        summary: {
          openai: { cost: 0, calls: 0, percentage: 0 },
          anthropic: { cost: 0, calls: 0, percentage: 0 },
          other: { cost: 0, calls: 0, percentage: 0 },
        }
      });
    }

    // Calculate totals
    const totalCost = records.reduce((sum, r) => sum + (r.cost_usd || 0), 0);
    const totalCalls = records.length;

    // Auto-detect provider from model name if not set
    const getProvider = (model: string, provider?: string) => {
      if (provider) return provider;
      if (model.startsWith('gpt') || model.includes('dall-e') || model.includes('whisper')) return 'openai';
      if (model.startsWith('claude')) return 'anthropic';
      if (model.includes('assemblyai')) return 'assemblyai';
      if (model.includes('google') || model.includes('gmail') || model.includes('drive')) return 'google';
      return 'other';
    };

    // Group by provider
    const byProvider: Record<string, {
      totalCost: number;
      totalCalls: number;
      avgCost: number;
      models: Set<string>;
      inputTokens: number;
      outputTokens: number;
    }> = {};

    records.forEach(record => {
      const provider = getProvider(record.model, record.provider);
      if (!byProvider[provider]) {
        byProvider[provider] = {
          totalCost: 0,
          totalCalls: 0,
          avgCost: 0,
          models: new Set(),
          inputTokens: 0,
          outputTokens: 0,
        };
      }
      byProvider[provider].totalCost += record.cost_usd || 0;
      byProvider[provider].totalCalls += 1;
      byProvider[provider].models.add(record.model);
      byProvider[provider].inputTokens += record.input_tokens || 0;
      byProvider[provider].outputTokens += record.output_tokens || 0;
    });

    // Calculate averages and convert sets to arrays
    Object.keys(byProvider).forEach(provider => {
      byProvider[provider].avgCost = byProvider[provider].totalCost / byProvider[provider].totalCalls;
    });

    // Group by model
    const byModel: Record<string, {
      totalCost: number;
      totalCalls: number;
      avgCost: number;
      provider: string;
      inputTokens: number;
      outputTokens: number;
    }> = {};

    records.forEach(record => {
      const model = record.model;
      if (!byModel[model]) {
        byModel[model] = {
          totalCost: 0,
          totalCalls: 0,
          avgCost: 0,
          provider: getProvider(record.model, record.provider),
          inputTokens: 0,
          outputTokens: 0,
        };
      }
      byModel[model].totalCost += record.cost_usd || 0;
      byModel[model].totalCalls += 1;
      byModel[model].inputTokens += record.input_tokens || 0;
      byModel[model].outputTokens += record.output_tokens || 0;
    });

    // Calculate averages for models
    Object.keys(byModel).forEach(model => {
      byModel[model].avgCost = byModel[model].totalCost / byModel[model].totalCalls;
    });

    // Group by day
    const byDay: Record<string, Record<string, number>> = {};
    records.forEach(record => {
      const date = new Date(record.timestamp).toISOString().split('T')[0];
      const provider = getProvider(record.model, record.provider);
      if (!byDay[date]) {
        byDay[date] = {};
      }
      byDay[date][provider] = (byDay[date][provider] || 0) + (record.cost_usd || 0);
    });

    // Convert to array format for charts
    const byDayArray = Object.entries(byDay)
      .map(([date, providers]) => ({
        date,
        ...providers,
        total: Object.values(providers).reduce((sum, cost) => sum + cost, 0)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Group by hour (last 24 hours only)
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const byHour: Record<string, Record<string, number>> = {};
    records
      .filter(r => new Date(r.timestamp) >= last24Hours)
      .forEach(record => {
        const hour = new Date(record.timestamp).toISOString().substring(0, 13) + ':00:00';
        const provider = getProvider(record.model, record.provider);
        if (!byHour[hour]) {
          byHour[hour] = {};
        }
        byHour[hour][provider] = (byHour[hour][provider] || 0) + (record.cost_usd || 0);
      });

    const byHourArray = Object.entries(byHour)
      .map(([hour, providers]) => ({
        hour: new Date(hour).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        ...providers,
        total: Object.values(providers).reduce((sum, cost) => sum + cost, 0)
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    // Top expensive calls
    const topExpensive = records
      .sort((a, b) => (b.cost_usd || 0) - (a.cost_usd || 0))
      .slice(0, 10)
      .map(record => ({
        model: record.model,
        provider: getProvider(record.model, record.provider),
        endpoint: record.endpoint,
        cost: record.cost_usd,
        inputTokens: record.input_tokens,
        outputTokens: record.output_tokens,
        timestamp: record.timestamp,
      }));

    // Calculate potential savings
    const savings = calculateSavings(records, getProvider);

    // Summary for main dashboard cards
    const openaiCost = byProvider['openai']?.totalCost || 0;
    const anthropicCost = byProvider['anthropic']?.totalCost || 0;
    const otherCost = totalCost - openaiCost - anthropicCost;

    const summary = {
      openai: {
        cost: openaiCost,
        calls: byProvider['openai']?.totalCalls || 0,
        percentage: totalCost > 0 ? (openaiCost / totalCost) * 100 : 0,
      },
      anthropic: {
        cost: anthropicCost,
        calls: byProvider['anthropic']?.totalCalls || 0,
        percentage: totalCost > 0 ? (anthropicCost / totalCost) * 100 : 0,
      },
      other: {
        cost: otherCost,
        calls: totalCalls - (summary.openai.calls + summary.anthropic.calls),
        percentage: totalCost > 0 ? (otherCost / totalCost) * 100 : 0,
      },
    };

    // Convert model sets to arrays for JSON serialization
    const byProviderSerialized = Object.fromEntries(
      Object.entries(byProvider).map(([key, value]) => [
        key,
        { ...value, models: Array.from(value.models) }
      ])
    );

    return NextResponse.json({
      totalCost,
      totalCalls,
      byProvider: byProviderSerialized,
      byModel,
      byDay: byDayArray,
      byHour: byHourArray,
      topExpensive,
      savings,
      summary,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days,
      },
    });

  } catch (error: any) {
    console.error('[ModelCostAPI] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model cost data', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Calculate potential savings by using cheaper models
 */
function calculateSavings(
  records: any[],
  getProvider: (model: string, provider?: string) => string
): Array<{
  description: string;
  actualCost: number;
  potentialCost: number;
  savings: number;
  percentage: number;
}> {
  const savings: Array<{
    description: string;
    actualCost: number;
    potentialCost: number;
    savings: number;
    percentage: number;
  }> = [];

  // GPT-4o vs GPT-4o-mini
  const gpt4oRecords = records.filter(r => r.model === 'gpt-4o');
  if (gpt4oRecords.length > 0) {
    const actualCost = gpt4oRecords.reduce((sum, r) => sum + (r.cost_usd || 0), 0);
    // GPT-4o: $2.50/$10 per 1M tokens vs GPT-4o-mini: $0.15/$0.60 per 1M tokens
    const potentialCost = gpt4oRecords.reduce((sum, r) => {
      const inputCost = (r.input_tokens || 0) * (0.15 / 1_000_000);
      const outputCost = (r.output_tokens || 0) * (0.60 / 1_000_000);
      return sum + inputCost + outputCost;
    }, 0);
    const saved = actualCost - potentialCost;
    if (saved > 0.01) {
      savings.push({
        description: 'Using GPT-4o-mini instead of GPT-4o',
        actualCost,
        potentialCost,
        savings: saved,
        percentage: (saved / actualCost) * 100,
      });
    }
  }

  // Claude Sonnet vs Haiku
  const sonnetRecords = records.filter(r =>
    r.model.includes('sonnet') && r.model.includes('claude')
  );
  if (sonnetRecords.length > 0) {
    const actualCost = sonnetRecords.reduce((sum, r) => sum + (r.cost_usd || 0), 0);
    // Sonnet: $3/$15 per 1M tokens vs Haiku: $0.25/$1.25 per 1M tokens
    const potentialCost = sonnetRecords.reduce((sum, r) => {
      const inputCost = (r.input_tokens || 0) * (0.25 / 1_000_000);
      const outputCost = (r.output_tokens || 0) * (1.25 / 1_000_000);
      return sum + inputCost + outputCost;
    }, 0);
    const saved = actualCost - potentialCost;
    if (saved > 0.01) {
      savings.push({
        description: 'Using Claude Haiku instead of Claude Sonnet',
        actualCost,
        potentialCost,
        savings: saved,
        percentage: (saved / actualCost) * 100,
      });
    }
  }

  // GPT-4o vs Claude Haiku (cross-provider)
  if (gpt4oRecords.length > 0) {
    const actualCost = gpt4oRecords.reduce((sum, r) => sum + (r.cost_usd || 0), 0);
    const potentialCost = gpt4oRecords.reduce((sum, r) => {
      const inputCost = (r.input_tokens || 0) * (0.25 / 1_000_000);
      const outputCost = (r.output_tokens || 0) * (1.25 / 1_000_000);
      return sum + inputCost + outputCost;
    }, 0);
    const saved = actualCost - potentialCost;
    if (saved > 0.01) {
      savings.push({
        description: 'Using Claude Haiku instead of GPT-4o',
        actualCost,
        potentialCost,
        savings: saved,
        percentage: (saved / actualCost) * 100,
      });
    }
  }

  return savings.sort((a, b) => b.savings - a.savings);
}
