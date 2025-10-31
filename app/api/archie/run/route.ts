/**
 * Archie Autonomous Maintenance Endpoint
 *
 * GET /api/archie/run
 * - Triggers Archie to scan and fix issues
 * - Can be called manually or via cron
 * - Returns summary of what was done
 */

import { NextRequest, NextResponse } from 'next/server';
import { archieAgent } from '@/lib/archie-agent';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    console.log('🦉 Archie run triggered');

    // Check for manual trigger or cron auth
    const trigger = request.nextUrl.searchParams.get('trigger');
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    const isManualTrigger = trigger === 'manual';
    const isAuthorizedCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isManualTrigger && cronSecret && !isAuthorizedCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run Archie
    const result = await archieAgent.run();

    return NextResponse.json({
      success: true,
      ...result,
      triggerType: isManualTrigger ? 'manual' : 'cron'
    });

  } catch (error: any) {
    console.error('Archie run failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
