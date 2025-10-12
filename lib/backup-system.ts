// lib/backup-system.ts
// Automated Backup System with Google Drive Integration
// Backs up all critical data: conversations, knowledge, files, projects, settings

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { EmailAlertSystem } from './email-alert-system';
import NotificationManager from './notification-manager';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Backup manifest
export interface BackupManifest {
  backup_id: string;
  backup_version: string;
  created_at: string;
  user_id: string;
  user_email: string;
  data_counts: {
    conversations: number;
    messages: number;
    knowledge_base: number;
    files: number;
    projects: number;
    transcriptions: number;
  };
  backup_size_bytes: number;
  drive_file_id?: string;
  drive_file_url?: string;
}

// Backup data structure
interface BackupData {
  backup_version: string;
  created_at: string;
  user_id: string;
  user_email: string;
  data: {
    conversations: any[];
    messages: any[];
    knowledge_base: any[];
    files: any[];
    file_registry: any[];
    projects: any[];
    audio_transcriptions: any[];
    processed_images: any[];
    processed_documents: any[];
    user_preferences: any;
    budget_config: any;
  };
  metadata: {
    backup_id: string;
    data_counts: any;
    backup_size_bytes: number;
  };
}

/**
 * Backup System
 * Handles automated backups to Google Drive
 */
export class BackupSystem {
  /**
   * Create a full backup of user data
   */
  static async createFullBackup(userId: string): Promise<BackupManifest> {
    console.log(`[BACKUP] Starting full backup for user: ${userId}`);

    try {
      // Get user info
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!userData) {
        throw new Error('User not found');
      }

      // Fetch all data
      const [
        conversations,
        messages,
        knowledgeBase,
        files,
        fileRegistry,
        projects,
        transcriptions,
        images,
        documents
      ] = await Promise.all([
        this.getConversations(userId),
        this.getMessages(userId),
        this.getKnowledgeBase(userId),
        this.getFiles(userId),
        this.getFileRegistry(userId),
        this.getProjects(userId),
        this.getTranscriptions(userId),
        this.getProcessedImages(userId),
        this.getProcessedDocuments(userId)
      ]);

      // Get user preferences and budget config
      const { data: budgetConfig } = await supabase
        .from('budget_config')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Build backup data
      const backupId = `backup_${Date.now()}_${userId}`;
      const backupData: BackupData = {
        backup_version: '1.0',
        created_at: new Date().toISOString(),
        user_id: userId,
        user_email: userData.email,
        data: {
          conversations: conversations || [],
          messages: messages || [],
          knowledge_base: knowledgeBase || [],
          files: files || [],
          file_registry: fileRegistry || [],
          projects: projects || [],
          audio_transcriptions: transcriptions || [],
          processed_images: images || [],
          processed_documents: documents || [],
          user_preferences: {
            name: userData.name,
            email: userData.email,
            timezone: userData.timezone,
            created_at: userData.created_at
          },
          budget_config: budgetConfig || null
        },
        metadata: {
          backup_id: backupId,
          data_counts: {
            conversations: conversations?.length || 0,
            messages: messages?.length || 0,
            knowledge_base: knowledgeBase?.length || 0,
            files: files?.length || 0,
            projects: projects?.length || 0,
            transcriptions: transcriptions?.length || 0
          },
          backup_size_bytes: 0
        }
      };

      // Calculate size
      const backupJson = JSON.stringify(backupData);
      backupData.metadata.backup_size_bytes = Buffer.byteLength(backupJson, 'utf8');

      console.log(`[BACKUP] Backup created: ${backupData.metadata.backup_size_bytes} bytes`);

      // Store backup data in Supabase Storage
      const storageFileName = `${userId}/${backupId}.json`;
      const { error: storageError } = await supabase
        .storage
        .from('backups')
        .upload(storageFileName, backupJson, {
          contentType: 'application/json',
          upsert: true
        });

      if (storageError) {
        console.error('[BACKUP] Failed to upload to storage:', storageError);
        throw new Error(`Storage upload failed: ${storageError.message}`);
      }

      // Create manifest
      const manifest: BackupManifest = {
        backup_id: backupId,
        backup_version: '1.0',
        created_at: backupData.created_at,
        user_id: userId,
        user_email: userData.email,
        data_counts: backupData.metadata.data_counts,
        backup_size_bytes: backupData.metadata.backup_size_bytes
      };

      // Store backup metadata in database
      await supabase.from('backups').insert({
        id: backupId,
        user_id: userId,
        created_at: backupData.created_at,
        data_counts: backupData.metadata.data_counts,
        backup_size_bytes: backupData.metadata.backup_size_bytes,
        status: 'completed'
      });

      console.log(`[BACKUP] Full backup completed: ${backupId}`);

      // Send success notification (both email and in-app)
      await this.sendBackupNotification(userId, userData.email, 'success', manifest);

      // Send in-app notification
      await NotificationManager.notifyBackupCompleted(
        userId,
        backupId,
        backupData.metadata.backup_size_bytes
      );

      return manifest;

    } catch (error: any) {
      console.error('[BACKUP] Error creating backup:', error);

      // Send failure notification (both email and in-app)
      await this.sendBackupNotification(userId, userData?.email || '', 'failure', null, error.message);

      // Send in-app notification
      await NotificationManager.notifyBackupFailed(userId, error.message);

      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  /**
   * Export backup to Google Drive
   */
  static async exportToGoogleDrive(
    userId: string,
    accessToken: string,
    refreshToken: string
  ): Promise<{ driveFileId: string; driveFileUrl: string }> {
    console.log(`[BACKUP] Exporting backup to Google Drive for user: ${userId}`);

    try {
      // Create backup
      const manifest = await this.createFullBackup(userId);

      // Initialize Google Drive client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID!,
        process.env.GOOGLE_CLIENT_SECRET!,
        process.env.NEXTAUTH_URL + '/api/auth/callback/google'
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      // Check if backup folder exists, create if not
      const folderName = 'KimbleAI Backups';
      let folderId = await this.findOrCreateFolder(drive, folderName);

      // Prepare backup file
      const filename = `KimbleAI_Backup_${new Date().toISOString().split('T')[0]}_${manifest.backup_id}.json`;

      // Get full backup data from manifest
      const backupData = await this.getBackupData(manifest.backup_id);

      // Upload to Drive
      const fileMetadata = {
        name: filename,
        parents: [folderId],
        mimeType: 'application/json',
        description: `KimbleAI backup created on ${manifest.created_at}`
      };

      const media = {
        mimeType: 'application/json',
        body: JSON.stringify(backupData, null, 2)
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink'
      });

      const driveFileId = response.data.id!;
      const driveFileUrl = response.data.webViewLink || '';

      // Update backup record with Drive info
      await supabase
        .from('backups')
        .update({
          drive_file_id: driveFileId,
          drive_file_url: driveFileUrl
        })
        .eq('id', manifest.backup_id);

      console.log(`[BACKUP] Exported to Google Drive: ${driveFileId}`);

      return {
        driveFileId,
        driveFileUrl
      };

    } catch (error: any) {
      console.error('[BACKUP] Error exporting to Drive:', error);
      throw new Error(`Drive export failed: ${error.message}`);
    }
  }

  /**
   * List all backups for a user
   */
  static async listBackups(userId: string, limit: number = 30): Promise<BackupManifest[]> {
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[BACKUP] Error listing backups:', error);
      return [];
    }

    return data.map(backup => ({
      backup_id: backup.id,
      backup_version: '1.0',
      created_at: backup.created_at,
      user_id: backup.user_id,
      user_email: '',
      data_counts: backup.data_counts,
      backup_size_bytes: backup.backup_size_bytes,
      drive_file_id: backup.drive_file_id,
      drive_file_url: backup.drive_file_url
    }));
  }

  /**
   * Restore from backup
   */
  static async restoreFromBackup(
    backupId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    console.log(`[BACKUP] Restoring backup: ${backupId} for user: ${userId}`);

    try {
      // Get backup data
      const backupData = await this.getBackupData(backupId);

      if (!backupData) {
        return { success: false, message: 'Backup not found' };
      }

      // Verify user owns this backup
      if (backupData.user_id !== userId) {
        return { success: false, message: 'Unauthorized' };
      }

      // Restore data (this is a simplified version - in production, you'd want more safeguards)
      // Note: This does NOT delete existing data, it only adds/updates

      // Restore conversations
      if (backupData.data.conversations.length > 0) {
        await supabase.from('conversations').upsert(backupData.data.conversations);
      }

      // Restore messages
      if (backupData.data.messages.length > 0) {
        await supabase.from('messages').upsert(backupData.data.messages);
      }

      // Restore knowledge base
      if (backupData.data.knowledge_base.length > 0) {
        await supabase.from('knowledge_base').upsert(backupData.data.knowledge_base);
      }

      // Restore file registry
      if (backupData.data.file_registry.length > 0) {
        await supabase.from('file_registry').upsert(backupData.data.file_registry);
      }

      // Restore projects
      if (backupData.data.projects.length > 0) {
        await supabase.from('projects').upsert(backupData.data.projects);
      }

      console.log(`[BACKUP] Restore completed: ${backupId}`);

      return {
        success: true,
        message: `Restored ${backupData.metadata.data_counts.conversations} conversations, ${backupData.metadata.data_counts.messages} messages, ${backupData.metadata.data_counts.knowledge_base} knowledge entries`
      };

    } catch (error: any) {
      console.error('[BACKUP] Error restoring backup:', error);
      return {
        success: false,
        message: `Restore failed: ${error.message}`
      };
    }
  }

  /**
   * Schedule automated backup (to be called by cron)
   */
  static async scheduleBackup(userId: string, frequency: 'daily' | 'weekly'): Promise<void> {
    // This would be called by a Vercel Cron job or similar
    // For now, just log the intent
    console.log(`[BACKUP] Scheduled ${frequency} backup for user: ${userId}`);
  }

  /**
   * Clean up old backups with rotation logic
   * Keep: 7 daily, 4 weekly, 12 monthly
   */
  static async cleanupOldBackups(userId: string, keepDays: number = 30): Promise<number> {
    try {
      // Get all backups for user
      const { data: allBackups, error } = await supabase
        .from('backups')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !allBackups) {
        console.error('[BACKUP] Error fetching backups:', error);
        return 0;
      }

      const now = new Date();
      const backupsToKeep = new Set<string>();
      const backupsByDate: { [key: string]: any } = {};

      // Organize backups by date
      allBackups.forEach(backup => {
        const date = new Date(backup.created_at);
        const dateKey = date.toISOString().split('T')[0];
        if (!backupsByDate[dateKey] || new Date(backup.created_at) > new Date(backupsByDate[dateKey].created_at)) {
          backupsByDate[dateKey] = backup;
        }
      });

      // Keep last 7 daily backups
      const dailyBackups = Object.values(backupsByDate).slice(0, 7);
      dailyBackups.forEach(b => backupsToKeep.add(b.id));

      // Keep last 4 weekly backups (one per week)
      const weeklyBackups: any[] = [];
      const seenWeeks = new Set<string>();

      allBackups.forEach(backup => {
        const date = new Date(backup.created_at);
        const weekKey = `${date.getFullYear()}-W${Math.floor(date.getDate() / 7)}`;

        if (!seenWeeks.has(weekKey) && weeklyBackups.length < 4) {
          seenWeeks.add(weekKey);
          weeklyBackups.push(backup);
        }
      });
      weeklyBackups.forEach(b => backupsToKeep.add(b.id));

      // Keep last 12 monthly backups (one per month)
      const monthlyBackups: any[] = [];
      const seenMonths = new Set<string>();

      allBackups.forEach(backup => {
        const date = new Date(backup.created_at);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

        if (!seenMonths.has(monthKey) && monthlyBackups.length < 12) {
          seenMonths.add(monthKey);
          monthlyBackups.push(backup);
        }
      });
      monthlyBackups.forEach(b => backupsToKeep.add(b.id));

      // Delete backups not in keep list
      const backupsToDelete = allBackups.filter(b => !backupsToKeep.has(b.id));

      let deletedCount = 0;
      for (const backup of backupsToDelete) {
        // Delete from storage
        await supabase
          .storage
          .from('backups')
          .remove([`${userId}/${backup.id}.json`]);

        // Delete from database
        await supabase
          .from('backups')
          .delete()
          .eq('id', backup.id);

        deletedCount++;
      }

      console.log(`[BACKUP] Cleaned up ${deletedCount} old backups (kept ${backupsToKeep.size})`);
      return deletedCount;

    } catch (error: any) {
      console.error('[BACKUP] Error cleaning up backups:', error);
      return 0;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private static async getConversations(userId: string) {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId);
    return data;
  }

  private static async getMessages(userId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId);
    return data;
  }

  private static async getKnowledgeBase(userId: string) {
    const { data } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('user_id', userId);
    return data;
  }

  private static async getFiles(userId: string) {
    const { data } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId);
    return data;
  }

  private static async getFileRegistry(userId: string) {
    const { data } = await supabase
      .from('file_registry')
      .select('*')
      .eq('user_id', userId);
    return data;
  }

  private static async getProjects(userId: string) {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', userId);
    return data;
  }

  private static async getTranscriptions(userId: string) {
    const { data } = await supabase
      .from('audio_transcriptions')
      .select('*')
      .eq('user_id', userId);
    return data;
  }

  private static async getProcessedImages(userId: string) {
    const { data } = await supabase
      .from('processed_images')
      .select('*')
      .eq('user_id', userId);
    return data;
  }

  private static async getProcessedDocuments(userId: string) {
    const { data } = await supabase
      .from('processed_documents')
      .select('*')
      .eq('user_id', userId);
    return data;
  }

  private static async getBackupData(backupId: string): Promise<BackupData | null> {
    try {
      // Fetch backup metadata
      const { data: backupMeta, error } = await supabase
        .from('backups')
        .select('*')
        .eq('id', backupId)
        .single();

      if (error || !backupMeta) {
        console.error('[BACKUP] Backup not found:', backupId);
        return null;
      }

      // Fetch the actual backup data from storage
      const { data: storageData, error: storageError } = await supabase
        .storage
        .from('backups')
        .download(`${backupMeta.user_id}/${backupId}.json`);

      if (storageError || !storageData) {
        console.error('[BACKUP] Failed to download backup data:', storageError);
        return null;
      }

      // Parse the backup data
      const backupJson = await storageData.text();
      return JSON.parse(backupJson);

    } catch (error: any) {
      console.error('[BACKUP] Error fetching backup data:', error);
      return null;
    }
  }

  private static async findOrCreateFolder(
    drive: any,
    folderName: string
  ): Promise<string> {
    // Search for existing folder
    const response = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Create folder
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });

    return folder.data.id;
  }

  /**
   * Send backup notification email
   */
  private static async sendBackupNotification(
    userId: string,
    userEmail: string,
    status: 'success' | 'failure',
    manifest?: BackupManifest | null,
    errorMessage?: string
  ): Promise<void> {
    try {
      const emailSystem = EmailAlertSystem.getInstance();

      if (status === 'success' && manifest) {
        // Success notification
        await emailSystem.sendAlert({
          to: [userEmail],
          subject: 'KimbleAI Backup Completed Successfully',
          template: 'custom',
          data: {
            subject: 'KimbleAI Backup Completed Successfully',
            html: `
              <h2>Backup Completed</h2>
              <p>Your KimbleAI data has been backed up successfully.</p>
              <h3>Backup Details:</h3>
              <ul>
                <li><strong>Backup ID:</strong> ${manifest.backup_id}</li>
                <li><strong>Date:</strong> ${new Date(manifest.created_at).toLocaleString()}</li>
                <li><strong>Size:</strong> ${(manifest.backup_size_bytes / 1024 / 1024).toFixed(2)} MB</li>
                <li><strong>Conversations:</strong> ${manifest.data_counts.conversations}</li>
                <li><strong>Messages:</strong> ${manifest.data_counts.messages}</li>
                <li><strong>Knowledge Items:</strong> ${manifest.data_counts.knowledge_base}</li>
                <li><strong>Files:</strong> ${manifest.data_counts.files}</li>
                <li><strong>Projects:</strong> ${manifest.data_counts.projects}</li>
              </ul>
              ${manifest.drive_file_url ? `<p><a href="${manifest.drive_file_url}">View in Google Drive</a></p>` : ''}
              <p><small>Time: ${new Date().toLocaleString()}</small></p>
            `,
            text: `KimbleAI Backup Completed Successfully

Backup Details:
- Backup ID: ${manifest.backup_id}
- Date: ${new Date(manifest.created_at).toLocaleString()}
- Size: ${(manifest.backup_size_bytes / 1024 / 1024).toFixed(2)} MB
- Conversations: ${manifest.data_counts.conversations}
- Messages: ${manifest.data_counts.messages}
- Knowledge Items: ${manifest.data_counts.knowledge_base}
- Files: ${manifest.data_counts.files}
- Projects: ${manifest.data_counts.projects}

${manifest.drive_file_url ? `View in Google Drive: ${manifest.drive_file_url}` : ''}

Time: ${new Date().toLocaleString()}`
          },
          priority: 'normal',
          userId
        });
      } else {
        // Failure notification
        await emailSystem.sendAlert({
          to: [userEmail],
          subject: 'KimbleAI Backup Failed',
          template: 'custom',
          data: {
            subject: 'KimbleAI Backup Failed',
            html: `
              <h2>Backup Failed</h2>
              <p>Your scheduled KimbleAI backup encountered an error.</p>
              <h3>Error Details:</h3>
              <p style="color: #dc3545;"><strong>${errorMessage || 'Unknown error'}</strong></p>
              <p>Please review the backup system or contact support if this issue persists.</p>
              <p><small>Time: ${new Date().toLocaleString()}</small></p>
            `,
            text: `KimbleAI Backup Failed

Your scheduled KimbleAI backup encountered an error.

Error: ${errorMessage || 'Unknown error'}

Please review the backup system or contact support if this issue persists.

Time: ${new Date().toLocaleString()}`
          },
          priority: 'high',
          userId
        });
      }
    } catch (error: any) {
      console.error('[BACKUP] Failed to send notification email:', error);
      // Don't throw - we don't want email failures to break backups
    }
  }
}
