/**
 * Quick script to add test cost data to verify tracking is working
 */

import 'dotenv/config';

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

// Test cost records to insert
const testCosts = [
  {
    userId: 'zach.kimble@gmail.com',
    model: 'gpt-4o-mini',
    endpoint: '/api/chat',
    inputTokens: 1500,
    outputTokens: 500,
  },
  {
    userId: 'zach.kimble@gmail.com',
    model: 'gpt-5',
    endpoint: '/api/chat',
    inputTokens: 3000,
    outputTokens: 1200,
  },
  {
    userId: 'zach.kimble@gmail.com',
    model: 'claude-3-5-sonnet-20241022',
    endpoint: '/api/chat',
    inputTokens: 2500,
    outputTokens: 800,
  },
  {
    userId: 'zach.kimble@gmail.com',
    model: 'gpt-4o',
    endpoint: '/api/chat',
    inputTokens: 2000,
    outputTokens: 600,
  },
  {
    userId: 'zach.kimble@gmail.com',
    model: 'assemblyai-transcription',
    endpoint: '/api/transcribe',
    inputTokens: 3600, // 1 hour in seconds
    outputTokens: 0,
  },
];

async function addTestCosts() {
  console.log('🧪 Adding test cost data...\n');

  // First, get the user UUID
  console.log('1️⃣  Fetching user ID...');
  const userResponse = await fetch(`${API_URL}/api/users?email=zach.kimble@gmail.com`);
  const userData = await userResponse.json();

  if (!userData.success) {
    console.error('❌ Failed to get user:', userData.error);
    return;
  }

  const userId = userData.user.id;
  console.log(`✅ Found user: ${userData.user.name} (${userId})\n`);

  // Add each test cost
  console.log('2️⃣  Inserting test cost records...');
  let successCount = 0;

  for (const cost of testCosts) {
    try {
      const response = await fetch(`${API_URL}/api/costs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          model: cost.model,
          endpoint: cost.endpoint,
          inputTokens: cost.inputTokens,
          outputTokens: cost.outputTokens,
          metadata: {
            test: true,
            source: 'test-script'
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log(`   ✅ ${cost.model}: $${data.cost.toFixed(4)}`);
        successCount++;
      } else {
        console.error(`   ❌ ${cost.model}: ${data.error}`);
      }
    } catch (error: any) {
      console.error(`   ❌ ${cost.model}: ${error.message}`);
    }
  }

  console.log(`\n✅ Successfully added ${successCount}/${testCosts.length} test records\n`);

  // Verify the data
  console.log('3️⃣  Verifying cost summary...');
  try {
    const summaryResponse = await fetch(`${API_URL}/api/costs?action=summary&userId=${userId}`);
    const summaryData = await summaryResponse.json();

    if (summaryData.error) {
      console.error('❌ Error:', summaryData.error);
    } else {
      console.log('📊 Current spending:');
      console.log(`   - Hourly: $${summaryData.hourly.used.toFixed(4)} (${summaryData.hourly.percentage.toFixed(1)}%)`);
      console.log(`   - Daily: $${summaryData.daily.used.toFixed(4)} (${summaryData.daily.percentage.toFixed(1)}%)`);
      console.log(`   - Monthly: $${summaryData.monthly.used.toFixed(4)} (${summaryData.monthly.percentage.toFixed(1)}%)`);
      console.log(`   - Recent calls: ${summaryData.recentCalls?.length || 0}`);
    }
  } catch (error: any) {
    console.error('❌ Failed to fetch summary:', error.message);
  }

  console.log('\n🌐 View costs at: http://localhost:3001/costs\n');
}

// Run the script
addTestCosts().catch(console.error);
