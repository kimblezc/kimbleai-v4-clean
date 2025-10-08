// Watch script - continuously test export endpoint until it works
const https = require('https');

const testEndpoint = () => {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      transcriptionId: "test-uuid-12345678",
      userId: "zach"
    });

    const options = {
      hostname: 'www.kimbleai.com',
      port: 443,
      path: '/api/transcribe/export-to-drive',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: body
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        statusCode: 0,
        body: error.message
      });
    });

    req.write(data);
    req.end();
  });
};

const formatTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false });
};

const main = async () => {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   Export Endpoint Watcher                 ║');
  console.log('║   Testing every 10 seconds...             ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  let counter = 1;

  while (true) {
    const timestamp = formatTime();
    console.log(`[${timestamp}] Test #${counter}`);

    const result = await testEndpoint();

    if (result.statusCode === 404) {
      console.log('   ❌ Still 404 - endpoint not found');
    } else if (result.statusCode === 401) {
      console.log('   ⚠️  401 Unauthorized - endpoint exists but auth issue');
      console.log(`   Response: ${result.body}`);
    } else if (result.statusCode === 500) {
      console.log('   ⚠️  500 Server Error - endpoint exists but has error');
      console.log(`   Response: ${result.body}`);
    } else if (result.statusCode === 0) {
      console.log(`   ❌ Network error: ${result.body}`);
    } else {
      console.log(`   ✅ RESPONSE CODE: ${result.statusCode}`);
      console.log(`   📄 Response: ${result.body}`);

      if (result.body.includes('Transcription not found') || result.body.includes('Not authenticated')) {
        console.log('\n╔═══════════════════════════════════════════╗');
        console.log('║   ✅ ENDPOINT IS WORKING!                 ║');
        console.log('║   (Getting expected error responses)      ║');
        console.log('╚═══════════════════════════════════════════╝\n');
        console.log('You can now test manually on the website!');
        process.exit(0);
      }
    }

    console.log('');
    counter++;

    // Wait 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
};

main().catch(console.error);
