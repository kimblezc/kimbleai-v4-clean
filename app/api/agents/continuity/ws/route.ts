import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WebSocketConnection {
  deviceId: string;
  userId: string;
  connectionId: string;
  lastPing: number;
  subscribedEvents: string[];
}

// In-memory connection store (in production, use Redis or similar)
const connections = new Map<string, WebSocketConnection>();
const deviceConnections = new Map<string, Set<string>>();

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const deviceId = url.searchParams.get('deviceId');
    const userId = url.searchParams.get('userId') || 'zach';
    const events = url.searchParams.get('events')?.split(',') || ['state_updated', 'session_transferred'];

    if (!deviceId) {
      return NextResponse.json({
        error: 'Device ID required'
      }, { status: 400 });
    }

    // For real WebSocket implementation, you'd upgrade the connection here
    // This is a simplified polling-based approach for compatibility

    const connectionId = generateConnectionId();
    const connection: WebSocketConnection = {
      deviceId,
      userId,
      connectionId,
      lastPing: Date.now(),
      subscribedEvents: events
    };

    // Store connection
    connections.set(connectionId, connection);

    if (!deviceConnections.has(deviceId)) {
      deviceConnections.set(deviceId, new Set());
    }
    deviceConnections.get(deviceId)!.add(connectionId);

    return NextResponse.json({
      success: true,
      connectionId,
      pollingUrl: `/api/agents/continuity/ws/poll?connectionId=${connectionId}`,
      pingInterval: 30000, // 30 seconds
      message: 'WebSocket connection established (polling mode)'
    });

  } catch (error: any) {
    console.error('WebSocket setup error:', error);
    return NextResponse.json({
      error: 'Failed to establish WebSocket connection',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, connectionId, deviceId, userId, eventData } = await request.json();

    switch (action) {
      case 'ping':
        return handlePing(connectionId);

      case 'broadcast':
        return handleBroadcast(userId, deviceId, eventData);

      case 'subscribe':
        return handleSubscribe(connectionId, eventData.events);

      case 'disconnect':
        return handleDisconnect(connectionId);

      default:
        return NextResponse.json({
          error: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('WebSocket POST error:', error);
    return NextResponse.json({
      error: 'Failed to process WebSocket request',
      details: error.message
    }, { status: 500 });
  }
}

async function handlePing(connectionId: string): Promise<NextResponse> {
  const connection = connections.get(connectionId);

  if (!connection) {
    return NextResponse.json({
      error: 'Connection not found'
    }, { status: 404 });
  }

  connection.lastPing = Date.now();

  // Check for pending notifications
  const notifications = await getPendingNotifications(connection.deviceId, connection.userId);

  return NextResponse.json({
    success: true,
    timestamp: Date.now(),
    notifications: notifications,
    connectionStatus: 'active'
  });
}

async function handleBroadcast(userId: string, sourceDevice: string, eventData: any): Promise<NextResponse> {
  try {
    // Store notification in database for persistence
    await supabase.from('device_notifications').insert({
      user_id: userId,
      source_device: sourceDevice,
      event_type: eventData.type,
      event_data: eventData,
      created_at: new Date().toISOString()
    });

    // Broadcast to all active connections for this user
    const userConnections = Array.from(connections.values())
      .filter(conn => conn.userId === userId && conn.deviceId !== sourceDevice);

    let notifiedConnections = 0;

    for (const connection of userConnections) {
      if (connection.subscribedEvents.includes(eventData.type)) {
        // In a real WebSocket implementation, you'd send the message directly
        // For polling, we rely on the database storage above
        notifiedConnections++;
      }
    }

    return NextResponse.json({
      success: true,
      notifiedConnections,
      eventType: eventData.type
    });

  } catch (error: any) {
    console.error('Broadcast error:', error);
    return NextResponse.json({
      error: 'Failed to broadcast event',
      details: error.message
    }, { status: 500 });
  }
}

async function handleSubscribe(connectionId: string, events: string[]): Promise<NextResponse> {
  const connection = connections.get(connectionId);

  if (!connection) {
    return NextResponse.json({
      error: 'Connection not found'
    }, { status: 404 });
  }

  connection.subscribedEvents = [...new Set([...connection.subscribedEvents, ...events])];

  return NextResponse.json({
    success: true,
    subscribedEvents: connection.subscribedEvents
  });
}

async function handleDisconnect(connectionId: string): Promise<NextResponse> {
  const connection = connections.get(connectionId);

  if (connection) {
    // Remove from device connections
    const deviceConns = deviceConnections.get(connection.deviceId);
    if (deviceConns) {
      deviceConns.delete(connectionId);
      if (deviceConns.size === 0) {
        deviceConnections.delete(connection.deviceId);
      }
    }

    // Remove connection
    connections.delete(connectionId);
  }

  return NextResponse.json({
    success: true,
    message: 'Connection closed'
  });
}

async function getPendingNotifications(deviceId: string, userId: string): Promise<any[]> {
  try {
    // Get notifications from the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: notifications, error } = await supabase
      .from('device_notifications')
      .select('*')
      .eq('user_id', userId)
      .neq('source_device', deviceId) // Don't send notifications from the same device
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }

    // Mark notifications as delivered (optional)
    if (notifications && notifications.length > 0) {
      const notificationIds = notifications.map(n => n.id);
      await supabase
        .from('device_notifications')
        .update({ delivered: true })
        .in('id', notificationIds);
    }

    return notifications || [];

  } catch (error) {
    console.error('Failed to get pending notifications:', error);
    return [];
  }
}

function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Cleanup stale connections periodically
setInterval(() => {
  const staleThreshold = Date.now() - 2 * 60 * 1000; // 2 minutes

  for (const [connectionId, connection] of connections.entries()) {
    if (connection.lastPing < staleThreshold) {
      // Remove stale connection
      const deviceConns = deviceConnections.get(connection.deviceId);
      if (deviceConns) {
        deviceConns.delete(connectionId);
        if (deviceConns.size === 0) {
          deviceConnections.delete(connection.deviceId);
        }
      }
      connections.delete(connectionId);
    }
  }
}, 60000); // Check every minute