/**
 * Test Script for Semantic Search System
 * Tests all API endpoints and database integration
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const TEST_USER_ID = 'test-user';

console.log('🔍 Testing Semantic Search System');
console.log('================================');

async function runTests() {
  try {
    // Test 1: Check API health
    console.log('\n1. Testing API Health...');
    await testAPIHealth();

    // Test 2: Test file upload
    console.log('\n2. Testing File Upload...');
    await testFileUpload();

    // Test 3: Test semantic search
    console.log('\n3. Testing Semantic Search...');
    await testSemanticSearch();

    // Test 4: Test search modes
    console.log('\n4. Testing Different Search Modes...');
    await testSearchModes();

    // Test 5: Test search statistics
    console.log('\n5. Testing Search Statistics...');
    await testSearchStats();

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

async function testAPIHealth() {
  // Test semantic search API health
  const searchResponse = await fetch(`${BASE_URL}/api/search/semantic`);
  const searchData = await searchResponse.json();

  if (searchData.service === 'Semantic Search API') {
    console.log('✅ Semantic Search API is operational');
  } else {
    throw new Error('Semantic Search API health check failed');
  }

  // Test file upload API health
  const uploadResponse = await fetch(`${BASE_URL}/api/files/upload`);
  const uploadData = await uploadResponse.json();

  if (uploadData.service === 'File Upload System for Semantic Search') {
    console.log('✅ File Upload API is operational');
  } else {
    throw new Error('File Upload API health check failed');
  }
}

async function testFileUpload() {
  // Create a test text file
  const testContent = `
    This is a test document for the semantic search system.
    It contains sample content about artificial intelligence and machine learning.
    The system should be able to process this text and generate embeddings.
    Topics covered include natural language processing, computer vision, and deep learning.
  `;

  const formData = new FormData();
  const blob = new Blob([testContent], { type: 'text/plain' });
  formData.append('file', blob, 'test-document.txt');
  formData.append('userId', TEST_USER_ID);
  formData.append('title', 'Test Document for Semantic Search');
  formData.append('tags', 'test,ai,machine-learning');
  formData.append('generateEmbeddings', 'true');

  const response = await fetch(`${BASE_URL}/api/files/upload`, {
    method: 'POST',
    body: formData
  });

  const result = await response.json();

  if (result.success) {
    console.log('✅ File upload successful');
    console.log(`   - Document ID: ${result.result.id}`);
    console.log(`   - Content Type: ${result.result.contentType}`);
    console.log(`   - Chunks Created: ${result.result.chunks}`);
    console.log(`   - Processing Time: ${result.result.processingTime}ms`);
    return result.result.id;
  } else {
    throw new Error(`File upload failed: ${result.error}`);
  }
}

async function testSemanticSearch() {
  const searchQueries = [
    'artificial intelligence',
    'machine learning algorithms',
    'natural language processing',
    'computer vision applications'
  ];

  for (const query of searchQueries) {
    const response = await fetch(`${BASE_URL}/api/search/semantic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        userId: TEST_USER_ID,
        limit: 5,
        threshold: 0.5,
        searchMode: 'semantic'
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Search for "${query}" successful`);
      console.log(`   - Results found: ${result.results.length}`);
      console.log(`   - Search time: ${result.stats.searchTime}ms`);

      if (result.results.length > 0) {
        const topResult = result.results[0];
        console.log(`   - Top result similarity: ${topResult.similarity.toFixed(3)}`);
      }
    } else {
      throw new Error(`Search failed for "${query}": ${result.error}`);
    }
  }
}

async function testSearchModes() {
  const query = 'artificial intelligence and machine learning';
  const modes = ['semantic', 'hybrid', 'keyword'];

  for (const mode of modes) {
    const response = await fetch(`${BASE_URL}/api/search/semantic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        userId: TEST_USER_ID,
        limit: 3,
        searchMode: mode
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ ${mode} search mode working`);
      console.log(`   - Results: ${result.results.length}`);
      console.log(`   - Method: ${result.stats.searchMethod}`);
    } else {
      throw new Error(`${mode} search mode failed: ${result.error}`);
    }
  }
}

async function testSearchStats() {
  // Test semantic search stats
  const searchStatsResponse = await fetch(`${BASE_URL}/api/search/semantic?action=stats`);
  const searchStats = await searchStatsResponse.json();

  if (searchStats.success) {
    console.log('✅ Search statistics retrieved');
    console.log(`   - Total documents: ${searchStats.stats.totalDocuments}`);
    console.log(`   - Total chunks: ${searchStats.stats.totalChunks}`);
    console.log(`   - Index health: ${searchStats.stats.indexHealth}`);
  } else {
    throw new Error(`Search stats failed: ${searchStats.error}`);
  }

  // Test upload stats
  const uploadStatsResponse = await fetch(`${BASE_URL}/api/files/upload?action=stats`);
  const uploadStats = await uploadStatsResponse.json();

  if (uploadStats.success) {
    console.log('✅ Upload statistics retrieved');
    console.log(`   - Total files: ${uploadStats.stats.totalFiles}`);
    console.log(`   - Total size: ${uploadStats.stats.totalSize}MB`);
    console.log(`   - Recent uploads: ${uploadStats.stats.recentUploads}`);
  } else {
    throw new Error(`Upload stats failed: ${uploadStats.error}`);
  }
}

// Handle both Node.js and browser environments
if (typeof fetch === 'undefined') {
  // Node.js environment - would need node-fetch or similar
  console.log('❌ This test requires a fetch implementation');
  console.log('Run this test in a browser environment or install node-fetch');
  process.exit(1);
} else {
  // Browser environment
  runTests();
}

// Export for use in other test frameworks
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runTests,
    testAPIHealth,
    testFileUpload,
    testSemanticSearch,
    testSearchModes,
    testSearchStats
  };
}