/**
 * Project-Tag Guardian API Endpoint
 *
 * Triggers the Project-Tag Guardian to run validation and maintenance.
 *
 * Usage:
 * - Scheduled: Called by Vercel Cron (every 6 hours)
 * - Manual: GET /api/guardian/run?trigger=manual
 *
 * Returns a detailed report of issues found and fixes applied.
 */

import { NextRequest, NextResponse } from 'next/server';
import { projectTagGuardian } from '@/lib/project-tag-guardian';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max (for cron job)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trigger = searchParams.get('trigger') || 'scheduled';

    console.log(`🛡️ Guardian run triggered: ${trigger}`);

    // Run the guardian
    const report = await projectTagGuardian.run(trigger);

    // Return the report
    return NextResponse.json(report);

  } catch (error: any) {
    console.error('❌ Guardian endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: 'Guardian run failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
