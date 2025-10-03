// Test transcription endpoint directly
require('dotenv').config({ path: '.env.local' });

const testTranscription = async () => {
  console.log('🎤 Testing Transcription System\n');

  // Test 1: Check AssemblyAI API key
  console.log('1. Checking AssemblyAI API Key...');
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  console.log(`   API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING'}`);

  if (!apiKey) {
    console.log('   ❌ ASSEMBLYAI_API_KEY not found in environment');
    return;
  }

  // Test 2: Try to access AssemblyAI API
  console.log('\n2. Testing AssemblyAI API Access...');
  try {
    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    console.log(`   Status: ${response.status}`);

    if (response.status === 200 || response.status === 404) {
      console.log('   ✅ API key is valid (endpoint accessible)');
    } else if (response.status === 401) {
      console.log('   ❌ API key is invalid or expired');
    } else {
      const text = await response.text();
      console.log(`   ⚠️  Unexpected response: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 3: Check transcription endpoint
  console.log('\n3. Testing Local Transcription Endpoint...');
  try {
    const response = await fetch('https://www.kimbleai.com/api/transcribe/assemblyai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audioUrl: 'https://storage.googleapis.com/aai-web-samples/5_common_sports_injuries.mp3',
        userId: 'zach',
        projectId: 'test',
        filename: 'test.mp3',
        fileSize: 1000000
      })
    });

    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response: ${JSON.stringify(data, null, 2)}`);

    if (data.jobId) {
      console.log('   ✅ Transcription job created!');
      console.log(`   Job ID: ${data.jobId}`);
    } else if (data.error) {
      console.log(`   ❌ Error: ${data.error}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 4: Check daily usage
  console.log('\n4. Checking Daily Usage Stats...');
  const today = new Date().toISOString().split('T')[0];

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: transcriptions } = await supabase
    .from('audio_transcriptions')
    .select('duration, created_at')
    .eq('user_id', 'zach')
    .gte('created_at', today + 'T00:00:00Z');

  const totalSeconds = (transcriptions || []).reduce((sum, t) => sum + (t.duration || 0), 0);
  const totalHours = totalSeconds / 3600;
  const totalCost = totalHours * 0.41;

  console.log(`   Today's usage: ${totalHours.toFixed(2)} hours ($${totalCost.toFixed(2)})`);
  console.log(`   Daily limit: 50 hours ($25.00)`);
  console.log(`   Remaining: ${(50 - totalHours).toFixed(2)} hours ($${(25 - totalCost).toFixed(2)})`);
};

testTranscription().catch(console.error);
