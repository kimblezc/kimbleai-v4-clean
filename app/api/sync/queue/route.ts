// app/api/sync/queue/route.ts
// Sync queue management

import { NextRequest, NextResponse } from 'next/server';
import { queueSync, getPendingSyncs, markSyncCompleted } from '@/lib/device-continuity';

// POST: Queue new sync
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, fromDeviceId, toDeviceId, payload } = body;

    if (!userId || !fromDeviceId || !payload) {
      return NextResponse.json(
        { error: 'User ID, from device ID, and payload required' },
        { status: 400 }
      );
    }

    const result = await queueSync(
      userId,
      fromDeviceId,
      payload,
      toDeviceId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      syncId: result.syncId
    });

  } catch (error: any) {
    console.error('[SYNC-QUEUE] Queue error:', error);
    return NextResponse.json(
      { error: 'Failed to queue sync', details: error.message },
      { status: 500 }
    );
  }
}

// GET: Get pending syncs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID required' },
        { status: 400 }
      );
    }

    const result = await getPendingSyncs(deviceId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      syncs: result.syncs || [],
      count: (result.syncs || []).length
    });

  } catch (error: any) {
    console.error('[SYNC-QUEUE] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to get syncs', details: error.message },
      { status: 500 }
    );
  }
}

// PUT: Mark sync as completed
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { syncId } = body;

    if (!syncId) {
      return NextResponse.json(
        { error: 'Sync ID required' },
        { status: 400 }
      );
    }

    const result = await markSyncCompleted(syncId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sync marked as completed'
    });

  } catch (error: any) {
    console.error('[SYNC-QUEUE] Complete error:', error);
    return NextResponse.json(
      { error: 'Failed to mark sync as completed', details: error.message },
      { status: 500 }
    );
  }
}
