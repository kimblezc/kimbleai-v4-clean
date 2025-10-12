// lib/unified-file-system.ts
// Unified File System - Single source of truth for ALL files
// Handles files from uploads, Drive, email attachments, calendar attachments

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// File sources
export type FileSource = 'upload' | 'drive' | 'email_attachment' | 'calendar_attachment' | 'link';

// File registry entry
export interface FileRegistryEntry {
  id: string;
  user_id: string;
  file_source: FileSource;
  source_id: string; // Original ID from source system
  source_metadata: any; // Email details, Drive path, etc.
  filename: string;
  mime_type: string;
  file_size: number;
  storage_path: string; // Supabase storage path or URL
  preview_url?: string;
  thumbnail_url?: string;
  processed: boolean;
  processing_result?: any;
  knowledge_base_ids: string[]; // Related knowledge entries
  tags: string[];
  projects: string[]; // Associated projects
  created_at: string;
  indexed_at?: string;
  updated_at?: string;
}

// File with content
export interface FileWithContent extends FileRegistryEntry {
  content?: Buffer | string;
  download_url?: string;
}

// Search filters
export interface FileSearchFilters {
  fileSource?: FileSource;
  mimeType?: string;
  projectId?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  processed?: boolean;
}

/**
 * Unified File System
 * Manages all files regardless of source
 */
export class UnifiedFileSystem {
  /**
   * Register a new file in the unified system
   */
  static async registerFile(
    userId: string,
    source: FileSource,
    sourceId: string,
    fileData: {
      filename: string;
      mimeType: string;
      fileSize: number;
      storagePath: string;
      sourceMetadata?: any;
      previewUrl?: string;
      thumbnailUrl?: string;
      tags?: string[];
      projects?: string[];
    }
  ): Promise<FileRegistryEntry> {
    const { data, error } = await supabase
      .from('file_registry')
      .insert({
        user_id: userId,
        file_source: source,
        source_id: sourceId,
        source_metadata: fileData.sourceMetadata || {},
        filename: fileData.filename,
        mime_type: fileData.mimeType,
        file_size: fileData.fileSize,
        storage_path: fileData.storagePath,
        preview_url: fileData.previewUrl,
        thumbnail_url: fileData.thumbnailUrl,
        processed: false,
        tags: fileData.tags || [],
        projects: fileData.projects || [],
        knowledge_base_ids: []
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to register file:', error);
      throw new Error(`Failed to register file: ${error.message}`);
    }

    return data as FileRegistryEntry;
  }

  /**
   * Get a file by ID
   */
  static async getFile(fileId: string): Promise<FileRegistryEntry | null> {
    const { data, error } = await supabase
      .from('file_registry')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error) {
      console.error('Failed to get file:', error);
      return null;
    }

    return data as FileRegistryEntry;
  }

  /**
   * Get file with content (download from storage)
   */
  static async getFileWithContent(fileId: string): Promise<FileWithContent | null> {
    const fileEntry = await this.getFile(fileId);
    if (!fileEntry) return null;

    // For Supabase storage files
    if (fileEntry.storage_path.startsWith('http')) {
      return {
        ...fileEntry,
        download_url: fileEntry.storage_path
      };
    }

    // Download from Supabase storage
    const { data, error } = await supabase.storage
      .from(this.getBucketFromPath(fileEntry.storage_path))
      .download(this.getPathFromStorage(fileEntry.storage_path));

    if (error) {
      console.error('Failed to download file:', error);
      return {
        ...fileEntry,
        download_url: fileEntry.storage_path
      };
    }

    const buffer = Buffer.from(await data.arrayBuffer());

    return {
      ...fileEntry,
      content: buffer,
      download_url: fileEntry.storage_path
    };
  }

  /**
   * Search files
   */
  static async searchFiles(
    userId: string,
    query?: string,
    filters?: FileSearchFilters,
    limit: number = 50
  ): Promise<FileRegistryEntry[]> {
    let queryBuilder = supabase
      .from('file_registry')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (filters) {
      if (filters.fileSource) {
        queryBuilder = queryBuilder.eq('file_source', filters.fileSource);
      }
      if (filters.mimeType) {
        queryBuilder = queryBuilder.eq('mime_type', filters.mimeType);
      }
      if (filters.projectId) {
        queryBuilder = queryBuilder.contains('projects', [filters.projectId]);
      }
      if (filters.tags && filters.tags.length > 0) {
        queryBuilder = queryBuilder.overlaps('tags', filters.tags);
      }
      if (filters.dateFrom) {
        queryBuilder = queryBuilder.gte('created_at', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        queryBuilder = queryBuilder.lte('created_at', filters.dateTo.toISOString());
      }
      if (filters.processed !== undefined) {
        queryBuilder = queryBuilder.eq('processed', filters.processed);
      }
    }

    // Text search on filename
    if (query) {
      queryBuilder = queryBuilder.ilike('filename', `%${query}%`);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Failed to search files:', error);
      return [];
    }

    return data as FileRegistryEntry[];
  }

  /**
   * Get files by source and source ID
   */
  static async getFilesBySource(
    userId: string,
    source: FileSource,
    sourceId: string
  ): Promise<FileRegistryEntry[]> {
    const { data, error } = await supabase
      .from('file_registry')
      .select('*')
      .eq('user_id', userId)
      .eq('file_source', source)
      .eq('source_id', sourceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get files by source:', error);
      return [];
    }

    return data as FileRegistryEntry[];
  }

  /**
   * Update file processing status
   */
  static async markAsProcessed(
    fileId: string,
    processingResult: any,
    knowledgeBaseIds: string[] = []
  ): Promise<boolean> {
    const { error } = await supabase
      .from('file_registry')
      .update({
        processed: true,
        processing_result: processingResult,
        knowledge_base_ids: knowledgeBaseIds,
        indexed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId);

    if (error) {
      console.error('Failed to mark file as processed:', error);
      return false;
    }

    return true;
  }

  /**
   * Link file to project
   */
  static async linkToProject(fileId: string, projectId: string): Promise<boolean> {
    const file = await this.getFile(fileId);
    if (!file) return false;

    const updatedProjects = [...new Set([...file.projects, projectId])];

    const { error } = await supabase
      .from('file_registry')
      .update({
        projects: updatedProjects,
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId);

    if (error) {
      console.error('Failed to link file to project:', error);
      return false;
    }

    return true;
  }

  /**
   * Unlink file from project
   */
  static async unlinkFromProject(fileId: string, projectId: string): Promise<boolean> {
    const file = await this.getFile(fileId);
    if (!file) return false;

    const updatedProjects = file.projects.filter(p => p !== projectId);

    const { error } = await supabase
      .from('file_registry')
      .update({
        projects: updatedProjects,
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId);

    if (error) {
      console.error('Failed to unlink file from project:', error);
      return false;
    }

    return true;
  }

  /**
   * Add tags to file
   */
  static async addTags(fileId: string, newTags: string[]): Promise<boolean> {
    const file = await this.getFile(fileId);
    if (!file) return false;

    const updatedTags = [...new Set([...file.tags, ...newTags])];

    const { error } = await supabase
      .from('file_registry')
      .update({
        tags: updatedTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId);

    if (error) {
      console.error('Failed to add tags:', error);
      return false;
    }

    return true;
  }

  /**
   * Get related files (same project or tags)
   */
  static async getRelatedFiles(
    fileId: string,
    limit: number = 10
  ): Promise<FileRegistryEntry[]> {
    const file = await this.getFile(fileId);
    if (!file) return [];

    // Find files with overlapping projects or tags
    const { data, error } = await supabase
      .from('file_registry')
      .select('*')
      .eq('user_id', file.user_id)
      .neq('id', fileId)
      .or(`projects.ov.{${file.projects.join(',')}},tags.ov.{${file.tags.join(',')}}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get related files:', error);
      return [];
    }

    return data as FileRegistryEntry[];
  }

  /**
   * Get file statistics for user
   */
  static async getFileStats(userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    bySource: Record<FileSource, number>;
    byType: Record<string, number>;
    byProject: Record<string, number>;
  }> {
    const { data, error } = await supabase
      .from('file_registry')
      .select('*')
      .eq('user_id', userId);

    if (error || !data) {
      return {
        totalFiles: 0,
        totalSize: 0,
        bySource: {} as any,
        byType: {},
        byProject: {}
      };
    }

    const stats = {
      totalFiles: data.length,
      totalSize: data.reduce((sum, f) => sum + (f.file_size || 0), 0),
      bySource: {} as Record<FileSource, number>,
      byType: {} as Record<string, number>,
      byProject: {} as Record<string, number>
    };

    data.forEach(file => {
      // By source
      stats.bySource[file.file_source] = (stats.bySource[file.file_source] || 0) + 1;

      // By type
      const type = file.mime_type.split('/')[0];
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // By project
      file.projects?.forEach((proj: string) => {
        stats.byProject[proj] = (stats.byProject[proj] || 0) + 1;
      });
    });

    return stats;
  }

  /**
   * Delete file
   */
  static async deleteFile(fileId: string): Promise<boolean> {
    const file = await this.getFile(fileId);
    if (!file) return false;

    // Delete from storage if it's in Supabase
    if (!file.storage_path.startsWith('http')) {
      try {
        await supabase.storage
          .from(this.getBucketFromPath(file.storage_path))
          .remove([this.getPathFromStorage(file.storage_path)]);
      } catch (err) {
        console.error('Failed to delete from storage:', err);
      }
    }

    // Delete from registry
    const { error } = await supabase
      .from('file_registry')
      .delete()
      .eq('id', fileId);

    if (error) {
      console.error('Failed to delete file:', error);
      return false;
    }

    return true;
  }

  /**
   * Helper: Extract bucket name from storage path
   */
  private static getBucketFromPath(path: string): string {
    if (path.includes('gmail-attachments')) return 'gmail-attachments';
    if (path.includes('audio-files')) return 'audio-files';
    if (path.includes('thumbnails')) return 'thumbnails';
    if (path.includes('documents')) return 'documents';
    return 'files';
  }

  /**
   * Helper: Extract path from storage path
   */
  private static getPathFromStorage(path: string): string {
    // Remove bucket prefix if present
    const buckets = ['gmail-attachments/', 'audio-files/', 'thumbnails/', 'documents/', 'files/'];
    for (const bucket of buckets) {
      if (path.startsWith(bucket)) {
        return path.substring(bucket.length);
      }
    }
    return path;
  }

  /**
   * Get files by project
   */
  static async getFilesByProject(
    userId: string,
    projectId: string,
    limit: number = 100
  ): Promise<FileRegistryEntry[]> {
    const { data, error } = await supabase
      .from('file_registry')
      .select('*')
      .eq('user_id', userId)
      .contains('projects', [projectId])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get files by project:', error);
      return [];
    }

    return data as FileRegistryEntry[];
  }

  /**
   * Bulk register files
   */
  static async bulkRegisterFiles(
    userId: string,
    files: Array<{
      source: FileSource;
      sourceId: string;
      filename: string;
      mimeType: string;
      fileSize: number;
      storagePath: string;
      sourceMetadata?: any;
      tags?: string[];
      projects?: string[];
    }>
  ): Promise<FileRegistryEntry[]> {
    const entries = files.map(file => ({
      user_id: userId,
      file_source: file.source,
      source_id: file.sourceId,
      source_metadata: file.sourceMetadata || {},
      filename: file.filename,
      mime_type: file.mimeType,
      file_size: file.fileSize,
      storage_path: file.storagePath,
      processed: false,
      tags: file.tags || [],
      projects: file.projects || [],
      knowledge_base_ids: []
    }));

    const { data, error } = await supabase
      .from('file_registry')
      .insert(entries)
      .select();

    if (error) {
      console.error('Failed to bulk register files:', error);
      throw new Error(`Failed to bulk register files: ${error.message}`);
    }

    return data as FileRegistryEntry[];
  }
}
