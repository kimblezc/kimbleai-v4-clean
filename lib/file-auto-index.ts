// lib/file-auto-index.ts
// Auto-indexing pipeline for background file processing

import { createClient } from '@supabase/supabase-js';
import { UnifiedFileSystem, FileRegistryEntry } from './unified-file-system';
import { RAGSearchSystem } from './rag-search';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Processing statistics
export interface ProcessingStats {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  skippedFiles: number;
  totalEntriesCreated: number;
  processingTime: number;
  errors: Array<{ fileId: string; filename: string; error: string }>;
}

/**
 * Auto-Indexing Pipeline
 * Monitors and processes unindexed files in the background
 */
export class FileAutoIndexPipeline {
  private isRunning: boolean = false;
  private processedCount: number = 0;

  /**
   * Process all unindexed files for a user
   */
  static async processUnindexedFiles(
    userId: string,
    options?: {
      limit?: number;
      fileSource?: string;
      projectId?: string;
    }
  ): Promise<ProcessingStats> {
    const startTime = Date.now();
    const stats: ProcessingStats = {
      totalFiles: 0,
      processedFiles: 0,
      failedFiles: 0,
      skippedFiles: 0,
      totalEntriesCreated: 0,
      processingTime: 0,
      errors: [],
    };

    try {
      console.log('[AUTO-INDEX] Starting processing for user:', userId);

      // Find all unprocessed files
      let query = supabase
        .from('file_registry')
        .select('*')
        .eq('user_id', userId)
        .eq('processed', false)
        .order('created_at', { ascending: true });

      if (options?.fileSource) {
        query = query.eq('file_source', options.fileSource);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data: unprocessedFiles, error } = await query;

      if (error) {
        console.error('[AUTO-INDEX] Error fetching unprocessed files:', error);
        return stats;
      }

      if (!unprocessedFiles || unprocessedFiles.length === 0) {
        console.log('[AUTO-INDEX] No unprocessed files found');
        return stats;
      }

      stats.totalFiles = unprocessedFiles.length;
      console.log(`[AUTO-INDEX] Found ${stats.totalFiles} unprocessed files`);

      // Process each file
      for (const file of unprocessedFiles) {
        try {
          console.log(`[AUTO-INDEX] Processing file: ${file.filename}`);

          const result = await RAGSearchSystem.indexFile(
            file.id,
            userId,
            options?.projectId || file.metadata?.projectId
          );

          if (result.success) {
            stats.processedFiles++;
            stats.totalEntriesCreated += result.entriesCreated;
            console.log(
              `[AUTO-INDEX] Successfully indexed ${file.filename} (${result.entriesCreated} entries)`
            );
          } else {
            stats.failedFiles++;
            stats.errors.push({
              fileId: file.id,
              filename: file.filename,
              error: result.error || 'Unknown error',
            });
            console.error(`[AUTO-INDEX] Failed to index ${file.filename}:`, result.error);
          }
        } catch (error: any) {
          stats.failedFiles++;
          stats.errors.push({
            fileId: file.id,
            filename: file.filename,
            error: error.message,
          });
          console.error(`[AUTO-INDEX] Error processing ${file.filename}:`, error);
        }
      }

      stats.processingTime = Date.now() - startTime;

      console.log('[AUTO-INDEX] Processing complete:', {
        processed: stats.processedFiles,
        failed: stats.failedFiles,
        entriesCreated: stats.totalEntriesCreated,
        time: `${(stats.processingTime / 1000).toFixed(2)}s`,
      });

      return stats;
    } catch (error: any) {
      console.error('[AUTO-INDEX] Pipeline error:', error);
      stats.processingTime = Date.now() - startTime;
      return stats;
    }
  }

  /**
   * Process a single file
   */
  static async processFile(
    fileId: string,
    userId: string,
    projectId?: string
  ): Promise<{ success: boolean; entriesCreated: number; error?: string }> {
    try {
      console.log(`[AUTO-INDEX] Processing file: ${fileId}`);

      const result = await RAGSearchSystem.indexFile(fileId, userId, projectId);

      if (result.success) {
        console.log(
          `[AUTO-INDEX] Successfully indexed file ${fileId} (${result.entriesCreated} entries)`
        );
      } else {
        console.error(`[AUTO-INDEX] Failed to index file ${fileId}:`, result.error);
      }

      return result;
    } catch (error: any) {
      console.error(`[AUTO-INDEX] Error processing file ${fileId}:`, error);
      return {
        success: false,
        entriesCreated: 0,
        error: error.message,
      };
    }
  }

  /**
   * Re-index all files for a user (useful after schema changes)
   */
  static async reindexAllFiles(
    userId: string,
    options?: {
      limit?: number;
      fileSource?: string;
      projectId?: string;
    }
  ): Promise<ProcessingStats> {
    const startTime = Date.now();
    const stats: ProcessingStats = {
      totalFiles: 0,
      processedFiles: 0,
      failedFiles: 0,
      skippedFiles: 0,
      totalEntriesCreated: 0,
      processingTime: 0,
      errors: [],
    };

    try {
      console.log('[AUTO-INDEX] Starting re-indexing for user:', userId);

      // Get all files (processed or not)
      let query = supabase
        .from('file_registry')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (options?.fileSource) {
        query = query.eq('file_source', options.fileSource);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data: files, error } = await query;

      if (error) {
        console.error('[AUTO-INDEX] Error fetching files:', error);
        return stats;
      }

      if (!files || files.length === 0) {
        console.log('[AUTO-INDEX] No files found');
        return stats;
      }

      stats.totalFiles = files.length;
      console.log(`[AUTO-INDEX] Re-indexing ${stats.totalFiles} files`);

      // Re-index each file
      for (const file of files) {
        try {
          console.log(`[AUTO-INDEX] Re-indexing file: ${file.filename}`);

          const result = await RAGSearchSystem.reindexFile(
            file.id,
            userId,
            options?.projectId || file.metadata?.projectId
          );

          if (result.success) {
            stats.processedFiles++;
            stats.totalEntriesCreated += result.entriesCreated;
            console.log(
              `[AUTO-INDEX] Successfully re-indexed ${file.filename} (${result.entriesCreated} entries)`
            );
          } else {
            stats.failedFiles++;
            stats.errors.push({
              fileId: file.id,
              filename: file.filename,
              error: result.error || 'Unknown error',
            });
            console.error(`[AUTO-INDEX] Failed to re-index ${file.filename}:`, result.error);
          }
        } catch (error: any) {
          stats.failedFiles++;
          stats.errors.push({
            fileId: file.id,
            filename: file.filename,
            error: error.message,
          });
          console.error(`[AUTO-INDEX] Error re-indexing ${file.filename}:`, error);
        }
      }

      stats.processingTime = Date.now() - startTime;

      console.log('[AUTO-INDEX] Re-indexing complete:', {
        processed: stats.processedFiles,
        failed: stats.failedFiles,
        entriesCreated: stats.totalEntriesCreated,
        time: `${(stats.processingTime / 1000).toFixed(2)}s`,
      });

      return stats;
    } catch (error: any) {
      console.error('[AUTO-INDEX] Re-indexing error:', error);
      stats.processingTime = Date.now() - startTime;
      return stats;
    }
  }

  /**
   * Get processing queue status
   */
  static async getQueueStatus(
    userId: string
  ): Promise<{
    unprocessedCount: number;
    processedCount: number;
    totalCount: number;
    bySource: Record<string, { processed: number; unprocessed: number }>;
  }> {
    try {
      const { data: files } = await supabase
        .from('file_registry')
        .select('file_source, processed')
        .eq('user_id', userId);

      if (!files) {
        return {
          unprocessedCount: 0,
          processedCount: 0,
          totalCount: 0,
          bySource: {},
        };
      }

      const unprocessedCount = files.filter((f) => !f.processed).length;
      const processedCount = files.filter((f) => f.processed).length;

      const bySource: Record<string, { processed: number; unprocessed: number }> = {};
      files.forEach((file) => {
        if (!bySource[file.file_source]) {
          bySource[file.file_source] = { processed: 0, unprocessed: 0 };
        }
        if (file.processed) {
          bySource[file.file_source].processed++;
        } else {
          bySource[file.file_source].unprocessed++;
        }
      });

      return {
        unprocessedCount,
        processedCount,
        totalCount: files.length,
        bySource,
      };
    } catch (error: any) {
      console.error('[AUTO-INDEX] Error getting queue status:', error);
      return {
        unprocessedCount: 0,
        processedCount: 0,
        totalCount: 0,
        bySource: {},
      };
    }
  }

  /**
   * Process files by source (Gmail, Drive, etc.)
   */
  static async processBySource(
    userId: string,
    source: 'upload' | 'drive' | 'email_attachment' | 'calendar_attachment' | 'link',
    options?: {
      limit?: number;
      projectId?: string;
    }
  ): Promise<ProcessingStats> {
    return await this.processUnindexedFiles(userId, {
      ...options,
      fileSource: source,
    });
  }

  /**
   * Schedule periodic processing (for use in cron jobs or background workers)
   */
  static async scheduleProcessing(
    userId: string,
    intervalMs: number = 60000 // 1 minute default
  ): Promise<void> {
    console.log(`[AUTO-INDEX] Scheduling periodic processing every ${intervalMs}ms`);

    const process = async () => {
      console.log('[AUTO-INDEX] Running scheduled processing...');
      const stats = await this.processUnindexedFiles(userId);
      console.log('[AUTO-INDEX] Scheduled processing complete:', stats);
    };

    // Run immediately
    await process();

    // Then run periodically
    setInterval(process, intervalMs);
  }

  /**
   * Clean up failed processing attempts
   */
  static async cleanupFailedProcessing(userId: string): Promise<number> {
    try {
      // Reset files that have been marked as processed but have no knowledge base entries
      const { data: files } = await supabase
        .from('file_registry')
        .select('id, knowledge_base_ids')
        .eq('user_id', userId)
        .eq('processed', true);

      if (!files) return 0;

      let cleanedCount = 0;
      for (const file of files) {
        if (!file.knowledge_base_ids || file.knowledge_base_ids.length === 0) {
          // Reset processed status
          await supabase
            .from('file_registry')
            .update({ processed: false })
            .eq('id', file.id);
          cleanedCount++;
        }
      }

      console.log(`[AUTO-INDEX] Cleaned up ${cleanedCount} failed processing attempts`);
      return cleanedCount;
    } catch (error: any) {
      console.error('[AUTO-INDEX] Error cleaning up failed processing:', error);
      return 0;
    }
  }
}
