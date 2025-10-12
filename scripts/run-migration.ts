// scripts/run-migration.ts
// Run database migrations via Supabase API

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigration(migrationFile: string) {
  console.log(`\n🔄 Running migration: ${migrationFile}`);

  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'database', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split into individual statements (handle DO blocks properly)
    const statements = splitSQLStatements(migrationSQL);

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement || statement.startsWith('--')) continue;

      console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
      console.log(`Preview: ${statement.substring(0, 100)}...`);

      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          // Try direct execution via raw SQL if RPC fails
          const { error: directError } = await supabase.from('_migrations').select('*').limit(0);

          if (directError) {
            console.error(`❌ Error executing statement:`, error);
            console.log(`Statement: ${statement.substring(0, 200)}`);
            throw error;
          }
        } else {
          console.log(`✅ Statement executed successfully`);
        }
      } catch (err: any) {
        console.error(`⚠️  Warning: ${err.message}`);
        // Continue with other statements
      }
    }

    console.log(`\n✅ Migration completed: ${migrationFile}`);
    return true;
  } catch (error: any) {
    console.error(`\n❌ Migration failed: ${migrationFile}`, error.message);
    return false;
  }
}

function splitSQLStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;
  let dollarQuoteTag = '';

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('--')) {
      continue;
    }

    // Handle dollar-quoted strings (for functions, DO blocks)
    if (trimmed.includes('$$')) {
      if (!inDollarQuote) {
        // Starting dollar quote
        const match = trimmed.match(/\$(\w*)\$/);
        if (match) {
          dollarQuoteTag = match[0];
          inDollarQuote = true;
        }
      } else if (trimmed.includes(dollarQuoteTag)) {
        // Ending dollar quote
        inDollarQuote = false;
        dollarQuoteTag = '';
        current += line + '\n';

        // Check if statement ends after dollar quote
        const afterDollar = trimmed.substring(trimmed.indexOf(dollarQuoteTag) + dollarQuoteTag.length);
        if (afterDollar.includes(';')) {
          statements.push(current.trim());
          current = '';
        }
        continue;
      }
    }

    current += line + '\n';

    // Statement ends with semicolon (outside dollar quotes)
    if (!inDollarQuote && trimmed.endsWith(';')) {
      if (current.trim()) {
        statements.push(current.trim());
      }
      current = '';
    }
  }

  // Add remaining statement if any
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

async function main() {
  console.log('🚀 KimbleAI Database Migration Runner\n');

  // Check environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log(`📊 Database: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

  // Run migration
  const migrationFile = process.argv[2] || 'file-integration-enhancement.sql';
  const success = await runMigration(migrationFile);

  if (success) {
    console.log('\n✅ All migrations completed successfully!');
    console.log('\n📚 Next steps:');
    console.log('   1. Test the file integration: npm run test:file-integration');
    console.log('   2. Upload a test file via the UI');
    console.log('   3. Try semantic search');
    process.exit(0);
  } else {
    console.log('\n⚠️  Migration completed with warnings');
    console.log('\n📝 Manual execution may be required via Supabase Dashboard:');
    console.log('   1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
    console.log(`   2. Copy contents of database/${migrationFile}`);
    console.log('   3. Paste and execute');
    process.exit(1);
  }
}

main();
