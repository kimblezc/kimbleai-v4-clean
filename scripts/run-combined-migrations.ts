// scripts/run-combined-migrations.ts
// Run the COMBINED-CRITICAL-MIGRATIONS.sql file using PostgreSQL client

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface MigrationResult {
  name: string;
  success: boolean;
  error?: string;
  details?: any;
}

async function runMigrations(): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  // Parse Supabase URL to get connection details
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Extract database connection info from Supabase URL
  // Format: https://[project-id].supabase.co
  const projectId = supabaseUrl.match(/https:\/\/(.+)\.supabase\.co/)?.[1];
  if (!projectId) {
    throw new Error('Invalid Supabase URL format');
  }

  // Supabase PostgreSQL connection details
  const connectionString = `postgresql://postgres.${projectId}:${encodeURIComponent(serviceRoleKey)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require`;

  console.log('\n🔌 Connecting to Supabase PostgreSQL...');
  console.log(`📊 Database: ${supabaseUrl}`);
  console.log(`🔑 Project ID: ${projectId}\n`);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database successfully!\n');

    // Read the combined migration file
    const migrationPath = path.join(process.cwd(), 'database', 'COMBINED-CRITICAL-MIGRATIONS.sql');
    console.log(`📖 Reading migration file: ${migrationPath}\n`);

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split into logical sections based on migration comments
    const sections = migrationSQL.split(/-- ={70,}/);

    console.log('🚀 Starting migration execution...\n');
    console.log('=' .repeat(80));

    // Execute the entire migration as one transaction
    console.log('\n📝 Executing COMBINED-CRITICAL-MIGRATIONS.sql...');
    console.log('   This includes:');
    console.log('   1. File Registry (file management system)');
    console.log('   2. File Integration Enhancement (vector search)');
    console.log('   3. Notifications System (real-time notifications)');
    console.log('   4. Backups System (automated backups)\n');

    try {
      // Execute the entire SQL file
      const result = await client.query(migrationSQL);

      results.push({
        name: 'COMBINED-CRITICAL-MIGRATIONS',
        success: true,
        details: result
      });

      console.log('✅ Migration executed successfully!\n');
    } catch (error: any) {
      console.error('❌ Migration failed:', error.message);
      results.push({
        name: 'COMBINED-CRITICAL-MIGRATIONS',
        success: false,
        error: error.message
      });
    }

    // Verify tables were created
    console.log('=' .repeat(80));
    console.log('\n🔍 Verifying database objects...\n');

    const verifications = [
      { name: 'file_registry table', query: "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'file_registry'" },
      { name: 'notifications table', query: "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'notifications'" },
      { name: 'notification_preferences table', query: "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'notification_preferences'" },
      { name: 'backups table', query: "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'backups'" },
      { name: 'search_knowledge_base function', query: "SELECT COUNT(*) FROM pg_proc WHERE proname = 'search_knowledge_base'" },
      { name: 'get_related_files_semantic function', query: "SELECT COUNT(*) FROM pg_proc WHERE proname = 'get_related_files_semantic'" },
      { name: 'vector extension', query: "SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector'" },
    ];

    for (const verification of verifications) {
      try {
        const result = await client.query(verification.query);
        const exists = result.rows[0].count > 0;

        if (exists) {
          console.log(`✅ ${verification.name} - EXISTS`);
        } else {
          console.log(`❌ ${verification.name} - NOT FOUND`);
        }
      } catch (error: any) {
        console.log(`⚠️  ${verification.name} - ERROR: ${error.message}`);
      }
    }

    // Check indexes
    console.log('\n📊 Checking indexes...\n');
    const indexQuery = `
      SELECT
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE tablename IN ('file_registry', 'notifications', 'notification_preferences', 'backups', 'knowledge_base')
      ORDER BY tablename, indexname;
    `;

    try {
      const indexResult = await client.query(indexQuery);
      console.log(`Found ${indexResult.rows.length} indexes:\n`);

      const groupedByTable: { [key: string]: string[] } = {};
      indexResult.rows.forEach(row => {
        if (!groupedByTable[row.tablename]) {
          groupedByTable[row.tablename] = [];
        }
        groupedByTable[row.tablename].push(row.indexname);
      });

      Object.keys(groupedByTable).sort().forEach(table => {
        console.log(`  ${table}:`);
        groupedByTable[table].forEach(index => {
          console.log(`    - ${index}`);
        });
        console.log();
      });
    } catch (error: any) {
      console.log(`⚠️  Could not retrieve indexes: ${error.message}\n`);
    }

    // Check RLS policies
    console.log('🔒 Checking Row Level Security policies...\n');
    const rlsQuery = `
      SELECT
        schemaname,
        tablename,
        policyname,
        cmd
      FROM pg_policies
      WHERE tablename IN ('file_registry', 'notifications', 'notification_preferences', 'backups')
      ORDER BY tablename, policyname;
    `;

    try {
      const rlsResult = await client.query(rlsQuery);
      console.log(`Found ${rlsResult.rows.length} RLS policies:\n`);

      const groupedByTable: { [key: string]: Array<{name: string, cmd: string}> } = {};
      rlsResult.rows.forEach(row => {
        if (!groupedByTable[row.tablename]) {
          groupedByTable[row.tablename] = [];
        }
        groupedByTable[row.tablename].push({ name: row.policyname, cmd: row.cmd });
      });

      Object.keys(groupedByTable).sort().forEach(table => {
        console.log(`  ${table}:`);
        groupedByTable[table].forEach(policy => {
          console.log(`    - ${policy.name} (${policy.cmd})`);
        });
        console.log();
      });
    } catch (error: any) {
      console.log(`⚠️  Could not retrieve RLS policies: ${error.message}\n`);
    }

  } catch (error: any) {
    console.error('\n❌ Connection or execution error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed.');
  }

  return results;
}

async function main() {
  console.log('=' .repeat(80));
  console.log('🚀 KIMBLEAI V4 - CRITICAL MIGRATIONS RUNNER');
  console.log('=' .repeat(80));

  try {
    const results = await runMigrations();

    console.log('\n' + '=' .repeat(80));
    console.log('📊 MIGRATION SUMMARY');
    console.log('=' .repeat(80) + '\n');

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log(`\n📈 Total: ${results.length} migrations`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed === 0) {
      console.log('\n🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!');
      console.log('\n📚 Your database is now ready with:');
      console.log('   ✅ File Registry - Unified file management');
      console.log('   ✅ Vector Search - Semantic file relations');
      console.log('   ✅ Notifications - Real-time user alerts');
      console.log('   ✅ Backups System - Automated data backups');
      console.log('\n🔗 Next steps:');
      console.log('   1. Test file uploads and indexing');
      console.log('   2. Test semantic search functionality');
      console.log('   3. Test notification system');
      console.log('   4. Test backup creation\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  SOME MIGRATIONS FAILED');
      console.log('\n📝 You may need to:');
      console.log('   1. Check the error messages above');
      console.log('   2. Run manually via Supabase Dashboard SQL Editor');
      console.log('   3. Verify connection string and permissions\n');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.log('\n📝 Manual execution required:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/gbmefnaqsxtoseufjixp/sql');
    console.log('   2. Copy contents of: database/COMBINED-CRITICAL-MIGRATIONS.sql');
    console.log('   3. Paste and execute in SQL Editor\n');
    process.exit(1);
  }
}

main();
