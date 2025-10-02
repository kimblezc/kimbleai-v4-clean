// scripts/test-file-upload.js
// Test script for file upload system

const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const USER_ID = 'zach';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test file upload
async function testUpload(filePath, description) {
  try {
    log(`\n📤 Testing: ${description}`, 'blue');
    log(`File: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      log(`❌ File not found: ${filePath}`, 'red');
      return null;
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('userId', USER_ID);
    formData.append('projectId', 'test-project');

    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}/api/files/upload`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    const uploadTime = Date.now() - startTime;

    if (result.success) {
      log(`✓ Upload successful (${uploadTime}ms)`, 'green');
      log(`  File ID: ${result.fileId}`);
      log(`  Status: ${result.status}`);
      log(`  Category: ${result.category}`);
      return result.fileId;
    } else {
      log(`✗ Upload failed: ${result.error}`, 'red');
      if (result.details) log(`  Details: ${result.details}`);
      return null;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return null;
  }
}

// Check processing status
async function checkStatus(fileId, description) {
  try {
    log(`\n⏳ Checking status: ${description}`, 'blue');

    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(`${BASE_URL}/api/files/${fileId}/status`);
      const result = await response.json();

      if (result.status === 'completed') {
        log(`✓ Processing completed`, 'green');
        log(`  Processing time: ${result.processingTime}s`);
        if (result.processingResult) {
          log(`  Result: ${JSON.stringify(result.processingResult, null, 2)}`);
        }
        return true;
      } else if (result.status === 'failed') {
        log(`✗ Processing failed: ${result.error}`, 'red');
        return false;
      } else {
        process.stdout.write(`\r  Status: ${result.status} (${result.progress}%) - ${result.message}`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        attempts++;
      }
    }

    log(`\n⚠ Timeout waiting for processing`, 'yellow');
    return false;
  } catch (error) {
    log(`\n✗ Error checking status: ${error.message}`, 'red');
    return false;
  }
}

// Test file download
async function testDownload(fileId, description) {
  try {
    log(`\n⬇️  Testing download: ${description}`, 'blue');

    const response = await fetch(`${BASE_URL}/api/files/${fileId}/download`);

    if (response.ok) {
      const size = parseInt(response.headers.get('content-length') || '0');
      log(`✓ Download successful`, 'green');
      log(`  Size: ${(size / 1024).toFixed(2)} KB`);
      return true;
    } else {
      log(`✗ Download failed: ${response.statusText}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error downloading: ${error.message}`, 'red');
    return false;
  }
}

// Test file deletion
async function testDelete(fileId, description) {
  try {
    log(`\n🗑️  Testing delete: ${description}`, 'blue');

    const response = await fetch(`${BASE_URL}/api/files/${fileId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      log(`✓ Delete successful`, 'green');
      return true;
    } else {
      log(`✗ Delete failed: ${result.error}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error deleting: ${error.message}`, 'red');
    return false;
  }
}

// Create test files
function createTestFiles() {
  log('\n📝 Creating test files...', 'blue');

  const testDir = './test-files';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }

  // Create small text file
  const textContent = `# Test Document

This is a test document for the file upload system.

## Features
- Text extraction
- Metadata generation
- Knowledge base indexing

## Testing
This document will be processed and indexed.
`;

  fs.writeFileSync(`${testDir}/test-document.txt`, textContent);
  log('✓ Created test-document.txt', 'green');

  // Create CSV file
  const csvContent = `Name,Age,City,Email
John Doe,30,New York,john@example.com
Jane Smith,25,Los Angeles,jane@example.com
Bob Johnson,35,Chicago,bob@example.com
Alice Williams,28,Houston,alice@example.com
`;

  fs.writeFileSync(`${testDir}/test-spreadsheet.csv`, csvContent);
  log('✓ Created test-spreadsheet.csv', 'green');

  // Create markdown file
  const markdownContent = `# Test Markdown

This is a **test markdown** file.

## Code Example
\`\`\`javascript
console.log('Hello, World!');
\`\`\`

## List
- Item 1
- Item 2
- Item 3
`;

  fs.writeFileSync(`${testDir}/test-document.md`, markdownContent);
  log('✓ Created test-document.md', 'green');

  log(`\n✓ Test files created in ${testDir}/`, 'green');
}

// Run all tests
async function runTests() {
  log('═══════════════════════════════════════', 'blue');
  log('  File Upload System - Test Suite', 'blue');
  log('═══════════════════════════════════════', 'blue');
  log(`\nBase URL: ${BASE_URL}`);
  log(`User ID: ${USER_ID}\n`);

  // Create test files
  createTestFiles();

  const testFiles = [
    { path: './test-files/test-document.txt', desc: 'Text File' },
    { path: './test-files/test-spreadsheet.csv', desc: 'CSV File' },
    { path: './test-files/test-document.md', desc: 'Markdown File' }
  ];

  const results = {
    total: testFiles.length,
    passed: 0,
    failed: 0,
    fileIds: []
  };

  // Test each file
  for (const testFile of testFiles) {
    const fileId = await testUpload(testFile.path, testFile.desc);

    if (fileId) {
      results.fileIds.push(fileId);

      // Wait a bit before checking status
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check processing status
      const processed = await checkStatus(fileId, testFile.desc);

      if (processed) {
        results.passed++;

        // Test download
        await testDownload(fileId, testFile.desc);
      } else {
        results.failed++;
      }
    } else {
      results.failed++;
    }

    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Test listing files
  log('\n📋 Testing file listing...', 'blue');
  try {
    const response = await fetch(`${BASE_URL}/api/files?userId=${USER_ID}&limit=10`);
    const data = await response.json();

    if (data.success) {
      log(`✓ Found ${data.files.length} files`, 'green');
      log(`  Total: ${data.total}`);
      log(`  Categories: ${JSON.stringify(data.categories)}`);
    } else {
      log(`✗ Failed to list files`, 'red');
    }
  } catch (error) {
    log(`✗ Error listing files: ${error.message}`, 'red');
  }

  // Clean up - delete test files
  log('\n🧹 Cleaning up test files...', 'blue');
  for (const fileId of results.fileIds) {
    await testDelete(fileId, `File ${fileId}`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  log('\n═══════════════════════════════════════', 'blue');
  log('  Test Results', 'blue');
  log('═══════════════════════════════════════', 'blue');
  log(`\nTotal Tests: ${results.total}`);
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

  if (results.failed === 0) {
    log('🎉 All tests passed!', 'green');
  } else {
    log('⚠️  Some tests failed. Check logs above.', 'yellow');
  }
}

// Run tests
runTests().catch(error => {
  log(`\n💥 Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
