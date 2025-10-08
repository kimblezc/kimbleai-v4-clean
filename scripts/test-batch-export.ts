// Test batch export functionality
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_BASE = 'https://www.kimbleai.com';
const SESSION_COOKIE = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..lYQBlhxXPeaPL9Ve.a8OQ-7yZXp-k9_pxWRkImqOFJcR5UKanb1AtMqDxsu_f6EFdAaeOg4jvNmCAxnXUdfSNjQHBy7z9vC8mtjrpH5G9a83fRjx6uH9FmcYsi25WF9YErhzffXVeSWQeADbEAb5tZlXqjfNaR1dwLbfupG0C0tu0mKBMNrnph4XsREB0Rxyu5mIpvgAKnIYKSlPPm8H2LTNZDWKIK-Q6YGfLF2VII_62nI9CFJDPp30m-tbFfZ0tNX6gtfSK64qoYuV1fKR8LdBSimlZQFvmIVXuNDKsvhwNUjkpom7CFO49yDLDu3AmPLTWYe6pIDOHNvg8FSKAAhYvFFEO2kgIqq-V4ZVT-Gjvnhictz8NIKYngbj59OAy7zA28yMY4DTuWKJ13ujDF2MlE4Pimw5F5t65Xb6YCh25HO84ANOE405SelkErlVk6LKGvu1yU4tsmqyRBYScjnFvSSK0V2XRBk1zrihqURdtWMAuohEPTUNYa3cs7ao5NELu8FJ3ikWiDXs5_bQODBFmvkRmYtlrxE_8xxAo7OMiTO-Qjh2XjrkeQhe98MeNwL7UgaiZHYt80oLYV0Oeq01VAAHGPnkGzSRcI3ysBt4HEYsL2zgHoqWgy8sH_GiCw5_aD6oB8VJRqjyJfu0-Aj6hKiXAkuPv0iVGhi1LiiPmJNi5e0nUvgwbhEy1rDWZPq3yzmXliqBxwJy1C1CQbHVsSjmmbjovJJPHrxpjmGnb4BjfWfCxjK5Y0Omg4xZEQ34kmwak1IQeoUd_bz8nj_TFl2yGjeyzUFL-E55uhOT4ddoSaRjLB2WJ3pZswVFnK3GJqR9EdMT0uWlkIytMna71vMJRb6LPGXwjG8WJRIYteSUc8zchHDlyeHnISv2OH6lUwYJ0zF9k1x-h1ibVzpBgumkxRKbOtEzWuY1nQS1x0d8Uo0Pup2cRC04HaotLgPKDvozjocpOoPA42v2_ueF_wYuGgUaLssHpV6ckQr81gofuP8N_QPn5fPoZNiR6TRVnXFkzt0f_dFeURHU4s-T77UUJWNVOPuUQrurjpyedzwJp1Hp_jDZytoIPUJxOCbK6C_HYHRfEButHcTsEgTmtdWAnIZTATqNlvoGmI63BSWdvRTh01GfYT3fdL8bnJPnFhxtBDQ1RXM1i5d-3WhTMhM6_1LNefrVA_MYsbNxuHlY5LpnRGcBJeewMUymvGVqB8pNNcexKiRpe_ZkR5KMcZ7FHLPKMhpsIIVY37NEowsYlPxrMebpNv2OTWLBYd6dFEn0MxYZXEkj7GRlPZIavZ3Srh72GDeoVKicu7gtDT4kL3jfKZ_hLGP8YGNzpJ5PS5RR39Eh7KUhfCy1gBq8TFPLBnMIlWqjgVU6KvGJnzcGmG8LCLEd9GoLYSxFAJaxBJ425Q9eYKvolQxcyl4__aJNh04eMBVQSI0X9BB7n_ZebFRJZD1vv3_0T9gvo5AU_JtJAuNozcipOIRKqokxUbTKsBAAF5tcfqLUCUbk3Ou1_sF6WlRN6gpNWgHNBCwp12-GqZBqG-nTCdx3kxssnDJ_l_FDMSEvbD6cfiF7G9IZUaTx9lo_IkoueyPIy4rYNowaJqI2mRgXtLTZgol9TuHeW59rmVknS06eFwskE98MMOiIvvR07Ld1-y-QKKEX64kY3lT_HsgEPivKux_dQiaZhrd438LwiBEkaULYC8QrJx1OSBT3FN2F1kIPDossicI1hIT2BahJj1A09o0K-Uo3quak-weY21QshyUy9WTLbeR_i-dOZknip-NQ7KXWTkSHhcIclhG1boxtUDPUvezKct-9QUqkkNY-piCoFrQ6Oh0K94oo4MprrnfP0eu2mAG6lAfE1InFw5bMA9Ui9Dxbmv-2sqLx7sVY9L1gxKEIsjmd_YIbQZL2IFk9LDWZNeSIRfUWno1WXJ-V7EaqT3Ca-rualXQguwqon8IfU59PmIPm4zDgQUvF5DrpRmfMAkkeiJiidRSDK17-FpI4J9p_lQ15wYwWFuqcJJNtXCw7TSCJg4SFx1ZLa_8d7kKdT9VqlRMlUH9nJ3rLB4gz7Sh9zyUV6l8mD6ZzLCNdFoim2FpWYlbnPiAgYdGudyeE6LrXnErimvSYk4HnDm9Z4Ji-j_owecQC4ZMQbUqkyrE0tRBE0QHiTX9UDPLM6NKUNw44I_1qgUYIGvJnspMjff4bF_2MlQQywnQT0DlE2vBApgoQsMrWZ_K66IJikbxz0EH7TVFVotnBbzdwEQPj8G02ah1-Ayu4SpncMMdjwjX4x61iMAD_rwnmYko9PMDFMLl9TYpwg24_odZUxn-8pYYCEf4O2Twj4NKgIr5FInZvoqYqsKJVxV1fq7Bf3UJb8IDsfzL8b3FIL6pLlhf8YT7Igbxk-5pRIWkmo8TDgKYGkTuZBICGLeymoFTNH8p5jdY60snzqqzFeDMVpyXsdKFptNCaLaZ8CA3hTqSAKS677UWnPkEGoF8C-JjZAsno4kPe5.mX1ZyiFKa_KXfg-PL5fuOQ';

const authHeaders = {
  'Cookie': `__Secure-next-auth.session-token=${SESSION_COOKIE}`,
  'Content-Type': 'application/json'
};

async function testBatchExport() {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   Batch Export Test                       ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  // For testing, we'll use transcription IDs from recent exports
  // In a real scenario, you would create multiple transcriptions first

  // Get recent transcriptions from database to use for batch export test
  console.log('📋 Fetching recent transcriptions from database...\n');

  const { data: transcriptions, error } = await supabase
    .from('audio_transcriptions')
    .select('id, filename')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error || !transcriptions || transcriptions.length === 0) {
    console.log('⚠️  No transcriptions found in database.');
    console.log('   Using mock transcription IDs from recent tests...\n');

    // Use IDs from our recent automated tests
    const mockIds = [
      '552b1868-99f7-4a35-853d-c9460f715c56', // Most recent test
      '46d88db1-f19c-43f9-aa55-ca35d6331d5e', // Previous test
      'c6cdd163-2366-43f3-b2ba-8c8c78ff3c44'  // Earlier test
    ];

    console.log('📦 Testing batch export with 3 transcription IDs:\n');
    mockIds.forEach((id, i) => {
      console.log(`   ${i + 1}. ${id}`);
    });

    await performBatchExport(mockIds);
  } else {
    console.log(`✅ Found ${transcriptions.length} transcriptions in database:\n`);
    transcriptions.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.filename} (${t.id})`);
    });

    const ids = transcriptions.map(t => t.id);
    await performBatchExport(ids);
  }
}

async function performBatchExport(transcriptionIds: string[]) {
  console.log('\n🚀 Starting batch export...\n');

  try {
    const response = await fetch(`${API_BASE}/api/transcribe/batch-export`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        transcriptionIds,
        category: 'batch-test',
        userId: 'zach'
      })
    });

    console.log(`📡 Response status: ${response.status}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Batch export failed:');
      console.error(errorText);
      return;
    }

    const data = await response.json() as any;

    console.log('✅ Batch Export Complete!\n');
    console.log('═'.repeat(60));
    console.log(`📊 Results:`);
    console.log(`   Total transcriptions: ${data.total}`);
    console.log(`   Successfully exported: ${data.exported}`);
    console.log(`   Failed: ${data.failed}`);
    console.log(`   Message: ${data.message}`);
    console.log('═'.repeat(60));

    if (data.results && data.results.length > 0) {
      console.log(`\n✅ Successful Exports (${data.results.length}):\n`);
      data.results.forEach((result: any, i: number) => {
        console.log(`   ${i + 1}. Transcription: ${result.transcriptionId}`);
        if (result.files) {
          result.files.forEach((file: any) => {
            console.log(`      • ${file.format}: ${file.fileName}`);
          });
        }
        console.log('');
      });
    }

    if (data.errors && data.errors.length > 0) {
      console.log(`\n❌ Failed Exports (${data.errors.length}):\n`);
      data.errors.forEach((error: any, i: number) => {
        console.log(`   ${i + 1}. Transcription: ${error.transcriptionId}`);
        console.log(`      Error: ${error.error}\n`);
      });
    }

    // Test export logs
    console.log('\n📜 Fetching export logs...\n');

    const logsResponse = await fetch(`${API_BASE}/api/export-logs?userId=zach&limit=5`, {
      headers: authHeaders
    });

    if (logsResponse.ok) {
      const logsData = await logsResponse.json() as any;
      console.log(`✅ Found ${logsData.total} recent export logs:\n`);

      logsData.logs?.slice(0, 3).forEach((log: any, i: number) => {
        console.log(`   ${i + 1}. ${log.export_type.toUpperCase()} export`);
        console.log(`      Date: ${new Date(log.created_at).toLocaleString()}`);
        console.log(`      Transcriptions: ${log.transcription_count}`);
        console.log(`      Success: ${log.success_count} | Failed: ${log.error_count}`);
        if (log.category) {
          console.log(`      Project: ${log.category}`);
        }
        console.log('');
      });
    }

  } catch (error: any) {
    console.error('❌ Batch export test failed:', error.message);
    console.error(error.stack);
  }
}

testBatchExport();
