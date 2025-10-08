/**
 * Test the proper AssemblyAI upload flow
 * GET /upload returns a signed upload URL
 */

async function testUploadFlow(apiKey) {
  console.log(`Testing API key: ${apiKey.substring(0, 20)}...`);

  try {
    // Step 1: Get upload URL
    console.log('  [1/2] Getting signed upload URL...');
    const response = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/octet-stream',
      },
      body: Buffer.alloc(100, 'test'), // Small test file
    });

    if (!response.ok) {
      const text = await response.text();
      console.log(`  ✗ Upload failed: ${response.status} - ${text}`);
      return false;
    }

    const data = await response.json();
    console.log(`  ✓ Upload successful!`);
    console.log(`  Upload URL: ${data.upload_url}`);
    return true;

  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('============================================================');
  console.log('AssemblyAI Upload Flow Test');
  console.log('============================================================\n');

  const key1 = '9e34453814d74ca98efbbb14c69baa8d'; // Default
  const key2 = 'f4e7e2cf1ced4d3d83c15f7206d5c74b'; // Kimbleai

  console.log('Testing Default API Key:');
  const result1 = await testUploadFlow(key1);

  console.log('\nTesting Kimbleai API Key:');
  const result2 = await testUploadFlow(key2);

  console.log('\n============================================================');
  if (result1 || result2) {
    console.log('✓ At least one key works!');
    if (result1) console.log('  - Default key: WORKS');
    if (result2) console.log('  - Kimbleai key: WORKS');
  } else {
    console.log('✗ Both keys failed');
    console.log('\nPossible reasons:');
    console.log('  1. Account requires active billing');
    console.log('  2. API keys are read-only (can retrieve but not upload)');
    console.log('  3. Account is suspended or has reached limits');
    console.log('  4. Keys need to be regenerated from dashboard');
  }
  console.log('============================================================');
}

main();
