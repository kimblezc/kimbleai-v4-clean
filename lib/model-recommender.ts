/**
 * Model Recommender System
 *
 * Uses historical performance data to recommend the best AI model
 * for each task type based on:
 * - Response time (speed)
 * - Success rate (reliability)
 * - User satisfaction (quality)
 * - Token efficiency (cost)
 */

import { createClient } from '@supabase/supabase-js';
import { TaskContext, ModelConfig, AVAILABLE_MODELS, GPT5_MODELS } from './model-selector';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type ModelPriority = 'speed' | 'quality' | 'cost' | 'balanced';

export interface ModelRecommendation {
  model: string;
  provider: string;
  confidence: number; // 0-100
  reason: string;
  metrics: {
    avgResponseTime: number;
    successRate: number;
    satisfactionRate: number;
    avgTokens: number;
    qualityScore: number;
    sampleSize: number;
  };
  alternatives?: Array<{
    model: string;
    confidence: number;
    reason: string;
  }>;
}

/**
 * Get best model recommendation based on task context and priority
 */
export async function getModelRecommendation(
  taskContext: TaskContext,
  priority: ModelPriority = 'balanced',
  userId?: string
): Promise<ModelRecommendation> {
  try {
    // Determine task type from context
    const taskType = inferTaskType(taskContext);

    // Fetch performance data for this task type
    const performanceData = await getTaskPerformanceData(taskType, 30); // Last 30 days

    if (!performanceData || performanceData.length === 0) {
      // No historical data - fall back to rule-based selection
      console.log('[ModelRecommender] No performance data, using rule-based fallback');
      return getRuleBasedRecommendation(taskContext, priority);
    }

    // Filter models with sufficient data (minimum 5 samples)
    const viableModels = performanceData.filter(m => m.totalCalls >= 5);

    if (viableModels.length === 0) {
      console.log('[ModelRecommender] Insufficient data for viable models, using fallback');
      return getRuleBasedRecommendation(taskContext, priority);
    }

    // Rank models based on priority
    const rankedModels = rankModelsByPriority(viableModels, priority);

    // Select best model
    const bestModel = rankedModels[0];

    // Calculate confidence based on sample size and consistency
    const confidence = calculateConfidence(bestModel);

    return {
      model: bestModel.model,
      provider: bestModel.provider,
      confidence,
      reason: generateRecommendationReason(bestModel, priority, taskType),
      metrics: {
        avgResponseTime: bestModel.avgResponseTime,
        successRate: bestModel.successRate,
        satisfactionRate: bestModel.satisfactionRate,
        avgTokens: bestModel.avgTokens,
        qualityScore: bestModel.qualityScore,
        sampleSize: bestModel.totalCalls,
      },
      alternatives: rankedModels.slice(1, 3).map(m => ({
        model: m.model,
        confidence: calculateConfidence(m),
        reason: generateRecommendationReason(m, priority, taskType),
      })),
    };

  } catch (error) {
    console.error('[ModelRecommender] Error getting recommendation:', error);
    return getRuleBasedRecommendation(taskContext, priority);
  }
}

/**
 * Get performance data for a specific task type
 */
async function getTaskPerformanceData(taskType: string, days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const { data, error } = await supabase
      .from('model_performance_metrics')
      .select('*')
      .eq('task_type', taskType)
      .eq('success', true) // Only consider successful calls
      .gte('timestamp', startDate.toISOString());

    if (error) {
      console.error('[ModelRecommender] Error fetching performance data:', error);
      return null;
    }

    // Aggregate by model
    const modelStats = new Map<string, any>();

    data.forEach(metric => {
      const key = metric.model;
      if (!modelStats.has(key)) {
        modelStats.set(key, {
          model: metric.model,
          provider: metric.provider,
          totalCalls: 0,
          totalResponseTime: 0,
          totalTokens: 0,
          successCount: 0,
          totalCount: 0,
          positiveRatings: 0,
          totalRatings: 0,
        });
      }

      const stats = modelStats.get(key);
      stats.totalCalls += 1;
      stats.totalResponseTime += metric.response_time_ms;
      stats.totalTokens += metric.tokens_used;
      stats.totalCount += 1;
      if (metric.success) stats.successCount += 1;

      if (metric.user_rating !== null && metric.user_rating !== 0) {
        stats.totalRatings += 1;
        if (metric.user_rating === 1) stats.positiveRatings += 1;
      }
    });

    // Calculate averages and scores
    return Array.from(modelStats.values()).map(stats => ({
      model: stats.model,
      provider: stats.provider,
      totalCalls: stats.totalCalls,
      avgResponseTime: Math.round(stats.totalResponseTime / stats.totalCalls),
      successRate: Math.round((stats.successCount / stats.totalCount) * 100),
      satisfactionRate: stats.totalRatings > 0
        ? Math.round((stats.positiveRatings / stats.totalRatings) * 100)
        : 50, // Default to neutral if no ratings
      avgTokens: Math.round(stats.totalTokens / stats.totalCalls),
      qualityScore: calculateQualityScore({
        avgResponseTime: stats.totalResponseTime / stats.totalCalls,
        successRate: (stats.successCount / stats.totalCount) * 100,
        satisfactionRate: stats.totalRatings > 0
          ? (stats.positiveRatings / stats.totalRatings) * 100
          : 50,
      }),
    }));

  } catch (error) {
    console.error('[ModelRecommender] Database error:', error);
    return null;
  }
}

/**
 * Rank models by priority (speed, quality, cost, or balanced)
 */
function rankModelsByPriority(models: any[], priority: ModelPriority) {
  return [...models].sort((a, b) => {
    switch (priority) {
      case 'speed':
        // Prioritize faster models
        return a.avgResponseTime - b.avgResponseTime;

      case 'quality':
        // Prioritize high success rate and satisfaction
        const qualityA = a.successRate * 0.6 + a.satisfactionRate * 0.4;
        const qualityB = b.successRate * 0.6 + b.satisfactionRate * 0.4;
        return qualityB - qualityA;

      case 'cost':
        // Prioritize models with lower token usage (proxy for cost)
        return a.avgTokens - b.avgTokens;

      case 'balanced':
      default:
        // Use quality score (composite metric)
        return b.qualityScore - a.qualityScore;
    }
  });
}

/**
 * Calculate quality score (0-100)
 */
function calculateQualityScore(metrics: {
  avgResponseTime: number;
  successRate: number;
  satisfactionRate: number;
}) {
  // Normalize response time to 0-100 (lower is better)
  const speedScore = Math.max(0, 100 - Math.min(100, metrics.avgResponseTime / 100));

  // Composite score: 40% success + 40% satisfaction + 20% speed
  return Math.round(
    0.4 * metrics.successRate +
    0.4 * metrics.satisfactionRate +
    0.2 * speedScore
  );
}

/**
 * Calculate confidence score based on sample size and consistency
 */
function calculateConfidence(modelStats: any): number {
  // Base confidence on sample size
  const sampleSizeScore = Math.min(100, (modelStats.totalCalls / 50) * 100); // 50 samples = 100% confidence

  // Penalize if success rate is low
  const reliabilityScore = modelStats.successRate;

  // Penalize if satisfaction is low (if we have ratings)
  const satisfactionScore = modelStats.satisfactionRate;

  // Weighted average
  return Math.round(
    0.5 * sampleSizeScore +
    0.3 * reliabilityScore +
    0.2 * satisfactionScore
  );
}

/**
 * Generate human-readable recommendation reason
 */
function generateRecommendationReason(
  model: any,
  priority: ModelPriority,
  taskType: string
): string {
  const reasons = [];

  if (priority === 'speed') {
    reasons.push(`fastest for ${taskType} tasks (${(model.avgResponseTime / 1000).toFixed(2)}s avg)`);
  } else if (priority === 'quality') {
    reasons.push(`highest quality for ${taskType} (${model.successRate}% success rate)`);
  } else if (priority === 'cost') {
    reasons.push(`most cost-effective for ${taskType} (${model.avgTokens} avg tokens)`);
  } else {
    reasons.push(`best overall performance for ${taskType} (quality score: ${model.qualityScore})`);
  }

  if (model.successRate >= 98) {
    reasons.push('excellent reliability');
  }

  if (model.satisfactionRate >= 80) {
    reasons.push(`${model.satisfactionRate}% user satisfaction`);
  }

  if (model.totalCalls >= 50) {
    reasons.push('well-tested with sufficient data');
  }

  return reasons.join(', ');
}

/**
 * Infer task type from context
 */
function inferTaskType(context: TaskContext): string {
  const content = context.messageContent.toLowerCase();

  if (context.hasCodeContent || ['function', 'class', 'code', 'debug'].some(term => content.includes(term))) {
    return 'coding';
  }

  if (['analyze', 'analysis', 'evaluate'].some(term => content.includes(term))) {
    return 'analysis';
  }

  if (['calculate', 'solve', 'math', 'reason'].some(term => content.includes(term))) {
    return 'reasoning';
  }

  if (['write', 'create', 'generate', 'creative'].some(term => content.includes(term))) {
    return 'creative';
  }

  if (context.hasFileContext || ['file', 'document', 'pdf'].some(term => content.includes(term))) {
    return 'file_processing';
  }

  return 'general_chat';
}

/**
 * Fallback to rule-based recommendation when no performance data exists
 */
function getRuleBasedRecommendation(
  context: TaskContext,
  priority: ModelPriority
): ModelRecommendation {
  const taskType = inferTaskType(context);

  let selectedModel = 'claude-sonnet-4-5';
  let provider = 'anthropic';
  let reason = 'Default high-quality model';

  if (priority === 'speed') {
    selectedModel = 'claude-haiku-4-5';
    reason = 'Fast model for quick responses';
  } else if (priority === 'quality') {
    if (taskType === 'coding') {
      selectedModel = 'claude-sonnet-4-5';
      reason = 'Best for coding tasks';
    } else if (taskType === 'reasoning') {
      selectedModel = 'claude-opus-4-1';
      reason = 'Best for complex reasoning';
    } else {
      selectedModel = 'gpt-4o';
      provider = 'openai';
      reason = 'High-quality general model';
    }
  } else if (priority === 'cost') {
    selectedModel = 'gpt-4o-mini';
    provider = 'openai';
    reason = 'Cost-effective model';
  }

  return {
    model: selectedModel,
    provider,
    confidence: 50, // Low confidence without data
    reason: `${reason} (rule-based selection, no performance data available)`,
    metrics: {
      avgResponseTime: 0,
      successRate: 0,
      satisfactionRate: 0,
      avgTokens: 0,
      qualityScore: 0,
      sampleSize: 0,
    },
  };
}

/**
 * Get model recommendation for a specific task type
 */
export async function getBestModelForTask(
  taskType: string,
  priority: ModelPriority = 'balanced'
): Promise<ModelRecommendation> {
  try {
    const { data, error } = await supabase
      .rpc('get_best_model_for_task', {
        p_task_type: taskType,
        p_priority: priority,
      })
      .single();

    if (error || !data) {
      console.warn('[ModelRecommender] No data from DB function, using fallback');
      return getRuleBasedRecommendation(
        { messageContent: taskType, userPreference: priority } as TaskContext,
        priority
      );
    }

    return {
      model: data.model,
      provider: data.provider,
      confidence: 80, // High confidence from DB function
      reason: data.recommendation_reason,
      metrics: {
        avgResponseTime: data.avg_response_ms,
        successRate: data.success_rate,
        satisfactionRate: data.satisfaction_rate,
        avgTokens: 0,
        qualityScore: data.success_rate,
        sampleSize: 0,
      },
    };
  } catch (error) {
    console.error('[ModelRecommender] Error calling DB function:', error);
    return getRuleBasedRecommendation(
      { messageContent: taskType, userPreference: priority } as TaskContext,
      priority
    );
  }
}

/**
 * Export for integration with ModelSelector
 */
export const ModelRecommender = {
  getModelRecommendation,
  getBestModelForTask,
};
