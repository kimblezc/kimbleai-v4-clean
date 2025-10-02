// app/api/sync/heartbeat/route.ts
// Device heartbeat endpoint for maintaining active session

import { NextRequest, NextResponse } from 'next/server';
import { sendHeartbeat, registerDevice, detectDeviceType } from '@/lib/device-continuity';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, userId, currentContext, deviceInfo } = body;

    if (!deviceId || !userId) {
      return NextResponse.json(
        { error: 'Device ID and User ID required' },
        { status: 400 }
      );
    }

    // If device info provided, register/update device
    if (deviceInfo) {
      await registerDevice(userId, {
        deviceId,
        deviceType: deviceInfo.deviceType || detectDeviceType(),
        deviceName: deviceInfo.deviceName || 'Unknown Device',
        browserInfo: deviceInfo.browserInfo
      });
    }

    // Send heartbeat
    const result = await sendHeartbeat(deviceId, currentContext, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[HEARTBEAT] Error:', error);
    return NextResponse.json(
      { error: 'Heartbeat failed', details: error.message },
      { status: 500 }
    );
  }
}

// GET: Check device status
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

    // Get device status from database
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('device_sessions')
      .select('*')
      .eq('device_id', deviceId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    const secondsSinceHeartbeat = Math.floor(
      (Date.now() - new Date(data.last_heartbeat).getTime()) / 1000
    );

    return NextResponse.json({
      deviceId: data.device_id,
      deviceType: data.device_type,
      deviceName: data.device_name,
      isActive: data.is_active && secondsSinceHeartbeat < 300, // 5 minutes
      lastHeartbeat: data.last_heartbeat,
      secondsSinceHeartbeat,
      currentContext: data.current_context
    });

  } catch (error: any) {
    console.error('[HEARTBEAT] Status check error:', error);
    return NextResponse.json(
      { error: 'Status check failed', details: error.message },
      { status: 500 }
    );
  }
}
