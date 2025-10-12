// app/api/notifications/route.ts
// API routes for notification CRUD operations

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import NotificationManager from '@/lib/notification-manager';

/**
 * GET /api/notifications
 * Get all notifications for the authenticated user
 *
 * Query params:
 * - limit: Number of notifications to fetch (default: 50)
 * - includeRead: Include read notifications (default: true)
 * - unreadOnly: Only fetch unread notifications (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.email;
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '50');
    const includeRead = searchParams.get('includeRead') !== 'false';
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Fetch notifications
    const notifications = await NotificationManager.getNotifications(
      userId,
      limit,
      unreadOnly ? false : includeRead
    );

    // Get unread count
    const unreadCount = await NotificationManager.getUnreadCount(userId);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        total: notifications.length,
      },
    });
  } catch (error) {
    console.error('[API] Failed to fetch notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create a new notification
 *
 * Body:
 * - type: 'success' | 'error' | 'info' | 'warning'
 * - title: string
 * - message: string
 * - link?: string
 * - metadata?: Record<string, any>
 * - sendEmail?: boolean
 * - emailSubject?: string
 * - emailRecipients?: string[]
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.email;
    const body = await request.json();

    const {
      type,
      title,
      message,
      link,
      metadata = {},
      sendEmail = false,
      emailSubject,
      emailRecipients,
    } = body;

    // Validate required fields
    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, message' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['success', 'error', 'info', 'warning'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      );
    }

    // Send notification
    const result = await NotificationManager.notify({
      userId,
      type,
      title,
      message,
      link,
      metadata,
      sendEmail,
      emailSubject,
      emailRecipients,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to create notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        notificationId: result.notificationId,
      },
    });
  } catch (error) {
    console.error('[API] Failed to create notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications
 * Update notification(s)
 *
 * Body:
 * - id?: string (specific notification to update)
 * - markAllAsRead?: boolean (mark all as read)
 * - read?: boolean (mark as read/unread)
 */
export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.email;
    const body = await request.json();

    const { id, markAllAsRead, read } = body;

    if (markAllAsRead) {
      // Mark all notifications as read
      const success = await NotificationManager.markAllAsRead(userId);

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to mark all as read' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    if (id) {
      // Mark specific notification as read
      const success = await NotificationManager.markAsRead(id);

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to update notification' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Notification updated',
      });
    }

    return NextResponse.json(
      { error: 'Missing required fields: id or markAllAsRead' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Failed to update notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * Delete notification(s)
 *
 * Query params:
 * - id: specific notification to delete
 * - deleteAllRead: delete all read notifications (default: false)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.email;
    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id');
    const deleteAllRead = searchParams.get('deleteAllRead') === 'true';

    if (deleteAllRead) {
      // Delete all read notifications
      const success = await NotificationManager.deleteAllRead(userId);

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to delete read notifications' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Read notifications deleted',
      });
    }

    if (id) {
      // Delete specific notification
      const success = await NotificationManager.deleteNotification(id);

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to delete notification' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Notification deleted',
      });
    }

    return NextResponse.json(
      { error: 'Missing required fields: id or deleteAllRead' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Failed to delete notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
