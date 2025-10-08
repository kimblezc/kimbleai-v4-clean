// Test script to verify Device Continuity database setup
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabase() {
  console.log('=== DEVICE CONTINUITY DATABASE HEALTH CHECK ===\n');

  console.log('1. Testing Supabase connection...');
  console.log(`   URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`   Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'MISSING'}\n`);

  const tables = [
    'device_sessions',
    'context_snapshots',
    'sync_queue',
    'device_preferences',
    'user_tokens',
    'device_states'
  ];

  const results = {};

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        results[table] = { status: 'ERROR', message: error.message };
      } else {
        results[table] = { status: 'OK', count: count || 0 };
      }
    } catch (err) {
      results[table] = { status: 'ERROR', message: err.message };
    }
  }

  console.log('2. Table Status:\n');
  for (const [table, result] of Object.entries(results)) {
    const status = result.status === 'OK' ? '✅' : '❌';
    const info = result.status === 'OK'
      ? `${result.count} rows`
      : result.message;
    console.log(`   ${status} ${table.padEnd(20)} - ${info}`);
  }

  console.log('\n3. Testing database functions...');
  try {
    const { data, error } = await supabase.rpc('get_active_devices', { p_user_id: 'test' });
    if (error) {
      console.log('   ❌ get_active_devices - ERROR:', error.message);
    } else {
      console.log('   ✅ get_active_devices - OK');
    }
  } catch (err) {
    console.log('   ❌ get_active_devices - ERROR:', err.message);
  }

  try {
    const { data, error } = await supabase.rpc('get_latest_context', { p_user_id: 'test' });
    if (error) {
      console.log('   ❌ get_latest_context - ERROR:', error.message);
    } else {
      console.log('   ✅ get_latest_context - OK');
    }
  } catch (err) {
    console.log('   ❌ get_latest_context - ERROR:', err.message);
  }

  console.log('\n4. Checking storage buckets...');
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.log('   ❌ Storage API - ERROR:', error.message);
    } else {
      console.log('   ✅ Storage API - OK');
      console.log('   Buckets:', data.map(b => b.name).join(', ') || 'None');

      const hasThumbnails = data.some(b => b.name === 'thumbnails');
      if (!hasThumbnails) {
        console.log('   ⚠️  WARNING: "thumbnails" bucket not found');
      } else {
        console.log('   ✅ "thumbnails" bucket found');
      }
    }
  } catch (err) {
    console.log('   ❌ Storage API - ERROR:', err.message);
  }

  console.log('\n=== END HEALTH CHECK ===\n');
}

testDatabase().catch(console.error);
