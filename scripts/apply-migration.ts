/**
 * Apply database migration to production
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigration() {
  console.log('=== Applying Database Migration ===\n');

  const migrationPath = join(process.cwd(), 'database', 'UPGRADE_PROJECTS_SCHEMA.sql');
  console.log('Reading migration file:', migrationPath);

  const sql = readFileSync(migrationPath, 'utf8');

  console.log('Migration SQL length:', sql.length, 'characters');
  console.log('\nThis will apply the following changes:');
  console.log('1. Add status, priority, owner_id, collaborators, tags, metadata, stats to projects');
  console.log('2. Add role, permissions, metadata to users');
  console.log('3. Create project_tasks and project_collaborators tables');
  console.log('4. Add indexes for performance');
  console.log('5. Update user "zach" to admin with full permissions');

  console.log('\n⚠️  WARNING: This will modify your production database!');
  console.log('Please review the SQL file before proceeding.\n');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.substring(0, 80).replace(/\n/g, ' ');

    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });

      if (error) {
        // Try direct SQL execution as fallback
        console.log('   Trying alternative execution method...');
        const { error: error2 } = await (supabase as any).from('_').select('*').sql(statement);

        if (error2) {
          console.error('   ❌ Error:', error.message || error2.message);
          errorCount++;
        } else {
          console.log('   ✅ Success (alternative method)');
          successCount++;
        }
      } else {
        console.log('   ✅ Success');
        successCount++;
      }
    } catch (e: any) {
      console.error('   ❌ Exception:', e.message);
      errorCount++;
    }
  }

  console.log(`\n=== Migration Summary ===`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`Total: ${statements.length}`);

  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. You may need to run them manually in Supabase SQL Editor.');
    console.log('Copy the SQL from: database/UPGRADE_PROJECTS_SCHEMA.sql');
  }

  // Verify the changes
  console.log('\n=== Verifying Changes ===');

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .limit(1);

  if (projects && projects[0]) {
    console.log('\n✅ Projects table structure:');
    console.log('Columns:', Object.keys(projects[0]).join(', '));
  }

  const { data: users } = await supabase
    .from('users')
    .select('id, name, role, permissions')
    .eq('id', 'zach')
    .single();

  if (users) {
    console.log('\n✅ User "zach" permissions:');
    console.log('Role:', users.role);
    console.log('Permissions:', JSON.stringify(users.permissions, null, 2));
  }

  console.log('\n=== Migration Complete ===');
}

applyMigration().catch(console.error);
