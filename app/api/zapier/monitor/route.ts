/**
 * Zapier Usage Monitoring Endpoint
 *
 * Provides real-time monitoring of Zapier webhook usage,
 * success rates, and analytics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { zapierClient } from '@/lib/zapier-client';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const days = parseInt(searchParams.get('days') || '7');
    const eventType = searchParams.get('eventType');

    // Get current usage stats from client
    const currentUsage = zapierClient.getUsageStats();

    // Build query for historical data
    let query = supabase
      .from('zapier_webhook_logs')
      .select('*')
      .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: logs, error } = await query.limit(1000);

    if (error) {
      console.error('[Zapier Monitor] Database error:', error);
      return NextResponse.json({
        error: 'Failed to fetch webhook logs',
        details: error.message
      }, { status: 500 });
    }

    // Calculate analytics
    const analytics = calculateAnalytics(logs || []);

    // Get Zapier plan limits
    const planLimits = {
      plan: 'Free',
      monthlyLimit: 750,
      dailyLimit: 30,
      estimatedMonthlyUsage: currentUsage.dailyCount * 30,
      percentUsed: (currentUsage.dailyCount * 30 / 750) * 100
    };

    // Breakdown by event type
    const eventTypeBreakdown = (logs || []).reduce((acc: any, log: any) => {
      const type = log.event_type || 'unknown';
      if (!acc[type]) {
        acc[type] = {
          total: 0,
          successful: 0,
          failed: 0,
          successRate: 0
        };
      }
      acc[type].total++;
      if (log.success) {
        acc[type].successful++;
      } else {
        acc[type].failed++;
      }
      acc[type].successRate = (acc[type].successful / acc[type].total) * 100;
      return acc;
    }, {});

    // User breakdown
    const userBreakdown = (logs || []).reduce((acc: any, log: any) => {
      const user = log.user_id || 'unknown';
      if (!acc[user]) {
        acc[user] = {
          total: 0,
          successful: 0,
          failed: 0
        };
      }
      acc[user].total++;
      if (log.success) {
        acc[user].successful++;
      } else {
        acc[user].failed++;
      }
      return acc;
    }, {});

    // Recent failures
    const recentFailures = (logs || [])
      .filter((log: any) => !log.success)
      .slice(0, 10)
      .map((log: any) => ({
        eventType: log.event_type,
        userId: log.user_id,
        error: log.error,
        timestamp: log.timestamp
      }));

    // Hourly distribution (last 24 hours)
    const hourlyDistribution = calculateHourlyDistribution(logs || []);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      currentUsage: {
        ...currentUsage,
        percentOfDailyLimit: (currentUsage.dailyCount / currentUsage.dailyLimit) * 100
      },
      planLimits,
      analytics,
      eventTypeBreakdown,
      userBreakdown,
      hourlyDistribution,
      recentFailures,
      recentLogs: (logs || []).slice(0, 20).map((log: any) => ({
        id: log.id,
        eventType: log.event_type,
        userId: log.user_id,
        priority: log.priority,
        success: log.success,
        error: log.error,
        timestamp: log.timestamp
      })),
      summary: {
        totalWebhooksCalled: analytics.totalCalls,
        successRate: analytics.successRate,
        averageCallsPerDay: analytics.averageCallsPerDay,
        mostActiveUser: Object.entries(userBreakdown)
          .sort(([, a]: any, [, b]: any) => b.total - a.total)[0]?.[0] || 'none',
        mostCommonEventType: Object.entries(eventTypeBreakdown)
          .sort(([, a]: any, [, b]: any) => b.total - a.total)[0]?.[0] || 'none',
        healthStatus: analytics.successRate > 95 ? 'excellent' :
                     analytics.successRate > 85 ? 'good' :
                     analytics.successRate > 70 ? 'fair' : 'poor'
      }
    });

  } catch (error: any) {
    console.error('[Zapier Monitor] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch monitoring data',
      details: error.message
    }, { status: 500 });
  }
}

function calculateAnalytics(logs: any[]): any {
  if (logs.length === 0) {
    return {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      successRate: 0,
      averageCallsPerDay: 0,
      peakHour: 'N/A'
    };
  }

  const totalCalls = logs.length;
  const successfulCalls = logs.filter(log => log.success).length;
  const failedCalls = logs.filter(log => !log.success).length;
  const successRate = (successfulCalls / totalCalls) * 100;

  // Calculate average calls per day
  const oldestLog = new Date(logs[logs.length - 1].timestamp);
  const newestLog = new Date(logs[0].timestamp);
  const daysDiff = Math.max(1, (newestLog.getTime() - oldestLog.getTime()) / (1000 * 60 * 60 * 24));
  const averageCallsPerDay = totalCalls / daysDiff;

  // Find peak hour
  const hourCounts = logs.reduce((acc: any, log: any) => {
    const hour = new Date(log.timestamp).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {});

  const peakHour = Object.entries(hourCounts)
    .sort(([, a]: any, [, b]: any) => b - a)[0]?.[0] || 'N/A';

  return {
    totalCalls,
    successfulCalls,
    failedCalls,
    successRate: Math.round(successRate * 100) / 100,
    averageCallsPerDay: Math.round(averageCallsPerDay * 100) / 100,
    peakHour: peakHour !== 'N/A' ? `${peakHour}:00` : 'N/A'
  };
}

function calculateHourlyDistribution(logs: any[]): any {
  const now = new Date();
  const last24Hours = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
    return {
      hour: hour.getHours(),
      timestamp: hour.toISOString(),
      count: 0
    };
  });

  logs.forEach(log => {
    const logTime = new Date(log.timestamp);
    const hoursDiff = Math.floor((now.getTime() - logTime.getTime()) / (1000 * 60 * 60));

    if (hoursDiff >= 0 && hoursDiff < 24) {
      const index = 23 - hoursDiff;
      if (last24Hours[index]) {
        last24Hours[index].count++;
      }
    }
  });

  return last24Hours;
}

/**
 * POST endpoint to test webhook manually
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, userId, testData } = body;

    if (!eventType || !userId) {
      return NextResponse.json({
        error: 'Missing required fields: eventType, userId'
      }, { status: 400 });
    }

    // Send test webhook
    const result = await zapierClient.sendEvent({
      eventType,
      userId,
      data: testData || { test: true, message: 'Test webhook from monitoring endpoint' },
      priority: 'low',
      retryOnFailure: false
    });

    return NextResponse.json({
      success: true,
      testResult: result,
      message: 'Test webhook sent',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Zapier Monitor] Test webhook error:', error);
    return NextResponse.json({
      error: 'Failed to send test webhook',
      details: error.message
    }, { status: 500 });
  }
}
