/**
 * End-to-end transcription test
 * Tests transcription via kimbleai.com production
 */

async function testTranscription() {
  const BASE_URL = 'https://www.kimbleai.com';

  console.log('🎤 Starting transcription test...\n');

  // Step 1: Check if we have Google Drive files
  console.log('1️⃣ Fetching Google Drive audio files...');
  const driveResponse = await fetch(`${BASE_URL}/api/google/drive?action=list&userId=zach`);
  const driveData = await driveResponse.json();

  if (driveData.error) {
    console.error('❌ Failed to fetch Drive files:', driveData.error);
    return;
  }

  const audioFiles = (driveData.files || []).filter((file: any) =>
    file.mimeType?.includes('audio/') ||
    file.name.toLowerCase().endsWith('.m4a') ||
    file.name.toLowerCase().endsWith('.mp3') ||
    file.name.toLowerCase().endsWith('.wav')
  );

  if (audioFiles.length === 0) {
    console.log('⚠️ No audio files found in Google Drive');
    return;
  }

  const testFile = audioFiles[0];
  console.log(`✅ Found audio file: ${testFile.name} (${testFile.sizeFormatted})\n`);

  // Step 2: Start transcription
  console.log('2️⃣ Starting transcription...');
  const transcribeResponse = await fetch(`${BASE_URL}/api/transcribe/drive-assemblyai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileId: testFile.id,
      fileName: testFile.name,
      userId: 'zach',
      projectId: 'test'
    })
  });

  const transcribeData = await transcribeResponse.json();

  if (transcribeData.error) {
    console.error('❌ Transcription failed:', transcribeData.error);
    console.error('   Details:', transcribeData.details);
    return;
  }

  const jobId = transcribeData.jobId;
  console.log(`✅ Transcription job started: ${jobId}\n`);

  // Step 3: Poll for completion
  console.log('3️⃣ Polling for completion...');
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max

  while (attempts < maxAttempts) {
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
      console.log('🗣️  Speaker labels:', statusData.speaker_labels ? 'Yes' : 'No');

      if (statusData.text) {
        console.log('\n📝 First 200 characters:');
        console.log(statusData.text.substring(0, 200) + '...');
      }

      return;
    }

    if (status === 'error') {
      console.error('\n❌ Transcription error:', statusData.error);
      return;
    }

    // Wait 5 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('\n⏰ Timeout: Transcription took longer than 5 minutes');
}

// Run the test
testTranscription().catch(console.error);
