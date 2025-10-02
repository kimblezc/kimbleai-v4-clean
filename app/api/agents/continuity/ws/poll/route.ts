import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const connectionId = url.searchParams.get('connectionId');
    const lastCheck = url.searchParams.get('lastCheck');

    if (!connectionId) {
      return NextResponse.json({
        error: 'Connection ID required'
      }, { status: 400 });
    }

    // In a real implementation, you'd check the in-memory connection store
    // For now, we'll extract device info from the connection ID pattern
    const deviceId = url.searchParams.get('deviceId');
    const userId = url.searchParams.get('userId') || 'zach';

    if (!deviceId) {
      return NextResponse.json({
        error: 'Device ID required'
      }, { status: 400 });
    }

    // Get new notifications since last check
    const checkTime = lastCheck ? new Date(parseInt(lastCheck)) : new Date(Date.now() - 30000);

    const { data: notifications, error } = await supabase
      .from('device_notifications')
      .select('*')
      .eq('user_id', userId)
      .neq('source_device', deviceId)
      .gte('created_at', checkTime.toISOString())
      .eq('delivered', false)
      .order('created_at', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Failed to get notifications:', error);
      return NextResponse.json({
        error: 'Failed to get notifications',
        details: error.message
      }, { status: 500 });
    }

    // Mark notifications as delivered
    if (notifications && notifications.length > 0) {
      const notificationIds = notifications.map(n => n.id);
      await supabase
        .from('device_notifications')
        .update({ delivered: true, delivered_at: new Date().toISOString() })
        .in('id', notificationIds);
    }

    // Process notifications into events
    const events = (notifications || []).map(notification => ({
      id: notification.id,
      type: notification.event_type,
      data: notification.event_data,
      sourceDevice: notification.source_device,
      timestamp: notification.created_at
    }));

    return NextResponse.json({
      success: true,
      events: events,
      hasMore: events.length === 20,
      timestamp: Date.now(),
      connectionId: connectionId
    });

  } catch (error: any) {
    console.error('Polling error:', error);
    return NextResponse.json({
      error: 'Failed to poll for updates',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { connectionId, action, deviceId, userId } = await request.json();

    switch (action) {
      case 'heartbeat':
        return handleHeartbeat(connectionId, deviceId, userId);

      case 'ack':
        return handleAcknowledgment(request);

      default:
        return NextResponse.json({
          error: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Polling POST error:', error);
    return NextResponse.json({
      error: 'Failed to process polling request',
      details: error.message
    }, { status: 500 });
  }
}

async function handleHeartbeat(connectionId: string, deviceId: string, userId: string): Promise<NextResponse> {
  try {
    // Update last seen timestamp for the device
    await supabase
      .from('device_states')
      .upsert({
        device_id: deviceId,
        user_id: userId,
        last_seen: new Date().toISOString(),
        connection_id: connectionId
      }, {
        onConflict: 'device_id,user_id'
      });

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      status: 'active'
    });

  } catch (error: any) {
    console.error('Heartbeat error:', error);
    return NextResponse.json({
      error: 'Failed to process heartbeat',
      details: error.message
    }, { status: 500 });
  }
}

async function handleAcknowledgment(request: NextRequest): Promise<NextResponse> {
  try {
    const { eventIds } = await request.json();

    if (eventIds && eventIds.length > 0) {
      await supabase
        .from('device_notifications')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString()
        })
        .in('id', eventIds);
    }

    return NextResponse.json({
      success: true,
      acknowledgedEvents: eventIds?.length || 0
    });

  } catch (error: any) {
    console.error('Acknowledgment error:', error);
    return NextResponse.json({
      error: 'Failed to acknowledge events',
      details: error.message
    }, { status: 500 });
  }
}