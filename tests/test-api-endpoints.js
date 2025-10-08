// Test API endpoints
require('dotenv').config({ path: '.env.local' });

// Use native fetch if available (Node 18+), otherwise fallback
const fetch = globalThis.fetch || require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = 'test-user-health-check';
const TEST_DEVICE_ID = 'test-device-' + Date.now();

async function testEndpoints() {
  console.log('=== API ENDPOINTS HEALTH CHECK ===\n');
  console.log(`Test User ID: ${TEST_USER_ID}`);
  console.log(`Test Device ID: ${TEST_DEVICE_ID}\n`);

  // Test 1: Heartbeat POST
  console.log('1. Testing POST /api/sync/heartbeat...');
  try {
    const response = await fetch(`${BASE_URL}/api/sync/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        deviceId: TEST_DEVICE_ID,
        currentContext: { test: true },
        deviceInfo: {
          deviceType: 'pc',
          deviceName: 'Test Device',
          browserInfo: { userAgent: 'Test' }
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ FAILED - Status ${response.status}: ${error}\n`);
    } else {
      const data = await response.json();
      console.log(`   ✅ SUCCESS - ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}\n`);
  }

  // Test 2: Context POST
  console.log('2. Testing POST /api/sync/context...');
  try {
    const response = await fetch(`${BASE_URL}/api/sync/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        deviceId: TEST_DEVICE_ID,
        snapshot: {
          snapshotType: 'full_state',
          contextData: { testData: 'hello' },
          metadata: { timestamp: new Date().toISOString() }
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ FAILED - Status ${response.status}: ${error}\n`);
    } else {
      const data = await response.json();
      console.log(`   ✅ SUCCESS - ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}\n`);
  }

  // Test 3: Context GET
  console.log('3. Testing GET /api/sync/context...');
  try {
    const response = await fetch(
      `${BASE_URL}/api/sync/context?userId=${TEST_USER_ID}&excludeDeviceId=${TEST_DEVICE_ID}`
    );

    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ FAILED - Status ${response.status}: ${error}\n`);
    } else {
      const data = await response.json();
      console.log(`   ✅ SUCCESS - ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}\n`);
  }

  // Test 4: Devices GET
  console.log('4. Testing GET /api/sync/devices...');
  try {
    const response = await fetch(`${BASE_URL}/api/sync/devices?userId=${TEST_USER_ID}`);

    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ FAILED - Status ${response.status}: ${error}\n`);
    } else {
      const data = await response.json();
      console.log(`   ✅ SUCCESS - ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}\n`);
  }

  // Test 5: Queue POST
  console.log('5. Testing POST /api/sync/queue...');
  try {
    const response = await fetch(`${BASE_URL}/api/sync/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        fromDeviceId: TEST_DEVICE_ID,
        payload: { type: 'test', data: 'hello' }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ FAILED - Status ${response.status}: ${error}\n`);
    } else {
      const data = await response.json();
      console.log(`   ✅ SUCCESS - ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}\n`);
  }

  // Test 6: Queue GET
  console.log('6. Testing GET /api/sync/queue...');
  try {
    const response = await fetch(`${BASE_URL}/api/sync/queue?deviceId=${TEST_DEVICE_ID}`);

    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ FAILED - Status ${response.status}: ${error}\n`);
    } else {
      const data = await response.json();
      console.log(`   ✅ SUCCESS - ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}\n`);
  }

  console.log('=== END HEALTH CHECK ===\n');
  console.log('NOTE: Server must be running on localhost:3000 for this test to work.');
  console.log('If server is not running, start it with: npm run dev\n');
}

testEndpoints().catch(console.error);
