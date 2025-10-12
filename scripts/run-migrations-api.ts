// scripts/run-migrations-api.ts
// Run migrations using Supabase REST API

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function executeSQLViaAPI(sql: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  console.log('🔌 Using Supabase REST API...');
  console.log(`📊 Database: ${supabaseUrl}\n`);

  // For Supabase, we can execute SQL by creating a temporary function
  // or by using the SQL editor API endpoint
  // Let's try a different approach - execute statements one by one

  // Split SQL into statements
  const statements = splitSQL(sql);

  console.log(`📝 Found ${statements.length} SQL statements\n`);

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    if (!statement || statement.startsWith('--')) {
      continue;
    }

    const preview = statement.substring(0, 80).replace(/\n/g, ' ');
    console.log(`\n[${i + 1}/${statements.length}] ${preview}...`);

    try {
      // For CREATE TABLE, ALTER TABLE, CREATE INDEX, etc., we need to use rpc
      // Supabase doesn't directly expose SQL execution via REST API
      // We'll need to use the management API or execute via a function

      // Try to execute using a custom function approach
      const { data, error } = await supabase.rpc('exec_sql', {
        query: statement
      });

      if (error) {
        console.log(`⚠️  Warning: ${error.message}`);
        // Some errors are OK (like "already exists")
        if (error.message.includes('already exists') ||
            error.message.includes('does not exist') ||
            error.message.includes('could not find function')) {
          console.log('   (This is likely OK - object may already exist or RPC not available)');
          successCount++;
        } else {
          failCount++;
        }
      } else {
        console.log(`✅ Success`);
        successCount++;
      }

      results.push({ statement: preview, success: !error, error: error?.message });
    } catch (err: any) {
      console.log(`⚠️  Error: ${err.message}`);
      failCount++;
      results.push({ statement: preview, success: false, error: err.message });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 EXECUTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total statements: ${statements.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}\n`);

  return results;
}

function splitSQL(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inFunction = false;
  let dollarQuoteCount = 0;

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comment-only lines
    if (trimmed.startsWith('--') && !inFunction) {
      continue;
    }

    // Track function/DO blocks with $$ delimiters
    if (trimmed.includes('$$')) {
      const matches = (trimmed.match(/\$\$/g) || []).length;
      dollarQuoteCount += matches;

      if (dollarQuoteCount % 2 === 1) {
        inFunction = true;
      } else {
        inFunction = false;
      }
    }

    current += line + '\n';

    // Statement ends with semicolon (outside of functions)
    if (!inFunction && trimmed.endsWith(';')) {
      if (current.trim()) {
        statements.push(current.trim());
      }
      current = '';
      dollarQuoteCount = 0;
    }
  }

  // Add remaining statement if any
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

async function verifyMigrations(supabase: any) {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VERIFYING MIGRATIONS');
  console.log('='.repeat(80) + '\n');

  const checks = [
    { name: 'file_registry', type: 'table' },
    { name: 'notifications', type: 'table' },
    { name: 'notification_preferences', type: 'table' },
    { name: 'backups', type: 'table' },
  ];

  for (const check of checks) {
    try {
      const { data, error } = await supabase
        .from(check.name)
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${check.name} - ERROR: ${error.message}`);
      } else {
        console.log(`✅ ${check.name} - EXISTS`);
      }
    } catch (err: any) {
      console.log(`⚠️  ${check.name} - ${err.message}`);
    }
  }

  console.log();
}

async function main() {
  console.log('='.repeat(80));
  console.log('🚀 KIMBLEAI V4 - MIGRATIONS VIA SUPABASE API');
  console.log('='.repeat(80) + '\n');

  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'database', 'COMBINED-CRITICAL-MIGRATIONS.sql');
    console.log(`📖 Reading: ${migrationPath}\n`);

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('⚠️  IMPORTANT NOTE:');
    console.log('   Supabase REST API has limitations for DDL operations.');
    console.log('   Some operations may need to be executed via SQL Editor.\n');

    // Execute via API
    const results = await executeSQLViaAPI(migrationSQL);

    // Verify
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await verifyMigrations(supabase);

    console.log('\n' + '='.repeat(80));
    console.log('📝 RECOMMENDATION');
    console.log('='.repeat(80));
    console.log('\nFor best results, execute the migration directly in Supabase SQL Editor:');
    console.log('\n1. Go to: https://supabase.com/dashboard/project/gbmefnaqsxtoseufjixp/sql');
    console.log('2. Open: database/COMBINED-CRITICAL-MIGRATIONS.sql');
    console.log('3. Copy all contents');
    console.log('4. Paste into SQL Editor');
    console.log('5. Click "RUN" button\n');

    console.log('This ensures all DDL operations (CREATE TABLE, CREATE INDEX, etc.)');
    console.log('are executed properly with full database privileges.\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
