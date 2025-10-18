/**
 * Autonomous Agent Cron Endpoint
 *
 * Triggered every hour by Vercel Cron
 * Runs the autonomous agent to monitor, fix, and optimize the system
 */

import { NextRequest, NextResponse } from 'next/server';
import { AutonomousAgent } from '@/lib/autonomous-agent';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    console.log('🤖 Autonomous Agent cron job triggered');

    // Security: Verify this is actually a cron request OR allow manual trigger with special key
    const authHeader = request.headers.get('authorization');
    const manualTrigger = request.nextUrl.searchParams.get('trigger');
    const cronSecret = process.env.CRON_SECRET;

    // Allow manual trigger with ?trigger=archie-now
    const isManualTrigger = manualTrigger === 'archie-now';
    const isAuthorizedCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isManualTrigger && cronSecret && !isAuthorizedCron) {
      console.error('Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`Trigger type: ${isManualTrigger ? 'Manual' : 'Cron'}`);

    // Run the agent
    const agent = AutonomousAgent.getInstance();
    await agent.run();

    return NextResponse.json({
      success: true,
      message: 'Autonomous agent execution completed',
      triggerType: isManualTrigger ? 'manual' : 'cron',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Autonomous agent cron error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
