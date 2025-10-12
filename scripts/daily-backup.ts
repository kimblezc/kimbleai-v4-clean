// scripts/daily-backup.ts
// Manual script to trigger daily backups for all users
// Usage: npx tsx scripts/daily-backup.ts

import { BackupSystem } from '../lib/backup-system';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BackupResult {
  userId: string;
  userEmail: string;
  success: boolean;
  backupId?: string;
  size?: number;
  error?: string;
  duration?: number;
}

async function runDailyBackup() {
  console.log('========================================');
  console.log('KimbleAI Daily Backup Script');
  console.log('========================================');
  console.log(`Started at: ${new Date().toLocaleString()}\n`);

  try {
    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .order('created_at', { ascending: true });

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('No users found to backup.');
      return;
    }

    console.log(`Found ${users.length} user(s) to backup\n`);

    const results: BackupResult[] = [];
    let totalSize = 0;

    // Process each user
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const startTime = Date.now();

      console.log(`[${i + 1}/${users.length}] Backing up: ${user.email}`);

      try {
        // Create backup
        const manifest = await BackupSystem.createFullBackup(user.id);

        // Try to export to Google Drive if user has tokens
        const { data: tokenData } = await supabase
          .from('user_tokens')
          .select('access_token, refresh_token')
          .eq('user_id', user.id)
          .single();

        let driveExported = false;
        if (tokenData?.access_token) {
          try {
            const driveResult = await BackupSystem.exportToGoogleDrive(
              user.id,
              tokenData.access_token,
              tokenData.refresh_token
            );

            manifest.drive_file_id = driveResult.driveFileId;
            manifest.drive_file_url = driveResult.driveFileUrl;
            driveExported = true;

            console.log(`  ✓ Exported to Google Drive: ${driveResult.driveFileId}`);
          } catch (driveError: any) {
            console.log(`  ⚠ Drive export failed: ${driveError.message}`);
          }
        } else {
          console.log('  ⚠ No Google Drive tokens found, skipping Drive export');
        }

        // Cleanup old backups
        const deletedCount = await BackupSystem.cleanupOldBackups(user.id);
        if (deletedCount > 0) {
          console.log(`  ✓ Cleaned up ${deletedCount} old backup(s)`);
        }

        const duration = Date.now() - startTime;
        totalSize += manifest.backup_size_bytes;

        results.push({
          userId: user.id,
          userEmail: user.email,
          success: true,
          backupId: manifest.backup_id,
          size: manifest.backup_size_bytes,
          duration
        });

        console.log(`  ✓ Backup completed in ${(duration / 1000).toFixed(2)}s`);
        console.log(`    - Size: ${(manifest.backup_size_bytes / 1024 / 1024).toFixed(2)} MB`);
        console.log(`    - Conversations: ${manifest.data_counts.conversations}`);
        console.log(`    - Messages: ${manifest.data_counts.messages}`);
        console.log(`    - Knowledge: ${manifest.data_counts.knowledge_base}`);
        console.log(`    - Files: ${manifest.data_counts.files}`);
        console.log(`    - Projects: ${manifest.data_counts.projects}`);
        console.log(`    - Drive: ${driveExported ? 'Yes' : 'No'}\n`);

      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`  ✗ Backup failed: ${error.message}\n`);

        results.push({
          userId: user.id,
          userEmail: user.email,
          success: false,
          error: error.message,
          duration
        });
      }
    }

    // Summary
    console.log('========================================');
    console.log('Backup Summary');
    console.log('========================================');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`Total users: ${users.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Completed at: ${new Date().toLocaleString()}`);

    if (failed > 0) {
      console.log('\nFailed backups:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.userEmail}: ${r.error}`);
      });
    }

    console.log('\n========================================\n');

    // Log to database
    await supabase.from('cron_logs').insert({
      job_name: 'manual_daily_backup',
      run_at: new Date().toISOString(),
      status: failed === 0 ? 'success' : successful > 0 ? 'partial' : 'failed',
      results: {
        total: users.length,
        successful,
        failed,
        totalSize,
        backups: results
      }
    });

    process.exit(failed > 0 ? 1 : 0);

  } catch (error: any) {
    console.error('Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the backup
runDailyBackup().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
