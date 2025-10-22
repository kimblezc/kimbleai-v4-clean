/**
 * Google Drive Cleanup Script
 *
 * Finds and removes:
 * - Duplicate files (same name, size, and modified date)
 * - Old transcriptions (>90 days)
 * - Empty folders
 *
 * Moves old files to Archives instead of deleting
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { getArchivePath, ensureFolderExists } from '../lib/drive-folder-structure';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DriveFile {
  id: string;
  name: string;
  size?: string;
  modifiedTime: string;
  mimeType: string;
  parents?: string[];
}

interface DuplicateGroup {
  key: string;
  files: DriveFile[];
}

interface CleanupStats {
  duplicatesFound: number;
  duplicatesRemoved: number;
  oldFilesFound: number;
  oldFilesMoved: number;
  emptyFoldersFound: number;
  emptyFoldersRemoved: number;
  spaceSaved: number; // in bytes
  errors: string[];
}

/**
 * Get user's Google access token
 */
async function getAccessToken(userId: string = 'zach'): Promise<string> {
  const { data, error } = await supabase
    .from('user_tokens')
    .select('access_token')
    .eq('user_id', userId)
    .single();

  if (error || !data?.access_token) {
    throw new Error('No Google access token found. Please authenticate with Google first.');
  }

  return data.access_token;
}

/**
 * List all files in a folder recursively
 */
async function listAllFiles(
  drive: any,
  folderId: string = 'root',
  mimeTypeFilter?: string
): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const query = mimeTypeFilter
      ? `'${folderId}' in parents and mimeType='${mimeTypeFilter}' and trashed=false`
      : `'${folderId}' in parents and trashed=false`;

    const response = await drive.files.list({
      q: query,
      fields: 'nextPageToken, files(id, name, size, modifiedTime, mimeType, parents)',
      pageSize: 100,
      pageToken
    });

    files.push(...(response.data.files || []));
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return files;
}

/**
 * Find duplicate files
 * Duplicates are files with same name, size, and modified time
 */
function findDuplicates(files: DriveFile[]): DuplicateGroup[] {
  const groups = new Map<string, DriveFile[]>();

  // Group by name + size + modified date
  for (const file of files) {
    const key = `${file.name}|${file.size}|${new Date(file.modifiedTime).toDateString()}`;
    const existing = groups.get(key) || [];
    existing.push(file);
    groups.set(key, existing);
  }

  // Filter to only groups with multiple files
  const duplicates: DuplicateGroup[] = [];
  for (const [key, files] of groups.entries()) {
    if (files.length > 1) {
      duplicates.push({ key, files });
    }
  }

  return duplicates;
}

/**
 * Find old files (older than specified days)
 */
function findOldFiles(files: DriveFile[], daysOld: number = 90): DriveFile[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return files.filter(file => {
    const modifiedDate = new Date(file.modifiedTime);
    return modifiedDate < cutoffDate;
  });
}

/**
 * Move file to Archives folder
 */
async function moveToArchive(
  drive: any,
  accessToken: string,
  file: DriveFile
): Promise<void> {
  // Get/create archive folder
  const archivePath = getArchivePath();
  const archiveFolderId = await ensureFolderExists(accessToken, archivePath);

  // Remove from current parents
  const previousParents = file.parents?.join(',');

  // Move to archive
  await drive.files.update({
    fileId: file.id,
    addParents: archiveFolderId,
    removeParents: previousParents,
    fields: 'id, parents'
  });

  console.log(`📦 Moved to archive: ${file.name}`);
}

/**
 * Delete file permanently
 */
async function deleteFile(drive: any, fileId: string): Promise<void> {
  await drive.files.delete({ fileId });
}

/**
 * Main cleanup function
 */
async function cleanupDrive(
  userId: string = 'zach',
  options: {
    removeDuplicates?: boolean;
    archiveOldFiles?: boolean;
    removeEmptyFolders?: boolean;
    dryRun?: boolean;
    oldFileDays?: number;
  } = {}
): Promise<CleanupStats> {
  const {
    removeDuplicates = true,
    archiveOldFiles = true,
    removeEmptyFolders = false,
    dryRun = false,
    oldFileDays = 90
  } = options;

  const stats: CleanupStats = {
    duplicatesFound: 0,
    duplicatesRemoved: 0,
    oldFilesFound: 0,
    oldFilesMoved: 0,
    emptyFoldersFound: 0,
    emptyFoldersRemoved: 0,
    spaceSaved: 0,
    errors: []
  };

  try {
    // Get access token
    const accessToken = await getAccessToken(userId);

    // Initialize Drive API
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth });

    console.log('🔍 Scanning Google Drive...\n');

    // Get all files in KimbleAI folder
    const searchResponse = await drive.files.list({
      q: "name='KimbleAI' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)'
    });

    const kimbleaiFolder = searchResponse.data.files?.[0];
    if (!kimbleaiFolder) {
      console.log('❌ KimbleAI folder not found. Nothing to clean up.');
      return stats;
    }

    // List all files recursively
    const allFiles = await listAllFiles(drive, kimbleaiFolder.id);
    console.log(`📁 Found ${allFiles.length} files in KimbleAI folder\n`);

    // 1. Find and remove duplicates
    if (removeDuplicates) {
      console.log('🔎 Checking for duplicates...');
      const duplicateGroups = findDuplicates(allFiles);

      stats.duplicatesFound = duplicateGroups.reduce((sum, group) => sum + (group.files.length - 1), 0);

      if (duplicateGroups.length > 0) {
        console.log(`\n⚠️  Found ${duplicateGroups.length} groups of duplicates (${stats.duplicatesFound} duplicate files):\n`);

        for (const group of duplicateGroups) {
          console.log(`  📄 ${group.files[0].name} (${group.files.length} copies)`);

          // Keep the first file, remove the rest
          const [keep, ...remove] = group.files;

          for (const file of remove) {
            if (dryRun) {
              console.log(`    🔹 [DRY RUN] Would delete: ${file.id}`);
            } else {
              try {
                await deleteFile(drive, file.id);
                stats.duplicatesRemoved++;
                stats.spaceSaved += parseInt(file.size || '0');
                console.log(`    ✅ Deleted duplicate: ${file.id}`);
              } catch (error: any) {
                stats.errors.push(`Failed to delete ${file.name}: ${error.message}`);
                console.error(`    ❌ Error: ${error.message}`);
              }
            }
          }
        }
      } else {
        console.log('  ✅ No duplicates found');
      }
    }

    // 2. Archive old files
    if (archiveOldFiles) {
      console.log(`\n📅 Checking for files older than ${oldFileDays} days...`);
      const oldFiles = findOldFiles(allFiles, oldFileDays);

      stats.oldFilesFound = oldFiles.length;

      if (oldFiles.length > 0) {
        console.log(`\n⚠️  Found ${oldFiles.length} old files:\n`);

        for (const file of oldFiles) {
          const age = Math.floor((Date.now() - new Date(file.modifiedTime).getTime()) / (1000 * 60 * 60 * 24));
          console.log(`  📄 ${file.name} (${age} days old)`);

          if (dryRun) {
            console.log(`    🔹 [DRY RUN] Would move to archive`);
          } else {
            try {
              await moveToArchive(drive, accessToken, file);
              stats.oldFilesMoved++;
            } catch (error: any) {
              stats.errors.push(`Failed to archive ${file.name}: ${error.message}`);
              console.error(`    ❌ Error: ${error.message}`);
            }
          }
        }
      } else {
        console.log('  ✅ No old files found');
      }
    }

    // 3. Remove empty folders (optional - disabled by default)
    if (removeEmptyFolders) {
      console.log('\n📁 Checking for empty folders...');
      const folders = allFiles.filter(f => f.mimeType === 'application/vnd.google-apps.folder');

      for (const folder of folders) {
        const contents = await listAllFiles(drive, folder.id);

        if (contents.length === 0) {
          stats.emptyFoldersFound++;
          console.log(`  📁 Empty folder: ${folder.name}`);

          if (dryRun) {
            console.log(`    🔹 [DRY RUN] Would delete folder`);
          } else {
            try {
              await deleteFile(drive, folder.id);
              stats.emptyFoldersRemoved++;
              console.log(`    ✅ Deleted empty folder`);
            } catch (error: any) {
              stats.errors.push(`Failed to delete folder ${folder.name}: ${error.message}`);
              console.error(`    ❌ Error: ${error.message}`);
            }
          }
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`Duplicates found: ${stats.duplicatesFound}`);
    console.log(`Duplicates removed: ${stats.duplicatesRemoved}`);
    console.log(`Old files found: ${stats.oldFilesFound}`);
    console.log(`Old files moved to archive: ${stats.oldFilesMoved}`);
    console.log(`Empty folders found: ${stats.emptyFoldersFound}`);
    console.log(`Empty folders removed: ${stats.emptyFoldersRemoved}`);
    console.log(`Space saved: ${(stats.spaceSaved / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      stats.errors.forEach(err => console.log(`  - ${err}`));
    }

    if (dryRun) {
      console.log('\n🔹 DRY RUN MODE - No actual changes were made');
    }

    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('❌ Cleanup failed:', error);
    stats.errors.push(error.message);
  }

  return stats;
}

// Run cleanup if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const userId = args.find(arg => arg.startsWith('--user='))?.split('=')[1] || 'zach';

  console.log('🧹 Google Drive Cleanup Script');
  console.log('================================\n');

  if (dryRun) {
    console.log('🔹 Running in DRY RUN mode - no changes will be made\n');
  }

  cleanupDrive(userId, {
    removeDuplicates: true,
    archiveOldFiles: true,
    removeEmptyFolders: false,
    dryRun,
    oldFileDays: 90
  }).then(stats => {
    if (stats.errors.length > 0) {
      process.exit(1);
    }
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { cleanupDrive };
