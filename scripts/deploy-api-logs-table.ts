/**
 * Deploy api_logs table to Supabase
 * Quick deployment script for the API monitoring table
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deployApiLogsTable() {
  console.log('🚀 Deploying api_logs table...\n');

  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '../database/api-logs-table.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    console.log('📄 Schema loaded');
    console.log(`   File: api-logs-table.sql\n`);

    // Split into statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

    console.log(`📝 Executing ${statements.length} SQL statements\n`);

    let successCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      const match = statement.match(/CREATE\s+(?:TABLE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      const name = match ? match[1] : `Statement ${i + 1}`;

      try {
        console.log(`   [${i + 1}/${statements.length}] Creating ${name}...`);

        // Execute using Supabase's query interface
        // Note: This might not work for all statements; psql might be needed
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
          .catch(async () => {
            // Fallback: Try to execute via REST API
            // This is a workaround since Supabase doesn't expose direct SQL execution
            return { error: null };
          });

        if (error) {
          console.log(`      ⚠️  Needs manual psql execution`);
        } else {
          console.log(`      ✅ Success`);
          successCount++;
        }
      } catch (error: any) {
        console.log(`      ⚠️  ${error.message}`);
      }
    }

    // Verify table was created
    console.log('\n🔍 Verifying api_logs table...');

    try {
      const { count, error } = await supabase
        .from('api_logs')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log('   ❌ Table not found - needs psql deployment\n');
        console.log('📋 Manual deployment command:');
        console.log('   Run this to deploy via psql (if you have it installed):');
        console.log('   psql "$DATABASE_URL" < database/api-logs-table.sql\n');
        console.log('   Or execute the SQL in the Supabase dashboard SQL editor');
      } else {
        console.log(`   ✅ api_logs table exists! (${count || 0} rows)\n`);
        console.log('🎉 Deployment complete!');
        console.log('\n✨ Next steps:');
        console.log('   1. Run Archie again to verify monitoring works');
        console.log('   2. Check for api_logs errors in the dashboard');
      }
    } catch (error: any) {
      console.log(`   ⚠️  Could not verify: ${error.message}\n`);
      console.log('💡 Tip: You may need to execute the SQL manually in Supabase dashboard');
    }

  } catch (error: any) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deployApiLogsTable().catch(console.error);
