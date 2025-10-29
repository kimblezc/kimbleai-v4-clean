/**
 * MCP System Diagnostic and Test Script
 *
 * Tests all aspects of MCP implementation:
 * - Database schema and tables
 * - Server manager initialization
 * - Server installation
 * - Backend connectivity
 * - Tool discovery
 * - Frontend integration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
  error?: any;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<any>): Promise<void> {
  console.log(`\n🔍 Running: ${name}`);
  try {
    const result = await fn();
    results.push({
      test: name,
      passed: true,
      message: 'PASSED',
      details: result
    });
    console.log(`✅ PASSED: ${name}`);
    if (result) {
      console.log('   Details:', JSON.stringify(result, null, 2).split('\n').slice(0, 5).join('\n'));
    }
  } catch (error: any) {
    results.push({
      test: name,
      passed: false,
      message: error.message,
      error: error
    });
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 MCP System Diagnostic Test Suite\n');
  console.log('=' .repeat(60));

  // ================================================================
  // TEST 1: Database Tables Exist
  // ================================================================
  await runTest('Database: Check mcp_servers table exists', async () => {
    const { data, error } = await supabase
      .from('mcp_servers')
      .select('id')
      .limit(1);

    if (error) throw error;
    return { exists: true, message: 'mcp_servers table exists' };
  });

  // ================================================================
  // TEST 2: Check Initial Data
  // ================================================================
  await runTest('Database: Check initial server data', async () => {
    const { data, error } = await supabase
      .from('mcp_servers')
      .select('*')
      .order('priority', { ascending: false });

    if (error) throw error;
    return {
      serverCount: data?.length || 0,
      servers: data?.map(s => ({ name: s.name, transport: s.transport, enabled: s.enabled }))
    };
  });

  // ================================================================
  // TEST 3: MCP Initialization API
  // ================================================================
  await runTest('API: Test /api/mcp/init endpoint', async () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/mcp/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Init failed');

    return data;
  });

  // ================================================================
  // TEST 4: List Servers API
  // ================================================================
  await runTest('API: Test /api/mcp/servers endpoint', async () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/mcp/servers`);

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'List servers failed');

    return {
      total: data.total,
      connected: data.connected,
      disconnected: data.disconnected,
      servers: data.servers?.map((s: any) => ({
        name: s.name,
        status: s.status,
        isConnected: s.isConnected
      }))
    };
  });

  // ================================================================
  // TEST 5: MCP Tools API
  // ================================================================
  await runTest('API: Test /api/mcp/tools endpoint', async () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/mcp/tools`);

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'List tools failed');

    return {
      totalTools: data.totalTools,
      serverCount: data.servers?.length,
      servers: data.servers
    };
  });

  // ================================================================
  // TEST 6: Install Filesystem Server (if not exists)
  // ================================================================
  await runTest('Install: Add filesystem server with correct args', async () => {
    // Check if filesystem server exists
    const { data: existing } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('name', 'filesystem-test')
      .single();

    if (existing) {
      return { message: 'Filesystem test server already exists', server: existing };
    }

    // Add with proper path argument
    const { data, error } = await supabase
      .from('mcp_servers')
      .insert({
        name: 'filesystem-test',
        description: 'Test filesystem server with project directory access',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
        capabilities: { tools: true, resources: true, prompts: false },
        priority: 9,
        tags: ['files', 'storage', 'test'],
        enabled: true
      })
      .select()
      .single();

    if (error) throw error;
    return { message: 'Filesystem test server installed', server: data };
  });

  // ================================================================
  // TEST 7: Check SDK Installation
  // ================================================================
  await runTest('Dependencies: Check @modelcontextprotocol/sdk', async () => {
    try {
      const pkg = await import('@modelcontextprotocol/sdk/client/index.js');
      return { installed: true, hasClient: !!pkg.Client };
    } catch (error: any) {
      throw new Error('MCP SDK not installed. Run: npm install @modelcontextprotocol/sdk');
    }
  });

  // ================================================================
  // TEST 8: Check npx availability
  // ================================================================
  await runTest('System: Check npx command availability', async () => {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('npx --version');
      return { available: true, version: stdout.trim() };
    } catch (error: any) {
      throw new Error('npx not available. Install Node.js to get npx.');
    }
  });

  // ================================================================
  // RESULTS SUMMARY
  // ================================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / total) * 100)}%\n`);

  if (failed > 0) {
    console.log('❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.test}`);
      console.log(`     Error: ${r.message}`);
    });
    console.log('');
  }

  // ================================================================
  // RECOMMENDATIONS
  // ================================================================
  console.log('💡 RECOMMENDATIONS:\n');

  const failedTests = results.filter(r => !r.passed).map(r => r.test);

  if (failedTests.some(t => t.includes('Database'))) {
    console.log('🔧 Database Issues Detected:');
    console.log('   1. Run the database migration:');
    console.log('      psql <connection-string> -f database/mcp-servers-schema.sql');
    console.log('');
  }

  if (failedTests.some(t => t.includes('SDK'))) {
    console.log('🔧 Missing MCP SDK:');
    console.log('   1. Install the SDK:');
    console.log('      npm install @modelcontextprotocol/sdk');
    console.log('');
  }

  if (failedTests.some(t => t.includes('npx'))) {
    console.log('🔧 System Dependencies:');
    console.log('   1. Install Node.js (which includes npx)');
    console.log('      Download from: https://nodejs.org/');
    console.log('');
  }

  if (failedTests.some(t => t.includes('API'))) {
    console.log('🔧 API Issues:');
    console.log('   1. Ensure the dev server is running: npm run dev');
    console.log('   2. Check environment variables are set');
    console.log('   3. Review server logs for errors');
    console.log('');
  }

  if (passed === total) {
    console.log('✅ All tests passed! MCP system is working correctly.');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Visit http://localhost:3000/integrations/mcp to manage servers');
    console.log('   2. Install additional servers from the UI');
    console.log('   3. Test MCP tools in the chat interface');
    console.log('');
  }

  // Save results to file
  const fs = await import('fs/promises');
  const resultsJson = JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: { total, passed, failed, successRate: Math.round((passed / total) * 100) },
    results
  }, null, 2);

  await fs.writeFile('mcp-test-results.json', resultsJson);
  console.log('📄 Full results saved to: mcp-test-results.json\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('❌ Test suite error:', error);
  process.exit(1);
});
