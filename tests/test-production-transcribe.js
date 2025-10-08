/**
 * Test production transcription through kimbleai.com API
 * This tests the full flow: get credentials -> upload -> transcribe
 */

const fs = require('fs');

async function testProductionTranscription() {
  console.log('============================================================');
  console.log('Production Transcription Test via kimbleai.com');
  console.log('============================================================\n');

  try {
    // Step 1: Get upload credentials from production
    console.log('[1/4] Getting upload credentials from production...');
    const credentialsResponse = await fetch('https://www.kimbleai.com/api/transcribe/upload-url', {
      method: 'POST',
    });

    if (!credentialsResponse.ok) {
      throw new Error(`Failed to get credentials: ${credentialsResponse.status}`);
    }

    const { upload_url, auth_token } = await credentialsResponse.json();
    console.log('      ✓ Credentials received');
    console.log(`      Upload URL: ${upload_url}`);
    console.log(`      Auth token: ${auth_token.substring(0, 20)}...`);

    // Step 2: Create a small test file
    console.log('\n[2/4] Creating test audio file...');
    const testData = Buffer.alloc(1024, 'test'); // 1KB test file
    console.log('      ✓ Test file created (1KB)');

    // Step 3: Upload to AssemblyAI
    console.log('\n[3/4] Uploading to AssemblyAI...');
    const uploadResponse = await fetch(upload_url, {
      method: 'POST',
      headers: {
        'Authorization': auth_token,
        'Content-Type': 'application/octet-stream',
      },
      body: testData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed (HTTP ${uploadResponse.status}): ${errorText}`);
    }

    const { upload_url: audioUrl } = await uploadResponse.json();
    console.log('      ✓ Upload successful!');
    console.log(`      Audio URL: ${audioUrl}`);

    // Step 4: Start transcription
    console.log('\n[4/4] Starting transcription...');
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': auth_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
      }),
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      throw new Error(`Transcription failed (HTTP ${transcriptResponse.status}): ${errorText}`);
    }

    const transcript = await transcriptResponse.json();
    console.log('      ✓ Transcription started!');
    console.log(`      Transcript ID: ${transcript.id}`);
    console.log(`      Status: ${transcript.status}`);

    console.log('\n============================================================');
    console.log('✓ SUCCESS! Production transcription is working!');
    console.log('============================================================');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('\n============================================================');
    console.log('✗ FAILED - Production transcription is not working');
    console.log('============================================================');
    process.exit(1);
  }
}

testProductionTranscription();
