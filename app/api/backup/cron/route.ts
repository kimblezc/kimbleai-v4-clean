// app/api/backup/cron/route.ts
// Automated backup cron job endpoint
// Called by Vercel Cron at 2 AM daily

import { NextRequest, NextResponse } from 'next/server';
import { BackupSystem } from '@/lib/backup-system';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/backup/cron
 * Scheduled backup cron job
 * Runs daily at 2 AM (configured in vercel.json)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is a valid cron request
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (authHeader !== expectedAuth) {
      console.error('[BACKUP CRON] Unauthorized request');
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    console.log('[BACKUP CRON] Starting scheduled backup job');

    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .order('created_at', { ascending: true });

    if (usersError || !users || users.length === 0) {
      console.error('[BACKUP CRON] No users found or error:', usersError);
      return NextResponse.json({
        success: false,
        error: 'No users to backup'
      }, { status: 400 });
    }

    console.log(`[BACKUP CRON] Found ${users.length} users to backup`);

    const results = {
      total: users.length,
      successful: 0,
      failed: 0,
      backups: [] as any[]
    };

    // Process each user
    for (const user of users) {
      try {
        console.log(`[BACKUP CRON] Creating backup for user: ${user.email}`);

        // Create backup
        const manifest = await BackupSystem.createFullBackup(user.id);

        // Try to export to Google Drive if user has tokens
        const { data: tokenData } = await supabase
          .from('user_tokens')
          .select('access_token, refresh_token')
          .eq('user_id', user.id)
          .single();

        if (tokenData?.access_token) {
          try {
            const driveResult = await BackupSystem.exportToGoogleDrive(
              user.id,
              tokenData.access_token,
              tokenData.refresh_token
            );

            manifest.drive_file_id = driveResult.driveFileId;
            manifest.drive_file_url = driveResult.driveFileUrl;

            console.log(`[BACKUP CRON] Exported to Drive: ${driveResult.driveFileId}`);
          } catch (driveError: any) {
            console.error(`[BACKUP CRON] Drive export failed for ${user.email}:`, driveError);
            // Continue even if Drive export fails
          }
        }

        // Cleanup old backups (keep rotation: 7 daily, 4 weekly, 12 monthly)
        const deletedCount = await BackupSystem.cleanupOldBackups(user.id);
        console.log(`[BACKUP CRON] Cleaned up ${deletedCount} old backups for ${user.email}`);

        results.successful++;
        results.backups.push({
          userId: user.id,
          userEmail: user.email,
          backupId: manifest.backup_id,
          size: manifest.backup_size_bytes,
          success: true
        });

      } catch (error: any) {
        console.error(`[BACKUP CRON] Failed to backup user ${user.email}:`, error);
        results.failed++;
        results.backups.push({
          userId: user.id,
          userEmail: user.email,
          success: false,
          error: error.message
        });
      }
    }

    // Log the cron job result
    await supabase.from('cron_logs').insert({
      job_name: 'daily_backup',
      run_at: new Date().toISOString(),
      status: results.failed === 0 ? 'success' : results.successful > 0 ? 'partial' : 'failed',
      results: results,
      duration_ms: 0 // Could track this if needed
    });

    console.log('[BACKUP CRON] Backup job completed:', results);

    return NextResponse.json({
      success: true,
      message: `Backup completed: ${results.successful} successful, ${results.failed} failed`,
      results
    });

  } catch (error: any) {
    console.error('[BACKUP CRON] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Backup cron job failed'
    }, { status: 500 });
  }
}

/**
 * GET /api/backup/cron (for testing)
 * Test endpoint to verify cron configuration
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Backup cron endpoint is active',
    nextRun: '2:00 AM UTC daily',
    config: {
      cronSecret: process.env.CRON_SECRET ? 'configured' : 'missing',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing'
    }
  });
}
