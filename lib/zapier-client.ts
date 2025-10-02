/**
 * Zapier Webhook Client
 *
 * Centralized client for sending events to Zapier webhooks.
 * Handles retries, error handling, and usage tracking.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Webhook URLs from environment
const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL;
const ZAPIER_MEMORY_WEBHOOK_URL = process.env.ZAPIER_MEMORY_WEBHOOK_URL;
const ZAPIER_WEBHOOK_SECRET = process.env.ZAPIER_WEBHOOK_SECRET;

// Usage tracking
let dailyWebhookCount = 0;
let lastResetDate = new Date().toISOString().split('T')[0];

export interface ZapierEvent {
  eventType: 'conversation_saved' | 'transcription_complete' | 'photo_uploaded' | 'urgent_notification' | 'daily_summary' | 'action_items';
  userId: string;
  data: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  retryOnFailure?: boolean;
}

export interface ZapierResponse {
  success: boolean;
  webhookCalled: boolean;
  error?: string;
  webhookId?: string;
  timestamp: string;
}

export class ZapierClient {
  private static instance: ZapierClient;

  private constructor() {}

  public static getInstance(): ZapierClient {
    if (!ZapierClient.instance) {
      ZapierClient.instance = new ZapierClient();
    }
    return ZapierClient.instance;
  }

  /**
   * Send event to Zapier webhook
   */
  public async sendEvent(event: ZapierEvent): Promise<ZapierResponse> {
    const timestamp = new Date().toISOString();

    // Check if webhooks are configured
    if (!ZAPIER_WEBHOOK_URL && !ZAPIER_MEMORY_WEBHOOK_URL) {
      console.warn('[Zapier] Webhooks not configured, skipping event:', event.eventType);
      return {
        success: false,
        webhookCalled: false,
        error: 'Webhooks not configured',
        timestamp
      };
    }

    // Check daily limits (750 tasks/month = ~25/day)
    this.resetDailyCountIfNeeded();
    if (dailyWebhookCount >= 30) {
      console.warn('[Zapier] Daily webhook limit reached (30/day)');
      return {
        success: false,
        webhookCalled: false,
        error: 'Daily webhook limit reached',
        timestamp
      };
    }

    // Determine which webhook to use based on event type
    const webhookUrl = this.getWebhookUrl(event.eventType);

    if (!webhookUrl) {
      console.warn('[Zapier] No webhook URL configured for event type:', event.eventType);
      return {
        success: false,
        webhookCalled: false,
        error: 'No webhook URL for event type',
        timestamp
      };
    }

    // Prepare payload
    const payload = {
      eventType: event.eventType,
      userId: event.userId,
      priority: event.priority || 'medium',
      timestamp,
      data: event.data
    };

    // Send webhook (async, non-blocking)
    try {
      const response = await this.sendWebhook(webhookUrl, payload, event.retryOnFailure);

      if (response.success) {
        dailyWebhookCount++;
      }

      // Track webhook call in database (async, don't await)
      this.trackWebhookCall(event, response).catch(err => {
        console.error('[Zapier] Failed to track webhook call:', err);
      });

      return response;

    } catch (error: any) {
      console.error('[Zapier] Failed to send event:', error);
      return {
        success: false,
        webhookCalled: false,
        error: error.message,
        timestamp
      };
    }
  }

  /**
   * Send conversation saved event
   */
  public async sendConversationSaved(
    userId: string,
    conversationId: string,
    messages: any[],
    metadata?: any
  ): Promise<ZapierResponse> {
    return this.sendEvent({
      eventType: 'conversation_saved',
      userId,
      data: {
        conversationId,
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1]?.content?.substring(0, 200),
        metadata
      },
      priority: 'low',
      retryOnFailure: false
    });
  }

  /**
   * Send transcription complete event
   */
  public async sendTranscriptionComplete(
    userId: string,
    transcriptionId: string,
    text: string,
    actionItems: string[],
    tags: string[],
    metadata?: any
  ): Promise<ZapierResponse> {
    return this.sendEvent({
      eventType: 'transcription_complete',
      userId,
      data: {
        transcriptionId,
        textPreview: text.substring(0, 500),
        fullTextLength: text.length,
        actionItems,
        tags,
        metadata
      },
      priority: 'medium',
      retryOnFailure: true
    });
  }

  /**
   * Send photo uploaded event
   */
  public async sendPhotoUploaded(
    userId: string,
    photoId: string,
    analysis: string,
    tags: string[],
    hasUrgentTag: boolean,
    metadata?: any
  ): Promise<ZapierResponse> {
    return this.sendEvent({
      eventType: 'photo_uploaded',
      userId,
      data: {
        photoId,
        analysisPreview: analysis.substring(0, 300),
        tags,
        metadata
      },
      priority: hasUrgentTag ? 'urgent' : 'low',
      retryOnFailure: false
    });
  }

  /**
   * Send urgent notification
   */
  public async sendUrgentNotification(
    userId: string,
    title: string,
    message: string,
    source: string,
    metadata?: any
  ): Promise<ZapierResponse> {
    return this.sendEvent({
      eventType: 'urgent_notification',
      userId,
      data: {
        title,
        message,
        source,
        metadata
      },
      priority: 'urgent',
      retryOnFailure: true
    });
  }

  /**
   * Send daily summary
   */
  public async sendDailySummary(
    userId: string,
    summary: {
      conversationCount: number;
      transcriptionCount: number;
      photoCount: number;
      actionItems: string[];
      topTopics: string[];
    }
  ): Promise<ZapierResponse> {
    return this.sendEvent({
      eventType: 'daily_summary',
      userId,
      data: summary,
      priority: 'low',
      retryOnFailure: false
    });
  }

  /**
   * Private: Send webhook with retry logic
   */
  private async sendWebhook(
    url: string,
    payload: any,
    retry: boolean = false
  ): Promise<ZapierResponse> {
    const maxRetries = retry ? 3 : 1;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ZAPIER_WEBHOOK_SECRET || 'kimbleai-zapier-2024'}`
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (response.ok) {
          const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.log(`[Zapier] Webhook sent successfully (attempt ${attempt}/${maxRetries}):`, payload.eventType);

          return {
            success: true,
            webhookCalled: true,
            webhookId,
            timestamp: new Date().toISOString()
          };
        } else {
          lastError = new Error(`Webhook failed with status ${response.status}`);
          console.warn(`[Zapier] Webhook attempt ${attempt}/${maxRetries} failed:`, response.status);
        }

      } catch (error: any) {
        lastError = error;
        console.error(`[Zapier] Webhook attempt ${attempt}/${maxRetries} error:`, error.message);
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return {
      success: false,
      webhookCalled: false,
      error: lastError?.message || 'Webhook failed after retries',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Private: Track webhook call in database
   */
  private async trackWebhookCall(event: ZapierEvent, response: ZapierResponse): Promise<void> {
    try {
      await supabase.from('zapier_webhook_logs').insert({
        event_type: event.eventType,
        user_id: event.userId,
        priority: event.priority || 'medium',
        success: response.success,
        webhook_called: response.webhookCalled,
        webhook_id: response.webhookId,
        error: response.error,
        payload_preview: JSON.stringify(event.data).substring(0, 500),
        timestamp: response.timestamp
      });

      console.log(`[Zapier] Webhook call tracked: ${event.eventType} - ${response.success ? 'SUCCESS' : 'FAILED'}`);

    } catch (error) {
      console.error('[Zapier] Failed to track webhook call in database:', error);
    }
  }

  /**
   * Private: Get webhook URL for event type
   */
  private getWebhookUrl(eventType: string): string | undefined {
    switch (eventType) {
      case 'transcription_complete':
      case 'action_items':
      case 'daily_summary':
        return ZAPIER_MEMORY_WEBHOOK_URL || ZAPIER_WEBHOOK_URL;

      case 'conversation_saved':
      case 'photo_uploaded':
      case 'urgent_notification':
      default:
        return ZAPIER_WEBHOOK_URL;
    }
  }

  /**
   * Private: Reset daily count if new day
   */
  private resetDailyCountIfNeeded(): void {
    const today = new Date().toISOString().split('T')[0];
    if (today !== lastResetDate) {
      console.log(`[Zapier] Resetting daily webhook count. Previous: ${dailyWebhookCount}`);
      dailyWebhookCount = 0;
      lastResetDate = today;
    }
  }

  /**
   * Get current usage stats
   */
  public getUsageStats(): { dailyCount: number; dailyLimit: number; date: string } {
    this.resetDailyCountIfNeeded();
    return {
      dailyCount: dailyWebhookCount,
      dailyLimit: 30,
      date: lastResetDate
    };
  }

  /**
   * Check if urgent tag is detected
   */
  public detectUrgentTag(text: string, tags?: string[]): boolean {
    const urgentKeywords = ['urgent', 'asap', 'critical', 'emergency', 'immediate', 'deadline'];
    const lowerText = text.toLowerCase();

    // Check text content
    const hasUrgentInText = urgentKeywords.some(keyword => lowerText.includes(keyword));

    // Check tags
    const hasUrgentTag = tags?.some(tag =>
      urgentKeywords.some(keyword => tag.toLowerCase().includes(keyword))
    );

    return hasUrgentInText || hasUrgentTag || false;
  }
}

// Export singleton instance
export const zapierClient = ZapierClient.getInstance();
