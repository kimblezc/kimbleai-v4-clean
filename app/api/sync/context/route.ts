// app/api/sync/context/route.ts
// Context snapshot storage and retrieval

import { NextRequest, NextResponse } from 'next/server';
import { saveContextSnapshot, getLatestContext } from '@/lib/device-continuity';

// POST: Save context snapshot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, deviceId, snapshot } = body;

    if (!userId || !deviceId || !snapshot) {
      return NextResponse.json(
        { error: 'User ID, Device ID, and snapshot required' },
        { status: 400 }
      );
    }

    const result = await saveContextSnapshot(userId, deviceId, {
      snapshotType: snapshot.snapshotType || 'full_state',
      contextData: snapshot.contextData,
      metadata: {
        timestamp: new Date().toISOString(),
        ...snapshot.metadata
      }
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      snapshotId: result.snapshotId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[CONTEXT] Save error:', error);
    return NextResponse.json(
      { error: 'Failed to save context', details: error.message },
      { status: 500 }
    );
  }
}

// GET: Retrieve latest context
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const excludeDeviceId = searchParams.get('excludeDeviceId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const result = await getLatestContext(userId, excludeDeviceId || undefined);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    if (!result.context) {
      return NextResponse.json({
        success: true,
        context: null,
        message: 'No recent context found'
      });
    }

    return NextResponse.json({
      success: true,
      context: result.context
    });

  } catch (error: any) {
    console.error('[CONTEXT] Retrieve error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve context', details: error.message },
      { status: 500 }
    );
  }
}
