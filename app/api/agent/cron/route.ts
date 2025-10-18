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

    // Security: Verify this is actually a cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run the agent
    const agent = AutonomousAgent.getInstance();
    await agent.run();

    return NextResponse.json({
      success: true,
      message: 'Autonomous agent execution completed',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Autonomous agent cron error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
