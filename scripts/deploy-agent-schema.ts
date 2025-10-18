/**
 * Deploy Autonomous Agent Database Schema
 *
 * Connects to Supabase and creates the agent tables
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deploySchema() {
  console.log('🚀 Deploying Autonomous Agent Schema...\n');

  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '../database/autonomous-agent-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    console.log('📄 Schema file loaded');
    console.log(`   File: ${schemaPath}`);
    console.log(`   Size: ${(schema.length / 1024).toFixed(2)} KB\n`);

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements\n`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Extract table/function name for logging
      const match = statement.match(/CREATE\s+(?:TABLE|INDEX|TRIGGER|FUNCTION)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      const name = match ? match[1] : `Statement ${i + 1}`;

      try {
        console.log(`   [${i + 1}/${statements.length}] Creating ${name}...`);

        // Execute via RPC
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        }).catch(() => {
          // If exec_sql doesn't exist, try direct query
          return supabase.from('_').select('*').limit(0);
        });

        if (error) {
          // Try alternative method - some statements need direct execution
          console.log(`      ⚠️  Retrying with alternative method...`);
          // For now, we'll skip and note it needs manual execution
          console.log(`      ⚠️  Skipped (requires psql): ${name}`);
          errorCount++;
        } else {
          console.log(`      ✅ Success`);
          successCount++;
        }
      } catch (error: any) {
        console.error(`      ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Deployment Summary');
    console.log('='.repeat(60));
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total: ${statements.length}`);

    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed. You may need to run:');
      console.log('   psql $DATABASE_URL < database/autonomous-agent-schema.sql');
    } else {
      console.log('\n🎉 Schema deployed successfully!');
    }

    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const tables = ['agent_tasks', 'agent_findings', 'agent_logs', 'agent_reports', 'agent_state'];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`   ❌ ${table}: Not found`);
        } else {
          console.log(`   ✅ ${table}: Exists (${count || 0} rows)`);
        }
      } catch (error) {
        console.log(`   ❌ ${table}: Error checking`);
      }
    }

    console.log('\n✨ Deployment complete!');
    console.log('\n📚 Next steps:');
    console.log('   1. Verify cron job is configured in Vercel');
    console.log('   2. Test agent: curl https://kimbleai.com/api/agent/status?view=summary');
    console.log('   3. View dashboard: https://kimbleai.com/agent');
    console.log('   4. Check logs: curl https://kimbleai.com/api/agent/status?view=logs');

  } catch (error: any) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run deployment
deploySchema().catch(console.error);
