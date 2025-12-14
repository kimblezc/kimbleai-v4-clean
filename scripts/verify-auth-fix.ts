/**
 * Verification script for NEXTAUTH_URL fix
 *
 * This script verifies that the authentication configuration is correct
 * after fixing the NEXTAUTH_URL environment variable.
 */

const PRODUCTION_URL = 'https://www.kimbleai.com';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

const results: TestResult[] = [];

async function runTests() {
  console.log('🔍 AUTHENTICATION FIX VERIFICATION\n');
  console.log('=' . repeat(60));
  console.log(`Production URL: ${PRODUCTION_URL}`);
  console.log('=' . repeat(60) + '\n');

  // Test 1: Health check
  try {
    console.log('1️⃣  Testing health endpoint...');
    const healthResponse = await fetch(`${PRODUCTION_URL}/api/health`);
    const healthData = await healthResponse.json();

    if (healthResponse.ok) {
      results.push({
        name: 'Health Check',
        status: 'PASS',
        message: `API is healthy (${healthData.timestamp})`
      });
    } else {
      results.push({
        name: 'Health Check',
        status: 'FAIL',
        message: `Health check failed with status ${healthResponse.status}`
      });
    }
  } catch (error) {
    results.push({
      name: 'Health Check',
      status: 'FAIL',
      message: `Error: ${error}`
    });
  }

  // Test 2: NextAuth configuration endpoint accessibility
  try {
    console.log('2️⃣  Testing NextAuth endpoint...');
    const authResponse = await fetch(`${PRODUCTION_URL}/api/auth/providers`);
    const authData = await authResponse.json();

    if (authResponse.ok && authData.google) {
      results.push({
        name: 'NextAuth Configuration',
        status: 'PASS',
        message: 'Google provider is configured'
      });
    } else {
      results.push({
        name: 'NextAuth Configuration',
        status: 'FAIL',
        message: 'Google provider not found or endpoint inaccessible'
      });
    }
  } catch (error) {
    results.push({
      name: 'NextAuth Configuration',
      status: 'FAIL',
      message: `Error: ${error}`
    });
  }

  // Test 3: OAuth callback endpoint accessibility
  try {
    console.log('3️⃣  Testing OAuth callback endpoint...');
    const callbackResponse = await fetch(`${PRODUCTION_URL}/api/auth/callback/google`, {
      redirect: 'manual' // Don't follow redirects
    });

    // We expect a redirect (3xx status) or some response
    if (callbackResponse.status === 302 || callbackResponse.status === 307 || callbackResponse.status === 400) {
      results.push({
        name: 'OAuth Callback Endpoint',
        status: 'PASS',
        message: `Endpoint is accessible (status: ${callbackResponse.status})`
      });
    } else {
      results.push({
        name: 'OAuth Callback Endpoint',
        status: 'WARN',
        message: `Unexpected status: ${callbackResponse.status} (may be normal)`
      });
    }
  } catch (error) {
    results.push({
      name: 'OAuth Callback Endpoint',
      status: 'FAIL',
      message: `Error: ${error}`
    });
  }

  // Test 4: Check signin page loads
  try {
    console.log('4️⃣  Testing signin page...');
    const signinResponse = await fetch(`${PRODUCTION_URL}/auth/signin`);

    if (signinResponse.ok) {
      results.push({
        name: 'Signin Page',
        status: 'PASS',
        message: 'Signin page loads correctly'
      });
    } else {
      results.push({
        name: 'Signin Page',
        status: 'FAIL',
        message: `Signin page returned status ${signinResponse.status}`
      });
    }
  } catch (error) {
    results.push({
      name: 'Signin Page',
      status: 'FAIL',
      message: `Error: ${error}`
    });
  }

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60) + '\n');

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message}\n`);

    if (result.status === 'PASS') passed++;
    else if (result.status === 'FAIL') failed++;
    else warnings++;
  });

  console.log('='.repeat(60));
  console.log(`Total: ${results.length} tests | ✅ ${passed} passed | ❌ ${failed} failed | ⚠️ ${warnings} warnings`);
  console.log('='.repeat(60) + '\n');

  // Manual verification steps
  console.log('🔧 MANUAL VERIFICATION REQUIRED:\n');
  console.log('1. Google Cloud Console OAuth Configuration:');
  console.log('   - Visit: https://console.cloud.google.com/apis/credentials');
  console.log('   - Verify redirect URI: https://www.kimbleai.com/api/auth/callback/google');
  console.log('   - Ensure both test users are added (zach.kimble@gmail.com, becky.aza.kimble@gmail.com)\n');

  console.log('2. User Re-Authentication Required:');
  console.log('   - All existing users must sign out and sign back in');
  console.log('   - Old session tokens created with incorrect NEXTAUTH_URL are invalid');
  console.log('   - Visit: https://www.kimbleai.com/api/auth/signout\n');

  console.log('3. Test Google Integrations:');
  console.log('   - After re-authentication, test Gmail: /api/google/gmail?action=search');
  console.log('   - Test Drive: /api/google/drive?action=list');
  console.log('   - Test Calendar: /api/google/calendar?action=list\n');

  console.log('4. Monitor Cron Jobs:');
  console.log('   - Watch Railway logs for next cron run');
  console.log('   - Should see: "[CRON] Index Attachments completed successfully"');
  console.log('   - No more "User not authenticated" errors\n');

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
