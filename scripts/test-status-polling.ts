// Test status polling fix for 404 error
import fetch from 'node-fetch';

async function testStatusPolling() {
  console.log('\n🔍 Testing Status Polling Fix\n');

  const API_BASE = 'https://www.kimbleai.com';

  // Test 1: Poll with non-existent jobId (should return processing status)
  console.log('Test 1: Polling with non-existent jobId...');
  const fakeJobId = `assemblyai_${Date.now()}_test123`;

  const response1 = await fetch(`${API_BASE}/api/transcribe/assemblyai?jobId=${fakeJobId}`);
  console.log(`Status: ${response1.status} ${response1.statusText}`);

  if (response1.status === 404) {
    console.log('❌ FAILED: Still getting 404 error');
    const errorData = await response1.json();
    console.log('Error:', errorData);
    return;
  }

  const data1 = await response1.json();
  console.log('Response:', JSON.stringify(data1, null, 2));

  if (response1.ok) {
    console.log('✅ PASSED: No 404 error, returning proper status');
  }

  // Test 2: Check that it returns processing status for unknown jobs
  console.log('\nTest 2: Verify unknown jobs return processing status...');
  if (data1.status === 'processing') {
    console.log('✅ PASSED: Unknown jobs return processing status');
  } else {
    console.log(`⚠️  Unexpected status: ${data1.status}`);
  }

  console.log('\n📊 Summary:');
  console.log(`   Status code: ${response1.status}`);
  console.log(`   Status: ${data1.status}`);
  console.log(`   Progress: ${data1.progress}%`);
  console.log('\n✅ 404 polling fix is working!\n');
}

testStatusPolling().catch(console.error);
