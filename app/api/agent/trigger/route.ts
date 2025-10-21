/**
 * Manual Archie Trigger Endpoint
 *
 * Allows triggering Archie manually when Vercel Crons fail
 * Can be called by GitHub Actions or manually
 */

import { NextRequest, NextResponse } from 'next/server';
import { AutonomousAgent } from '@/lib/autonomous-agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  try {
    // Simple authentication check
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.ARCHIE_TRIGGER_SECRET}`;

    // Allow if:
    // 1. Has correct auth header
    // 2. OR has the trigger query param (for quick manual testing)
    const hasAuth = authHeader === expectedAuth;
    const hasTriggerParam = request.nextUrl.searchParams.get('trigger') === 'archie-manual';

    if (!hasAuth && !hasTriggerParam) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authentication' },
        { status: 401 }
      );
    }

    console.log('🚀 Manual Archie trigger received');

    // Run Archie
    const agent = AutonomousAgent.getInstance();
    await agent.run();

    return NextResponse.json({
      success: true,
      message: 'Archie executed successfully',
      timestamp: new Date().toISOString(),
      trigger: hasAuth ? 'authenticated' : 'manual'
    });

  } catch (error: any) {
    console.error('Archie trigger failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
