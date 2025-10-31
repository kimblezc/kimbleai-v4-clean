import { NextResponse } from 'next/server';
import { DeviceSyncAgent } from '@/lib/device-sync-agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute (runs frequently)

export async function GET(request: Request) {
  try {
    // Allow manual trigger with ?trigger=manual
    const url = new URL(request.url);
    const manualTrigger = url.searchParams.get('trigger');
    const isManual = manualTrigger === 'manual';

    // Verify cron secret for security (skip for manual triggers)
    const authHeader = request.headers.get('authorization');
    if (!isManual && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Device Sync Agent] Starting run...');
    const agent = DeviceSyncAgent.getInstance();
    const result = await agent.run();

    console.log('[Device Sync Agent] Completed:', {
      findings: result.findings.length,
      tasks: result.tasks.length,
      errors: result.errors.length
    });

    return NextResponse.json({
      success: true,
      agent: 'device-sync',
      triggerType: isManual ? 'manual' : 'cron',
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error: any) {
    console.error('[Device Sync Agent] Fatal error:', error);
    return NextResponse.json({
      success: false,
      agent: 'device-sync',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also support POST for manual triggers from dashboard buttons
export async function POST(request: Request) {
  return GET(request);
}
