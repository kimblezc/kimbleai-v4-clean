import { NextResponse } from 'next/server';
import { DriveIntelligenceAgent } from '@/lib/drive-intelligence-agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

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

    console.log('[Drive Intelligence Agent] Starting run...');
    const agent = DriveIntelligenceAgent.getInstance();
    const result = await agent.run();

    console.log('[Drive Intelligence Agent] Completed:', {
      findings: result.findings.length,
      tasks: result.tasks.length,
      errors: result.errors.length
    });

    return NextResponse.json({
      success: true,
      agent: 'drive-intelligence',
      triggerType: isManual ? 'manual' : 'cron',
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error: any) {
    console.error('[Drive Intelligence Agent] Fatal error:', error);
    return NextResponse.json({
      success: false,
      agent: 'drive-intelligence',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also support POST for manual triggers from dashboard buttons
export async function POST(request: Request) {
  return GET(request);
}
