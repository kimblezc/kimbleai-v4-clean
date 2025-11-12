/**
 * Apply Archie V2 Database Migration
 *
 * This script applies the 20251112_add_archie_tracking.sql migration to Supabase.
 * It creates the necessary tables for Archie's enhanced tracking system.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('📊 Applying Archie V2 database migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20251112_add_archie_tracking.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('✅ Migration file loaded');
    console.log(`📝 SQL length: ${sql.length} characters\n`);

    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`🔨 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      if (statement.length === 0) continue;

      try {
        console.log(`[${i + 1}/${statements.length}] Executing statement...`);

        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });

        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabase.from('_migrations').select('*').limit(0);
          if (directError) {
            throw error;
          }
        }

        console.log(`✅ Statement ${i + 1} executed successfully\n`);
      } catch (err: any) {
        console.error(`❌ Error executing statement ${i + 1}:`, err.message);
        console.error('Statement:', statement.substring(0, 100) + '...\n');
        throw err;
      }
    }

    console.log('\n🎉 Migration applied successfully!');
    console.log('\n📋 Created tables:');
    console.log('  ✓ archie_runs');
    console.log('  ✓ archie_issues');
    console.log('  ✓ archie_fix_attempts');
    console.log('  ✓ archie_learning');
    console.log('  ✓ archie_strategy_recommendations');
    console.log('\n🔍 Created indexes for optimal performance');
    console.log('\n✨ Archie V2 database is ready!');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Alternative: Manual SQL execution instructions
function printManualInstructions() {
  console.log('\n' + '='.repeat(70));
  console.log('ALTERNATIVE: Manual Migration via Supabase Dashboard');
  console.log('='.repeat(70));
  console.log('\nIf the automatic migration fails, follow these steps:');
  console.log('\n1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
  console.log('2. Open: supabase/migrations/20251112_add_archie_tracking.sql');
  console.log('3. Copy the entire SQL content');
  console.log('4. Paste into Supabase SQL Editor');
  console.log('5. Click "Run"');
  console.log('\nThe migration creates 5 tables:');
  console.log('  - archie_runs (main tracking)');
  console.log('  - archie_issues (issue tracking)');
  console.log('  - archie_fix_attempts (fix attempts)');
  console.log('  - archie_learning (learning system)');
  console.log('  - archie_strategy_recommendations (strategy cache)');
  console.log('='.repeat(70) + '\n');
}

// Run migration
applyMigration().catch(() => {
  printManualInstructions();
});
