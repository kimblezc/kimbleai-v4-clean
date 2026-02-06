/**
 * Routing Statistics & Health Check Endpoint
 *
 * Provides insights into model routing patterns to verify
 * smart routing is working correctly and not stuck on defaults.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { supabaseAdmin } from '@/lib/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RoutingStats {
  model: string;
  count: number;
  percentage: number;
  cost: number;
}

interface RoutingHealth {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  dominantModel: string | null;
  dominantPercentage: number;
  diversity: number;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from('api_cost_tracking')
      .select('model, cost_usd, timestamp')
      .eq('user_id', userId)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('[Routing API] Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch routing data' }, { status: 500 });
    }

    const modelStats: Record<string, { count: number; cost: number }> = {};
    let totalCount = 0;

    data?.forEach((row) => {
      const model = row.model || 'unknown';
      const cost = parseFloat(row.cost_usd || '0');
      if (!modelStats[model]) {
        modelStats[model] = { count: 0, cost: 0 };
      }
      modelStats[model].count++;
      modelStats[model].cost += cost;
      totalCount++;
    });

    const stats: RoutingStats[] = Object.entries(modelStats)
      .map(([model, data]) => ({
        model,
        count: data.count,
        percentage: totalCount > 0 ? (data.count / totalCount) * 100 : 0,
        cost: Math.round(data.cost * 10000) / 10000,
      }))
      .sort((a, b) => b.count - a.count);

    const health = calculateRoutingHealth(stats, totalCount);

    const recentDecisions = data?.slice(0, 10).map((row) => ({
      model: row.model,
      timestamp: row.timestamp,
      cost: parseFloat(row.cost_usd || '0'),
    })) || [];

    return NextResponse.json({
      userId,
      period: `${days} days`,
      totalRequests: totalCount,
      stats,
      health,
      recentDecisions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Routing API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateRoutingHealth(stats: RoutingStats[], totalCount: number): RoutingHealth {
  if (totalCount === 0 || stats.length === 0) {
    return {
      status: 'healthy',
      message: 'No routing data available yet',
      dominantModel: null,
      dominantPercentage: 0,
      diversity: 1,
    };
  }

  const dominant = stats[0];
  const modelCount = stats.length;

  let entropy = 0;
  stats.forEach((s) => {
    if (s.percentage > 0) {
      const p = s.percentage / 100;
      entropy -= p * Math.log2(p);
    }
  });
  const maxEntropy = Math.log2(modelCount);
  const diversity = maxEntropy > 0 ? entropy / maxEntropy : 1;

  let status: 'healthy' | 'warning' | 'critical';
  let message: string;

  if (dominant.percentage > 95 && totalCount > 10) {
    status = 'critical';
    message = `Routing may be stuck! ${dominant.model} handles ${dominant.percentage.toFixed(1)}% of requests.`;
  } else if (dominant.percentage > 85 && totalCount > 20) {
    status = 'warning';
    message = `Low routing diversity: ${dominant.model} handles ${dominant.percentage.toFixed(1)}% of requests.`;
  } else if (modelCount === 1 && totalCount > 5) {
    status = 'warning';
    message = `Only one model used (${dominant.model}). Try different request types.`;
  } else {
    status = 'healthy';
    message = `Smart routing is working. ${modelCount} models used across ${totalCount} requests.`;
  }

  return {
    status,
    message,
    dominantModel: dominant.model,
    dominantPercentage: dominant.percentage,
    diversity: Math.round(diversity * 100) / 100,
  };
}
