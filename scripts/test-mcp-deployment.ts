#!/usr/bin/env tsx
/**
 * MCP Deployment Test Script
 * Tests MCP server functionality on Railway deployment
 *
 * Usage: npx tsx scripts/test-mcp-deployment.ts [url]
 * Example: npx tsx scripts/test-mcp-deployment.ts https://www.kimbleai.com
 */

const BASE_URL = process.argv[2] || 'https://www.kimbleai.com';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<{ passed: boolean; details: string }>) {
  process.stdout.write(`Testing ${name}... `);
  try {
    const result = await fn();
    results.push({ name, ...result });
    console.log(result.passed ? '✅' : '❌');
    if (!result.passed) {
      console.log(`  ${result.details}`);
    }
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      details: 'Error during test',
      error: error.message
    });
    console.log('❌');
    console.log(`  Error: ${error.message}`);
  }
}

async function fetchJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

async function runTests() {
  console.log('🔮 MCP Deployment Test Suite');
  console.log('='.repeat(60));
  console.log(`Testing: ${BASE_URL}`);
  console.log('');

  // Test 1: MCP Servers Endpoint
  await test('MCP Servers API', async () => {
    const data = await fetchJson(`${BASE_URL}/api/mcp/servers`);

    if (!data.servers || !Array.isArray(data.servers)) {
      return {
        passed: false,
        details: 'Invalid response format'
      };
    }

    const connectedServers = data.servers.filter((s: any) => s.status === 'connected');
    const totalTools = data.servers.reduce((sum: number, s: any) => sum + (s.toolCount || 0), 0);

    return {
      passed: connectedServers.length > 0 && totalTools > 0,
      details: `${connectedServers.length}/${data.servers.length} servers connected, ${totalTools} tools available`
    };
  });

  // Test 2: Filesystem Server
  await test('Filesystem MCP Server', async () => {
    const data = await fetchJson(`${BASE_URL}/api/mcp/servers`);
    const filesystemServer = data.servers?.find((s: any) => s.name.toLowerCase().includes('filesystem'));

    if (!filesystemServer) {
      return { passed: false, details: 'Filesystem server not found' };
    }

    const isConnected = filesystemServer.status === 'connected';
    const hasTools = (filesystemServer.toolCount || 0) > 0;

    return {
      passed: isConnected && hasTools,
      details: `Status: ${filesystemServer.status}, Tools: ${filesystemServer.toolCount || 0}`
    };
  });

  // Test 3: GitHub Server
  await test('GitHub MCP Server', async () => {
    const data = await fetchJson(`${BASE_URL}/api/mcp/servers`);
    const githubServer = data.servers?.find((s: any) => s.name.toLowerCase().includes('github'));

    if (!githubServer) {
      return { passed: false, details: 'GitHub server not found' };
    }

    const isConnected = githubServer.status === 'connected';
    const hasTools = (githubServer.toolCount || 0) > 0;

    return {
      passed: isConnected && hasTools,
      details: `Status: ${githubServer.status}, Tools: ${githubServer.toolCount || 0}`
    };
  });

  // Test 4: Memory Server
  await test('Memory MCP Server', async () => {
    const data = await fetchJson(`${BASE_URL}/api/mcp/servers`);
    const memoryServer = data.servers?.find((s: any) => s.name.toLowerCase().includes('memory'));

    if (!memoryServer) {
      return { passed: false, details: 'Memory server not found' };
    }

    const isConnected = memoryServer.status === 'connected';
    const hasTools = (memoryServer.toolCount || 0) > 0;

    return {
      passed: isConnected && hasTools,
      details: `Status: ${memoryServer.status}, Tools: ${memoryServer.toolCount || 0}`
    };
  });

  // Test 5: MCP Init Endpoint
  await test('MCP Init Endpoint', async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/mcp/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      // Endpoint might require auth, but should return proper HTTP status
      if (response.status === 401 || response.status === 403) {
        return { passed: true, details: 'Endpoint protected (expected)' };
      }

      if (response.status === 200) {
        const data = await response.json();
        return { passed: true, details: `Initialized: ${data.message || 'success'}` };
      }

      return { passed: false, details: `Unexpected status: ${response.status}` };
    } catch (error: any) {
      return { passed: false, details: error.message };
    }
  });

  // Test 6: Tool Discovery
  await test('Tool Discovery', async () => {
    const data = await fetchJson(`${BASE_URL}/api/mcp/servers`);

    const allTools: string[] = [];
    data.servers?.forEach((server: any) => {
      if (server.availableTools) {
        allTools.push(...server.availableTools.map((t: any) => t.name || t));
      }
    });

    const uniqueTools = [...new Set(allTools)];

    return {
      passed: uniqueTools.length > 0,
      details: `${uniqueTools.length} unique tools discovered: ${uniqueTools.slice(0, 5).join(', ')}${uniqueTools.length > 5 ? '...' : ''}`
    };
  });

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Test Summary:');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.details}`);
  });

  console.log('');
  console.log(`Results: ${passed}/${total} tests passed (${passRate}%)`);
  console.log('');

  // Detailed server information
  try {
    console.log('Detailed Server Information:');
    console.log('-'.repeat(60));
    const data = await fetchJson(`${BASE_URL}/api/mcp/servers`);

    data.servers?.forEach((server: any) => {
      console.log(`\n📦 ${server.name}`);
      console.log(`   Status: ${server.status}`);
      console.log(`   Transport: ${server.transport || 'unknown'}`);
      console.log(`   Tools: ${server.toolCount || 0}`);
      if (server.availableTools && server.availableTools.length > 0) {
        console.log(`   Available Tools:`);
        server.availableTools.slice(0, 3).forEach((tool: any) => {
          const toolName = typeof tool === 'string' ? tool : tool.name;
          console.log(`     • ${toolName}`);
        });
        if (server.availableTools.length > 3) {
          console.log(`     ... and ${server.availableTools.length - 3} more`);
        }
      }
    });
  } catch (error) {
    console.log('Could not fetch detailed server information');
  }

  console.log('');

  // Exit code
  const exitCode = passed === total ? 0 : 1;
  process.exit(exitCode);
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
