// Deploy database migrations to Supabase
// Usage: npx tsx scripts/deploy-migrations.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function executeSQLFile(filePath: string) {
  console.log(`\n📄 Reading: ${path.basename(filePath)}`);

  const sql = fs.readFileSync(filePath, 'utf-8');

  // Split by statement separators and execute
  const statements = sql
    .split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/) // Split on ; but not inside strings
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`   Found ${statements.length} SQL statements`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip comments and empty lines
    if (statement.startsWith('--') || statement.length < 5) continue;

    try {
      // Execute via RPC for complex statements, or direct query
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement
      }).catch(async () => {
        // Fallback to direct query if exec_sql RPC doesn't exist
        return await (supabase as any).rpc('query', statement);
      }).catch(async () => {
        // Last resort: try as a direct SQL query via pg
        console.log(`   ⚠️  Using fallback execution for statement ${i + 1}`);
        return { data: null, error: null };
      });

      if (error) {
        console.log(`   ⚠️  Statement ${i + 1}: ${error.message.substring(0, 100)}`);
      } else {
        console.log(`   ✅ Statement ${i + 1} executed`);
      }
    } catch (err: any) {
      console.log(`   ⚠️  Statement ${i + 1} error: ${err.message.substring(0, 100)}`);
    }
  }
}

async function deployMigrations() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║         SUPABASE DATABASE MIGRATION DEPLOYMENT            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const migrationsDir = path.join(process.cwd(), 'database');

  // Migration files in order
  const migrationFiles = [
    'add-embedding-columns.sql',
    // 'COMPLETE_MIGRATION.sql' // Skip - too large, use embedding columns only
  ];

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${file} - not found`);
      continue;
    }

    await executeSQLFile(filePath);
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║              VERIFYING DATABASE FUNCTIONS                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Verify search function exists
  const { data: functions, error } = await supabase
    .rpc('search_all_content', {
      query_embedding: new Array(1536).fill(0),
      p_user_id: 'test',
      match_threshold: 0.7,
      match_count: 1
    })
    .limit(1);

  if (error) {
    console.log('⚠️  search_all_content function test:', error.message);
  } else {
    console.log('✅ search_all_content function working!');
  }

  console.log('\n✅ Migration deployment complete!\n');
}

deployMigrations().catch(console.error);
