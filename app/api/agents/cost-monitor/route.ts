import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CostMonitor } from '@/lib/cost-monitor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Retrieve cost monitoring data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach-admin-001';
    const periodParam = searchParams.get('period') || 'daily'; // daily, weekly, monthly
    const period = (periodParam === 'daily' || periodParam === 'weekly' || periodParam === 'monthly') ? periodParam : 'daily';
    const service = searchParams.get('service'); // openai, all

    const costMonitor = CostMonitor.getInstance();

    // Get current usage stats
    const currentUsage = await costMonitor.getCurrentUsage(userId, period);

    // Get usage limits
    const limits = await costMonitor.getUserLimits(userId);

    // Get recent usage history
    const history = await costMonitor.getUsageHistory(userId, period, 30);

    // Get alerts status
    const alerts = await costMonitor.getActiveAlerts(userId);

    // Calculate cost breakdown by service
    const breakdown = await costMonitor.getCostBreakdown(userId, period);

    // Get cost trends and projections
    const trends = await costMonitor.getCostTrends(userId, period);

    return NextResponse.json({
      success: true,
      data: {
        currentUsage,
        limits,
        history,
        alerts,
        breakdown,
        trends,
        status: {
          monitoring_active: true,
          last_check: new Date().toISOString(),
          health: 'healthy'
        }
      }
    });

  } catch (error: any) {
    console.error('[COST-MONITOR] GET error:', error);
    return NextResponse.json({
      error: 'Failed to retrieve cost monitoring data',
      details: error.message
    }, { status: 500 });
  }
}

// POST: Update limits, configure alerts, or force usage check
export async function POST(request: NextRequest) {
  try {
    const { action, userId, ...data } = await request.json();
    const costMonitor = CostMonitor.getInstance();

    switch (action) {
      case 'update_limits':
        await costMonitor.updateUserLimits(userId, data.limits);
        return NextResponse.json({
          success: true,
          message: 'Limits updated successfully',
          limits: data.limits
        });

      case 'configure_alerts':
        await costMonitor.configureAlerts(userId, data.alertConfig);
        return NextResponse.json({
          success: true,
          message: 'Alert configuration updated',
          config: data.alertConfig
        });

      case 'force_check':
        const usage = await costMonitor.forceUsageCheck(userId);
        return NextResponse.json({
          success: true,
          message: 'Usage check completed',
          usage
        });

      case 'reset_limits':
        await costMonitor.resetUserLimits(userId);
        return NextResponse.json({
          success: true,
          message: 'Limits reset to defaults'
        });

      case 'pause_service':
        await costMonitor.pauseService(userId, data.service, data.reason);
        return NextResponse.json({
          success: true,
          message: `Service ${data.service} paused`,
          service: data.service,
          reason: data.reason
        });

      case 'resume_service':
        await costMonitor.resumeService(userId, data.service);
        return NextResponse.json({
          success: true,
          message: `Service ${data.service} resumed`,
          service: data.service
        });

      default:
        return NextResponse.json({
          error: 'Invalid action',
          validActions: ['update_limits', 'configure_alerts', 'force_check', 'reset_limits', 'pause_service', 'resume_service']
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[COST-MONITOR] POST error:', error);
    return NextResponse.json({
      error: 'Failed to process cost monitor request',
      details: error.message
    }, { status: 500 });
  }
}

// PUT: Manual cost tracking entry (for testing or manual adjustments)
export async function PUT(request: NextRequest) {
  try {
    const { userId, service, cost, tokens, model, description } = await request.json();

    if (!userId || !service || !cost) {
      return NextResponse.json({
        error: 'Missing required fields: userId, service, cost'
      }, { status: 400 });
    }

    const costMonitor = CostMonitor.getInstance();

    // Record usage entry manually
    const entry = await costMonitor.recordUsage({
      userId,
      service,
      model: model || 'manual',
      operation: 'other' as const,
      inputTokens: tokens || 0,
      outputTokens: 0,
      totalTokens: tokens || 0,
      inputCost: cost,
      outputCost: 0,
      totalCost: cost,
      metadata: {
        description: description || 'Manual entry',
        manual: true
      },
      timestamp: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Manual usage entry recorded',
      entry
    });

  } catch (error: any) {
    console.error('[COST-MONITOR] PUT error:', error);
    return NextResponse.json({
      error: 'Failed to record manual usage',
      details: error.message
    }, { status: 500 });
  }
}

// DELETE: Clear usage history or delete specific entries
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const entryId = searchParams.get('entryId');
    const period = searchParams.get('period'); // clear all data for period

    if (!userId) {
      return NextResponse.json({
        error: 'User ID required'
      }, { status: 400 });
    }

    const costMonitor = CostMonitor.getInstance();

    if (entryId) {
      // Delete specific entry
      await costMonitor.deleteUsageEntry(userId, entryId);
      return NextResponse.json({
        success: true,
        message: `Usage entry ${entryId} deleted`
      });
    } else if (period) {
      // Clear data for period
      const deleted = await costMonitor.clearUsageHistory(userId, period);
      return NextResponse.json({
        success: true,
        message: `Cleared ${deleted} entries for period: ${period}`
      });
    } else {
      return NextResponse.json({
        error: 'Either entryId or period must be specified'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[COST-MONITOR] DELETE error:', error);
    return NextResponse.json({
      error: 'Failed to delete usage data',
      details: error.message
    }, { status: 500 });
  }
}