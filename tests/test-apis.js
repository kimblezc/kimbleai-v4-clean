// Test key API endpoints
const baseUrl = 'https://www.kimbleai.com';

const tests = [
  {
    name: 'Health Check (should be public)',
    url: '/api/health',
    method: 'GET',
    expectAuth: false
  },
  {
    name: 'Status Check (should be public)',
    url: '/api/status',
    method: 'GET',
    expectAuth: false
  },
  {
    name: 'Agent Monitor',
    url: '/api/agents/monitor',
    method: 'GET',
    expectAuth: true
  },
  {
    name: 'Search Endpoint',
    url: '/api/search?q=test',
    method: 'GET',
    expectAuth: true
  }
];

(async () => {
  console.log('🔍 Testing API Endpoints\n');
  console.log(`Base URL: ${baseUrl}\n`);

  for (const test of tests) {
    try {
      const response = await fetch(`${baseUrl}${test.url}`, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      const status = response.status;

      if (status === 401 && test.expectAuth) {
        console.log(`✅ ${test.name}`);
        console.log(`   Status: ${status} (Auth required as expected)`);
      } else if (status === 200 && !test.expectAuth) {
        console.log(`✅ ${test.name}`);
        console.log(`   Status: ${status} (Public as expected)`);
      } else if (status === 401 && !test.expectAuth) {
        console.log(`❌ ${test.name}`);
        console.log(`   Status: ${status} (Should be public!)`);
      } else if (status === 200 && test.expectAuth) {
        console.log(`⚠️  ${test.name}`);
        console.log(`   Status: ${status} (Working, but should require auth)`);
      } else {
        console.log(`⚠️  ${test.name}`);
        console.log(`   Status: ${status}`);
        console.log(`   Response: ${JSON.stringify(data).substring(0, 100)}`);
      }
      console.log('');
    } catch (error) {
      console.log(`❌ ${test.name}`);
      console.log(`   Error: ${error.message}`);
      console.log('');
    }
  }

  console.log('\n📝 Notes:');
  console.log('- Health/Status endpoints should be public for monitoring');
  console.log('- Protected endpoints returning 401 is expected behavior');
})();
