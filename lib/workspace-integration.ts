import { knowledgeGraph } from './knowledge-graph';
import { EntityType } from './knowledge-graph-db';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface DataSourceConfig {
  id: string;
  name: string;
  type: 'conversations' | 'google_drive' | 'gmail' | 'files' | 'calendar';
  enabled: boolean;
  lastSync?: string;
  totalItems?: number;
  processedItems?: number;
  settings: Record<string, any>;
}

export interface SyncResult {
  sourceId: string;
  success: boolean;
  entitiesCreated: number;
  relationshipsCreated: number;
  itemsProcessed: number;
  errors: string[];
  duration: number;
}

export class WorkspaceIntegration {
  private syncInProgress = new Set<string>();

  async getDataSources(userId: string): Promise<DataSourceConfig[]> {
    const sources: DataSourceConfig[] = [
      {
        id: 'conversations',
        name: 'Chat Conversations',
        type: 'conversations',
        enabled: true,
        settings: {
          includeSystemMessages: false,
          minimumLength: 100
        }
      },
      {
        id: 'google_drive',
        name: 'Google Drive',
        type: 'google_drive',
        enabled: true,
        settings: {
          fileTypes: ['pdf', 'doc', 'docx', 'txt'],
          maxFileSize: 10485760 // 10MB
        }
      },
      {
        id: 'gmail',
        name: 'Gmail',
        type: 'gmail',
        enabled: false,
        settings: {
          includeAttachments: false,
          dateRange: 30 // days
        }
      },
      {
        id: 'uploaded_files',
        name: 'Uploaded Files',
        type: 'files',
        enabled: true,
        settings: {
          supportedTypes: ['pdf', 'txt', 'md', 'docx']
        }
      },
      {
        id: 'google_calendar',
        name: 'Google Calendar',
        type: 'calendar',
        enabled: false,
        settings: {
          includeAttendees: true,
          includeDescription: true
        }
      }
    ];

    // Get sync status for each source
    for (const source of sources) {
      const syncStatus = await this.getSyncStatus(source.id, userId);
      source.lastSync = syncStatus.lastSync;
      source.totalItems = syncStatus.totalItems;
      source.processedItems = syncStatus.processedItems;
    }

    return sources;
  }

  async syncDataSource(
    sourceId: string,
    userId: string,
    options: {
      force?: boolean;
      limit?: number;
      since?: string;
    } = {}
  ): Promise<SyncResult> {
    if (this.syncInProgress.has(sourceId)) {
      throw new Error(`Sync already in progress for ${sourceId}`);
    }

    this.syncInProgress.add(sourceId);
    const startTime = Date.now();

    try {
      let result: SyncResult;

      switch (sourceId) {
        case 'conversations':
          result = await this.syncConversations(userId, options);
          break;
        case 'google_drive':
          result = await this.syncGoogleDrive(userId, options);
          break;
        case 'gmail':
          result = await this.syncGmail(userId, options);
          break;
        case 'uploaded_files':
          result = await this.syncUploadedFiles(userId, options);
          break;
        case 'google_calendar':
          result = await this.syncGoogleCalendar(userId, options);
          break;
        default:
          throw new Error(`Unknown data source: ${sourceId}`);
      }

      result.duration = Date.now() - startTime;
      result.sourceId = sourceId;

      // Update sync status
      await this.updateSyncStatus(sourceId, userId, {
        lastSync: new Date().toISOString(),
        totalItems: result.itemsProcessed,
        processedItems: result.itemsProcessed,
        success: result.success,
        errors: result.errors
      });

      return result;
    } finally {
      this.syncInProgress.delete(sourceId);
    }
  }

  async syncAllDataSources(
    userId: string,
    options: { enabledOnly?: boolean } = {}
  ): Promise<SyncResult[]> {
    const sources = await this.getDataSources(userId);
    const results: SyncResult[] = [];

    for (const source of sources) {
      if (options.enabledOnly && !source.enabled) continue;

      try {
        const result = await this.syncDataSource(source.id, userId);
        results.push(result);
      } catch (error) {
        console.error(`Error syncing ${source.id}:`, error);
        results.push({
          sourceId: source.id,
          success: false,
          entitiesCreated: 0,
          relationshipsCreated: 0,
          itemsProcessed: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          duration: 0
        });
      }
    }

    return results;
  }

  private async syncConversations(
    userId: string,
    options: { limit?: number; since?: string }
  ): Promise<Omit<SyncResult, 'sourceId' | 'duration'>> {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', options.since || '2000-01-01')
      .order('created_at', { ascending: false })
      .limit(options.limit || 100);

    if (error) {
      return {
        success: false,
        entitiesCreated: 0,
        relationshipsCreated: 0,
        itemsProcessed: 0,
        errors: [error.message]
      };
    }

    let entitiesCreated = 0;
    let relationshipsCreated = 0;
    const errors: string[] = [];

    for (const conversation of conversations || []) {
      try {
        const messages = conversation.messages || [];

        if (messages.length === 0) continue;

        const conversationText = messages
          .map((msg: any) => `${msg.role}: ${msg.content}`)
          .join('\n\n');

        const result = await knowledgeGraph.processContent(
          conversationText,
          'conversation',
          conversation.id,
          userId,
          {
            title: conversation.title,
            created_at: conversation.created_at,
            messages: messages,
            messageCount: messages.length
          }
        );

        entitiesCreated += result.entities.length;
        relationshipsCreated += result.relationships.length;
      } catch (error) {
        console.error('Error processing conversation:', conversation.id, error);
        errors.push(`Conversation ${conversation.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      entitiesCreated,
      relationshipsCreated,
      itemsProcessed: conversations?.length || 0,
      errors
    };
  }

  private async syncGoogleDrive(
    userId: string,
    options: { limit?: number; since?: string }
  ): Promise<Omit<SyncResult, 'sourceId' | 'duration'>> {
    // This would integrate with the existing Google Drive system
    // For now, return a placeholder
    try {
      const response = await fetch('/api/google/drive', {
        method: 'GET',
        headers: { 'user-id': userId }
      });

      if (!response.ok) {
        return {
          success: false,
          entitiesCreated: 0,
          relationshipsCreated: 0,
          itemsProcessed: 0,
          errors: ['Failed to fetch Google Drive data']
        };
      }

      const driveData = await response.json();
      let entitiesCreated = 0;
      let relationshipsCreated = 0;
      const errors: string[] = [];

      // Process files from Drive
      const files = driveData.files || [];

      for (const file of files.slice(0, options.limit || 50)) {
        try {
          if (file.content && file.content.length > 100) {
            const result = await knowledgeGraph.processContent(
              file.content,
              'file',
              file.id,
              userId,
              {
                name: file.name,
                mimeType: file.mimeType,
                size: file.size,
                webViewLink: file.webViewLink,
                modifiedTime: file.modifiedTime,
                driveFile: true
              }
            );

            entitiesCreated += result.entities.length;
            relationshipsCreated += result.relationships.length;
          }
        } catch (error) {
          errors.push(`File ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: errors.length === 0,
        entitiesCreated,
        relationshipsCreated,
        itemsProcessed: files.length,
        errors
      };
    } catch (error) {
      return {
        success: false,
        entitiesCreated: 0,
        relationshipsCreated: 0,
        itemsProcessed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async syncGmail(
    userId: string,
    options: { limit?: number; since?: string }
  ): Promise<Omit<SyncResult, 'sourceId' | 'duration'>> {
    // This would integrate with the existing Gmail system
    try {
      const response = await fetch('/api/google/gmail', {
        method: 'GET',
        headers: { 'user-id': userId }
      });

      if (!response.ok) {
        return {
          success: false,
          entitiesCreated: 0,
          relationshipsCreated: 0,
          itemsProcessed: 0,
          errors: ['Failed to fetch Gmail data']
        };
      }

      const gmailData = await response.json();
      let entitiesCreated = 0;
      let relationshipsCreated = 0;
      const errors: string[] = [];

      const emails = gmailData.emails || [];

      for (const email of emails.slice(0, options.limit || 50)) {
        try {
          const emailContent = `
Subject: ${email.subject}
From: ${email.from}
To: ${email.to}
Date: ${email.date}

${email.body}
          `.trim();

          const result = await knowledgeGraph.processContent(
            emailContent,
            'email',
            email.id,
            userId,
            {
              emailData: email,
              subject: email.subject,
              from: email.from,
              to: email.to,
              date: email.date
            }
          );

          entitiesCreated += result.entities.length;
          relationshipsCreated += result.relationships.length;
        } catch (error) {
          errors.push(`Email ${email.subject}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: errors.length === 0,
        entitiesCreated,
        relationshipsCreated,
        itemsProcessed: emails.length,
        errors
      };
    } catch (error) {
      return {
        success: false,
        entitiesCreated: 0,
        relationshipsCreated: 0,
        itemsProcessed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async syncUploadedFiles(
    userId: string,
    options: { limit?: number; since?: string }
  ): Promise<Omit<SyncResult, 'sourceId' | 'duration'>> {
    // Query uploaded files from the database
    const { data: files, error } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', options.since || '2000-01-01')
      .order('created_at', { ascending: false })
      .limit(options.limit || 100);

    if (error) {
      return {
        success: false,
        entitiesCreated: 0,
        relationshipsCreated: 0,
        itemsProcessed: 0,
        errors: [error.message]
      };
    }

    let entitiesCreated = 0;
    let relationshipsCreated = 0;
    const errors: string[] = [];

    for (const file of files || []) {
      try {
        if (file.content && file.content.length > 100) {
          const result = await knowledgeGraph.processContent(
            file.content,
            'file',
            file.id,
            userId,
            {
              filename: file.filename,
              fileType: file.file_type,
              size: file.size,
              uploadedAt: file.created_at
            }
          );

          entitiesCreated += result.entities.length;
          relationshipsCreated += result.relationships.length;
        }
      } catch (error) {
        errors.push(`File ${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      entitiesCreated,
      relationshipsCreated,
      itemsProcessed: files?.length || 0,
      errors
    };
  }

  private async syncGoogleCalendar(
    userId: string,
    options: { limit?: number; since?: string }
  ): Promise<Omit<SyncResult, 'sourceId' | 'duration'>> {
    // This would integrate with Google Calendar API
    try {
      const response = await fetch('/api/google/calendar', {
        method: 'GET',
        headers: { 'user-id': userId }
      });

      if (!response.ok) {
        return {
          success: false,
          entitiesCreated: 0,
          relationshipsCreated: 0,
          itemsProcessed: 0,
          errors: ['Failed to fetch Google Calendar data']
        };
      }

      const calendarData = await response.json();
      let entitiesCreated = 0;
      let relationshipsCreated = 0;
      const errors: string[] = [];

      const events = calendarData.events || [];

      for (const event of events.slice(0, options.limit || 100)) {
        try {
          const eventContent = `
Event: ${event.summary}
Start: ${event.start}
End: ${event.end}
Location: ${event.location || 'No location'}
Description: ${event.description || 'No description'}
Attendees: ${event.attendees?.map((a: any) => a.email).join(', ') || 'None'}
          `.trim();

          const result = await knowledgeGraph.processContent(
            eventContent,
            'text',
            event.id,
            userId,
            {
              eventData: event,
              eventType: 'calendar_event',
              start: event.start,
              end: event.end,
              attendees: event.attendees
            }
          );

          entitiesCreated += result.entities.length;
          relationshipsCreated += result.relationships.length;
        } catch (error) {
          errors.push(`Event ${event.summary}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: errors.length === 0,
        entitiesCreated,
        relationshipsCreated,
        itemsProcessed: events.length,
        errors
      };
    } catch (error) {
      return {
        success: false,
        entitiesCreated: 0,
        relationshipsCreated: 0,
        itemsProcessed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async getSyncStatus(sourceId: string, userId: string): Promise<{
    lastSync?: string;
    totalItems?: number;
    processedItems?: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('sync_status')
        .select('*')
        .eq('source_id', sourceId)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return {};
      }

      return {
        lastSync: data.last_sync,
        totalItems: data.total_items,
        processedItems: data.processed_items
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {};
    }
  }

  private async updateSyncStatus(
    sourceId: string,
    userId: string,
    status: {
      lastSync: string;
      totalItems: number;
      processedItems: number;
      success: boolean;
      errors: string[];
    }
  ): Promise<void> {
    try {
      await supabase
        .from('sync_status')
        .upsert({
          source_id: sourceId,
          user_id: userId,
          last_sync: status.lastSync,
          total_items: status.totalItems,
          processed_items: status.processedItems,
          success: status.success,
          errors: status.errors,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }

  async schedulePeriodicSync(
    userId: string,
    sourceId: string,
    intervalHours: number = 24
  ): Promise<void> {
    // This would implement periodic syncing using a job queue or cron-like system
    console.log(`Scheduled periodic sync for ${sourceId} every ${intervalHours} hours`);
  }

  async getWorkspaceInsights(userId: string): Promise<{
    totalDataSources: number;
    activeSources: number;
    totalEntitiesFromIntegrations: number;
    lastSyncTimes: Record<string, string>;
    syncHealth: 'healthy' | 'warning' | 'error';
    recommendations: string[];
  }> {
    const sources = await this.getDataSources(userId);
    const activeSources = sources.filter(s => s.enabled).length;

    const lastSyncTimes: Record<string, string> = {};
    let oldestSync: string | null = null;

    for (const source of sources) {
      if (source.lastSync) {
        lastSyncTimes[source.id] = source.lastSync;
        if (!oldestSync || source.lastSync < oldestSync) {
          oldestSync = source.lastSync;
        }
      }
    }

    // Determine sync health
    let syncHealth: 'healthy' | 'warning' | 'error' = 'healthy';
    const recommendations: string[] = [];

    if (activeSources === 0) {
      syncHealth = 'error';
      recommendations.push('Enable at least one data source to build your knowledge graph');
    } else if (oldestSync) {
      const daysSinceSync = (Date.now() - new Date(oldestSync).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceSync > 7) {
        syncHealth = 'warning';
        recommendations.push('Some data sources haven\'t synced in over a week');
      }
    }

    if (sources.filter(s => s.type === 'conversations' && s.enabled).length === 0) {
      recommendations.push('Enable conversation sync to capture chat interactions');
    }

    return {
      totalDataSources: sources.length,
      activeSources,
      totalEntitiesFromIntegrations: sources.reduce((sum, s) => sum + (s.processedItems || 0), 0),
      lastSyncTimes,
      syncHealth,
      recommendations
    };
  }
}

export const workspaceIntegration = new WorkspaceIntegration();