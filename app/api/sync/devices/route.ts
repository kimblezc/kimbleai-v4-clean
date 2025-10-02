// app/api/sync/devices/route.ts
// Get active devices for user

import { NextRequest, NextResponse } from 'next/server';
import { getActiveDevices } from '@/lib/device-continuity';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const result = await getActiveDevices(userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      devices: result.devices || [],
      count: (result.devices || []).length
    });

  } catch (error: any) {
    console.error('[DEVICES] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get devices', details: error.message },
      { status: 500 }
    );
  }
}
