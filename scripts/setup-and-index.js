// Setup database and trigger initial indexing
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupAndIndex() {
  console.log('🚀 Setting up auto-indexing system...\n');

  // Step 1: Create the table directly
  console.log('📊 Creating indexing_state table...');

  const { error: tableError } = await supabase.rpc('exec', {
    sql: `
      CREATE TABLE IF NOT EXISTS indexing_state (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('drive', 'gmail')),
        last_cursor TEXT,
        total_indexed INTEGER DEFAULT 0,
        last_indexed_at TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'error')),
        error_message TEXT,
        error_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, source)
      );
    `
  });

  if (tableError && !tableError.message?.includes('already exists')) {
    console.log('⚠️  Table creation via RPC failed, trying direct insert test...');

    // Try to insert a test row to see if table exists
    const { error: testError } = await supabase
      .from('indexing_state')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Table does not exist. Manual SQL required:');
      console.log('\nGo to Supabase Dashboard > SQL Editor and run:');
      console.log('database/indexing-state-schema.sql\n');
      return;
    } else {
      console.log('✅ Table already exists!');
    }
  } else {
    console.log('✅ Table created successfully!');
  }

  // Step 2: Trigger indexing via the API
  console.log('\n🔄 Triggering initial indexing...');

  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/index/cron`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Indexing failed:', result.error);
      console.log('\nTroubleshooting:');
      console.log('1. Check CRON_SECRET in .env.local');
      console.log('2. Ensure Google OAuth tokens exist in user_tokens table');
      console.log('3. Check logs: npx vercel logs');
      return;
    }

    console.log('✅ Indexing started successfully!');
    console.log('\nResults:');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n📈 Next steps:');
    console.log('1. Check progress: GET /api/index/trigger');
    console.log('2. Cron runs automatically every 6 hours');
    console.log('3. Monitor Vercel logs for progress');

  } catch (error) {
    console.error('❌ Error triggering indexing:', error.message);
    console.log('\nManual trigger:');
    console.log(`curl -X POST ${process.env.NEXTAUTH_URL}/api/index/cron \\`);
    console.log(`  -H "Authorization: Bearer ${process.env.CRON_SECRET}"`);
  }
}

setupAndIndex();
