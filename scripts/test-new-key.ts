// Test new AssemblyAI API key
const API_KEY = 'b33ccce950894067b89588381d61cddb';

async function testKey() {
  console.log('Testing AssemblyAI API key:', API_KEY.substring(0, 8) + '...');

  // Test 1: List transcripts (GET - should work even with read-only)
  console.log('\n1. Testing GET /v2/transcript...');
  try {
    const listResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      headers: { 'authorization': API_KEY }
    });
    console.log('   Status:', listResponse.status);
    if (listResponse.ok) {
      const data = await listResponse.json();
      console.log('   ✅ GET works - transcripts count:', data.transcripts?.length || 0);
    } else {
      const error = await listResponse.text();
      console.log('   ❌ GET failed:', error);
    }
  } catch (err: any) {
    console.log('   ❌ GET error:', err.message);
  }

  // Test 2: Upload file (POST - requires full access)
  console.log('\n2. Testing POST /v2/upload...');
  try {
    // Create a tiny test audio buffer (1 second of silence, 44.1kHz, 16-bit, mono)
    const sampleRate = 44100;
    const duration = 1;
    const numSamples = sampleRate * duration;
    const buffer = Buffer.alloc(numSamples * 2); // 16-bit = 2 bytes per sample

    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': API_KEY,
        'content-type': 'application/octet-stream'
      },
      body: buffer
    });

    console.log('   Status:', uploadResponse.status);
    if (uploadResponse.ok) {
      const data = await uploadResponse.json();
      console.log('   ✅ POST works - upload_url:', data.upload_url?.substring(0, 50) + '...');
      return true;
    } else {
      const error = await uploadResponse.text();
      console.log('   ❌ POST failed:', error);
      return false;
    }
  } catch (err: any) {
    console.log('   ❌ POST error:', err.message);
    return false;
  }
}

testKey().then(success => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('✅ API KEY HAS FULL ACCESS - Ready to deploy!');
  } else {
    console.log('❌ API KEY IS READ-ONLY - Get a new key with full permissions');
  }
  process.exit(success ? 0 : 1);
});
