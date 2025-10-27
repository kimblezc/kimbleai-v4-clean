import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/analytics/models
 *
 * Retrieve model performance analytics
 *
 * Query Parameters:
 * - days: number of days to look back (default: 30)
 * - task_type: filter by task type (optional)
 * - model: filter by specific model (optional)
 * - group_by: grouping option (model, task_type, provider, time)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const taskType = searchParams.get('task_type');
    const model = searchParams.get('model');
    const groupBy = searchParams.get('group_by') || 'model';

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build base query
    let query = supabase
      .from('model_performance_metrics')
      .select('*')
      .gte('timestamp', startDate.toISOString());

    // Apply filters
    if (taskType) {
      query = query.eq('task_type', taskType);
    }
    if (model) {
      query = query.eq('model', model);
    }

    const { data: metrics, error } = await query;

    if (error) {
      console.error('[Analytics] Error fetching metrics:', error);
      return NextResponse.json({
        error: 'Failed to fetch analytics',
        details: error.message
      }, { status: 500 });
    }

    if (!metrics || metrics.length === 0) {
      return NextResponse.json({
        summary: {
          totalCalls: 0,
          avgResponseTime: 0,
          successRate: 100,
          satisfactionRate: 0,
        },
        byModel: [],
        byTaskType: [],
        byProvider: [],
        trends: [],
        recommendations: [],
      });
    }

    // Calculate summary statistics
    const summary = {
      totalCalls: metrics.length,
      avgResponseTime: Math.round(metrics.reduce((sum, m) => sum + m.response_time_ms, 0) / metrics.length),
      successRate: Math.round((metrics.filter(m => m.success).length / metrics.length) * 100),
      satisfactionRate: calculateSatisfactionRate(metrics),
      avgTokens: Math.round(metrics.reduce((sum, m) => sum + m.tokens_used, 0) / metrics.length),
    };

    // Group by model
    const byModel = groupByField(metrics, 'model');

    // Group by task type
    const byTaskType = groupByField(metrics, 'task_type');

    // Group by provider
    const byProvider = groupByField(metrics, 'provider');

    // Calculate daily trends
    const trends = calculateTrends(metrics, days);

    // Get recommendations based on performance data
    const recommendations = await getRecommendations(metrics);

    // Get best model for each task type
    const bestByTask = calculateBestModelByTask(metrics);

    return NextResponse.json({
      summary,
      byModel,
      byTaskType,
      byProvider,
      trends,
      recommendations,
      bestByTask,
      dateRange: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
        days,
      },
    });

  } catch (error: any) {
    console.error('[Analytics] Error:', error);
    return NextResponse.json({
      error: 'Analytics service error',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/analytics/models/feedback
 *
 * Submit user feedback (thumbs up/down) for a model response
 */
export async function POST(request: NextRequest) {
  try {
    const { metricId, rating, conversationId } = await request.json();

    if (!metricId && !conversationId) {
      return NextResponse.json({
        error: 'Either metricId or conversationId is required'
      }, { status: 400 });
    }

    if (rating !== 1 && rating !== -1) {
      return NextResponse.json({
        error: 'Rating must be 1 (thumbs up) or -1 (thumbs down)'
      }, { status: 400 });
    }

    let query = supabase
      .from('model_performance_metrics')
      .update({ user_rating: rating });

    if (metricId) {
      query = query.eq('id', metricId);
    } else if (conversationId) {
      // Update the most recent metric for this conversation
      query = query.eq('conversation_id', conversationId).order('timestamp', { ascending: false }).limit(1);
    }

    const { error } = await query;

    if (error) {
      console.error('[Analytics] Error updating feedback:', error);
      return NextResponse.json({
        error: 'Failed to save feedback',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback saved successfully'
    });

  } catch (error: any) {
    console.error('[Analytics] Error saving feedback:', error);
    return NextResponse.json({
      error: 'Failed to save feedback',
      details: error.message
    }, { status: 500 });
  }
}

// ==================== HELPER FUNCTIONS ====================

function calculateSatisfactionRate(metrics: any[]): number {
  const ratedMetrics = metrics.filter(m => m.user_rating !== null && m.user_rating !== 0);
  if (ratedMetrics.length === 0) return 0;

  const positiveRatings = ratedMetrics.filter(m => m.user_rating === 1).length;
  return Math.round((positiveRatings / ratedMetrics.length) * 100);
}

function groupByField(metrics: any[], field: string) {
  const groups = new Map<string, any[]>();

  metrics.forEach(metric => {
    const key = metric[field];
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(metric);
  });

  return Array.from(groups.entries()).map(([key, items]) => ({
    [field]: key,
    totalCalls: items.length,
    avgResponseTime: Math.round(items.reduce((sum, m) => sum + m.response_time_ms, 0) / items.length),
    successRate: Math.round((items.filter(m => m.success).length / items.length) * 100),
    satisfactionRate: calculateSatisfactionRate(items),
    avgTokens: Math.round(items.reduce((sum, m) => sum + m.tokens_used, 0) / items.length),
    avgInputTokens: Math.round(items.reduce((sum, m) => sum + m.input_tokens, 0) / items.length),
    avgOutputTokens: Math.round(items.reduce((sum, m) => sum + m.output_tokens, 0) / items.length),
    qualityScore: calculateQualityScore(items),
  })).sort((a, b) => b.qualityScore - a.qualityScore);
}

function calculateQualityScore(metrics: any[]): number {
  const avgResponseTime = metrics.reduce((sum, m) => sum + m.response_time_ms, 0) / metrics.length;
  const successRate = (metrics.filter(m => m.success).length / metrics.length) * 100;
  const satisfactionRate = calculateSatisfactionRate(metrics) || 50; // Default to 50 if no ratings

  // Composite score: 40% success rate + 40% satisfaction + 20% speed (inverted)
  const speedScore = Math.max(0, 100 - Math.min(100, avgResponseTime / 100));
  return Math.round(0.4 * successRate + 0.4 * satisfactionRate + 0.2 * speedScore);
}

function calculateTrends(metrics: any[], days: number) {
  const dailyData = new Map<string, any[]>();

  metrics.forEach(metric => {
    const date = new Date(metric.timestamp).toISOString().split('T')[0];
    if (!dailyData.has(date)) {
      dailyData.set(date, []);
    }
    dailyData.get(date)!.push(metric);
  });

  return Array.from(dailyData.entries())
    .map(([date, items]) => ({
      date,
      totalCalls: items.length,
      avgResponseTime: Math.round(items.reduce((sum, m) => sum + m.response_time_ms, 0) / items.length),
      successRate: Math.round((items.filter(m => m.success).length / items.length) * 100),
      satisfactionRate: calculateSatisfactionRate(items),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function calculateBestModelByTask(metrics: any[]) {
  const taskGroups = new Map<string, Map<string, any[]>>();

  // Group by task type, then by model
  metrics.forEach(metric => {
    if (!taskGroups.has(metric.task_type)) {
      taskGroups.set(metric.task_type, new Map());
    }
    const modelMap = taskGroups.get(metric.task_type)!;
    if (!modelMap.has(metric.model)) {
      modelMap.set(metric.model, []);
    }
    modelMap.get(metric.model)!.push(metric);
  });

  // Find best model for each task
  return Array.from(taskGroups.entries()).map(([taskType, modelMap]) => {
    const modelScores = Array.from(modelMap.entries()).map(([model, items]) => {
      // Only consider models with at least 3 samples
      if (items.length < 3) return null;

      return {
        model,
        taskType,
        totalCalls: items.length,
        avgResponseTime: Math.round(items.reduce((sum, m) => sum + m.response_time_ms, 0) / items.length),
        successRate: Math.round((items.filter(m => m.success).length / items.length) * 100),
        satisfactionRate: calculateSatisfactionRate(items),
        qualityScore: calculateQualityScore(items),
      };
    }).filter(Boolean);

    // Sort by quality score
    modelScores.sort((a, b) => b!.qualityScore - a!.qualityScore);

    return {
      taskType,
      bestModel: modelScores[0] || null,
      alternatives: modelScores.slice(1, 3),
    };
  });
}

async function getRecommendations(metrics: any[]) {
  const recommendations: string[] = [];

  // Analyze response times
  const avgResponseTime = metrics.reduce((sum, m) => sum + m.response_time_ms, 0) / metrics.length;
  if (avgResponseTime > 5000) {
    recommendations.push('Consider using faster models like Claude Haiku or GPT-4o-mini for improved response times');
  }

  // Analyze success rates by model
  const modelGroups = groupByField(metrics, 'model');
  const lowPerformers = modelGroups.filter(g => g.successRate < 95);
  if (lowPerformers.length > 0) {
    recommendations.push(`Models with low success rates: ${lowPerformers.map(m => m.model).join(', ')}`);
  }

  // Analyze task-specific performance
  const taskGroups = groupByField(metrics, 'task_type');
  taskGroups.forEach(task => {
    if (task.avgResponseTime > 8000) {
      recommendations.push(`${task.task_type} tasks are slow (${task.avgResponseTime}ms avg). Consider optimizing or using faster models.`);
    }
  });

  // User satisfaction analysis
  const overallSatisfaction = calculateSatisfactionRate(metrics);
  if (overallSatisfaction < 70 && overallSatisfaction > 0) {
    recommendations.push(`User satisfaction is at ${overallSatisfaction}%. Consider reviewing model quality and response accuracy.`);
  }

  return recommendations;
}
