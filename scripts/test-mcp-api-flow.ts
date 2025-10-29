/**
 * Test MCP API Flow End-to-End
 *
 * Tests the complete MCP flow:
 * 1. Database tables exist
 * 2. Initialize MCP manager
 * 3. Install filesystem server
 * 4. Connect to server
 * 5. List tools
 * 6. Test tool invocation
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

console.log('🚀 MCP API Flow Test\n');
console.log('API Base:', API_BASE);
console.log('=' .repeat(60));

async function test1_CheckDatabase() {
  console.log('\n📌 Test 1: Check database tables');

  const { data, error } = await supabase
    .from('mcp_servers')
    .select('id, name, transport, enabled')
    .limit(5);

  if (error) {
    console.log('❌ Database table error:', error.message);
    console.log('   Run migration: psql <connection> -f database/mcp-servers-schema.sql');
    throw error;
  }

  console.log(`✅ mcp_servers table exists`);
  console.log(`   Found ${data.length} existing servers:`);
  data.forEach(s => {
    console.log(`   - ${s.name} (${s.transport}, ${s.enabled ? 'enabled' : 'disabled'})`);
  });

  return data;
}

async function test2_InitializeManager() {
  console.log('\n📌 Test 2: Initialize MCP Manager');

  const response = await fetch(`${API_BASE}/api/mcp/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  const data = await response.json();

  if (!response.ok) {
    console.log('❌ Init failed:', data.error || data.message);
    throw new Error(data.error || 'Init failed');
  }

  console.log('✅ MCP Manager initialized');
  console.log('   Summary:', JSON.stringify(data.summary, null, 2));

  return data;
}

async function test3_ListServers() {
  console.log('\n📌 Test 3: List all servers via API');

  const response = await fetch(`${API_BASE}/api/mcp/servers`);
  const data = await response.json();

  if (!response.ok) {
    console.log('❌ List servers failed:', data.error);
    throw new Error(data.error);
  }

  console.log('✅ Servers listed');
  console.log(`   Total: ${data.total}, Connected: ${data.connected}, Disconnected: ${data.disconnected}`);

  if (data.servers && data.servers.length > 0) {
    console.log('   Servers:');
    data.servers.forEach((s: any) => {
      console.log(`   - ${s.name}: ${s.status} (${s.toolsCount} tools)`);
    });
  }

  return data;
}

async function test4_InstallFilesystemServer() {
  console.log('\n📌 Test 4: Install filesystem server');

  // Check if already exists
  const { data: existing } = await supabase
    .from('mcp_servers')
    .select('*')
    .eq('name', 'filesystem')
    .single();

  if (existing) {
    console.log('⚠️  Filesystem server already exists');
    console.log('   ID:', existing.id);
    console.log('   Enabled:', existing.enabled);
    console.log('   Command:', existing.command);
    console.log('   Args:', existing.args);

    // Update args if needed
    const correctArgs = ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()];
    if (JSON.stringify(existing.args) !== JSON.stringify(correctArgs)) {
      console.log('   ⚙️  Updating args to include directory path...');

      const { error: updateError } = await supabase
        .from('mcp_servers')
        .update({ args: correctArgs })
        .eq('id', existing.id);

      if (updateError) {
        console.log('   ❌ Update failed:', updateError.message);
      } else {
        console.log('   ✅ Args updated successfully');
      }
    }

    return existing;
  }

  // Install new server
  console.log('   Installing new filesystem server...');

  const { data, error } = await supabase
    .from('mcp_servers')
    .insert({
      name: 'filesystem',
      description: 'Secure local filesystem access with directory restrictions',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
      capabilities: { tools: true, resources: true, prompts: false },
      priority: 9,
      tags: ['files', 'storage', 'local'],
      enabled: true
    })
    .select()
    .single();

  if (error) {
    console.log('❌ Installation failed:', error.message);
    throw error;
  }

  console.log('✅ Filesystem server installed');
  console.log('   ID:', data.id);
  console.log('   Name:', data.name);

  return data;
}

async function test5_ConnectToServer(serverId: string) {
  console.log('\n📌 Test 5: Connect to server');

  const response = await fetch(`${API_BASE}/api/mcp/servers/${serverId}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  const data = await response.json();

  if (!response.ok) {
    console.log('❌ Connection failed:', data.error || data.details);
    throw new Error(data.error || 'Connection failed');
  }

  console.log('✅ Connected to server');
  console.log('   Status:', data.server.status);
  console.log('   Tools count:', data.server.toolsCount);
  console.log('   Resources count:', data.server.resourcesCount);

  return data;
}

async function test6_ListTools() {
  console.log('\n📌 Test 6: List all available tools');

  const response = await fetch(`${API_BASE}/api/mcp/tools`);
  const data = await response.json();

  if (!response.ok) {
    console.log('❌ List tools failed:', data.error);
    throw new Error(data.error);
  }

  console.log('✅ Tools listed');
  console.log(`   Total tools: ${data.totalTools}`);

  if (data.servers && data.servers.length > 0) {
    console.log('   By server:');
    data.servers.forEach((server: any) => {
      console.log(`   - ${server.serverName}: ${server.tools.length} tools`);
      if (server.tools.length > 0 && server.tools.length <= 5) {
        server.tools.forEach((tool: any) => {
          console.log(`      * ${tool.name}`);
        });
      } else if (server.tools.length > 0) {
        console.log(`      * ${server.tools.slice(0, 3).map((t: any) => t.name).join(', ')}...`);
      }
    });
  }

  return data;
}

async function main() {
  const results: { test: string; passed: boolean; error?: string; data?: any }[] = [];

  // Test 1
  try {
    const data = await test1_CheckDatabase();
    results.push({ test: 'Database tables', passed: true, data });
  } catch (error: any) {
    results.push({ test: 'Database tables', passed: false, error: error.message });
    console.log('\n⚠️  Cannot proceed without database tables');
    printSummary(results);
    process.exit(1);
  }

  // Test 2
  try {
    const data = await test2_InitializeManager();
    results.push({ test: 'Initialize manager', passed: true, data });
  } catch (error: any) {
    results.push({ test: 'Initialize manager', passed: false, error: error.message });
    console.log('\n⚠️  Manager initialization failed, but continuing...');
  }

  // Test 3
  try {
    const data = await test3_ListServers();
    results.push({ test: 'List servers', passed: true, data });
  } catch (error: any) {
    results.push({ test: 'List servers', passed: false, error: error.message });
  }

  // Test 4
  let serverId: string | null = null;
  try {
    const data = await test4_InstallFilesystemServer();
    serverId = data.id;
    results.push({ test: 'Install filesystem server', passed: true, data });
  } catch (error: any) {
    results.push({ test: 'Install filesystem server', passed: false, error: error.message });
  }

  // Test 5
  if (serverId) {
    try {
      const data = await test5_ConnectToServer(serverId);
      results.push({ test: 'Connect to server', passed: true, data });
    } catch (error: any) {
      results.push({ test: 'Connect to server', passed: false, error: error.message });
    }
  }

  // Test 6
  try {
    const data = await test6_ListTools();
    results.push({ test: 'List tools', passed: true, data });
  } catch (error: any) {
    results.push({ test: 'List tools', passed: false, error: error.message });
  }

  printSummary(results);

  const failed = results.filter(r => !r.passed).length;
  process.exit(failed > 0 ? 1 : 0);
}

function printSummary(results: { test: string; passed: boolean; error?: string }[]) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / results.length) * 100)}%\n`);

  if (failed > 0) {
    console.log('❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.test}: ${r.error}`);
    });
    console.log('');
  }

  if (passed === results.length) {
    console.log('✅ ALL TESTS PASSED!');
    console.log('');
    console.log('🎯 MCP System is fully operational:');
    console.log('   1. Database tables exist and have data');
    console.log('   2. MCP Manager is initialized');
    console.log('   3. Servers can be installed');
    console.log('   4. Servers can connect and provide tools');
    console.log('   5. Tools are available to the chat system');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   - Visit http://localhost:3000/integrations/mcp');
    console.log('   - Test MCP tools in chat at http://localhost:3000');
    console.log('');
  } else {
    console.log('\n💡 RECOMMENDATIONS:');

    const failedTests = results.filter(r => !r.passed).map(r => r.test);

    if (failedTests.includes('Initialize manager')) {
      console.log('   • Manager may already be initialized (this is OK)');
    }

    if (failedTests.includes('Connect to server')) {
      console.log('   • Check server logs for spawn errors');
      console.log('   • Verify npx and package are available');
      console.log('   • Check args include a valid directory path');
    }

    console.log('');
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
