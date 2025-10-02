/**
 * Test both AssemblyAI API keys systematically
 * Diagnose the 401 "Invalid API key" issue
 */

const fs = require('fs');

const KEYS = {
  'Key 1 (9e34...)': '9e34453814d74ca98efbbb14c69baa8d',
  'Key 2 (f4e7...)': 'f4e7e2cf1ced4d3d83c15f7206d5c74b'
};

async function testAPIKey(keyName, apiKey) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${keyName}`);
  console.log(`${'='.repeat(60)}`);

  try {
    // Test 1: Check if key can access account info (GET request)
    console.log('\n[Test 1] Checking account access (GET)...');
    const accountResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (accountResponse.ok) {
      console.log('  ✓ GET request successful - Key has read access');
      const data = await accountResponse.json();
      console.log(`  ✓ Response: ${JSON.stringify(data).substring(0, 100)}...`);
    } else {
      const errorText = await accountResponse.text();
      console.log(`  ✗ GET request failed (HTTP ${accountResponse.status}): ${errorText}`);
    }

    // Test 2: Try to upload a small test file (POST request)
    console.log('\n[Test 2] Testing file upload (POST)...');
    const testData = Buffer.alloc(100, 'test'); // 100 bytes

    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/octet-stream',
      },
      body: testData,
    });

    if (uploadResponse.ok) {
      const uploadData = await uploadResponse.json();
      console.log('  ✓ Upload successful!');
      console.log(`  ✓ Upload URL: ${uploadData.upload_url}`);
      return { success: true, key: keyName, uploadUrl: uploadData.upload_url };
    } else {
      const errorText = await uploadResponse.text();
      console.log(`  ✗ Upload failed (HTTP ${uploadResponse.status})`);
      console.log(`  ✗ Error: ${errorText}`);

      // Parse error to understand the issue
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          console.log(`  ✗ Error details: ${errorJson.error}`);
        }
      } catch (e) {
        // Not JSON, just plain text error
      }

      return { success: false, key: keyName, error: errorText, status: uploadResponse.status };
    }

  } catch (error) {
    console.log(`  ✗ Exception: ${error.message}`);
    return { success: false, key: keyName, error: error.message };
  }
}

async function diagnoseAssemblyAI() {
  console.log('============================================================');
  console.log('AssemblyAI API Key Diagnostic Tool');
  console.log('============================================================');
  console.log('Testing both API keys to identify the issue...\n');

  const results = [];

  for (const [keyName, apiKey] of Object.entries(KEYS)) {
    const result = await testAPIKey(keyName, apiKey);
    results.push(result);
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('DIAGNOSTIC SUMMARY');
  console.log('='.repeat(60));

  const workingKeys = results.filter(r => r.success);
  const failedKeys = results.filter(r => !r.success);

  if (workingKeys.length > 0) {
    console.log('\n✓ WORKING KEYS:');
    workingKeys.forEach(r => {
      console.log(`  - ${r.key}`);
      console.log(`    Upload URL: ${r.uploadUrl}`);
    });
  }

  if (failedKeys.length > 0) {
    console.log('\n✗ FAILED KEYS:');
    failedKeys.forEach(r => {
      console.log(`  - ${r.key}`);
      console.log(`    Error: ${r.error || 'Unknown'}`);
      console.log(`    Status: ${r.status || 'N/A'}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('DIAGNOSIS:');
  console.log('='.repeat(60));

  if (workingKeys.length === 0) {
    console.log('\n⚠️  CRITICAL: No working API keys found!\n');
    console.log('Root Causes:');
    console.log('1. Account may be in trial/free tier without upload permissions');
    console.log('2. Billing may not be enabled on the AssemblyAI account');
    console.log('3. API keys may have been revoked or expired');
    console.log('4. Account may have reached usage limits\n');
    console.log('Next Steps:');
    console.log('1. Visit https://www.assemblyai.com/app/account');
    console.log('2. Check billing status and enable if needed');
    console.log('3. Regenerate API keys if necessary');
    console.log('4. Consider implementing Whisper fallback');
  } else {
    console.log(`\n✓ Found ${workingKeys.length} working key(s)!`);
    console.log('\nAction: Update .env.local with working key:');
    console.log(`ASSEMBLYAI_API_KEY=${workingKeys[0].key.split('(')[1].split(')')[0]}`);
  }

  console.log('\n' + '='.repeat(60));
}

diagnoseAssemblyAI();
