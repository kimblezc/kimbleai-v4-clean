// Verify database setup and functions
// Usage: npx tsx scripts/verify-database.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyDatabase() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║            DATABASE VERIFICATION REPORT                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // 1. Check core tables
  console.log('📋 CHECKING CORE TABLES...\n');

  const tables = [
    'users',
    'projects',
    'conversations',
    'messages',
    'audio_transcriptions',
    'knowledge_base',
    'uploaded_files',
    'indexed_files',
    'user_tokens'
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`   ❌ ${table.padEnd(25)} - ERROR: ${error.message}`);
      } else {
        console.log(`   ✅ ${table.padEnd(25)} - ${count} rows`);
      }
    } catch (err: any) {
      console.log(`   ❌ ${table.padEnd(25)} - ERROR: ${err.message}`);
    }
  }

  // 2. Check for vector search functions
  console.log('\n🔍 CHECKING VECTOR SEARCH FUNCTIONS...\n');

  // Test search_all_content
  try {
    const testEmbedding = new Array(1536).fill(0.1);
    const { data, error } = await supabase.rpc('search_all_content', {
      query_embedding: testEmbedding,
      p_user_id: 'zach-admin-001',
      match_threshold: 0.7,
      match_count: 5,
      p_project_id: null,
      p_content_types: null
    });

    if (error) {
      console.log(`   ❌ search_all_content - ERROR: ${error.message}`);
      console.log('      → Need to run: database/add-embedding-columns.sql');
    } else {
      console.log(`   ✅ search_all_content - Working! (${data?.length || 0} results)`);
    }
  } catch (err: any) {
    console.log(`   ❌ search_all_content - ERROR: ${err.message}`);
    console.log('      → Need to run: database/add-embedding-columns.sql');
  }

  // Test get_search_stats
  try {
    const { data, error } = await supabase.rpc('get_search_stats', {
      p_user_id: 'zach-admin-001'
    });

    if (error) {
      console.log(`   ❌ get_search_stats - ERROR: ${error.message}`);
    } else {
      console.log(`   ✅ get_search_stats - Working!`);
      if (data && data.length > 0) {
        console.log('\n      📊 Embedding Coverage:');
        for (const stat of data) {
          console.log(`         ${stat.content_type.padEnd(15)}: ${stat.items_with_embeddings}/${stat.total_items} (${stat.embedding_coverage_percent}%)`);
        }
      }
    }
  } catch (err: any) {
    console.log(`   ❌ get_search_stats - ERROR: ${err.message}`);
  }

  // 3. Check storage buckets
  console.log('\n📦 CHECKING STORAGE BUCKETS...\n');

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.log(`   ❌ Storage error: ${error.message}`);
    } else if (buckets && buckets.length > 0) {
      for (const bucket of buckets) {
        console.log(`   ✅ ${bucket.name.padEnd(20)} - ${bucket.public ? 'Public' : 'Private'}`);
      }
    } else {
      console.log('   ⚠️  No storage buckets found');
      console.log('      → Need to create: files, thumbnails');
    }
  } catch (err: any) {
    console.log(`   ❌ Storage error: ${err.message}`);
  }

  // 4. Check users
  console.log('\n👥 CHECKING USERS...\n');

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .order('created_at', { ascending: true });

    if (error) {
      console.log(`   ❌ Users error: ${error.message}`);
    } else if (users && users.length > 0) {
      for (const user of users) {
        console.log(`   ✅ ${user.name?.padEnd(15)} - ${user.email} (${user.role})`);
      }
    } else {
      console.log('   ⚠️  No users found');
    }
  } catch (err: any) {
    console.log(`   ❌ Users error: ${err.message}`);
  }

  // 5. Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                  VERIFICATION SUMMARY                     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('Next steps:');
  console.log('1. If functions missing → Run SQL in Supabase Dashboard');
  console.log('2. If buckets missing → Create in Supabase Storage UI');
  console.log('3. Test endpoints with: npm run test:integration\n');
}

verifyDatabase().catch(console.error);
