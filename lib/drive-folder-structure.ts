/**
 * Google Drive Folder Structure Management
 *
 * Defines and manages the standard folder hierarchy for KimbleAI on Google Drive
 */

import { google } from 'googleapis';

// ============ FOLDER STRUCTURE DEFINITION ============

export const DRIVE_STRUCTURE = {
  root: 'KimbleAI',
  transcriptions: 'KimbleAI/Transcriptions',
  attachments: 'KimbleAI/Attachments',
  exports: 'KimbleAI/Exports',
  archives: 'KimbleAI/Archives',
  backups: 'KimbleAI/Backups'
} as const;

/**
 * Get date-based subfolder path (YYYY-MM format)
 */
export function getDateSubfolder(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Build full folder path for transcriptions
 * Example: KimbleAI/Transcriptions/2025-10/project-name
 */
export function getTranscriptionPath(projectName: string = 'general'): string {
  const dateFolder = getDateSubfolder();
  return `${DRIVE_STRUCTURE.transcriptions}/${dateFolder}/${projectName}`;
}

/**
 * Build full folder path for attachments
 * Example: KimbleAI/Attachments/2025-10
 */
export function getAttachmentPath(): string {
  const dateFolder = getDateSubfolder();
  return `${DRIVE_STRUCTURE.attachments}/${dateFolder}`;
}

/**
 * Build full folder path for exports
 * Example: KimbleAI/Exports/2025-10
 */
export function getExportPath(): string {
  const dateFolder = getDateSubfolder();
  return `${DRIVE_STRUCTURE.exports}/${dateFolder}`;
}

/**
 * Build full folder path for archives
 * Example: KimbleAI/Archives/2025
 */
export function getArchivePath(): string {
  const now = new Date();
  const year = now.getFullYear();
  return `${DRIVE_STRUCTURE.archives}/${year}`;
}

// ============ FOLDER CREATION ============

interface FolderCacheEntry {
  id: string;
  timestamp: number;
}

// Cache folder IDs to avoid repeated lookups (5 min TTL)
const folderCache = new Map<string, FolderCacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get folder ID from cache or lookup
 */
function getCachedFolderId(path: string): string | null {
  const cached = folderCache.get(path);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL) {
    folderCache.delete(path);
    return null;
  }

  return cached.id;
}

/**
 * Cache folder ID
 */
function cacheFolderId(path: string, id: string) {
  folderCache.set(path, {
    id,
    timestamp: Date.now()
  });
}

/**
 * Find or create a folder by path
 * Creates parent folders if they don't exist
 */
export async function ensureFolderExists(
  accessToken: string,
  folderPath: string
): Promise<string> {
  // Check cache first
  const cachedId = getCachedFolderId(folderPath);
  if (cachedId) {
    console.log(`[DriveStructure] Folder cached: ${folderPath}`);
    return cachedId;
  }

  const drive = google.drive({ version: 'v3' });
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  // Split path into parts
  const parts = folderPath.split('/').filter(p => p);
  let currentPath = '';
  let parentId = 'root';

  // Create each level of the hierarchy
  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;

    // Check if this level exists
    try {
      const searchResponse = await drive.files.list({
        auth,
        q: `name='${part}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        // Folder exists
        parentId = searchResponse.data.files[0].id!;
        cacheFolderId(currentPath, parentId);
        console.log(`[DriveStructure] Found folder: ${currentPath}`);
      } else {
        // Create folder
        const createResponse = await drive.files.create({
          auth,
          requestBody: {
            name: part,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
          },
          fields: 'id, name'
        });

        parentId = createResponse.data.id!;
        cacheFolderId(currentPath, parentId);
        console.log(`[DriveStructure] Created folder: ${currentPath}`);
      }
    } catch (error) {
      console.error(`[DriveStructure] Error with folder '${currentPath}':`, error);
      throw error;
    }
  }

  return parentId;
}

/**
 * Initialize complete KimbleAI folder structure on Drive
 * Creates all base folders if they don't exist
 */
export async function initializeFolderStructure(
  accessToken: string
): Promise<Record<string, string>> {
  console.log('[DriveStructure] Initializing folder structure...');

  const folderIds: Record<string, string> = {};

  // Create all base folders
  for (const [key, path] of Object.entries(DRIVE_STRUCTURE)) {
    try {
      const folderId = await ensureFolderExists(accessToken, path);
      folderIds[key] = folderId;
      console.log(`[DriveStructure] ✓ ${path} (${folderId})`);
    } catch (error) {
      console.error(`[DriveStructure] ✗ Failed to create ${path}:`, error);
    }
  }

  console.log('[DriveStructure] Initialization complete');
  return folderIds;
}

/**
 * Upload file to specific folder in structure
 */
export async function uploadToStructuredFolder(
  accessToken: string,
  fileName: string,
  content: Buffer | string,
  mimeType: string,
  folderPath: string
): Promise<string> {
  // Ensure folder exists
  const folderId = await ensureFolderExists(accessToken, folderPath);

  // Upload file
  const drive = google.drive({ version: 'v3' });
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const response = await drive.files.create({
    auth,
    requestBody: {
      name: fileName,
      parents: [folderId]
    },
    media: {
      mimeType,
      body: typeof content === 'string' ? content : Buffer.from(content)
    },
    fields: 'id, name, webViewLink'
  });

  console.log(`[DriveStructure] Uploaded ${fileName} to ${folderPath}`);

  return response.data.id!;
}

// ============ UTILITY FUNCTIONS ============

/**
 * Clear folder cache (useful after major operations)
 */
export function clearFolderCache() {
  folderCache.clear();
  console.log('[DriveStructure] Folder cache cleared');
}

/**
 * Get cache statistics
 */
export function getFolderCacheStats() {
  return {
    size: folderCache.size,
    ttl: CACHE_TTL,
    entries: Array.from(folderCache.entries()).map(([path, entry]) => ({
      path,
      id: entry.id,
      age: Date.now() - entry.timestamp
    }))
  };
}
