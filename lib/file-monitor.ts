/**
 * File Monitor Agent
 * Real-time file system monitoring with intelligent change detection
 * Watches directories, detects changes, and triggers automated workflows
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface MonitoredFile {
  id: string;
  path: string;
  name: string;
  size: number;
  hash: string;
  mimeType: string;
  lastModified: Date;
  createdAt: Date;
  userId: string;
  watchId: string;
  metadata?: Record<string, any>;
}

export interface FileChangeEvent {
  id: string;
  type: 'created' | 'modified' | 'deleted' | 'renamed' | 'moved';
  file: MonitoredFile;
  previousState?: Partial<MonitoredFile>;
  timestamp: Date;
  userId: string;
  watchId: string;
  autoProcessed: boolean;
}

export interface WatchConfig {
  id: string;
  userId: string;
  path: string;
  recursive: boolean;
  filters: {
    extensions?: string[]; // ['.m4a', '.mp3', '.pdf']
    minSize?: number;
    maxSize?: number;
    patterns?: string[]; // glob patterns
    ignorePatterns?: string[]; // ['.git', 'node_modules']
  };
  actions: {
    onCreated?: AutoAction[];
    onModified?: AutoAction[];
    onDeleted?: AutoAction[];
  };
  enabled: boolean;
  createdAt: Date;
  lastChecked?: Date;
}

export interface AutoAction {
  type: 'transcribe' | 'analyze' | 'backup' | 'notify' | 'workflow' | 'organize';
  agent?: string; // Which agent to invoke
  params?: Record<string, any>;
  conditions?: {
    fileSize?: { min?: number; max?: number };
    fileType?: string[];
    timeOfDay?: string; // Run only during certain hours
  };
}

export class FileMonitorAgent {
  private watches: Map<string, WatchConfig> = new Map();
  private fileCache: Map<string, MonitoredFile> = new Map();
  private changeListeners: Map<string, Function[]> = new Map();
  private scanInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeFromDatabase();
  }

  /**
   * Initialize watches from database
   */
  private async initializeFromDatabase() {
    try {
      const { data: watches } = await supabase
        .from('file_watches')
        .select('*')
        .eq('enabled', true);

      if (watches) {
        watches.forEach(watch => {
          this.watches.set(watch.id, watch);
        });

        console.log(`[FILE-MONITOR] Initialized ${watches.length} active watches`);
      }
    } catch (error) {
      console.error('[FILE-MONITOR] Failed to initialize:', error);
    }
  }

  /**
   * Create a new file watch
   */
  async createWatch(config: Omit<WatchConfig, 'id' | 'createdAt'>): Promise<WatchConfig> {
    const watchId = `watch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const watchConfig: WatchConfig = {
      ...config,
      id: watchId,
      createdAt: new Date(),
    };

    // Validate path exists
    if (!fs.existsSync(config.path)) {
      throw new Error(`Path does not exist: ${config.path}`);
    }

    // Store in database
    await supabase.from('file_watches').insert({
      id: watchId,
      user_id: config.userId,
      path: config.path,
      recursive: config.recursive,
      filters: config.filters,
      actions: config.actions,
      enabled: config.enabled,
      created_at: new Date().toISOString(),
    });

    // Add to active watches
    this.watches.set(watchId, watchConfig);

    // Start monitoring if enabled
    if (config.enabled) {
      await this.scanDirectory(watchConfig);
    }

    console.log(`[FILE-MONITOR] Created watch: ${watchId} for ${config.path}`);

    return watchConfig;
  }

  /**
   * Scan directory for changes
   */
  private async scanDirectory(watch: WatchConfig): Promise<FileChangeEvent[]> {
    const changes: FileChangeEvent[] = [];

    try {
      const files = await this.getFiles(watch.path, watch.recursive, watch.filters);

      for (const filePath of files) {
        const fileInfo = await this.getFileInfo(filePath, watch.userId, watch.id);
        const cacheKey = `${watch.id}:${filePath}`;
        const cached = this.fileCache.get(cacheKey);

        if (!cached) {
          // New file detected
          const event: FileChangeEvent = {
            id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            type: 'created',
            file: fileInfo,
            timestamp: new Date(),
            userId: watch.userId,
            watchId: watch.id,
            autoProcessed: false,
          };

          changes.push(event);
          this.fileCache.set(cacheKey, fileInfo);

          // Trigger auto-actions
          if (watch.actions.onCreated) {
            await this.executeAutoActions(event, watch.actions.onCreated);
          }
        } else if (cached.hash !== fileInfo.hash) {
          // File modified
          const event: FileChangeEvent = {
            id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            type: 'modified',
            file: fileInfo,
            previousState: cached,
            timestamp: new Date(),
            userId: watch.userId,
            watchId: watch.id,
            autoProcessed: false,
          };

          changes.push(event);
          this.fileCache.set(cacheKey, fileInfo);

          // Trigger auto-actions
          if (watch.actions.onModified) {
            await this.executeAutoActions(event, watch.actions.onModified);
          }
        }
      }

      // Check for deleted files
      for (const [cacheKey, cached] of this.fileCache.entries()) {
        if (cacheKey.startsWith(`${watch.id}:`)) {
          const filePath = cacheKey.replace(`${watch.id}:`, '');
          if (!fs.existsSync(filePath)) {
            const event: FileChangeEvent = {
              id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
              type: 'deleted',
              file: cached,
              timestamp: new Date(),
              userId: watch.userId,
              watchId: watch.id,
              autoProcessed: false,
            };

            changes.push(event);
            this.fileCache.delete(cacheKey);

            // Trigger auto-actions
            if (watch.actions.onDeleted) {
              await this.executeAutoActions(event, watch.actions.onDeleted);
            }
          }
        }
      }

      // Update last checked
      await supabase
        .from('file_watches')
        .update({ last_checked: new Date().toISOString() })
        .eq('id', watch.id);

      // Store changes in database
      if (changes.length > 0) {
        await this.storeChanges(changes);
      }
    } catch (error) {
      console.error(`[FILE-MONITOR] Error scanning ${watch.path}:`, error);
    }

    return changes;
  }

  /**
   * Get all files in directory with filters
   */
  private async getFiles(
    dir: string,
    recursive: boolean,
    filters: WatchConfig['filters']
  ): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Check ignore patterns
        if (filters.ignorePatterns?.some(pattern => entry.name.includes(pattern))) {
          continue;
        }

        if (entry.isDirectory()) {
          if (recursive) {
            files.push(...await this.getFiles(fullPath, recursive, filters));
          }
        } else {
          // Apply filters
          let include = true;

          if (filters.extensions && filters.extensions.length > 0) {
            const ext = path.extname(entry.name).toLowerCase();
            include = filters.extensions.includes(ext);
          }

          if (include && filters.patterns && filters.patterns.length > 0) {
            include = filters.patterns.some(pattern =>
              new RegExp(pattern).test(entry.name)
            );
          }

          if (include) {
            const stats = fs.statSync(fullPath);

            if (filters.minSize && stats.size < filters.minSize) {
              include = false;
            }

            if (filters.maxSize && stats.size > filters.maxSize) {
              include = false;
            }
          }

          if (include) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`[FILE-MONITOR] Error reading directory ${dir}:`, error);
    }

    return files;
  }

  /**
   * Get file information with hash
   */
  private async getFileInfo(
    filePath: string,
    userId: string,
    watchId: string
  ): Promise<MonitoredFile> {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath);
    const hash = createHash('md5').update(content).digest('hex');

    return {
      id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      path: filePath,
      name: path.basename(filePath),
      size: stats.size,
      hash,
      mimeType: this.getMimeType(filePath),
      lastModified: stats.mtime,
      createdAt: stats.birthtime,
      userId,
      watchId,
    };
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.m4a': 'audio/mp4',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Execute automatic actions on file changes
   */
  private async executeAutoActions(event: FileChangeEvent, actions: AutoAction[]) {
    for (const action of actions) {
      try {
        // Check conditions
        if (action.conditions) {
          if (action.conditions.fileSize) {
            const { min, max } = action.conditions.fileSize;
            if (min && event.file.size < min) continue;
            if (max && event.file.size > max) continue;
          }

          if (action.conditions.fileType) {
            if (!action.conditions.fileType.includes(event.file.mimeType)) {
              continue;
            }
          }

          if (action.conditions.timeOfDay) {
            const hour = new Date().getHours();
            const [start, end] = action.conditions.timeOfDay.split('-').map(Number);
            if (hour < start || hour > end) continue;
          }
        }

        // Execute action
        console.log(`[FILE-MONITOR] Executing ${action.type} for ${event.file.name}`);

        switch (action.type) {
          case 'transcribe':
            await this.triggerTranscription(event, action.params);
            break;
          case 'analyze':
            await this.triggerAnalysis(event, action.params);
            break;
          case 'backup':
            await this.triggerBackup(event, action.params);
            break;
          case 'notify':
            await this.sendNotification(event, action.params);
            break;
          case 'workflow':
            await this.triggerWorkflow(event, action.params);
            break;
          case 'organize':
            await this.triggerOrganization(event, action.params);
            break;
        }

        event.autoProcessed = true;
      } catch (error) {
        console.error(`[FILE-MONITOR] Error executing action ${action.type}:`, error);
      }
    }
  }

  /**
   * Trigger audio transcription
   */
  private async triggerTranscription(event: FileChangeEvent, params?: Record<string, any>) {
    // This would call the Audio Intelligence Agent
    console.log(`[FILE-MONITOR] Triggering transcription for ${event.file.path}`);

    // Store transcription job
    await supabase.from('transcription_queue').insert({
      file_path: event.file.path,
      file_size: event.file.size,
      user_id: event.userId,
      status: 'queued',
      created_at: new Date().toISOString(),
      params,
    });
  }

  /**
   * Trigger file analysis
   */
  private async triggerAnalysis(event: FileChangeEvent, params?: Record<string, any>) {
    console.log(`[FILE-MONITOR] Triggering analysis for ${event.file.path}`);
    // Would call appropriate analysis agent based on file type
  }

  /**
   * Trigger backup
   */
  private async triggerBackup(event: FileChangeEvent, params?: Record<string, any>) {
    console.log(`[FILE-MONITOR] Triggering backup for ${event.file.path}`);
    // Would backup to Google Drive or other storage
  }

  /**
   * Send notification
   */
  private async sendNotification(event: FileChangeEvent, params?: Record<string, any>) {
    console.log(`[FILE-MONITOR] Sending notification for ${event.file.name}`);

    await supabase.from('notifications').insert({
      user_id: event.userId,
      type: 'file_change',
      title: `File ${event.type}: ${event.file.name}`,
      message: `${event.file.name} was ${event.type}`,
      data: { event },
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Trigger workflow
   */
  private async triggerWorkflow(event: FileChangeEvent, params?: Record<string, any>) {
    console.log(`[FILE-MONITOR] Triggering workflow for ${event.file.path}`);
    // Would call Workflow Automation Agent
  }

  /**
   * Trigger file organization
   */
  private async triggerOrganization(event: FileChangeEvent, params?: Record<string, any>) {
    console.log(`[FILE-MONITOR] Triggering organization for ${event.file.path}`);
    // Would call Drive Intelligence Agent
  }

  /**
   * Store changes in database
   */
  private async storeChanges(changes: FileChangeEvent[]) {
    const records = changes.map(change => ({
      id: change.id,
      type: change.type,
      file_path: change.file.path,
      file_name: change.file.name,
      file_size: change.file.size,
      file_hash: change.file.hash,
      user_id: change.userId,
      watch_id: change.watchId,
      auto_processed: change.autoProcessed,
      previous_state: change.previousState,
      timestamp: change.timestamp.toISOString(),
    }));

    await supabase.from('file_changes').insert(records);
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMs: number = 10000) {
    if (this.scanInterval) {
      return; // Already running
    }

    console.log(`[FILE-MONITOR] Starting continuous monitoring (${intervalMs}ms interval)`);

    this.scanInterval = setInterval(async () => {
      for (const [, watch] of this.watches) {
        if (watch.enabled) {
          await this.scanDirectory(watch);
        }
      }
    }, intervalMs);
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      console.log('[FILE-MONITOR] Stopped continuous monitoring');
    }
  }

  /**
   * Get watch status
   */
  async getWatchStatus(watchId: string): Promise<{
    watch: WatchConfig;
    stats: {
      filesMonitored: number;
      changesDetected: number;
      lastScan: Date | null;
    };
  }> {
    const watch = this.watches.get(watchId);
    if (!watch) {
      throw new Error('Watch not found');
    }

    const filesMonitored = Array.from(this.fileCache.keys())
      .filter(key => key.startsWith(`${watchId}:`))
      .length;

    const { data: changes } = await supabase
      .from('file_changes')
      .select('id')
      .eq('watch_id', watchId);

    return {
      watch,
      stats: {
        filesMonitored,
        changesDetected: changes?.length || 0,
        lastScan: watch.lastChecked || null,
      },
    };
  }

  /**
   * Get all watches for user
   */
  async getUserWatches(userId: string): Promise<WatchConfig[]> {
    const { data: watches } = await supabase
      .from('file_watches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return watches || [];
  }

  /**
   * Get recent file changes
   */
  async getRecentChanges(userId: string, limit: number = 50): Promise<FileChangeEvent[]> {
    const { data: changes } = await supabase
      .from('file_changes')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    return (changes || []).map(c => ({
      id: c.id,
      type: c.type,
      file: {
        id: c.id,
        path: c.file_path,
        name: c.file_name,
        size: c.file_size,
        hash: c.file_hash,
        mimeType: '',
        lastModified: new Date(c.timestamp),
        createdAt: new Date(c.timestamp),
        userId: c.user_id,
        watchId: c.watch_id,
      },
      previousState: c.previous_state,
      timestamp: new Date(c.timestamp),
      userId: c.user_id,
      watchId: c.watch_id,
      autoProcessed: c.auto_processed,
    }));
  }

  /**
   * Delete watch
   */
  async deleteWatch(watchId: string) {
    await supabase.from('file_watches').delete().eq('id', watchId);
    this.watches.delete(watchId);

    // Clear cache
    for (const key of this.fileCache.keys()) {
      if (key.startsWith(`${watchId}:`)) {
        this.fileCache.delete(key);
      }
    }

    console.log(`[FILE-MONITOR] Deleted watch: ${watchId}`);
  }
}

// Singleton instance
export const fileMonitor = new FileMonitorAgent();
