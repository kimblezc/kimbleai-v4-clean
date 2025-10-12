import { NextRequest, NextResponse } from 'next/server';
import { BackupSystem } from '@/lib/backup-system';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/backup
 * Create a new backup
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, exportToDrive = false } = await request.json();

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId is required'
      }, { status: 400 });
    }

    console.log(`[BACKUP API] Creating backup for user: ${userId}`);

    // Create backup
    const manifest = await BackupSystem.createFullBackup(userId);

    // Export to Drive if requested
    if (exportToDrive) {
      // Get user's Google tokens
      const { data: tokenData } = await supabase
        .from('user_tokens')
        .select('access_token, refresh_token')
        .eq('user_id', userId)
        .single();

      if (tokenData?.access_token) {
        try {
          const driveResult = await BackupSystem.exportToGoogleDrive(
            userId,
            tokenData.access_token,
            tokenData.refresh_token
          );

          manifest.drive_file_id = driveResult.driveFileId;
          manifest.drive_file_url = driveResult.driveFileUrl;

          console.log(`[BACKUP API] Exported to Drive: ${driveResult.driveFileId}`);
        } catch (driveError: any) {
          console.error('[BACKUP API] Drive export failed:', driveError);
          // Continue even if Drive export fails
        }
      }
    }

    return NextResponse.json({
      success: true,
      backup: manifest
    });

  } catch (error: any) {
    console.error('[BACKUP API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create backup'
    }, { status: 500 });
  }
}

/**
 * GET /api/backup
 * List all backups for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '30');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId is required'
      }, { status: 400 });
    }

    console.log(`[BACKUP API] Listing backups for user: ${userId}`);

    const backups = await BackupSystem.listBackups(userId, limit);

    return NextResponse.json({
      success: true,
      backups,
      total: backups.length
    });

  } catch (error: any) {
    console.error('[BACKUP API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to list backups'
    }, { status: 500 });
  }
}

/**
 * POST /api/backup/restore
 * Restore from a backup
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId, backupId, options } = await request.json();

    if (!userId || !backupId) {
      return NextResponse.json({
        success: false,
        error: 'userId and backupId are required'
      }, { status: 400 });
    }

    console.log(`[BACKUP API] Restoring backup: ${backupId} for user: ${userId}`);

    // Verify backup exists and belongs to user
    const backups = await BackupSystem.listBackups(userId);
    const backup = backups.find(b => b.backup_id === backupId);

    if (!backup) {
      return NextResponse.json({
        success: false,
        error: 'Backup not found or access denied'
      }, { status: 404 });
    }

    // Perform restore
    const result = await BackupSystem.restoreFromBackup(backupId, userId);

    if (result.success) {
      console.log(`[BACKUP API] Restore completed successfully for user: ${userId}`);
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[BACKUP API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to restore backup'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/backup
 * Clean up old backups
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const keepDays = parseInt(searchParams.get('keepDays') || '30');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId is required'
      }, { status: 400 });
    }

    console.log(`[BACKUP API] Cleaning up backups for user: ${userId}, keeping ${keepDays} days`);

    const deletedCount = await BackupSystem.cleanupOldBackups(userId, keepDays);

    return NextResponse.json({
      success: true,
      deletedCount
    });

  } catch (error: any) {
    console.error('[BACKUP API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to cleanup backups'
    }, { status: 500 });
  }
}
