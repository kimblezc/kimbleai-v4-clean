// scripts/test-file-integration.ts
// Comprehensive integration tests for file system

import { createClient } from '@supabase/supabase-js';
import { UnifiedFileSystem } from '../lib/unified-file-system';
import { extractFileContent } from '../lib/file-content-extractor';
import { RAGSearchSystem } from '../lib/rag-search';
import { GoogleDriveIntegration } from '../lib/google-drive-integration';
import { FileAutoIndexPipeline } from '../lib/file-auto-index';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Test user
const TEST_USER_ID = 'test-user-001';
const TEST_PROJECT_ID = 'test-project-integration';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

/**
 * Log test result
 */
function logResult(result: TestResult) {
  results.push(result);
  const status = result.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${result.name}`);
  if (result.error) {
    console.error(`   Error: ${result.error}`);
  }
  if (result.details) {
    console.log(`   Details:`, result.details);
  }
}

/**
 * Test 1: File Registration
 */
async function testFileRegistration() {
  const testName = 'File Registration';
  try {
    // Register a test file
    const file = await UnifiedFileSystem.registerFile(
      TEST_USER_ID,
      'upload',
      'test-source-001',
      {
        filename: 'test-document.txt',
        mimeType: 'text/plain',
        fileSize: 1024,
        storagePath: 'test/path/document.txt',
        tags: ['test', 'integration'],
        projects: [TEST_PROJECT_ID],
      }
    );

    if (file && file.id) {
      logResult({
        name: testName,
        passed: true,
        details: { fileId: file.id, filename: file.filename },
      });
      return file.id;
    } else {
      throw new Error('File registration returned null');
    }
  } catch (error: any) {
    logResult({
      name: testName,
      passed: false,
      error: error.message,
    });
    return null;
  }
}

/**
 * Test 2: File Retrieval
 */
async function testFileRetrieval(fileId: string) {
  const testName = 'File Retrieval';
  try {
    const file = await UnifiedFileSystem.getFile(fileId);

    if (file && file.id === fileId) {
      logResult({
        name: testName,
        passed: true,
        details: { filename: file.filename, processed: file.processed },
      });
    } else {
      throw new Error('File not found or ID mismatch');
    }
  } catch (error: any) {
    logResult({
      name: testName,
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Test 3: Content Extraction (Text)
 */
async function testTextExtraction() {
  const testName = 'Text Content Extraction';
  try {
    const testContent = 'This is a test document with some sample text for extraction.';
    const buffer = Buffer.from(testContent);

    // Create a mock file registry entry
    const file: any = {
      id: 'test-file-001',
      filename: 'test.txt',
      mime_type: 'text/plain',
      file_size: buffer.length,
      storage_path: 'test/test.txt',
    };

    const extracted = await extractFileContent(file, buffer);

    if (extracted.text === testContent) {
      logResult({
        name: testName,
        passed: true,
        details: {
          textLength: extracted.text.length,
          wordCount: extracted.metadata.wordCount,
        },
      });
    } else {
      throw new Error('Extracted text does not match original');
    }
  } catch (error: any) {
    logResult({
      name: testName,
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Test 4: Embedding Generation
 */
async function testEmbeddingGeneration() {
  const testName = 'Embedding Generation';
  try {
    const testText = 'This is a test for generating embeddings using OpenAI.';
    const embedding = await RAGSearchSystem.generateEmbedding(testText);

    if (embedding && embedding.length === 1536) {
      logResult({
        name: testName,
        passed: true,
        details: {
          dimensions: embedding.length,
          sampleValues: embedding.slice(0, 5),
        },
      });
    } else {
      throw new Error(`Invalid embedding dimensions: ${embedding?.length || 0}`);
    }
  } catch (error: any) {
    logResult({
      name: testName,
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Test 5: File Indexing
 */
async function testFileIndexing(fileId: string) {
  const testName = 'File Indexing';
  try {
    const result = await RAGSearchSystem.indexFile(fileId, TEST_USER_ID, TEST_PROJECT_ID);

    if (result.success) {
      logResult({
        name: testName,
        passed: true,
        details: {
          entriesCreated: result.entriesCreated,
        },
      });
    } else {
      throw new Error(result.error || 'Indexing failed');
    }
  } catch (error: any) {
    logResult({
      name: testName,
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Test 6: Semantic Search
 */
async function testSemanticSearch() {
  const testName = 'Semantic Search';
  try {
    const results = await RAGSearchSystem.search({
      userId: TEST_USER_ID,
      query: 'test document',
      projectId: TEST_PROJECT_ID,
      limit: 10,
    });

    if (Array.isArray(results)) {
      logResult({
        name: testName,
        passed: true,
        details: {
          resultCount: results.length,
          topSimilarity: results[0]?.similarity || 0,
        },
      });
    } else {
      throw new Error('Search results not an array');
    }
  } catch (error: any) {
    logResult({
      name: testName,
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Test 7: File Search
 */
async function testFileSearch() {
  const testName = 'File Search';
  try {
    const files = await RAGSearchSystem.searchFiles(TEST_USER_ID, 'test', {
      projectId: TEST_PROJECT_ID,
      limit: 10,
    });

    if (Array.isArray(files)) {
      logResult({
        name: testName,
        passed: true,
        details: {
          fileCount: files.length,
          topSimilarity: files[0]?.similarity || 0,
        },
      });
    } else {
      throw new Error('File search results not an array');
    }
  } catch (error: any) {
    logResult({
      name: testName,
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Test 8: Related Files
 */
async function testRelatedFiles(fileId: string) {
  const testName = 'Related Files';
  try {
    const relatedFiles = await RAGSearchSystem.getRelatedFiles(fileId, TEST_USER_ID, {
      limit: 5,
    });

    if (Array.isArray(relatedFiles)) {
      logResult({
        name: testName,
        passed: true,
        details: {
          relatedCount: relatedFiles.length,
        },
      });
    } else {
      throw new Error('Related files not an array');
    }
  } catch (error: any) {
    logResult({
      name: testName,
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Test 9: Auto-Index Queue Status
 */
async function testAutoIndexQueueStatus() {
  const testName = 'Auto-Index Queue Status';
  try {
    const status = await FileAutoIndexPipeline.getQueueStatus(TEST_USER_ID);

    if (
      typeof status.unprocessedCount === 'number' &&
      typeof status.processedCount === 'number'
    ) {
      logResult({
        name: testName,
        passed: true,
        details: {
          unprocessed: status.unprocessedCount,
          processed: status.processedCount,
          total: status.totalCount,
        },
      });
    } else {
      throw new Error('Invalid queue status structure');
    }
  } catch (error: any) {
    logResult({
      name: testName,
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Test 10: Index Statistics
 */
async function testIndexStats() {
  const testName = 'Index Statistics';
  try {
    const stats = await RAGSearchSystem.getIndexStats(TEST_USER_ID);

    if (typeof stats.totalEntries === 'number' && typeof stats.totalFiles === 'number') {
      logResult({
        name: testName,
        passed: true,
        details: {
          totalEntries: stats.totalEntries,
          totalFiles: stats.totalFiles,
          entriesByCategory: stats.entriesByCategory,
        },
      });
    } else {
      throw new Error('Invalid index stats structure');
    }
  } catch (error: any) {
    logResult({
      name: testName,
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Test 11: Google Drive Preview URLs
 */
async function testGoogleDrivePreview() {
  const testName = 'Google Drive Preview URLs';
  try {
    const testFileId = 'test-drive-file-id';

    // Test document preview
    const docPreview = GoogleDriveIntegration.generatePreviewUrl(
      testFileId,
      'application/vnd.google-apps.document'
    );

    // Test spreadsheet preview
    const sheetPreview = GoogleDriveIntegration.generatePreviewUrl(
      testFileId,
      'application/vnd.google-apps.spreadsheet'
    );

    // Test PDF preview
    const pdfPreview = GoogleDriveIntegration.generatePreviewUrl(testFileId, 'application/pdf');

    if (
      docPreview.includes('docs.google.com') &&
      sheetPreview.includes('spreadsheets') &&
      pdfPreview.includes('drive.google.com')
    ) {
      logResult({
        name: testName,
        passed: true,
        details: {
          documentPreview: docPreview,
          spreadsheetPreview: sheetPreview,
          pdfPreview: pdfPreview,
        },
      });
    } else {
      throw new Error('Preview URLs not generated correctly');
    }
  } catch (error: any) {
    logResult({
      name: testName,
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Test 12: File Category Detection
 */
async function testFileCategoryDetection() {
  const testName = 'File Category Detection';
  try {
    const pdfCategory = GoogleDriveIntegration.getFileCategory('application/pdf');
    const docCategory = GoogleDriveIntegration.getFileCategory(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    const imageCategory = GoogleDriveIntegration.getFileCategory('image/jpeg');

    if (pdfCategory === 'pdf' && docCategory === 'document' && imageCategory === 'image') {
      logResult({
        name: testName,
        passed: true,
        details: {
          pdf: pdfCategory,
          document: docCategory,
          image: imageCategory,
        },
      });
    } else {
      throw new Error('File categories not detected correctly');
    }
  } catch (error: any) {
    logResult({
      name: testName,
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Cleanup test data
 */
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  try {
    // Delete test files
    await supabase.from('file_registry').delete().eq('user_id', TEST_USER_ID);

    // Delete test knowledge base entries
    await supabase.from('knowledge_base').delete().eq('user_id', TEST_USER_ID);

    console.log('✅ Cleanup complete');
  } catch (error: any) {
    console.error('❌ Cleanup error:', error.message);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting File Integration Tests\n');
  console.log('=' .repeat(80));

  let testFileId: string | null = null;

  // Test 1: File Registration
  testFileId = await testFileRegistration();

  // Test 2: File Retrieval
  if (testFileId) {
    await testFileRetrieval(testFileId);
  }

  // Test 3: Text Extraction
  await testTextExtraction();

  // Test 4: Embedding Generation
  await testEmbeddingGeneration();

  // Test 5: File Indexing
  if (testFileId) {
    await testFileIndexing(testFileId);
  }

  // Test 6: Semantic Search
  await testSemanticSearch();

  // Test 7: File Search
  await testFileSearch();

  // Test 8: Related Files
  if (testFileId) {
    await testRelatedFiles(testFileId);
  }

  // Test 9: Auto-Index Queue Status
  await testAutoIndexQueueStatus();

  // Test 10: Index Statistics
  await testIndexStats();

  // Test 11: Google Drive Preview
  await testGoogleDrivePreview();

  // Test 12: File Category Detection
  await testFileCategoryDetection();

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('Failed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
  }

  console.log('=' .repeat(80));

  // Cleanup
  await cleanup();

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});
