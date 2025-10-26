/**
 * Server-Sent Events (SSE) Endpoint for Real-Time Activity Streaming
 *
 * Provides real-time Archie activity updates to connected clients.
 * Uses Server-Sent Events for efficient one-way server-to-client streaming.
 *
 * Endpoint: GET /api/archie/activity/stream
 *
 * Features:
 * - Real-time activity streaming
 * - Automatic reconnection support
 * - Heartbeat to keep connection alive
 * - Graceful client disconnection handling
 */

import { NextRequest } from 'next/server';
import { activityStream, ActivityEvent } from '@/lib/activity-stream';

// Disable response caching for SSE
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Generate unique client ID
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      const initialMessage = {
        type: 'connected',
        message: 'Connected to Archie activity stream',
        clientId,
        timestamp: new Date().toISOString()
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`));

      // Activity event handler
      const sendActivity = (event: ActivityEvent) => {
        try {
          const data = {
            type: 'activity',
            event: {
              ...event,
              timestamp: event.timestamp.toISOString() // Convert Date to string for JSON
            }
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (error) {
          console.error('[SSE] Error sending activity:', error);
        }
      };

      // Register client with activity stream
      activityStream.registerClient(clientId, sendActivity);

      // Heartbeat to keep connection alive (every 15 seconds)
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = {
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`));
        } catch (error) {
          console.error('[SSE] Error sending heartbeat:', error);
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`[SSE] Client ${clientId} disconnected`);
        clearInterval(heartbeatInterval);
        activityStream.unregisterClient(clientId);
        try {
          controller.close();
        } catch (error) {
          // Controller may already be closed
        }
      });

      // Send stats every 30 seconds
      const statsInterval = setInterval(() => {
        try {
          const stats = activityStream.getStats();
          const statsMessage = {
            type: 'stats',
            stats,
            timestamp: new Date().toISOString()
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(statsMessage)}\n\n`));
        } catch (error) {
          console.error('[SSE] Error sending stats:', error);
          clearInterval(statsInterval);
        }
      }, 30000);

      // Cleanup stats interval on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(statsInterval);
      });
    }
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    }
  });
}
