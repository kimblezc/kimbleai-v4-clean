// app/api/transcribe/usage/route.ts
// Usage monitoring for AssemblyAI transcription costs

import { NextRequest, NextResponse } from 'next/server';

// This should match the storage used in assemblyai/route.ts
// In production, consider using Redis or a database instead of in-memory storage
const dailyUsage = new Map<string, { hours: number, cost: number, date: string }>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach';

    const today = new Date().toISOString().split('T')[0];
    const userUsage = dailyUsage.get(userId) || { hours: 0, cost: 0, date: today };

    // Reset if new day
    if (userUsage.date !== today) {
      userUsage.hours = 0;
      userUsage.cost = 0;
      userUsage.date = today;
      dailyUsage.set(userId, userUsage);
    }

    const DAILY_HOUR_LIMIT = 10;
    const DAILY_COST_LIMIT = 5.00;

    return NextResponse.json({
      success: true,
      usage: {
        date: today,
        hoursUsed: userUsage.hours.toFixed(2),
        costToday: `$${userUsage.cost.toFixed(2)}`,
        limits: {
          dailyHours: DAILY_HOUR_LIMIT,
          dailyCost: `$${DAILY_COST_LIMIT.toFixed(2)}`
        },
        remaining: {
          hours: Math.max(0, DAILY_HOUR_LIMIT - userUsage.hours).toFixed(2),
          budget: `$${Math.max(0, DAILY_COST_LIMIT - userUsage.cost).toFixed(2)}`
        },
        status: userUsage.cost >= DAILY_COST_LIMIT ? 'LIMIT_REACHED' :
                userUsage.cost > DAILY_COST_LIMIT * 0.8 ? 'WARNING' : 'GOOD'
      }
    });

  } catch (error: any) {
    console.error('[USAGE] Error checking usage:', error);
    return NextResponse.json(
      { error: 'Failed to check usage' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach';

    // Reset user's daily usage (admin function)
    const today = new Date().toISOString().split('T')[0];
    dailyUsage.set(userId, { hours: 0, cost: 0, date: today });

    return NextResponse.json({
      success: true,
      message: 'Usage reset successfully'
    });

  } catch (error: any) {
    console.error('[USAGE] Error resetting usage:', error);
    return NextResponse.json(
      { error: 'Failed to reset usage' },
      { status: 500 }
    );
  }
}