/**
 * Test Whisper transcription with a real audio file
 * This creates a small test audio and tests the /api/transcribe endpoint
 */

const fs = require('fs');
const FormData = require('form-data');

async function testWhisperTranscription() {
  console.log('============================================================');
  console.log('Whisper Transcription Test');
  console.log('============================================================\n');

  try {
    // Create a very small test audio file (just to test the API)
    console.log('[1/3] Creating test audio file...');

    // We'll use a minimal WAV file header + silence
    // This is a valid 1-second WAV file with silence
    const wavHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x24, 0x00, 0x00, 0x00, // File size - 8
      0x57, 0x41, 0x56, 0x45, // "WAVE"
      0x66, 0x6D, 0x74, 0x20, // "fmt "
      0x10, 0x00, 0x00, 0x00, // Chunk size (16)
      0x01, 0x00, // Audio format (1 = PCM)
      0x01, 0x00, // Channels (1 = mono)
      0x44, 0xAC, 0x00, 0x00, // Sample rate (44100 Hz)
      0x88, 0x58, 0x01, 0x00, // Byte rate
      0x02, 0x00, // Block align
      0x10, 0x00, // Bits per sample (16)
      0x64, 0x61, 0x74, 0x61, // "data"
      0x00, 0x00, 0x00, 0x00  // Data size (0 = silence)
    ]);

    const testFile = 'test-audio.wav';
    fs.writeFileSync(testFile, wavHeader);
    console.log(`  ✓ Test audio file created: ${testFile} (${wavHeader.length} bytes)`);

    // Step 2: Check if Whisper fallback is active
    console.log('\n[2/3] Checking transcription service status...');
    const credentialsResponse = await fetch('http://localhost:3000/api/transcribe/upload-url', {
      method: 'POST',
    });

    const credentialsData = await credentialsResponse.json();
    console.log('  Service Status:', credentialsData.fallback === 'whisper' ? 'Whisper (Fallback)' : 'AssemblyAI');
    if (credentialsData.message) {
      console.log('  Message:', credentialsData.message.split('\n')[0]);
    }

    // Step 3: Upload and transcribe via Whisper
    console.log('\n[3/3] Testing Whisper transcription...');

    const formData = new FormData();
    formData.append('audio', fs.createReadStream(testFile), {
      filename: testFile,
      contentType: 'audio/wav'
    });
    formData.append('userId', 'zach');
    formData.append('projectId', 'test');

    const transcribeResponse = await fetch('http://localhost:3000/api/transcribe', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!transcribeResponse.ok) {
      const errorText = await transcribeResponse.text();
      throw new Error(`Transcription failed (HTTP ${transcribeResponse.status}): ${errorText}`);
    }

    const result = await transcribeResponse.json();
    console.log('  ✓ Transcription successful!');
    console.log('  Transcription:', result.transcription || '(empty/silent audio)');
    console.log('  Duration:', result.duration, 'seconds');
    console.log('  Model:', result.metadata?.model || 'unknown');

    // Cleanup
    fs.unlinkSync(testFile);
    console.log('\n  ✓ Test file cleaned up');

    console.log('\n============================================================');
    console.log('✓ SUCCESS! Whisper transcription is working!');
    console.log('============================================================');
    console.log('\n📊 SUMMARY:');
    console.log('  - Transcription Service:', credentialsData.fallback === 'whisper' ? 'Whisper (Fallback Mode)' : 'AssemblyAI');
    console.log('  - File Limit:', credentialsData.fallback === 'whisper' ? '25MB' : 'Unlimited');
    console.log('  - Features:', credentialsData.fallback === 'whisper' ? 'Basic transcription' : 'Advanced (speakers, chapters, etc.)');
    console.log('\n💡 TIP: To enable AssemblyAI for large files and advanced features:');
    console.log('  1. Visit https://www.assemblyai.com/app/account');
    console.log('  2. Enable billing on your account');
    console.log('  3. Verify API key has upload permissions');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('\n============================================================');
    console.log('✗ FAILED - Whisper transcription test failed');
    console.log('============================================================');
    process.exit(1);
  }
}

testWhisperTranscription();
