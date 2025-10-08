// Automated test for transcription + export flow
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

const API_BASE = 'https://www.kimbleai.com';
const TEST_FILE_PATH = 'G:\\My Drive\\Easy Voice Recorder\\My recording 1.m4a';
const USER_ID = 'zach';
const PROJECT_ID = 'general';

interface TranscriptionResult {
  success: boolean;
  jobId?: string;
  result?: {
    id: string;
    text: string;
    duration: number;
    speakers: number;
    filename: string;
  };
  error?: string;
}

async function uploadAndTranscribe(): Promise<string | null> {
  console.log('\n========================================');
  console.log('STEP 1: Uploading to AssemblyAI');
  console.log('========================================\n');

  // Read the file
  if (!fs.existsSync(TEST_FILE_PATH)) {
    console.error(`❌ Test file not found: ${TEST_FILE_PATH}`);
    return null;
  }

  const fileBuffer = fs.readFileSync(TEST_FILE_PATH);
  const fileSize = fileBuffer.length;
  const filename = path.basename(TEST_FILE_PATH);

  console.log(`📁 File: ${filename}`);
  console.log(`📊 Size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

  // Step 1: Get upload credentials
  console.log('\n🔑 Getting upload credentials...');
  const credsResponse = await fetch(`${API_BASE}/api/transcribe/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: USER_ID })
  });

  if (!credsResponse.ok) {
    console.error(`❌ Failed to get credentials: ${credsResponse.status}`);
    return null;
  }

  const creds = await credsResponse.json() as any;
  console.log(`✅ Got upload URL: ${creds.upload_url}`);

  // Step 2: Upload to AssemblyAI
  console.log('\n📤 Uploading to AssemblyAI...');
  const uploadResponse = await fetch(creds.upload_url, {
    method: 'POST',
    headers: {
      'authorization': creds.auth_token,
      'content-type': 'application/octet-stream'
    },
    body: fileBuffer
  });

  if (!uploadResponse.ok) {
    console.error(`❌ Upload failed: ${uploadResponse.status}`);
    const errorText = await uploadResponse.text();
    console.error(errorText);
    return null;
  }

  const uploadData = await uploadResponse.json() as any;
  const audioUrl = uploadData.upload_url;
  console.log(`✅ Uploaded: ${audioUrl}`);

  // Step 3: Start transcription
  console.log('\n🎙️  Starting transcription...');
  const transcribeResponse = await fetch(`${API_BASE}/api/transcribe/assemblyai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioUrl,
      userId: USER_ID,
      projectId: PROJECT_ID,
      filename,
      fileSize
    })
  });

  if (!transcribeResponse.ok) {
    console.error(`❌ Transcription start failed: ${transcribeResponse.status}`);
    const errorText = await transcribeResponse.text();
    console.error(errorText);
    return null;
  }

  const transcribeData = await transcribeResponse.json() as any;
  console.log(`✅ Job started: ${transcribeData.jobId}`);

  return transcribeData.jobId;
}

async function pollTranscription(jobId: string): Promise<TranscriptionResult | null> {
  console.log('\n========================================');
  console.log('STEP 2: Polling for completion');
  console.log('========================================\n');

  const maxAttempts = 120; // 10 minutes
  const pollInterval = 5000; // 5 seconds

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    const statusResponse = await fetch(`${API_BASE}/api/transcribe/status?jobId=${jobId}`);

    if (!statusResponse.ok) {
      console.error(`❌ Status check failed: ${statusResponse.status}`);
      continue;
    }

    const status = await statusResponse.json() as TranscriptionResult;

    if (status.result) {
      console.log('\n✅ Transcription complete!');
      console.log(`📝 Text: ${status.result.text.substring(0, 100)}...`);
      console.log(`⏱️  Duration: ${status.result.duration}s`);
      console.log(`👥 Speakers: ${status.result.speakers}`);
      console.log(`🆔 ID: ${status.result.id}`);
      return status;
    }

    if (status.error) {
      console.error(`❌ Transcription failed: ${status.error}`);
      return null;
    }

    // Progress indicator
    if (i % 6 === 0) {  // Every 30 seconds
      process.stdout.write(`⏳ Waiting... ${Math.floor(i * pollInterval / 1000)}s elapsed\n`);
    }
  }

  console.error('❌ Timeout waiting for transcription');
  return null;
}

async function testExport(transcriptionId: string): Promise<boolean> {
  console.log('\n========================================');
  console.log('STEP 3: Testing export');
  console.log('========================================\n');

  console.log(`🔄 Exporting transcription ${transcriptionId}...`);

  const exportResponse = await fetch(`${API_BASE}/api/transcribe/export-to-drive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcriptionId,
      userId: USER_ID
    })
  });

  console.log(`📡 Response status: ${exportResponse.status}`);

  if (!exportResponse.ok) {
    const errorText = await exportResponse.text();
    console.error(`❌ Export failed (${exportResponse.status})`);
    console.error(`📄 Response: ${errorText}`);
    return false;
  }

  const exportData = await exportResponse.json() as any;
  console.log('\n✅ Export successful!');
  console.log(`📁 Folder: ${exportData.folderUrl}`);
  console.log(`📄 Files exported: ${exportData.files.length}`);
  exportData.files.forEach((file: any) => {
    console.log(`   - ${file.name}: ${file.url}`);
  });

  return true;
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   Transcription + Export Flow Test       ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  try {
    // Step 1: Upload and start transcription
    const jobId = await uploadAndTranscribe();
    if (!jobId) {
      console.error('\n❌ Upload/transcription failed');
      process.exit(1);
    }

    // Step 2: Wait for transcription to complete
    const result = await pollTranscription(jobId);
    if (!result || !result.result) {
      console.error('\n❌ Transcription did not complete');
      process.exit(1);
    }

    // Step 3: Test export
    const exportSuccess = await testExport(result.result.id);
    if (!exportSuccess) {
      console.error('\n❌ Export failed');
      process.exit(1);
    }

    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║   ✅ ALL TESTS PASSED                     ║');
    console.log('╚═══════════════════════════════════════════╝\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
