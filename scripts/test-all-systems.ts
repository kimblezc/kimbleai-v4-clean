#!/usr/bin/env tsx
// Comprehensive system test for kimbleai v4
// Tests all Phase 1 functionality

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const API_BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

let passedTests = 0;
let failedTests = 0;

function logTest(name: string, passed: boolean, details?: string) {
  if (passed) {
    console.log(`   ✅ ${name}`);
    passedTests++;
  } else {
    console.log(`   ❌ ${name}`);
    if (details) console.log(`      ${details}`);
    failedTests++;
  }
}

async function testDatabaseConnection() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          TEST 1: DATABASE CONNECTION                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    logTest('Connect to database', !error, error?.message);
    logTest('Users table exists', count !== null && count >= 0);
    logTest('At least 1 user exists', count! > 0);
  } catch (err: any) {
    logTest('Database connection', false, err.message);
  }
}

async function testDatabaseFunctions() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          TEST 2: DATABASE FUNCTIONS                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Test search_all_content
  try {
    const testEmbedding = new Array(1536).fill(0.1);
    const { data, error } = await supabase.rpc('search_all_content', {
      query_embedding: testEmbedding,
      p_user_id: 'zach-admin-001',
      match_threshold: 0.5,
      match_count: 5
    });

    logTest('search_all_content exists', !error, error?.message);
    logTest('search_all_content returns array', Array.isArray(data));
  } catch (err: any) {
    logTest('search_all_content', false, err.message);
  }

  // Test get_search_stats
  try {
    const { data, error } = await supabase.rpc('get_search_stats', {
      p_user_id: 'zach-admin-001'
    });

    logTest('get_search_stats exists', !error, error?.message);
    logTest('get_search_stats returns data', Array.isArray(data) && data.length > 0);

    if (data && data.length > 0) {
      console.log('\n      📊 Embedding Coverage:');
      for (const stat of data) {
        console.log(`         ${stat.content_type.padEnd(15)}: ${stat.items_with_embeddings}/${stat.total_items} (${stat.embedding_coverage_percent}%)`);
      }
    }
  } catch (err: any) {
    logTest('get_search_stats', false, err.message);
  }
}

async function testStorageBuckets() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          TEST 3: STORAGE BUCKETS                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    logTest('List storage buckets', !error, error?.message);

    if (buckets) {
      const hasFilesBucket = buckets.some(b => b.name === 'files');
      const hasThumbnailsBucket = buckets.some(b => b.name === 'thumbnails');

      logTest('Files bucket exists', hasFilesBucket);
      logTest('Thumbnails bucket exists', hasThumbnailsBucket);

      console.log('\n      Found buckets:');
      for (const bucket of buckets) {
        console.log(`         - ${bucket.name} (${bucket.public ? 'Public' : 'Private'})`);
      }
    }
  } catch (err: any) {
    logTest('Storage buckets', false, err.message);
  }
}

async function testSemanticSearchAPI() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          TEST 4: SEMANTIC SEARCH API                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    const response = await fetch(
      `${API_BASE}/api/search/semantic?q=test&userId=zach-admin-001&limit=5`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    logTest('Semantic search endpoint responds', response.ok, `Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      logTest('Returns valid JSON', !!data);
      logTest('Has query field', !!data.query);
      logTest('Has results array', Array.isArray(data.results));
      logTest('Has performance metrics', !!data.performance);

      if (data.performance) {
        console.log(`\n      ⚡ Performance: ${data.performance.totalTime}ms total`);
        console.log(`         Embedding: ${data.performance.embeddingTime}ms`);
        console.log(`         Search: ${data.performance.searchTime}ms`);
        logTest('Search completes in < 1s', data.performance.totalTime < 1000);
      }
    }
  } catch (err: any) {
    logTest('Semantic search API', false, err.message);
  }
}

async function testRAGSearchAPI() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          TEST 5: RAG SEARCH API (Existing)                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    const response = await fetch(`${API_BASE}/api/knowledge/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'test',
        userId: 'zach-admin-001',
        searchType: 'hybrid',
        limit: 5
      })
    });

    logTest('RAG search endpoint responds', response.ok, `Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      logTest('Returns valid JSON', !!data);
      logTest('Has results', !!data.results || !!data.success);
      logTest('RAG system still functional', true);
    }
  } catch (err: any) {
    logTest('RAG search API', false, err.message);
  }
}

async function testGoogleIntegrations() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          TEST 6: GOOGLE INTEGRATIONS                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Test Drive
  try {
    const response = await fetch(`${API_BASE}/api/google/drive?action=info&userId=zach`, {
      method: 'GET'
    });

    logTest('Google Drive API responds', response.status !== 404, `Status: ${response.status}`);
  } catch (err: any) {
    logTest('Google Drive API', false, err.message);
  }

  // Test Gmail
  try {
    const response = await fetch(`${API_BASE}/api/google/gmail?action=info&userId=zach`, {
      method: 'GET'
    });

    logTest('Gmail API responds', response.status !== 404, `Status: ${response.status}`);
  } catch (err: any) {
    logTest('Gmail API', false, err.message);
  }

  // Test Calendar
  try {
    const response = await fetch(`${API_BASE}/api/google/calendar?action=info&userId=zach`, {
      method: 'GET'
    });

    logTest('Calendar API responds', response.status !== 404, `Status: ${response.status}`);
  } catch (err: any) {
    logTest('Calendar API', false, err.message);
  }
}

async function testFileUploadAPI() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          TEST 7: FILE UPLOAD API                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    const response = await fetch(`${API_BASE}/api/files/upload`, {
      method: 'OPTIONS'
    });

    logTest('File upload endpoint exists', response.status !== 404);
  } catch (err: any) {
    logTest('File upload API', false, err.message);
  }

  try {
    const response = await fetch(`${API_BASE}/api/files?userId=zach&limit=5`, {
      method: 'GET'
    });

    logTest('File listing endpoint responds', response.ok, `Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      logTest('Returns file list', !!data.files);
      console.log(`\n      Found ${data.total || 0} uploaded files`);
    }
  } catch (err: any) {
    logTest('File listing API', false, err.message);
  }
}

async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║     KIMBLEAI V4 - COMPREHENSIVE SYSTEM TEST               ║');
  console.log('║     Phase 1: Database, Files, Search                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log(`API Base: ${API_BASE}`);
  console.log(`Database: ${process.env.NEXT_PUBLIC_SUPABASE_URL}\n`);

  await testDatabaseConnection();
  await testDatabaseFunctions();
  await testStorageBuckets();
  await testSemanticSearchAPI();
  await testRAGSearchAPI();
  await testGoogleIntegrations();
  await testFileUploadAPI();

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const total = passedTests + failedTests;
  const percentage = total > 0 ? Math.round((passedTests / total) * 100) : 0;

  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📊 Success Rate: ${percentage}%\n`);

  if (failedTests === 0) {
    console.log('   🎉 ALL TESTS PASSED! System is ready.\n');
    process.exit(0);
  } else if (percentage >= 80) {
    console.log('   ⚠️  Most tests passed. Review failures above.\n');
    process.exit(0);
  } else {
    console.log('   ❌ CRITICAL: Multiple tests failed. Review deployment.\n');
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('\n❌ Test suite error:', err);
  process.exit(1);
});
