// Audit current Supabase database schema
// Connects to Supabase and lists all existing tables and their structures

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function auditDatabase() {
  console.log('🔍 Auditing Supabase Database Schema...\n');
  console.log('Database URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('');

  try {
    // Get all tables in public schema
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_tables_info');

    if (tablesError) {
      // Fallback: try direct SQL query
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');

      if (error) {
        console.log('⚠️ Cannot query information_schema directly. Using direct table checks...\n');
        await checkTables();
        return;
      }

      console.log('📊 Tables found:', data?.length || 0);
      data?.forEach(t => console.log(`  - ${t.table_name}`));
    }

    console.log('\n✅ Audit complete!');

  } catch (error) {
    console.error('❌ Audit error:', error.message);
    console.log('\n📝 Attempting direct table checks...\n');
    await checkTables();
  }
}

async function checkTables() {
  const tablesToCheck = [
    'users',
    'user_tokens',
    'projects',
    'conversations',
    'messages',
    'knowledge_base',
    'audio_transcriptions',
    'api_cost_tracking',
    'budget_alerts',
    'budget_config',
    'content_categories',
    'zapier_webhook_logs',
    'files',
    'activity_logs',
    'auth_logs'
  ];

  console.log('Checking existence of expected tables:\n');

  for (const table of tablesToCheck) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table}: NOT FOUND (${error.message})`);
      } else {
        console.log(`✅ ${table}: EXISTS (${count || 0} rows)`);
      }
    } catch (e) {
      console.log(`❌ ${table}: ERROR (${e.message})`);
    }
  }

  console.log('\n📊 Checking pgvector extension...');
  try {
    const { data, error } = await supabase
      .rpc('execute_sql', { sql: "SELECT extname FROM pg_extension WHERE extname = 'vector';" });

    if (data) {
      console.log('✅ pgvector extension is installed');
    } else {
      console.log('❌ pgvector extension NOT installed');
    }
  } catch (e) {
    console.log('⚠️ Cannot check pgvector extension (need to check via SQL Editor)');
  }
}

// Run audit
auditDatabase().catch(console.error);
