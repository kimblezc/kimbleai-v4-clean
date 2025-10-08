require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('🔍 Testing Supabase Database Tables\n');
  console.log('Database:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('');

  const tablesToTest = [
    'knowledge_base',
    'audio_transcriptions',
    'user_tokens',
    'api_cost_tracking',
    'projects',
    'device_sessions',
    'zapier_webhook_logs',
    'workflow_automations',
    'knowledge_graph_entities',
    'security_events',
    'users',
    'categories',
    'files'
  ];

  const results = {
    exists: [],
    missing: [],
    error: []
  };

  for (const table of tablesToTest) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.message.includes('does not exist')) {
          results.missing.push(table);
          console.log(`❌ ${table}: Does not exist`);
        } else {
          results.error.push({ table, error: error.message });
          console.log(`⚠️  ${table}: ${error.message}`);
        }
      } else {
        results.exists.push({ table, count });
        console.log(`✅ ${table}: ${count || 0} rows`);
      }
    } catch (e) {
      results.error.push({ table, error: e.message });
      console.log(`⚠️  ${table}: ${e.message}`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Existing tables: ${results.exists.length}`);
  console.log(`❌ Missing tables: ${results.missing.length}`);
  console.log(`⚠️  Errors: ${results.error.length}`);

  if (results.exists.length > 0) {
    console.log('\n✅ Existing Tables:');
    results.exists.forEach(r => console.log(`   - ${r.table} (${r.count} rows)`));
  }

  if (results.missing.length > 0) {
    console.log('\n❌ Missing Tables:');
    results.missing.forEach(t => console.log(`   - ${t}`));
  }
})();
