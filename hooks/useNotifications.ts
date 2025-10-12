// hooks/useNotifications.ts
// React hook for real-time notifications via Supabase
// Provides subscription to new notifications and automatic updates

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { Notification, NotificationType } from '@/lib/notification-manager';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for managing notifications with real-time updates
 *
 * @param userId - User ID to fetch notifications for
 * @param options - Configuration options
 * @returns Notification state and management functions
 *
 * @example
 * ```tsx
 * const { notifications, unreadCount, markAsRead } = useNotifications('user@example.com');
 * ```
 */
export function useNotifications(
  userId: string | null,
  options: {
    limit?: number;
    includeRead?: boolean;
    autoShowToast?: boolean;
    toastDuration?: number;
  } = {}
): UseNotificationsReturn {
  const {
    limit = 50,
    includeRead = true,
    autoShowToast = true,
    toastDuration = 5000,
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch notifications from the database
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build query
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!includeRead) {
        query = query.eq('read', false);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setNotifications(data || []);

      // Calculate unread count
      const unread = (data || []).filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('[useNotifications] Failed to fetch notifications:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [userId, limit, includeRead]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId) return;

    console.log('[useNotifications] Setting up real-time subscription for user:', userId);

    // Subscribe to INSERT events for new notifications
    const subscription = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[useNotifications] New notification received:', payload);

          const newNotification = payload.new as Notification;

          // Add to notifications list
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show toast notification (if enabled)
          if (autoShowToast) {
            showToast(newNotification);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[useNotifications] Notification updated:', payload);

          const updatedNotification = payload.new as Notification;

          // Update in notifications list
          setNotifications(prev =>
            prev.map(n => (n.id === updatedNotification.id ? updatedNotification : n))
          );

          // Recalculate unread count
          if (updatedNotification.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[useNotifications] Notification deleted:', payload);

          const deletedNotification = payload.old as Notification;

          // Remove from notifications list
          setNotifications(prev => prev.filter(n => n.id !== deletedNotification.id));

          // Update unread count if it was unread
          if (!deletedNotification.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status) => {
        console.log('[useNotifications] Subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('[useNotifications] Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, [userId, autoShowToast]);

  // Show toast notification
  const showToast = (notification: Notification) => {
    const message = notification.message || notification.title;

    switch (notification.type) {
      case 'success':
        toast.success(
          <div>
            <strong>{notification.title}</strong>
            {notification.message && <div className="text-sm">{notification.message}</div>}
          </div>,
          { duration: toastDuration }
        );
        break;
      case 'error':
        toast.error(
          <div>
            <strong>{notification.title}</strong>
            {notification.message && <div className="text-sm">{notification.message}</div>}
          </div>,
          { duration: toastDuration * 1.5 }
        );
        break;
      case 'warning':
        toast(
          <div>
            <strong>{notification.title}</strong>
            {notification.message && <div className="text-sm">{notification.message}</div>}
          </div>,
          {
            icon: '⚠️',
            duration: toastDuration * 1.2,
          }
        );
        break;
      case 'info':
      default:
        toast(
          <div>
            <strong>{notification.title}</strong>
            {notification.message && <div className="text-sm">{notification.message}</div>}
          </div>,
          {
            icon: 'ℹ️',
            duration: toastDuration,
          }
        );
        break;
    }
  };

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', userId!);

      if (error) {
        throw error;
      }

      // Optimistically update local state
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[useNotifications] Failed to mark as read:', err);
      toast.error('Failed to mark notification as read');
    }
  }, [userId]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        throw error;
      }

      // Optimistically update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('[useNotifications] Failed to mark all as read:', err);
      toast.error('Failed to mark all as read');
    }
  }, [userId]);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!);

      if (error) {
        throw error;
      }

      // Optimistically update local state
      const notification = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));

      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('[useNotifications] Failed to delete notification:', err);
      toast.error('Failed to delete notification');
    }
  }, [userId, notifications]);

  // Delete all read notifications
  const deleteAllRead = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('read', true);

      if (error) {
        throw error;
      }

      // Optimistically update local state
      setNotifications(prev => prev.filter(n => !n.read));
    } catch (err) {
      console.error('[useNotifications] Failed to delete read notifications:', err);
      toast.error('Failed to delete read notifications');
    }
  }, [userId]);

  // Refresh notifications
  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    refresh,
  };
}

export default useNotifications;
