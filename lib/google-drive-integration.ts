// lib/google-drive-integration.ts
// Google Drive preview and integration utilities

import { google } from 'googleapis';
import { UnifiedFileSystem } from './unified-file-system';

// Google Drive file metadata
export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  owners?: Array<{ displayName: string; emailAddress: string }>;
  permissions?: any[];
  shared?: boolean;
}

/**
 * Google Drive Integration
 * Handles Drive file operations, previews, and registrations
 */
export class GoogleDriveIntegration {
  /**
   * Get file metadata from Google Drive
   */
  static async getFileMetadata(
    fileId: string,
    accessToken: string
  ): Promise<DriveFileMetadata | null> {
    try {
      const drive = google.drive({ version: 'v3' });
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const response = await drive.files.get({
        fileId,
        fields:
          'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, iconLink, createdTime, modifiedTime, owners, permissions, shared',
        auth,
      });

      return response.data as DriveFileMetadata;
    } catch (error: any) {
      console.error('[DRIVE] Failed to get file metadata:', error);
      return null;
    }
  }

  /**
   * Generate preview URL for embedding
   * Converts webViewLink to embeddable preview URL
   */
  static generatePreviewUrl(fileId: string, mimeType: string): string {
    // For Google Docs, Sheets, Slides
    if (mimeType.includes('google-apps')) {
      if (mimeType.includes('document')) {
        return `https://docs.google.com/document/d/${fileId}/preview`;
      } else if (mimeType.includes('spreadsheet')) {
        return `https://docs.google.com/spreadsheets/d/${fileId}/preview`;
      } else if (mimeType.includes('presentation')) {
        return `https://docs.google.com/presentation/d/${fileId}/preview`;
      }
    }

    // For other files (PDF, images, etc.)
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  /**
   * Generate thumbnail URL
   */
  static generateThumbnailUrl(fileId: string, size: number = 400): string {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
  }

  /**
   * Export Google Docs to Office format
   */
  static async exportGoogleDoc(
    fileId: string,
    accessToken: string,
    mimeType: string
  ): Promise<Buffer | null> {
    try {
      const drive = google.drive({ version: 'v3' });
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      // Determine export MIME type
      let exportMimeType: string;
      if (mimeType.includes('document')) {
        exportMimeType =
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (mimeType.includes('spreadsheet')) {
        exportMimeType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (mimeType.includes('presentation')) {
        exportMimeType =
          'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      } else if (mimeType.includes('drawing')) {
        exportMimeType = 'application/pdf';
      } else {
        console.error('[DRIVE] Unsupported Google Doc type:', mimeType);
        return null;
      }

      const response = await drive.files.export(
        {
          fileId,
          mimeType: exportMimeType,
          auth,
        },
        { responseType: 'arraybuffer' }
      );

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error: any) {
      console.error('[DRIVE] Failed to export Google Doc:', error);
      return null;
    }
  }

  /**
   * Download file from Google Drive
   */
  static async downloadFile(
    fileId: string,
    accessToken: string
  ): Promise<Buffer | null> {
    try {
      const drive = google.drive({ version: 'v3' });
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const response = await drive.files.get(
        {
          fileId,
          alt: 'media',
          auth,
        },
        { responseType: 'arraybuffer' }
      );

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error: any) {
      console.error('[DRIVE] Failed to download file:', error);
      return null;
    }
  }

  /**
   * Register Drive file in unified file system
   */
  static async registerDriveFile(
    userId: string,
    fileId: string,
    accessToken: string,
    projectId?: string
  ): Promise<string | null> {
    try {
      // Get file metadata
      const metadata = await this.getFileMetadata(fileId, accessToken);
      if (!metadata) {
        console.error('[DRIVE] Failed to get file metadata');
        return null;
      }

      // Check if already registered
      const existing = await UnifiedFileSystem.getFilesBySource(
        userId,
        'drive',
        fileId
      );
      if (existing.length > 0) {
        console.log('[DRIVE] File already registered:', existing[0].id);
        return existing[0].id;
      }

      // Generate preview URL
      const previewUrl = this.generatePreviewUrl(fileId, metadata.mimeType);
      const thumbnailUrl =
        metadata.thumbnailLink || this.generateThumbnailUrl(fileId);

      // Register in file system
      const registeredFile = await UnifiedFileSystem.registerFile(
        userId,
        'drive',
        fileId,
        {
          filename: metadata.name,
          mimeType: metadata.mimeType,
          fileSize: metadata.size ? parseInt(metadata.size.toString()) : 0,
          storagePath: metadata.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
          previewUrl,
          thumbnailUrl,
          sourceMetadata: {
            driveId: fileId,
            webViewLink: metadata.webViewLink,
            webContentLink: metadata.webContentLink,
            createdTime: metadata.createdTime,
            modifiedTime: metadata.modifiedTime,
            owners: metadata.owners,
            shared: metadata.shared,
            accessToken, // Store for later extraction
          },
          tags: ['drive', metadata.mimeType.split('/')[0]],
          projects: projectId ? [projectId] : [],
        }
      );

      console.log('[DRIVE] File registered:', registeredFile.id);
      return registeredFile.id;
    } catch (error: any) {
      console.error('[DRIVE] Failed to register file:', error);
      return null;
    }
  }

  /**
   * Bulk register multiple Drive files
   */
  static async bulkRegisterDriveFiles(
    userId: string,
    fileIds: string[],
    accessToken: string,
    projectId?: string
  ): Promise<string[]> {
    const registeredIds: string[] = [];

    for (const fileId of fileIds) {
      const id = await this.registerDriveFile(
        userId,
        fileId,
        accessToken,
        projectId
      );
      if (id) {
        registeredIds.push(id);
      }
    }

    return registeredIds;
  }

  /**
   * List files in a Drive folder
   */
  static async listFilesInFolder(
    folderId: string,
    accessToken: string,
    options?: {
      pageSize?: number;
      orderBy?: string;
      mimeType?: string;
    }
  ): Promise<DriveFileMetadata[]> {
    try {
      const drive = google.drive({ version: 'v3' });
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      let query = `'${folderId}' in parents and trashed = false`;
      if (options?.mimeType) {
        query += ` and mimeType = '${options.mimeType}'`;
      }

      const response = await drive.files.list({
        q: query,
        pageSize: options?.pageSize || 100,
        orderBy: options?.orderBy || 'modifiedTime desc',
        fields:
          'files(id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, iconLink, createdTime, modifiedTime, owners, shared)',
        auth,
      });

      return (response.data.files || []) as DriveFileMetadata[];
    } catch (error: any) {
      console.error('[DRIVE] Failed to list files:', error);
      return [];
    }
  }

  /**
   * Search Drive files
   */
  static async searchDriveFiles(
    query: string,
    accessToken: string,
    options?: {
      pageSize?: number;
      mimeType?: string;
    }
  ): Promise<DriveFileMetadata[]> {
    try {
      const drive = google.drive({ version: 'v3' });
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      let searchQuery = `name contains '${query}' and trashed = false`;
      if (options?.mimeType) {
        searchQuery += ` and mimeType = '${options.mimeType}'`;
      }

      const response = await drive.files.list({
        q: searchQuery,
        pageSize: options?.pageSize || 50,
        orderBy: 'modifiedTime desc',
        fields:
          'files(id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, iconLink, createdTime, modifiedTime, owners, shared)',
        auth,
      });

      return (response.data.files || []) as DriveFileMetadata[];
    } catch (error: any) {
      console.error('[DRIVE] Failed to search files:', error);
      return [];
    }
  }

  /**
   * Check if user has access to file
   */
  static async checkFileAccess(
    fileId: string,
    accessToken: string
  ): Promise<boolean> {
    try {
      const metadata = await this.getFileMetadata(fileId, accessToken);
      return metadata !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file permissions
   */
  static async getFilePermissions(
    fileId: string,
    accessToken: string
  ): Promise<any[] | null> {
    try {
      const drive = google.drive({ version: 'v3' });
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const response = await drive.permissions.list({
        fileId,
        fields: 'permissions(id, type, role, emailAddress, displayName)',
        auth,
      });

      return response.data.permissions || [];
    } catch (error: any) {
      console.error('[DRIVE] Failed to get permissions:', error);
      return null;
    }
  }

  /**
   * Get embed HTML for file
   */
  static getEmbedHtml(
    fileId: string,
    mimeType: string,
    options?: {
      width?: number | string;
      height?: number | string;
    }
  ): string {
    const width = options?.width || '100%';
    const height = options?.height || 600;
    const previewUrl = this.generatePreviewUrl(fileId, mimeType);

    return `<iframe src="${previewUrl}" width="${width}" height="${height}" frameborder="0" allow="autoplay"></iframe>`;
  }

  /**
   * Get direct download URL
   */
  static getDownloadUrl(fileId: string): string {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  /**
   * Check if file type is previewable
   */
  static isPreviewable(mimeType: string): boolean {
    const previewableMimeTypes = [
      'application/pdf',
      'image/',
      'video/',
      'audio/',
      'text/',
      'google-apps',
    ];

    return previewableMimeTypes.some((type) => mimeType.includes(type));
  }

  /**
   * Get file type category
   */
  static getFileCategory(mimeType: string): string {
    if (mimeType.includes('google-apps.document') || mimeType.includes('word'))
      return 'document';
    if (
      mimeType.includes('google-apps.spreadsheet') ||
      mimeType.includes('sheet')
    )
      return 'spreadsheet';
    if (
      mimeType.includes('google-apps.presentation') ||
      mimeType.includes('presentation')
    )
      return 'presentation';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('text/')) return 'text';
    return 'other';
  }

  /**
   * Get file icon URL based on MIME type
   */
  static getFileIcon(mimeType: string): string {
    const category = this.getFileCategory(mimeType);

    const icons: Record<string, string> = {
      document:
        'https://ssl.gstatic.com/docs/doclist/images/icon_11_document_list.png',
      spreadsheet:
        'https://ssl.gstatic.com/docs/doclist/images/icon_11_spreadsheet_list.png',
      presentation:
        'https://ssl.gstatic.com/docs/doclist/images/icon_11_presentation_list.png',
      pdf: 'https://ssl.gstatic.com/docs/doclist/images/icon_11_pdf_list.png',
      image:
        'https://ssl.gstatic.com/docs/doclist/images/icon_11_image_list.png',
      video:
        'https://ssl.gstatic.com/docs/doclist/images/icon_11_video_list.png',
      audio:
        'https://ssl.gstatic.com/docs/doclist/images/icon_11_audio_list.png',
      text: 'https://ssl.gstatic.com/docs/doclist/images/icon_11_generic_list.png',
      other:
        'https://ssl.gstatic.com/docs/doclist/images/icon_11_generic_list.png',
    };

    return icons[category] || icons.other;
  }
}
