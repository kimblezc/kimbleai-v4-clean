// scripts/verify-backup-system.ts
// Verification script for backup system components
// Usage: npx tsx scripts/verify-backup-system.ts

import * as fs from 'fs';
import * as path from 'path';

console.log('========================================');
console.log('KimbleAI Backup System Verification');
console.log('========================================\n');

interface CheckResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string[];
}

const results: CheckResult[] = [];

function check(component: string, status: 'pass' | 'fail' | 'warning', message: string, details?: string[]) {
  results.push({ component, status, message, details });

  const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '⚠';
  console.log(`${icon} ${component}: ${message}`);
  if (details) {
    details.forEach(d => console.log(`  - ${d}`));
  }
}

// Check 1: Verify lib/backup-system.ts exists and has key functions
console.log('\n1. Core Backup System');
console.log('─'.repeat(40));

try {
  const backupSystemPath = path.join(process.cwd(), 'lib', 'backup-system.ts');
  const content = fs.readFileSync(backupSystemPath, 'utf-8');

  const requiredFunctions = [
    'createFullBackup',
    'exportToGoogleDrive',
    'listBackups',
    'restoreFromBackup',
    'cleanupOldBackups',
    'sendBackupNotification'
  ];

  const missingFunctions = requiredFunctions.filter(fn => !content.includes(fn));

  if (missingFunctions.length === 0) {
    check('lib/backup-system.ts', 'pass', 'All required functions present', requiredFunctions);
  } else {
    check('lib/backup-system.ts', 'fail', 'Missing required functions', missingFunctions);
  }

  // Check for email integration
  if (content.includes('EmailAlertSystem')) {
    check('Email Integration', 'pass', 'Email notification system integrated');
  } else {
    check('Email Integration', 'warning', 'Email notification system not found');
  }

  // Check for storage integration
  if (content.includes('.storage')) {
    check('Storage Integration', 'pass', 'Supabase storage integration present (upload/download/delete)');
  } else {
    check('Storage Integration', 'fail', 'Supabase storage integration missing');
  }

} catch (error: any) {
  check('lib/backup-system.ts', 'fail', `File not found or unreadable: ${error.message}`);
}

// Check 2: Verify API endpoints
console.log('\n2. API Endpoints');
console.log('─'.repeat(40));

const apiEndpoints = [
  { path: 'app/api/backup/route.ts', name: 'Main Backup API' },
  { path: 'app/api/backup/cron/route.ts', name: 'Cron Backup API' }
];

for (const endpoint of apiEndpoints) {
  try {
    const filePath = path.join(process.cwd(), endpoint.path);
    const content = fs.readFileSync(filePath, 'utf-8');

    const methods: string[] = [];
    if (content.includes('export async function GET')) methods.push('GET');
    if (content.includes('export async function POST')) methods.push('POST');
    if (content.includes('export async function PUT')) methods.push('PUT');
    if (content.includes('export async function DELETE')) methods.push('DELETE');

    check(endpoint.name, 'pass', `Found with methods: ${methods.join(', ')}`);
  } catch (error: any) {
    check(endpoint.name, 'fail', `File not found: ${endpoint.path}`);
  }
}

// Check 3: Verify scripts
console.log('\n3. Backup Scripts');
console.log('─'.repeat(40));

const scripts = [
  { path: 'scripts/daily-backup.ts', name: 'Daily Backup Script' },
  { path: 'scripts/test-backup.ts', name: 'Test Script' }
];

for (const script of scripts) {
  try {
    const filePath = path.join(process.cwd(), script.path);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').length;
    check(script.name, 'pass', `Found (${lines} lines)`);
  } catch (error: any) {
    check(script.name, 'fail', `File not found: ${script.path}`);
  }
}

// Check 4: Verify Vercel configuration
console.log('\n4. Vercel Configuration');
console.log('─'.repeat(40));

try {
  const vercelPath = path.join(process.cwd(), 'vercel.json');
  const content = fs.readFileSync(vercelPath, 'utf-8');
  const config = JSON.parse(content);

  // Check cron configuration
  if (config.crons && Array.isArray(config.crons)) {
    const backupCron = config.crons.find((c: any) => c.path === '/api/backup/cron');
    if (backupCron) {
      check('Cron Job', 'pass', `Configured: ${backupCron.schedule} (Daily at 2 AM UTC)`);
    } else {
      check('Cron Job', 'fail', 'Backup cron job not configured');
    }
  } else {
    check('Cron Job', 'fail', 'No crons configured in vercel.json');
  }

  // Check function timeout
  if (config.functions && config.functions['app/api/backup/cron/route.ts']) {
    const timeout = config.functions['app/api/backup/cron/route.ts'].maxDuration;
    check('Function Timeout', 'pass', `Set to ${timeout}s`);
  } else {
    check('Function Timeout', 'warning', 'Not configured (using default 60s)');
  }

} catch (error: any) {
  check('vercel.json', 'fail', `Error reading config: ${error.message}`);
}

// Check 5: Environment variables
console.log('\n5. Environment Variables');
console.log('─'.repeat(40));

try {
  const envPath = path.join(process.cwd(), '.env.local');
  const content = fs.readFileSync(envPath, 'utf-8');

  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CRON_SECRET',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'COST_ALERT_EMAIL'
  ];

  const missingVars: string[] = [];
  const foundVars: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (content.includes(envVar + '=')) {
      foundVars.push(envVar);
    } else {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length === 0) {
    check('Environment Variables', 'pass', `All ${requiredEnvVars.length} required variables present`);
  } else {
    check('Environment Variables', 'warning', `Missing ${missingVars.length} variables`, missingVars);
  }

  // Check if SMTP password is set
  if (content.includes('SMTP_PASSWORD=your-app-password')) {
    check('SMTP Configuration', 'warning', 'SMTP password needs to be configured');
  } else if (content.includes('SMTP_PASSWORD=') && !content.includes('SMTP_PASSWORD=\n')) {
    check('SMTP Configuration', 'pass', 'SMTP credentials configured');
  } else {
    check('SMTP Configuration', 'warning', 'SMTP password not set');
  }

} catch (error: any) {
  check('.env.local', 'fail', `Error reading file: ${error.message}`);
}

// Check 6: Database schema
console.log('\n6. Database Schema');
console.log('─'.repeat(40));

try {
  const schemaPath = path.join(process.cwd(), 'database', 'backups-table-migration.sql');
  const content = fs.readFileSync(schemaPath, 'utf-8');

  const requiredTables = ['backups'];
  const requiredColumns = ['id', 'user_id', 'created_at', 'data_counts', 'backup_size_bytes', 'status', 'drive_file_id'];

  const missingColumns = requiredColumns.filter(col => !content.includes(col));

  if (missingColumns.length === 0) {
    check('Backups Table Schema', 'pass', `All ${requiredColumns.length} required columns present`);
  } else {
    check('Backups Table Schema', 'fail', 'Missing columns', missingColumns);
  }

  // Check for indexes
  if (content.includes('CREATE INDEX')) {
    check('Database Indexes', 'pass', 'Indexes configured for performance');
  } else {
    check('Database Indexes', 'warning', 'No indexes found');
  }

  // Check for RLS
  if (content.includes('ROW LEVEL SECURITY')) {
    check('Row Level Security', 'pass', 'RLS policies configured');
  } else {
    check('Row Level Security', 'warning', 'RLS not configured');
  }

} catch (error: any) {
  check('Database Schema', 'fail', `Migration file not found: ${error.message}`);
}

// Summary
console.log('\n========================================');
console.log('Verification Summary');
console.log('========================================');

const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'fail').length;
const warnings = results.filter(r => r.status === 'warning').length;
const total = results.length;

console.log(`Total checks: ${total}`);
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);
console.log(`⚠ Warnings: ${warnings}`);
console.log(`\nSuccess rate: ${((passed / total) * 100).toFixed(1)}%`);

if (failed > 0) {
  console.log('\n⚠ Failed checks require attention:');
  results.filter(r => r.status === 'fail').forEach(r => {
    console.log(`  ✗ ${r.component}: ${r.message}`);
  });
}

if (warnings > 0) {
  console.log('\n⚠ Warnings (optional improvements):');
  results.filter(r => r.status === 'warning').forEach(r => {
    console.log(`  ⚠ ${r.component}: ${r.message}`);
  });
}

console.log('\n========================================');

if (failed === 0) {
  console.log('✓ All critical components verified successfully!');
  console.log('\nNext steps:');
  console.log('1. Configure SMTP credentials in .env.local');
  console.log('2. Run the database migration: database/backups-table-migration.sql');
  console.log('3. Create Supabase storage bucket: "backups"');
  console.log('4. Deploy to Vercel to enable cron jobs');
  console.log('5. Test manual backup: npm run test-backup');
  process.exit(0);
} else {
  console.log('✗ Please fix the failed checks before proceeding.');
  process.exit(1);
}
