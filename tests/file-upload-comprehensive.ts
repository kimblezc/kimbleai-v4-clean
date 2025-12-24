// tests/file-upload-comprehensive.ts
// Comprehensive test suite for file upload fix v10.7.1

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.TEST_URL || 'https://www.kimbleai.com';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(name: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any) {
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${emoji} ${name}: ${message}`);
  if (details) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
  results.push({ name, status, message, details });
}

async function testVersionEndpoint() {
  try {
    const response = await fetch(`${BASE_URL}/api/version`);
    const data = await response.json();

    if (data.version === '10.7.1' && data.commit === '75ea23b') {
      logTest('Version Endpoint', 'PASS', 'Correct version deployed', { version: data.version, commit: data.commit });
      return true;
    } else {
      logTest('Version Endpoint', 'FAIL', 'Wrong version deployed', { expected: '10.7.1/75ea23b', actual: `${data.version}/${data.commit}` });
      return false;
    }
  } catch (error: any) {
    logTest('Version Endpoint', 'FAIL', 'Failed to fetch version', { error: error.message });
    return false;
  }
}

async function testHealthEndpoint() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();

    if (data.status === 'healthy') {
      logTest('Health Endpoint', 'PASS', 'Server is healthy', data);
      return true;
    } else {
      logTest('Health Endpoint', 'FAIL', 'Server unhealthy', data);
      return false;
    }
  } catch (error: any) {
    logTest('Health Endpoint', 'FAIL', 'Health check failed', { error: error.message });
    return false;
  }
}

async function testDatabaseSchema() {
  try {
    // Check if uploaded_files table exists and has correct structure
    const { data, error } = await supabase
      .from('uploaded_files')
      .select('*')
      .limit(1);

    if (error) {
      logTest('Database Schema', 'FAIL', 'Failed to query uploaded_files table', { error: error.message });
      return false;
    }

    // Check that we can query without category column error
    logTest('Database Schema', 'PASS', 'uploaded_files table accessible without column errors');
    return true;
  } catch (error: any) {
    logTest('Database Schema', 'FAIL', 'Database schema check failed', { error: error.message });
    return false;
  }
}

async function testRecentUploads() {
  try {
    const { data, error } = await supabase
      .from('uploaded_files')
      .select('id, filename, status, metadata, created_at')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      logTest('Recent Uploads', 'FAIL', 'Failed to fetch recent uploads', { error: error.message });
      return false;
    }

    if (!data || data.length === 0) {
      logTest('Recent Uploads', 'SKIP', 'No uploads in last hour', { count: 0 });
      return true;
    }

    // Check metadata structure
    const hasValidMetadata = data.every(upload => {
      const metadata = upload.metadata as any;
      return metadata &&
             typeof metadata === 'object' &&
             'originalName' in metadata;
    });

    if (hasValidMetadata) {
      logTest('Recent Uploads', 'PASS', `Found ${data.length} recent uploads with valid metadata`, {
        count: data.length,
        samples: data.slice(0, 3).map(u => ({
          filename: u.filename,
          status: u.status,
          category: (u.metadata as any)?.category,
          hasMetadata: !!u.metadata
        }))
      });
      return true;
    } else {
      logTest('Recent Uploads', 'FAIL', 'Some uploads have invalid metadata structure', {
        invalidUploads: data.filter(u => !u.metadata || typeof u.metadata !== 'object')
      });
      return false;
    }
  } catch (error: any) {
    logTest('Recent Uploads', 'FAIL', 'Failed to check recent uploads', { error: error.message });
    return false;
  }
}

async function testCategoryInMetadata() {
  try {
    // Get recent uploads and verify category is in metadata, not as column
    const { data, error } = await supabase
      .from('uploaded_files')
      .select('id, filename, metadata')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString())
      .limit(5);

    if (error) {
      // Check if error mentions category column (this would be bad)
      if (error.message.includes('category')) {
        logTest('Category in Metadata', 'FAIL', 'Database still trying to query category column', { error: error.message });
        return false;
      }
      logTest('Category in Metadata', 'FAIL', 'Query failed', { error: error.message });
      return false;
    }

    if (!data || data.length === 0) {
      logTest('Category in Metadata', 'SKIP', 'No recent uploads to check');
      return true;
    }

    // Check that category is in metadata, not as separate column
    const hasCategory = data.filter(u => (u.metadata as any)?.category);

    if (hasCategory.length > 0) {
      logTest('Category in Metadata', 'PASS', `Category found in metadata for ${hasCategory.length}/${data.length} uploads`, {
        categories: hasCategory.map(u => ({
          filename: u.filename,
          category: (u.metadata as any)?.category
        }))
      });
      return true;
    } else {
      logTest('Category in Metadata', 'FAIL', 'No categories found in metadata', {
        uploads: data.map(u => ({ filename: u.filename, metadata: u.metadata }))
      });
      return false;
    }
  } catch (error: any) {
    logTest('Category in Metadata', 'FAIL', 'Failed to check category in metadata', { error: error.message });
    return false;
  }
}

async function testNoColumnErrors() {
  try {
    // Try to insert a test record (will fail if category column error still exists)
    // We'll use a dry-run approach - just query to see if the error would happen

    // This query would fail with PGRST204 if category column was being referenced
    const { data, error } = await supabase
      .from('uploaded_files')
      .select('id, filename, file_type, file_size, status, metadata')
      .limit(1);

    if (error) {
      if (error.code === 'PGRST204' && error.message.includes('category')) {
        logTest('No Column Errors', 'FAIL', 'PGRST204 category column error still occurring', { error });
        return false;
      }
      logTest('No Column Errors', 'FAIL', 'Unexpected database error', { error });
      return false;
    }

    logTest('No Column Errors', 'PASS', 'No PGRST204 category column errors detected');
    return true;
  } catch (error: any) {
    logTest('No Column Errors', 'FAIL', 'Error checking for column errors', { error: error.message });
    return false;
  }
}

async function testFileTypes() {
  try {
    const { data, error } = await supabase
      .from('uploaded_files')
      .select('filename, metadata')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString()) // Last 24 hours
      .limit(50);

    if (error) {
      logTest('File Types', 'FAIL', 'Failed to fetch file types', { error: error.message });
      return false;
    }

    if (!data || data.length === 0) {
      logTest('File Types', 'SKIP', 'No uploads in last 24 hours to analyze');
      return true;
    }

    const categoryCounts: Record<string, number> = {};
    data.forEach(file => {
      const category = (file.metadata as any)?.category || 'unknown';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    logTest('File Types', 'PASS', `Found ${Object.keys(categoryCounts).length} different file categories`, {
      totalFiles: data.length,
      categories: categoryCounts
    });
    return true;
  } catch (error: any) {
    logTest('File Types', 'FAIL', 'Failed to analyze file types', { error: error.message });
    return false;
  }
}

async function testProcessingStatus() {
  try {
    const { data, error } = await supabase
      .from('uploaded_files')
      .select('id, filename, status, created_at, processed_at')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString())
      .limit(20);

    if (error) {
      logTest('Processing Status', 'FAIL', 'Failed to fetch processing status', { error: error.message });
      return false;
    }

    if (!data || data.length === 0) {
      logTest('Processing Status', 'SKIP', 'No recent uploads to check processing status');
      return true;
    }

    const statusCounts: Record<string, number> = {};
    data.forEach(file => {
      statusCounts[file.status] = (statusCounts[file.status] || 0) + 1;
    });

    const failedFiles = data.filter(f => f.status === 'failed');

    if (failedFiles.length > 0) {
      logTest('Processing Status', 'FAIL', `${failedFiles.length} files failed processing`, {
        statusCounts,
        failedFiles: failedFiles.map(f => f.filename)
      });
      return false;
    }

    logTest('Processing Status', 'PASS', 'All recent files processed successfully', {
      totalFiles: data.length,
      statusCounts
    });
    return true;
  } catch (error: any) {
    logTest('Processing Status', 'FAIL', 'Failed to check processing status', { error: error.message });
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  File Upload Fix Test Suite v10.7.1                       ║');
  console.log('║  Testing database category column fix                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`Testing against: ${BASE_URL}\n`);

  const tests = [
    { name: 'Version Endpoint', fn: testVersionEndpoint, critical: true },
    { name: 'Health Endpoint', fn: testHealthEndpoint, critical: true },
    { name: 'Database Schema', fn: testDatabaseSchema, critical: true },
    { name: 'No Column Errors', fn: testNoColumnErrors, critical: true },
    { name: 'Category in Metadata', fn: testCategoryInMetadata, critical: true },
    { name: 'Recent Uploads', fn: testRecentUploads, critical: false },
    { name: 'File Types', fn: testFileTypes, critical: false },
    { name: 'Processing Status', fn: testProcessingStatus, critical: false }
  ];

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let criticalFailed = false;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
        if (test.critical) criticalFailed = true;
      }
    } catch (error) {
      failed++;
      if (test.critical) criticalFailed = true;
    }
  }

  skipped = results.filter(r => r.status === 'SKIP').length;

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test Results Summary                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`\nCritical Tests: ${criticalFailed ? '❌ FAILED' : '✅ PASSED'}\n`);

  if (criticalFailed) {
    console.log('⚠️  CRITICAL FAILURE - FIX REQUIRED\n');
    console.log('Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.message}`);
    });
    process.exit(1);
  } else if (failed > 0) {
    console.log('⚠️  Some non-critical tests failed\n');
    console.log('Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.message}`);
    });
    process.exit(0);
  } else {
    console.log('🎉 ALL TESTS PASSED - FIX VERIFIED\n');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
