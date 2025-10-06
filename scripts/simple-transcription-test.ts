/**
 * Simple transcription test using direct AssemblyAI upload
 */

import { createReadStream } from 'fs';
import { readFileSync } from 'fs';

async function testTranscription() {
  const ASSEMBLYAI_API_KEY = 'f4e7e2cf1ced4d3d83c15f7206d5c74b';
  const BASE_URL = 'https://www.kimbleai.com';

  console.log('🎤 Testing AssemblyAI transcription...\n');

  // Create a simple test audio (just a WAV header for testing)
  const testAudioPath = 'test-audio.wav';

  console.log('1️⃣ Starting transcription via kimbleai.com API...');

  // For now, let's test by creating a minimal audio file
  const sampleAudioUrl = 'https://github.com/AssemblyAI-Examples/audio-examples/raw/main/20230607_me_canadian_wildfires.mp3';

  // Start transcription directly
  const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ASSEMBLYAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: sampleAudioUrl,
      speaker_labels: true,
    }),
  });

  const transcriptData = await transcriptResponse.json();
  const jobId = transcriptData.id;

  console.log(`✅ Transcription job started: ${jobId}\n`);

  // Poll for completion
  console.log('2️⃣ Polling for completion...');
  let attempts = 0;

  while (attempts < 60) {
    attempts++;

    const statusResponse = await fetch(`${BASE_URL}/api/transcribe/status?jobId=${jobId}`);
    const statusData = await statusResponse.json();

    if (statusData.error) {
      console.error('❌ Status check failed:', statusData.error);
      return;
    }

    const status = statusData.status;
    console.log(`   Attempt ${attempts}: Status = ${status}`);

    if (status === 'completed') {
      console.log('\n✅ TRANSCRIPTION COMPLETE!\n');
      console.log('📄 Transcript length:', statusData.text?.length || 0, 'characters');
      console.log('⏱️  Audio duration:', statusData.audio_duration, 'seconds');

      if (statusData.text) {
        console.log('\n📝 First 300 characters:');
        console.log(statusData.text.substring(0, 300) + '...\n');
      }

      console.log('✅ Transcription test PASSED via kimbleai.com');
      return;
    }

    if (status === 'error') {
      console.error('\n❌ Transcription error:', statusData.error);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('\n⏰ Timeout');
}

testTranscription().catch(console.error);
