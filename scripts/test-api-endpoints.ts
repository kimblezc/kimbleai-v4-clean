/**
 * Test script to verify API endpoints return data correctly
 * Usage: npx tsx scripts/test-api-endpoints.ts <base-url>
 * Example: npx tsx scripts/test-api-endpoints.ts https://kimbleai.com
 */

async function testAPIEndpoints(baseUrl: string) {
  console.log('🧪 Testing API Endpoints\n');
  console.log('Base URL:', baseUrl);
  console.log('═'.repeat(60), '\n');

  // Test 1: Projects API
  console.log('📁 Testing Projects API...');
  try {
    const projectsResponse = await fetch(`${baseUrl}/api/projects?userId=zach`);
    const projectsData = await projectsResponse.json();

    console.log('Status:', projectsResponse.status);
    console.log('Success:', projectsData.success);
    console.log('Projects count:', projectsData.projects?.length || 0);
    console.log('Projects:', JSON.stringify(projectsData.projects, null, 2));

    if (projectsData.projects?.length > 0) {
      console.log('✅ Projects API working - returned', projectsData.projects.length, 'projects\n');
    } else {
      console.log('⚠️  Projects API returned empty array\n');
    }
  } catch (error) {
    console.log('❌ Projects API failed:', error, '\n');
  }

  // Test 2: Conversations API
  console.log('💬 Testing Conversations API...');
  try {
    const convsResponse = await fetch(`${baseUrl}/api/conversations?userId=zach&limit=100`);
    const convsData = await convsResponse.json();

    console.log('Status:', convsResponse.status);
    console.log('Success:', convsData.success);
    console.log('Conversations count:', convsData.conversations?.length || 0);
    console.log('Sample conversation:', convsData.conversations?.[0] ? JSON.stringify(convsData.conversations[0], null, 2) : 'none');

    if (convsData.conversations?.length > 0) {
      console.log('✅ Conversations API working - returned', convsData.conversations.length, 'conversations\n');
    } else {
      console.log('⚠️  Conversations API returned empty array\n');
    }
  } catch (error) {
    console.log('❌ Conversations API failed:', error, '\n');
  }

  console.log('═'.repeat(60));
  console.log('✅ API endpoint testing complete');
}

// Get base URL from command line args
const baseUrl = process.argv[2] || 'http://localhost:3000';
testAPIEndpoints(baseUrl).catch(console.error);
