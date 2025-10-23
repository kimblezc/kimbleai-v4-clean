// lib/notification-manager.ts
// Production-ready notification management system for KimbleAI v4
// Handles toast notifications, email alerts, and persistent notifications

import { createClient } from '@supabase/supabase-js';
import { EmailAlertSystem } from './email-alert-system';
import toast from 'react-hot-toast';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id?: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read?: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  toast_enabled: boolean;
  sound_enabled: boolean;
  preferences: {
    file_upload?: boolean;
    file_indexed?: boolean;
    transcription_completed?: boolean;
    budget_alerts?: boolean;
    gmail_sync?: boolean;
    backup_completed?: boolean;
    agent_task_completed?: boolean;
  };
}

export interface NotificationOptions {
  // Core options
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;

  // Delivery options
  showToast?: boolean; // Show toast notification (default: true)
  persistToDb?: boolean; // Save to database (default: true)
  sendEmail?: boolean; // Send email notification (default: false)

  // Email options (only if sendEmail is true)
  emailSubject?: string;
  emailRecipients?: string[];
  emailTemplate?: 'custom' | 'cost_alert' | 'service_paused' | 'limit_exceeded' | 'weekly_report';

  // Toast customization
  toastDuration?: number; // Duration in milliseconds
  toastPosition?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

export class NotificationManager {
  private static instance: NotificationManager;
  private emailSystem: EmailAlertSystem | null = null;

  private constructor() {
    // Lazy initialization - don't create email system until needed
  }

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  private getEmailSystem(): EmailAlertSystem {
    if (!this.emailSystem) {
      this.emailSystem = EmailAlertSystem.getInstance();
    }
    return this.emailSystem;
  }

  // ==================== MAIN NOTIFICATION METHODS ====================

  /**
   * Send a notification through multiple channels
   * This is the main method to use for all notifications
   */
  async notify(options: NotificationOptions): Promise<{ success: boolean; notificationId?: string }> {
    const {
      userId,
      type,
      title,
      message,
      link,
      metadata = {},
      showToast = true,
      persistToDb = true,
      sendEmail = false,
      emailSubject,
      emailRecipients,
      emailTemplate = 'custom',
      toastDuration = 5000,
      toastPosition = 'top-right',
    } = options;

    try {
      // Check user preferences
      const preferences = await this.getUserPreferences(userId);

      let notificationId: string | undefined;

      // 1. Persist to database (if enabled)
      if (persistToDb) {
        const { data, error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type,
            title,
            message,
            link,
            metadata,
            read: false,
          })
          .select()
          .single();

        if (error) {
          console.error('[NOTIFICATION] Failed to persist notification:', error);
        } else {
          notificationId = data.id;
          console.log(`[NOTIFICATION] Persisted notification ${notificationId}`);
        }
      }

      // 2. Show toast notification (client-side only, handled via API)
      // Toast is handled by the client when they receive the notification

      // 3. Send email notification (if enabled)
      if (sendEmail && preferences?.email_enabled) {
        const emailSent = await this.sendEmailNotification({
          userId,
          type,
          title,
          message,
          recipients: emailRecipients || [userId],
          subject: emailSubject || title,
          template: emailTemplate,
          metadata,
        });

        if (emailSent) {
          console.log(`[NOTIFICATION] Email sent to ${emailRecipients || userId}`);
        }
      }

      return { success: true, notificationId };
    } catch (error) {
      console.error('[NOTIFICATION] Failed to send notification:', error);
      return { success: false };
    }
  }

  // ==================== CONVENIENCE METHODS ====================

  /**
   * Send a success notification
   */
  async success(userId: string, title: string, message: string, options?: Partial<NotificationOptions>): Promise<void> {
    await this.notify({
      userId,
      type: 'success',
      title,
      message,
      ...options,
    });
  }

  /**
   * Send an error notification
   */
  async error(userId: string, title: string, message: string, options?: Partial<NotificationOptions>): Promise<void> {
    await this.notify({
      userId,
      type: 'error',
      title,
      message,
      ...options,
    });
  }

  /**
   * Send an info notification
   */
  async info(userId: string, title: string, message: string, options?: Partial<NotificationOptions>): Promise<void> {
    await this.notify({
      userId,
      type: 'info',
      title,
      message,
      ...options,
    });
  }

  /**
   * Send a warning notification
   */
  async warning(userId: string, title: string, message: string, options?: Partial<NotificationOptions>): Promise<void> {
    await this.notify({
      userId,
      type: 'warning',
      title,
      message,
      ...options,
    });
  }

  // ==================== NOTIFICATION RETRIEVAL ====================

  /**
   * Get all notifications for a user
   */
  async getNotifications(userId: string, limit = 50, includeRead = true): Promise<Notification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!includeRead) {
        query = query.eq('read', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[NOTIFICATION] Failed to fetch notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[NOTIFICATION] Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('[NOTIFICATION] Failed to fetch unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('[NOTIFICATION] Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('[NOTIFICATION] Failed to mark as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NOTIFICATION] Error marking as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('[NOTIFICATION] Failed to mark all as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NOTIFICATION] Error marking all as read:', error);
      return false;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('[NOTIFICATION] Failed to delete notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NOTIFICATION] Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteAllRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('read', true);

      if (error) {
        console.error('[NOTIFICATION] Failed to delete read notifications:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NOTIFICATION] Error deleting read notifications:', error);
      return false;
    }
  }

  // ==================== PREFERENCE MANAGEMENT ====================

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, create default
          return await this.createDefaultPreferences(userId);
        }
        console.error('[NOTIFICATION] Failed to fetch preferences:', error);
        return null;
      }

      return {
        email_enabled: data.email_enabled,
        toast_enabled: data.toast_enabled,
        sound_enabled: data.sound_enabled,
        preferences: data.preferences,
      };
    } catch (error) {
      console.error('[NOTIFICATION] Error fetching preferences:', error);
      return null;
    }
  }

  /**
   * Create default preferences for a user
   */
  private async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    const defaultPreferences: NotificationPreferences = {
      email_enabled: true,
      toast_enabled: true,
      sound_enabled: false,
      preferences: {
        file_upload: true,
        file_indexed: true,
        transcription_completed: true,
        budget_alerts: true,
        gmail_sync: true,
        backup_completed: true,
        agent_task_completed: true,
      },
    };

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: userId,
          ...defaultPreferences,
        });

      if (error) {
        console.error('[NOTIFICATION] Failed to create default preferences:', error);
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error creating default preferences:', error);
    }

    return defaultPreferences;
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
        });

      if (error) {
        console.error('[NOTIFICATION] Failed to update preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NOTIFICATION] Error updating preferences:', error);
      return false;
    }
  }

  // ==================== EMAIL NOTIFICATIONS ====================

  /**
   * Send email notification using the email alert system
   */
  private async sendEmailNotification(options: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    recipients: string[];
    subject: string;
    template: 'custom' | 'cost_alert' | 'service_paused' | 'limit_exceeded' | 'weekly_report';
    metadata?: Record<string, any>;
  }): Promise<boolean> {
    try {
      const emailAlert = {
        to: options.recipients,
        subject: options.subject,
        template: options.template,
        data: {
          title: options.title,
          message: options.message,
          subject: options.subject,
          html: this.generateEmailHtml(options.type, options.title, options.message),
          text: this.generateEmailText(options.title, options.message),
          ...options.metadata,
        },
        priority: options.type === 'error' ? ('critical' as const) : ('normal' as const),
        userId: options.userId,
      };

      return await this.getEmailSystem().sendAlert(emailAlert);
    } catch (error) {
      console.error('[NOTIFICATION] Failed to send email:', error);
      return false;
    }
  }

  /**
   * Generate HTML email content
   */
  private generateEmailHtml(type: NotificationType, title: string, message: string): string {
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8',
    };

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: ${colors[type]}; color: white; padding: 20px; text-align: center; border-radius: 8px; }
        .content { padding: 20px; }
        .message { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${icons[type]} ${title}</h1>
    </div>
    <div class="content">
        <div class="message">
            ${message}
        </div>
    </div>
    <div class="footer">
        <p>KimbleAI v4 - Intelligent Document Processing & Analysis</p>
        <p><small>${new Date().toLocaleString()}</small></p>
    </div>
</body>
</html>`;
  }

  /**
   * Generate plain text email content
   */
  private generateEmailText(title: string, message: string): string {
    return `
${title}

${message}

---
KimbleAI v4 - Intelligent Document Processing & Analysis
${new Date().toLocaleString()}
`;
  }

  // ==================== PRESET NOTIFICATIONS ====================

  /**
   * File upload notification
   */
  async notifyFileUploaded(userId: string, fileName: string, fileId: string): Promise<void> {
    await this.success(
      userId,
      'File Uploaded',
      `${fileName} has been uploaded successfully`,
      {
        link: `/files/${fileId}`,
        metadata: { fileName, fileId, event: 'file_upload' },
        sendEmail: false,
      }
    );
  }

  /**
   * File indexed notification
   */
  async notifyFileIndexed(userId: string, fileName: string, fileId: string): Promise<void> {
    await this.success(
      userId,
      'File Indexed',
      `${fileName} has been indexed and is now searchable`,
      {
        link: `/files/${fileId}`,
        metadata: { fileName, fileId, event: 'file_indexed' },
        sendEmail: false,
      }
    );
  }

  /**
   * Transcription completed notification
   */
  async notifyTranscriptionCompleted(userId: string, fileName: string, fileId: string): Promise<void> {
    await this.success(
      userId,
      'Transcription Completed',
      `Transcription for ${fileName} is ready`,
      {
        link: `/files/${fileId}`,
        metadata: { fileName, fileId, event: 'transcription_completed' },
        sendEmail: false,
      }
    );
  }

  /**
   * Budget alert notification
   */
  async notifyBudgetAlert(userId: string, percentage: number, period: 'daily' | 'monthly', details: any): Promise<void> {
    const type = percentage >= 90 ? 'error' : percentage >= 75 ? 'warning' : 'info';

    await this.notify({
      userId,
      type,
      title: `Budget Alert - ${percentage}%`,
      message: `Your ${period} budget is ${percentage}% used`,
      link: '/dashboard/cost-monitor',
      metadata: { percentage, period, ...details, event: 'budget_alert' },
      sendEmail: percentage >= 75,
      emailSubject: `KimbleAI Budget Alert - ${period} usage at ${percentage}%`,
      emailTemplate: 'cost_alert',
    });
  }

  /**
   * Gmail sync completed notification
   */
  async notifyGmailSync(userId: string, messageCount: number): Promise<void> {
    await this.success(
      userId,
      'Gmail Sync Completed',
      `Synced ${messageCount} messages from Gmail`,
      {
        link: '/gmail',
        metadata: { messageCount, event: 'gmail_sync' },
        sendEmail: false,
      }
    );
  }

  /**
   * Backup completed notification
   */
  async notifyBackupCompleted(userId: string, backupId: string, size: number): Promise<void> {
    await this.success(
      userId,
      'Backup Completed',
      `Database backup completed (${(size / 1024 / 1024).toFixed(2)} MB)`,
      {
        link: `/backups/${backupId}`,
        metadata: { backupId, size, event: 'backup_completed' },
        sendEmail: false,
      }
    );
  }

  /**
   * Backup failed notification
   */
  async notifyBackupFailed(userId: string, error: string): Promise<void> {
    await this.error(
      userId,
      'Backup Failed',
      `Database backup failed: ${error}`,
      {
        metadata: { error, event: 'backup_failed' },
        sendEmail: true,
        emailSubject: 'KimbleAI Backup Failed - Immediate Action Required',
      }
    );
  }

  /**
   * Agent task completed notification
   */
  async notifyAgentTaskCompleted(userId: string, taskName: string, taskId: string): Promise<void> {
    await this.success(
      userId,
      'Task Completed',
      `${taskName} has been completed successfully`,
      {
        link: `/tasks/${taskId}`,
        metadata: { taskName, taskId, event: 'agent_task_completed' },
        sendEmail: false,
      }
    );
  }
}

// Export singleton instance
export default NotificationManager.getInstance();
