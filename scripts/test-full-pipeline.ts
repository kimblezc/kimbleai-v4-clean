/**
 * Full Pipeline Test Script
 *
 * Tests the complete flow:
 * 1. PDF upload and content extraction
 * 2. Gmail attachment indexing
 * 3. Unified search across all sources
 *
 * Usage: npx tsx scripts/test-full-pipeline.ts
 */

import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const USER_ID = 'zach';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(test: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any) {
  results.push({ test, status, message, details });
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${emoji} ${test}: ${message}`);
  if (details) {
    console.log('   Details:', JSON.stringify(details, null, 2).substring(0, 200));
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test 1: PDF Upload and Extraction
 */
async function testPDFUpload() {
  console.log('\n📄 TEST 1: PDF Upload and Content Extraction\n');

  try {
    // Check if we have a test PDF
    const testPDFPath = path.join(process.cwd(), 'test-files', 'sample.pdf');

    if (!fs.existsSync(testPDFPath)) {
      logTest('PDF Upload', 'SKIP', 'No test PDF found at test-files/sample.pdf');
      console.log('   💡 Create a test-files/sample.pdf to test PDF upload');
      return;
    }

    // Read the PDF file
    const pdfBuffer = fs.readFileSync(testPDFPath);
    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('file', blob, 'sample.pdf');
    formData.append('userId', USER_ID);
    formData.append('category', 'test-document');

    // Upload the PDF
    const uploadResponse = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData
    });

    const uploadResult = await uploadResponse.json();

    if (uploadResponse.ok && uploadResult.success) {
      logTest(
        'PDF Upload',
        'PASS',
        `PDF uploaded successfully. Extracted ${uploadResult.contentExtracted} characters`,
        { filename: uploadResult.filename, preview: uploadResult.preview }
      );
    } else {
      logTest('PDF Upload', 'FAIL', uploadResult.error || 'Upload failed', uploadResult);
    }

  } catch (error: any) {
    logTest('PDF Upload', 'FAIL', error.message);
  }
}

/**
 * Test 2: Gmail Attachment Indexing
 */
async function testGmailAttachmentIndexing() {
  console.log('\n📧 TEST 2: Gmail Attachment Indexing\n');

  try {
    // Trigger the attachment indexing cron job manually
    const indexResponse = await fetch(
      `${BASE_URL}/api/cron/index-attachments?userId=${USER_ID}&maxMessages=5&daysBack=30`,
      { method: 'GET' }
    );

    const indexResult = await indexResponse.json();

    if (indexResponse.ok && indexResult.success) {
      logTest(
        'Gmail Attachment Indexing',
        'PASS',
        `Indexed ${indexResult.attachmentsProcessed} attachments from ${indexResult.messagesChecked} messages`,
        {
          attachmentsFound: indexResult.attachmentsFound,
          attachmentsProcessed: indexResult.attachmentsProcessed,
          errors: indexResult.errors
        }
      );
    } else if (indexResponse.status === 401) {
      logTest('Gmail Attachment Indexing', 'SKIP', 'User not authenticated with Google');
    } else {
      logTest('Gmail Attachment Indexing', 'FAIL', indexResult.error || 'Indexing failed', indexResult);
    }

  } catch (error: any) {
    logTest('Gmail Attachment Indexing', 'FAIL', error.message);
  }
}

/**
 * Test 3: Unified Search - Gmail
 */
async function testUnifiedSearchGmail() {
  console.log('\n🔍 TEST 3: Unified Search - Gmail\n');

  try {
    const searchQuery = 'meeting';
    const searchResponse = await fetch(
      `${BASE_URL}/api/search/unified?q=${encodeURIComponent(searchQuery)}&userId=${USER_ID}&sources=gmail&limit=5`,
      { method: 'GET' }
    );

    const searchResult = await searchResponse.json();

    if (searchResponse.ok && searchResult.success) {
      logTest(
        'Unified Search - Gmail',
        'PASS',
        `Found ${searchResult.totalResults} Gmail results for "${searchQuery}"`,
        {
          breakdown: searchResult.breakdown,
          firstResult: searchResult.results[0]?.title
        }
      );
    } else {
      logTest('Unified Search - Gmail', 'FAIL', searchResult.error || 'Search failed', searchResult);
    }

  } catch (error: any) {
    logTest('Unified Search - Gmail', 'FAIL', error.message);
  }
}

/**
 * Test 4: Unified Search - Drive
 */
async function testUnifiedSearchDrive() {
  console.log('\n🔍 TEST 4: Unified Search - Drive\n');

  try {
    const searchQuery = 'document';
    const searchResponse = await fetch(
      `${BASE_URL}/api/search/unified?q=${encodeURIComponent(searchQuery)}&userId=${USER_ID}&sources=drive&limit=5`,
      { method: 'GET' }
    );

    const searchResult = await searchResponse.json();

    if (searchResponse.ok && searchResult.success) {
      logTest(
        'Unified Search - Drive',
        'PASS',
        `Found ${searchResult.totalResults} Drive results for "${searchQuery}"`,
        {
          breakdown: searchResult.breakdown,
          firstResult: searchResult.results[0]?.title
        }
      );
    } else {
      logTest('Unified Search - Drive', 'FAIL', searchResult.error || 'Search failed', searchResult);
    }

  } catch (error: any) {
    logTest('Unified Search - Drive', 'FAIL', error.message);
  }
}

/**
 * Test 5: Unified Search - Local Files
 */
async function testUnifiedSearchLocal() {
  console.log('\n🔍 TEST 5: Unified Search - Local Files\n');

  try {
    const searchQuery = 'test';
    const searchResponse = await fetch(
      `${BASE_URL}/api/search/unified?q=${encodeURIComponent(searchQuery)}&userId=${USER_ID}&sources=local&limit=5`,
      { method: 'GET' }
    );

    const searchResult = await searchResponse.json();

    if (searchResponse.ok && searchResult.success) {
      logTest(
        'Unified Search - Local',
        'PASS',
        `Found ${searchResult.totalResults} local file results for "${searchQuery}"`,
        {
          breakdown: searchResult.breakdown,
          firstResult: searchResult.results[0]?.title
        }
      );
    } else {
      logTest('Unified Search - Local', 'FAIL', searchResult.error || 'Search failed', searchResult);
    }

  } catch (error: any) {
    logTest('Unified Search - Local', 'FAIL', error.message);
  }
}

/**
 * Test 6: Unified Search - Knowledge Base
 */
async function testUnifiedSearchKnowledgeBase() {
  console.log('\n🔍 TEST 6: Unified Search - Knowledge Base\n');

  try {
    const searchQuery = 'file';
    const searchResponse = await fetch(
      `${BASE_URL}/api/search/unified?q=${encodeURIComponent(searchQuery)}&userId=${USER_ID}&sources=kb&limit=5`,
      { method: 'GET' }
    );

    const searchResult = await searchResponse.json();

    if (searchResponse.ok && searchResult.success) {
      logTest(
        'Unified Search - Knowledge Base',
        'PASS',
        `Found ${searchResult.totalResults} knowledge base results for "${searchQuery}"`,
        {
          breakdown: searchResult.breakdown,
          firstResult: searchResult.results[0]?.title
        }
      );
    } else {
      logTest('Unified Search - KB', 'FAIL', searchResult.error || 'Search failed', searchResult);
    }

  } catch (error: any) {
    logTest('Unified Search - KB', 'FAIL', error.message);
  }
}

/**
 * Test 7: Unified Search - All Sources
 */
async function testUnifiedSearchAll() {
  console.log('\n🔍 TEST 7: Unified Search - All Sources\n');

  try {
    const searchQuery = 'project';
    const searchResponse = await fetch(
      `${BASE_URL}/api/search/unified?q=${encodeURIComponent(searchQuery)}&userId=${USER_ID}&sources=gmail,drive,local,kb&limit=5`,
      { method: 'GET' }
    );

    const searchResult = await searchResponse.json();

    if (searchResponse.ok && searchResult.success) {
      logTest(
        'Unified Search - All Sources',
        'PASS',
        `Found ${searchResult.totalResults} total results across all sources for "${searchQuery}"`,
        {
          breakdown: searchResult.breakdown,
          sources: searchResult.sources
        }
      );
    } else {
      logTest('Unified Search - All', 'FAIL', searchResult.error || 'Search failed', searchResult);
    }

  } catch (error: any) {
    logTest('Unified Search - All', 'FAIL', error.message);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  FULL PIPELINE TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  User ID: ${USER_ID}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  await testPDFUpload();
  await sleep(1000);

  await testGmailAttachmentIndexing();
  await sleep(1000);

  await testUnifiedSearchGmail();
  await sleep(500);

  await testUnifiedSearchDrive();
  await sleep(500);

  await testUnifiedSearchLocal();
  await sleep(500);

  await testUnifiedSearchKnowledgeBase();
  await sleep(500);

  await testUnifiedSearchAll();

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  console.log(`  Total Tests: ${total}`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log('');

  if (failed === 0 && passed > 0) {
    console.log('  🎉 All tests passed!');
  } else if (failed > 0) {
    console.log('  ⚠️  Some tests failed. Check details above.');
  } else {
    console.log('  ℹ️  No tests were run successfully.');
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
