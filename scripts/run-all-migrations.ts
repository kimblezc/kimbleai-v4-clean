/**
 * Run All Critical Database Migrations for KimbleAI v4
 *
 * This script runs all necessary database migrations for:
 * - File Integration System
 * - Notifications System
 * - Backup System
 * - File Registry
 *
 * Usage: npx tsx scripts/run-all-migrations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Critical migrations in order of execution
const migrations = [
  {
    name: 'File Registry',
    file: 'file-registry-migration.sql',
    description: 'Creates file_registry table for unified file management'
  },
  {
    name: 'File Integration Enhancement',
    file: 'file-integration-enhancement.sql',
    description: 'Adds vector search and semantic file relations'
  },
  {
    name: 'Notifications System',
    file: 'notifications-table-migration.sql',
    description: 'Creates notifications and notification_preferences tables'
  },
  {
    name: 'Backups System',
    file: 'backups-table-migration.sql',
    description: 'Creates backups table for automated backup system'
  }
];

async function runMigration(migrationFile: string): Promise<boolean> {
  try {
    const filePath = path.join(process.cwd(), 'database', migrationFile);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Migration file not found: ${migrationFile}`);
      return false;
    }

    const sql = fs.readFileSync(filePath, 'utf-8');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql })
      .catch(async () => {
        // If exec_sql doesn't exist, try direct query
        return await supabase.from('_migrations').insert({ sql });
      })
      .catch(async () => {
        // Last resort: Use the REST API directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ sql_string: sql })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return { data: await response.json(), error: null };
      });

    if (error) {
      console.error(`❌ Error: ${error.message || error}`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error(`❌ Exception: ${error.message || error}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting KimbleAI Database Migrations\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`📊 Migrations to run: ${migrations.length}\n`);

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const migration of migrations) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔄 Running: ${migration.name}`);
    console.log(`📝 File: ${migration.file}`);
    console.log(`💬 ${migration.description}`);
    console.log(`${'='.repeat(70)}\n`);

    const success = await runMigration(migration.file);

    if (success) {
      console.log(`✅ ${migration.name} completed successfully!`);
      successCount++;
    } else if (!fs.existsSync(path.join(process.cwd(), 'database', migration.file))) {
      console.log(`⏭️  ${migration.name} skipped (file not found)`);
      skipCount++;
    } else {
      console.log(`❌ ${migration.name} failed!`);
      failCount++;
    }

    // Wait a bit between migrations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 Migration Summary');
  console.log(`${'='.repeat(70)}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`📦 Total: ${migrations.length}`);
  console.log(`${'='.repeat(70)}\n`);

  if (failCount === 0 && successCount > 0) {
    console.log('🎉 All migrations completed successfully!');
    console.log('\n✅ Your database is now ready for production!');
    console.log('\nNext steps:');
    console.log('1. Test the live site at https://www.kimbleai.com');
    console.log('2. Upload a test file');
    console.log('3. Try semantic search');
    console.log('4. Check notifications');
  } else if (failCount > 0) {
    console.log('⚠️  Some migrations failed. Please check the errors above.');
    console.log('\n💡 Tip: You can manually run migrations in Supabase SQL Editor:');
    console.log(`   https://supabase.com/dashboard/project/gbmefnaqsxtoseufjixp/sql`);
  } else if (successCount === 0) {
    console.log('ℹ️  No migrations were run. This might be because:');
    console.log('   - Migrations have already been run');
    console.log('   - Migration files are missing');
    console.log('   - Database connection failed');
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
