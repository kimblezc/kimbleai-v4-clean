// app/api/index/trigger/route.ts
// Manual trigger for indexing (for testing and immediate sync)

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/index/trigger
 * Manually trigger the indexing cron job
 * Calls the cron endpoint with proper authorization
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json().catch(() => ({ userId: 'zach' }));

    console.log(`[Manual Index] Triggering indexing for user: ${userId}`);

    // Call the cron endpoint
    const cronUrl = `${process.env.NEXTAUTH_URL}/api/index/cron`;
    const response = await fetch(cronUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Indexing failed');
    }

    return NextResponse.json({
      success: true,
      message: 'Indexing job completed successfully',
      ...result
    });

  } catch (error: any) {
    console.error('[Manual Index] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to trigger indexing'
    }, { status: 500 });
  }
}

/**
 * GET /api/index/trigger
 * Get indexing status and stats
 */
export async function GET(request: NextRequest) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get total indexed items by type
    const { data: stats } = await supabase
      .from('knowledge_base')
      .select('source_type')
      .eq('user_id', 'zach'); // Change to dynamic user

    const grouped = (stats || []).reduce((acc: any, item: any) => {
      acc[item.source_type] = (acc[item.source_type] || 0) + 1;
      return acc;
    }, {});

    // Get last cron run
    const { data: lastRun } = await supabase
      .from('cron_logs')
      .select('*')
      .eq('job_name', 'auto_indexing')
      .order('run_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      stats: {
        totalIndexed: stats?.length || 0,
        byType: grouped,
        lastRun: lastRun ? {
          at: lastRun.run_at,
          status: lastRun.status,
          duration: lastRun.duration_ms ? `${(lastRun.duration_ms / 1000).toFixed(1)}s` : 'unknown'
        } : null
      }
    });

  } catch (error: any) {
    console.error('[Manual Index] Error getting stats:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
