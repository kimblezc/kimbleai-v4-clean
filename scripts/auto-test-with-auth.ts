// Fully automated test with authentication
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

const API_BASE = 'https://www.kimbleai.com';
const TEST_FILE_PATH = 'G:\\My Drive\\Easy Voice Recorder\\My recording 1.m4a';
const USER_ID = 'zach';
const PROJECT_ID = 'general';

// Session cookie from browser
const SESSION_COOKIE = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..lYQBlhxXPeaPL9Ve.a8OQ-7yZXp-k9_pxWRkImqOFJcR5UKanb1AtMqDxsu_f6EFdAaeOg4jvNmCAxnXUdfSNjQHBy7z9vC8mtjrpH5G9a83fRjx6uH9FmcYsi25WF9YErhzffXVeSWQeADbEAb5tZlXqjfNaR1dwLbfupG0C0tu0mKBMNrnph4XsREB0Rxyu5mIpvgAKnIYKSlPPm8H2LTNZDWKIK-Q6YGfLF2VII_62nI9CFJDPp30m-tbFfZ0tNX6gtfSK64qoYuV1fKR8LdBSimlZQFvmIVXuNDKsvhwNUjkpom7CFO49yDLDu3AmPLTWYe6pIDOHNvg8FSKAAhYvFFEO2kgIqq-V4ZVT-Gjvnhictz8NIKYngbj59OAy7zA28yMY4DTuWKJ13ujDF2MlE4Pimw5F5t65Xb6YCh25HO84ANOE405SelkErlVk6LKGvu1yU4tsmqyRBYScjnFvSSK0V2XRBk1zrihqURdtWMAuohEPTUNYa3cs7ao5NELu8FJ3ikWiDXs5_bQODBFmvkRmYtlrxE_8xxAo7OMiTO-Qjh2XjrkeQhe98MeNwL7UgaiZHYt80oLYV0Oeq01VAAHGPnkGzSRcI3ysBt4HEYsL2zgHoqWgy8sH_GiCw5_aD6oB8VJRqjyJfu0-Aj6hKiXAkuPv0iVGhi1LiiPmJNi5e0nUvgwbhEy1rDWZPq3yzmXliqBxwJy1C1CQbHVsSjmmbjovJJPHrxpjmGnb4BjfWfCxjK5Y0Omg4xZEQ34kmwak1IQeoUd_bz8nj_TFl2yGjeyzUFL-E55uhOT4ddoSaRjLB2WJ3pZswVFnK3GJqR9EdMT0uWlkIytMna71vMJRb6LPGXwjG8WJRIYteSUc8zchHDlyeHnISv2OH6lUwYJ0zF9k1x-h1ibVzpBgumkxRKbOtEzWuY1nQS1x0d8Uo0Pup2cRC04HaotLgPKDvozjocpOoPA42v2_ueF_wYuGgUaLssHpV6ckQr81gofuP8N_QPn5fPoZNiR6TRVnXFkzt0f_dFeURHU4s-T77UUJWNVOPuUQrurjpyedzwJp1Hp_jDZytoIPUJxOCbK6C_HYHRfEButHcTsEgTmtdWAnIZTATqNlvoGmI63BSWdvRTh01GfYT3fdL8bnJPnFhxtBDQ1RXM1i5d-3WhTMhM6_1LNefrVA_MYsbNxuHlY5LpnRGcBJeewMUymvGVqB8pNNcexKiRpe_ZkR5KMcZ7FHLPKMhpsIIVY37NEowsYlPxrMebpNv2OTWLBYd6dFEn0MxYZXEkj7GRlPZIavZ3Srh72GDeoVKicu7gtDT4kL3jfKZ_hLGP8YGNzpJ5PS5RR39Eh7KUhfCy1gBq8TFPLBnMIlWqjgVU6KvGJnzcGmG8LCLEd9GoLYSxFAJaxBJ425Q9eYKvolQxcyl4__aJNh04eMBVQSI0X9BB7n_ZebFRJZD1vv3_0T9gvo5AU_JtJAuNozcipOIRKqokxUbTKsBAAF5tcfqLUCUbk3Ou1_sF6WlRN6gpNWgHNBCwp12-GqZBqG-nTCdx3kxssnDJ_l_FDMSEvbD6cfiF7G9IZUaTx9lo_IkoueyPIy4rYNowaJqI2mRgXtLTZgol9TuHeW59rmVknS06eFwskE98MMOiIvvR07Ld1-y-QKKEX64kY3lT_HsgEPivKux_dQiaZhrd438LwiBEkaULYC8QrJx1OSBT3FN2F1kIPDossicI1hIT2BahJj1A09o0K-Uo3quak-weY21QshyUy9WTLbeR_i-dOZknip-NQ7KXWTkSHhcIclhG1boxtUDPUvezKct-9QUqkkNY-piCoFrQ6Oh0K94oo4MprrnfP0eu2mAG6lAfE1InFw5bMA9Ui9Dxbmv-2sqLx7sVY9L1gxKEIsjmd_YIbQZL2IFk9LDWZNeSIRfUWno1WXJ-V7EaqT3Ca-rualXQguwqon8IfU59PmIPm4zDgQUvF5DrpRmfMAkkeiJiidRSDK17-FpI4J9p_lQ15wYwWFuqcJJNtXCw7TSCJg4SFx1ZLa_8d7kKdT9VqlRMlUH9nJ3rLB4gz7Sh9zyUV6l8mD6ZzLCNdFoim2FpWYlbnPiAgYdGudyeE6LrXnErimvSYk4HnDm9Z4Ji-j_owecQC4ZMQbUqkyrE0tRBE0QHiTX9UDPLM6NKUNw44I_1qgUYIGvJnspMjff4bF_2MlQQywnQT0DlE2vBApgoQsMrWZ_K66IJikbxz0EH7TVFVotnBbzdwEQPj8G02ah1-Ayu4SpncMMdjwjX4x61iMAD_rwnmYko9PMDFMLl9TYpwg24_odZUxn-8pYYCEf4O2Twj4NKgIr5FInZvoqYqsKJVxV1fq7Bf3UJb8IDsfzL8b3FIL6pLlhf8YT7Igbxk-5pRIWkmo8TDgKYGkTuZBICGLeymoFTNH8p5jdY60snzqqzFeDMVpyXsdKFptNCaLaZ8CA3hTqSAKS677UWnPkEGoF8C-JjZAsno4kPe5.mX1ZyiFKa_KXfg-PL5fuOQ';

const authHeaders = {
  'Cookie': `__Secure-next-auth.session-token=${SESSION_COOKIE}`,
  'Content-Type': 'application/json'
};

async function uploadAndTranscribe(): Promise<string | null> {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   STEP 1: Upload & Transcribe             ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  if (!fs.existsSync(TEST_FILE_PATH)) {
    console.error(`❌ Test file not found: ${TEST_FILE_PATH}`);
    return null;
  }

  const fileBuffer = fs.readFileSync(TEST_FILE_PATH);
  const fileSize = fileBuffer.length;
  const filename = path.basename(TEST_FILE_PATH);

  console.log(`📁 File: ${filename} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);

  // Get upload credentials
  console.log('🔑 Getting upload credentials...');
  const credsResponse = await fetch(`${API_BASE}/api/transcribe/upload-url`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ userId: USER_ID })
  });

  if (!credsResponse.ok) {
    console.error(`❌ Credentials failed: ${credsResponse.status}`);
    return null;
  }

  const creds = await credsResponse.json() as any;
  console.log(`✅ Got credentials`);

  // Upload to AssemblyAI
  console.log('📤 Uploading to AssemblyAI...');
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
    return null;
  }

  const uploadData = await uploadResponse.json() as any;
  console.log(`✅ Uploaded: ${uploadData.upload_url}`);

  // Start transcription directly with AssemblyAI
  console.log('🎙️  Starting transcription...');
  const transcribeResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'authorization': creds.auth_token,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: uploadData.upload_url,
      speaker_labels: true
    })
  });

  if (!transcribeResponse.ok) {
    console.error(`❌ Transcription start failed: ${transcribeResponse.status}`);
    const errorText = await transcribeResponse.text();
    console.error(errorText);
    return null;
  }

  const transcribeData = await transcribeResponse.json() as any;
  console.log(`✅ Transcript ID: ${transcribeData.id}`);

  return transcribeData.id;
}

async function pollTranscription(transcriptId: string): Promise<any | null> {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   STEP 2: Waiting for completion          ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  const maxAttempts = 120; // 10 minutes
  const pollInterval = 5000; // 5 seconds
  const ASSEMBLYAI_API_KEY = 'b33ccce950894067b89588381d61cddb';

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    // Poll AssemblyAI directly
    const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { 'authorization': ASSEMBLYAI_API_KEY }
    });

    if (!statusResponse.ok) {
      if (i % 6 === 0) {
        console.log(`⏳ Polling... ${Math.floor(i * pollInterval / 1000)}s elapsed (API check failed, will retry)`);
      }
      continue;
    }

    const result = await statusResponse.json() as any;

    if (result.status === 'completed') {
      console.log('\n✅ Transcription complete!');
      console.log(`📝 Text: ${result.text.substring(0, 100)}...`);
      console.log(`⏱️  Duration: ${result.audio_duration}s`);
      console.log(`👥 Utterances: ${result.utterances?.length || 0}`);
      console.log(`🆔 ID: ${result.id}`);
      return {
        id: result.id,
        text: result.text,
        duration: result.audio_duration,
        speakers: result.utterances?.length || 0
      };
    }

    if (result.status === 'error') {
      console.error(`❌ Transcription failed: ${result.error}`);
      return null;
    }

    // Progress indicator
    if (i % 6 === 0) {
      console.log(`⏳ Status: ${result.status}... ${Math.floor(i * pollInterval / 1000)}s elapsed`);
    }
  }

  console.error('❌ Timeout waiting for transcription');
  return null;
}

async function testExport(transcriptionId: string): Promise<boolean> {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   STEP 3: Testing export                  ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  console.log(`📤 Exporting transcription ${transcriptionId}...`);

  const exportResponse = await fetch(`${API_BASE}/api/transcribe/save-to-drive`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      transcriptionId,
      multiFormat: true
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
  console.log(`📄 File: ${exportData.fileName}`);
  console.log(`🔗 Link: ${exportData.webViewLink}`);
  console.log(`💬 Message: ${exportData.message}`);

  return true;
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   Automated End-to-End Test               ║');
  console.log('║   (With Authentication)                   ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  try {
    // Step 1: Upload and start transcription
    const transcriptId = await uploadAndTranscribe();
    if (!transcriptId) {
      console.error('\n❌ Upload/transcription failed');
      process.exit(1);
    }

    // Step 2: Wait for transcription to complete
    const result = await pollTranscription(transcriptId);
    if (!result || !result.id) {
      console.error('\n❌ Transcription did not complete');
      process.exit(1);
    }

    // Step 3: Test export
    const exportSuccess = await testExport(result.id);
    if (!exportSuccess) {
      console.error('\n❌ Export failed');
      process.exit(1);
    }

    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║   ✅ ALL TESTS PASSED!                    ║');
    console.log('╚═══════════════════════════════════════════╝\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
