#!/usr/bin/env tsx
/**
 * Test MCP Server Connection
 * Simulates connecting to MCP servers to debug issues
 */

import { MCPClient } from '../lib/mcp/mcp-client';
import type { MCPServerConfig } from '../lib/mcp/types';

const filesystemConfig: MCPServerConfig = {
  id: 'filesystem-test',
  name: 'Filesystem Test',
  description: 'Test filesystem MCP server',
  transport: 'stdio',
  command: 'npx',
  args: ['@modelcontextprotocol/server-filesystem', '/tmp'],
  enabled: true,
  timeout: 30000,
};

async function testConnection() {
  console.log('🧪 Testing MCP Filesystem Connection');
  console.log('='.repeat(60));

  const client = new MCPClient(filesystemConfig);

  try {
    console.log('1. Creating client...');
    console.log(`   Command: ${filesystemConfig.command}`);
    console.log(`   Args: ${JSON.stringify(filesystemConfig.args)}`);

    console.log('\n2. Connecting to server...');
    await client.connect();

    console.log('✅ Connected successfully!');

    console.log('\n3. Listing tools...');
    const tools = await client.listTools();
    console.log(`✅ Found ${tools.length} tools:`);
    tools.forEach(tool => {
      console.log(`   - ${tool.name}`);
    });

    console.log('\n4. Disconnecting...');
    await client.disconnect();
    console.log('✅ Disconnected successfully!');

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    if (error.originalError) {
      console.error('Original error:', error.originalError);
    }
    console.log('\n' + '='.repeat(60));
    console.log('❌ TEST FAILED');
    process.exit(1);
  }
}

testConnection();
