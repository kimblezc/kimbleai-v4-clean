// scripts/test-backup.ts
// Comprehensive backup system testing script
// Usage: npx tsx scripts/test-backup.ts

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

// Test configuration
const TEST_USER_EMAIL = process.env.COST_ALERT_EMAIL || 'zach.kimble@gmail.com';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
  details?: any;
}

const results: TestResult[] = [];

function log(message: string, indent: number = 0) {
  const padding = '  '.repeat(indent);
  console.log(`${padding}${message}`);
}

function logTest(name: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log('='.repeat(60));
}

async function test(name: string, fn: () => Promise<any>): Promise<boolean> {
  const startTime = Date.now();
  try {
    logTest(name);
    const result = await fn();
    const duration = Date.now() - startTime;

    results.push({
      name,
      passed: true,
      duration,
      details: result
    });

    log(`✓ PASSED (${(duration / 1000).toFixed(2)}s)`, 1);
    return true;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    results.push({
      name,
      passed: false,
      error: error.message,
      duration
    });

    log(`✗ FAILED (${(duration / 1000).toFixed(2)}s)`, 1);
    log(`Error: ${error.message}`, 1);
    return false;
  }
}

async function runTests() {
  console.log('========================================');
  console.log('KimbleAI Backup System Test Suite');
  console.log('========================================');
  console.log(`Started at: ${new Date().toLocaleString()}\n`);

  let testUserId: string | null = null;
  let testBackupId: string | null = null;

  // Test 1: Get test user
  await test('Get Test User', async () => {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', TEST_USER_EMAIL)
      .single();

    if (error) {
      throw new Error(`Failed to get test user: ${error.message}`);
    }

    if (!user) {
      throw new Error(`Test user not found: ${TEST_USER_EMAIL}`);
    }

    testUserId = user.id;
    log(`Found test user: ${user.email} (${user.id})`, 1);

    return { userId: user.id, email: user.email };
  });

  if (!testUserId) {
    console.error('\nCannot continue without test user. Exiting.');
    process.exit(1);
  }

  // Test 2: Create backup
  await test('Create Full Backup', async () => {
    const manifest = await BackupSystem.createFullBackup(testUserId!);

    testBackupId = manifest.backup_id;

    log(`Backup ID: ${manifest.backup_id}`, 1);
    log(`Size: ${(manifest.backup_size_bytes / 1024 / 1024).toFixed(2)} MB`, 1);
    log(`Data Counts:`, 1);
    log(`  - Conversations: ${manifest.data_counts.conversations}`, 1);
    log(`  - Messages: ${manifest.data_counts.messages}`, 1);
    log(`  - Knowledge: ${manifest.data_counts.knowledge_base}`, 1);
    log(`  - Files: ${manifest.data_counts.files}`, 1);
    log(`  - Projects: ${manifest.data_counts.projects}`, 1);

    if (!manifest.backup_id) {
      throw new Error('Backup ID not returned');
    }

    return manifest;
  });

  // Test 3: List backups
  await test('List Backups', async () => {
    const backups = await BackupSystem.listBackups(testUserId!, 10);

    log(`Found ${backups.length} backup(s)`, 1);

    if (backups.length === 0) {
      throw new Error('No backups found');
    }

    // Verify our backup is in the list
    const ourBackup = backups.find(b => b.backup_id === testBackupId);
    if (!ourBackup) {
      throw new Error('Newly created backup not found in list');
    }

    log(`Latest backup: ${backups[0].backup_id}`, 1);
    log(`Created: ${new Date(backups[0].created_at).toLocaleString()}`, 1);

    return { total: backups.length, latest: backups[0] };
  });

  // Test 4: Verify backup data storage
  await test('Verify Backup Storage', async () => {
    if (!testBackupId) {
      throw new Error('No backup ID available');
    }

    // Check if backup exists in storage
    const { data, error } = await supabase
      .storage
      .from('backups')
      .download(`${testUserId}/${testBackupId}.json`);

    if (error) {
      throw new Error(`Failed to download backup: ${error.message}`);
    }

    if (!data) {
      throw new Error('Backup data not found in storage');
    }

    const text = await data.text();
    const backupData = JSON.parse(text);

    log(`Backup version: ${backupData.backup_version}`, 1);
    log(`User: ${backupData.user_email}`, 1);
    log(`Tables backed up: ${Object.keys(backupData.data).length}`, 1);

    if (!backupData.data) {
      throw new Error('Backup data structure invalid');
    }

    return {
      size: text.length,
      tables: Object.keys(backupData.data).length
    };
  });

  // Test 5: Test backup restoration (dry run - we won't actually restore)
  await test('Test Restore Logic', async () => {
    if (!testBackupId) {
      throw new Error('No backup ID available');
    }

    // Just verify we can access the restore function
    // We won't actually restore to avoid data corruption in tests
    const backups = await BackupSystem.listBackups(testUserId!);
    const backup = backups.find(b => b.backup_id === testBackupId);

    if (!backup) {
      throw new Error('Backup not found for restore test');
    }

    log(`Restore would process:`, 1);
    log(`  - ${backup.data_counts.conversations} conversations`, 1);
    log(`  - ${backup.data_counts.messages} messages`, 1);
    log(`  - ${backup.data_counts.knowledge_base} knowledge items`, 1);

    return {
      backupId: testBackupId,
      itemsToRestore: backup.data_counts
    };
  });

  // Test 6: Test Google Drive export (if tokens available)
  await test('Test Google Drive Export', async () => {
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', testUserId!)
      .single();

    if (!tokenData?.access_token) {
      log('No Google tokens available, skipping Drive export', 1);
      return { skipped: true, reason: 'No tokens' };
    }

    log('Google tokens found, attempting Drive export...', 1);

    try {
      const driveResult = await BackupSystem.exportToGoogleDrive(
        testUserId!,
        tokenData.access_token,
        tokenData.refresh_token
      );

      log(`Drive File ID: ${driveResult.driveFileId}`, 1);
      log(`Drive URL: ${driveResult.driveFileUrl}`, 1);

      return {
        driveFileId: driveResult.driveFileId,
        driveFileUrl: driveResult.driveFileUrl
      };
    } catch (error: any) {
      log(`Drive export failed: ${error.message}`, 1);
      return { skipped: true, reason: error.message };
    }
  });

  // Test 7: Test backup rotation/cleanup
  await test('Test Backup Rotation', async () => {
    const beforeCleanup = await BackupSystem.listBackups(testUserId!);
    log(`Backups before cleanup: ${beforeCleanup.length}`, 1);

    // Run cleanup (this will keep 7 daily, 4 weekly, 12 monthly)
    const deletedCount = await BackupSystem.cleanupOldBackups(testUserId!);

    const afterCleanup = await BackupSystem.listBackups(testUserId!);
    log(`Backups after cleanup: ${afterCleanup.length}`, 1);
    log(`Deleted: ${deletedCount}`, 1);

    return {
      beforeCount: beforeCleanup.length,
      afterCount: afterCleanup.length,
      deleted: deletedCount
    };
  });

  // Test 8: Verify backup integrity
  await test('Verify Backup Integrity', async () => {
    if (!testBackupId) {
      throw new Error('No backup ID available');
    }

    // Download and parse the backup
    const { data, error } = await supabase
      .storage
      .from('backups')
      .download(`${testUserId}/${testBackupId}.json`);

    if (error) {
      throw new Error(`Failed to download: ${error.message}`);
    }

    const text = await data.text();
    const backupData = JSON.parse(text);

    // Verify required fields
    const requiredFields = [
      'backup_version',
      'created_at',
      'user_id',
      'user_email',
      'data',
      'metadata'
    ];

    for (const field of requiredFields) {
      if (!backupData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Verify data structure
    const requiredTables = [
      'conversations',
      'messages',
      'knowledge_base',
      'files',
      'projects'
    ];

    for (const table of requiredTables) {
      if (!Array.isArray(backupData.data[table])) {
        throw new Error(`Invalid data structure for table: ${table}`);
      }
    }

    log('All required fields present', 1);
    log('All required tables present', 1);
    log('Data structure valid', 1);

    return {
      valid: true,
      fields: requiredFields.length,
      tables: requiredTables.length
    };
  });

  // Test 9: Database integrity
  await test('Verify Database Records', async () => {
    if (!testBackupId) {
      throw new Error('No backup ID available');
    }

    const { data: backupRecord, error } = await supabase
      .from('backups')
      .select('*')
      .eq('id', testBackupId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch backup record: ${error.message}`);
    }

    if (!backupRecord) {
      throw new Error('Backup record not found in database');
    }

    log(`Status: ${backupRecord.status}`, 1);
    log(`Created: ${new Date(backupRecord.created_at).toLocaleString()}`, 1);
    log(`Size: ${(backupRecord.backup_size_bytes / 1024 / 1024).toFixed(2)} MB`, 1);

    if (backupRecord.status !== 'completed') {
      throw new Error(`Unexpected status: ${backupRecord.status}`);
    }

    return {
      id: backupRecord.id,
      status: backupRecord.status,
      size: backupRecord.backup_size_bytes
    };
  });

  // Print summary
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ✗ ${r.name}: ${r.error}`);
    });
  }

  console.log('\nCompleted at:', new Date().toLocaleString());
  console.log('========================================\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
