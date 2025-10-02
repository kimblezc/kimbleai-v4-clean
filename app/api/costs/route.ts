/**
 * Cost Monitoring Dashboard API
 *
 * Endpoints for tracking and monitoring API costs in real-time
 */

import { NextRequest, NextResponse } from 'next/server';
import { costMonitor } from '@/lib/cost-monitor';

export const runtime = 'nodejs';

/**
 * GET /api/costs - Get cost analytics and budget status
 *
 * Query params:
 * - action: 'summary' | 'analytics' | 'budget' | 'alerts'
 * - userId: optional user filter
 * - days: number of days back (default: 30)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'summary';
    const userId = searchParams.get('userId') || undefined;
    const days = parseInt(searchParams.get('days') || '30');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    switch (action) {
      case 'summary': {
        // Quick overview
        const [budgetStatus, analytics] = await Promise.all([
          costMonitor.checkBudgetLimits(userId),
          costMonitor.getUsageAnalytics(startDate, endDate, userId),
        ]);

        return NextResponse.json({
          status: budgetStatus.allowed ? 'healthy' : 'over-budget',
          budget: {
            monthly: {
              spent: budgetStatus.currentSpend.monthly,
              limit: budgetStatus.limits.monthly,
              percentUsed: budgetStatus.percentUsed.monthly,
              remaining: budgetStatus.limits.monthly - budgetStatus.currentSpend.monthly,
            },
            daily: {
              spent: budgetStatus.currentSpend.daily,
              limit: budgetStatus.limits.daily,
              percentUsed: budgetStatus.percentUsed.daily,
            },
            hourly: {
              spent: budgetStatus.currentSpend.hourly,
              limit: budgetStatus.limits.hourly,
            },
          },
          analytics: {
            totalCost: analytics.totalCost,
            totalCalls: analytics.totalCalls,
            dailyAverage: analytics.dailyAverage,
            projectedMonthly: analytics.projectedMonthly,
          },
          alerts: budgetStatus.reason ? [budgetStatus.reason] : [],
          hardStopEnabled: costMonitor.BUDGET_LIMITS.HARD_STOP_AT_LIMIT,
        });
      }

      case 'analytics': {
        // Detailed analytics
        const analytics = await costMonitor.getUsageAnalytics(startDate, endDate, userId);

        return NextResponse.json({
          timeRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            days,
          },
          totals: {
            cost: analytics.totalCost,
            calls: analytics.totalCalls,
            dailyAverage: analytics.dailyAverage,
            projectedMonthly: analytics.projectedMonthly,
          },
          breakdowns: {
            byModel: analytics.costByModel,
            byEndpoint: analytics.costByEndpoint,
            byUser: analytics.costByUser,
          },
          topExpensiveCalls: analytics.topExpensiveCalls,
        });
      }

      case 'budget': {
        // Budget status only
        const budgetStatus = await costMonitor.checkBudgetLimits(userId);

        return NextResponse.json({
          allowed: budgetStatus.allowed,
          reason: budgetStatus.reason,
          currentSpend: budgetStatus.currentSpend,
          limits: budgetStatus.limits,
          percentUsed: budgetStatus.percentUsed,
          projectedMonthly: budgetStatus.projectedMonthly,
          daysIntoMonth: budgetStatus.daysIntoMonth,
          hardStopEnabled: costMonitor.BUDGET_LIMITS.HARD_STOP_AT_LIMIT,
          recommendations: generateRecommendations(budgetStatus),
        });
      }

      case 'alerts': {
        // Recent budget alerts (would need to implement alert history)
        return NextResponse.json({
          alerts: [
            // TODO: Fetch from budget_alerts table
          ],
          message: 'Alert history endpoint - implementation pending',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: summary, analytics, budget, or alerts' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('[CostAPI] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch cost data',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Generate recommendations based on budget status
 */
function generateRecommendations(status: any): string[] {
  const recommendations: string[] = [];

  if (status.percentUsed.monthly > 90) {
    recommendations.push('🚨 URGENT: You\'ve used over 90% of your monthly budget');
    recommendations.push('Consider enabling HARD_STOP_AT_LIMIT to prevent overages');
    recommendations.push('Review expensive API calls and optimize');
  } else if (status.percentUsed.monthly > 75) {
    recommendations.push('⚠️ WARNING: You\'ve used over 75% of your monthly budget');
    recommendations.push('Monitor usage closely for the remainder of the month');
  } else if (status.percentUsed.monthly > 50) {
    recommendations.push('ℹ️ NOTICE: You\'ve used over 50% of your monthly budget');
  }

  if (status.projectedMonthly > status.limits.monthly * 1.2) {
    recommendations.push(`📈 Projected monthly spend ($${status.projectedMonthly.toFixed(2)}) is 20% over budget`);
    recommendations.push('Consider increasing budget or reducing API usage');
  }

  if (status.currentSpend.hourly > status.limits.hourly * 0.8) {
    recommendations.push('⚡ High hourly usage detected - potential runaway costs');
    recommendations.push('Check for infinite loops or excessive API calls');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Usage is within normal limits');
    recommendations.push('Continue monitoring regularly');
  }

  return recommendations;
}

/**
 * POST /api/costs - Manual cost tracking (for testing or external calls)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, model, endpoint, inputTokens, outputTokens, metadata } = body;

    if (!userId || !model || !endpoint) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, model, endpoint' },
        { status: 400 }
      );
    }

    // Calculate cost
    const cost = costMonitor.calculateCost(model, inputTokens || 0, outputTokens || 0);

    // Track the call
    await costMonitor.trackAPICall({
      user_id: userId,
      model,
      endpoint,
      input_tokens: inputTokens || 0,
      output_tokens: outputTokens || 0,
      cost_usd: cost,
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
    });

    // Check budget status
    const budgetStatus = await costMonitor.checkBudgetLimits(userId);

    return NextResponse.json({
      success: true,
      cost,
      budgetStatus: {
        allowed: budgetStatus.allowed,
        monthlySpent: budgetStatus.currentSpend.monthly,
        monthlyLimit: budgetStatus.limits.monthly,
        percentUsed: budgetStatus.percentUsed.monthly,
      },
    });

  } catch (error: any) {
    console.error('[CostAPI] Error tracking cost:', error);
    return NextResponse.json(
      {
        error: 'Failed to track cost',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
