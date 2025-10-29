/**
 * MCP Installation Diagnostic Script
 *
 * Identifies the exact point of failure in MCP server installation
 */

import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

console.log('🔍 MCP Installation Diagnostic\n');
console.log('=' .repeat(60));

async function testNpxCommand() {
  console.log('\n📌 Test 1: Check npx availability');

  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['--version'], { shell: true });

    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ npx is available: ${output.trim()}`);
        resolve(true);
      } else {
        console.log(`❌ npx not available (exit code: ${code})`);
        reject(new Error('npx not available'));
      }
    });

    proc.on('error', (error) => {
      console.log(`❌ npx error: ${error.message}`);
      reject(error);
    });
  });
}

async function testFilesystemServer() {
  console.log('\n📌 Test 2: Test filesystem MCP server spawn');

  const testDir = process.cwd();
  console.log(`   Using directory: ${testDir}`);

  return new Promise((resolve, reject) => {
    console.log('   Spawning: npx -y @modelcontextprotocol/server-filesystem');

    const proc = spawn(
      'npx',
      ['-y', '@modelcontextprotocol/server-filesystem', testDir],
      {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`   [stdout] ${data.toString().trim()}`);
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log(`   [stderr] ${data.toString().trim()}`);
    });

    // Give it 5 seconds to start
    const timeout = setTimeout(() => {
      console.log('   ⏱️  Server spawn timeout (5s) - might be OK if it started');
      proc.kill();

      if (stderr.includes('error') || stderr.includes('Error')) {
        console.log(`❌ Server failed to spawn`);
        console.log(`   Stderr: ${stderr}`);
        reject(new Error('Server spawn failed'));
      } else {
        console.log('✅ Server appears to spawn successfully');
        resolve(true);
      }
    }, 5000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0 || code === null) {
        console.log('✅ Server process started');
        resolve(true);
      } else {
        console.log(`❌ Server exited with code: ${code}`);
        console.log(`   Stderr: ${stderr}`);
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    proc.on('error', (error) => {
      clearTimeout(timeout);
      console.log(`❌ Server spawn error: ${error.message}`);
      reject(error);
    });
  });
}

async function testMCPClientConnection() {
  console.log('\n📌 Test 3: Test MCP Client connection to filesystem server');

  const testDir = process.cwd();
  console.log(`   Using directory: ${testDir}`);

  try {
    console.log('   Creating StdioClientTransport...');
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', testDir],
      env: {
        ...process.env
      }
    });

    console.log('   Creating MCP Client...');
    const client = new Client(
      {
        name: 'diagnostic-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    console.log('   Connecting to server...');
    await client.connect(transport);

    console.log('✅ Successfully connected to MCP server');

    console.log('   Listing tools...');
    const tools = await client.listTools();
    console.log(`✅ Found ${tools.tools.length} tools:`);
    tools.tools.forEach((tool: any) => {
      console.log(`      - ${tool.name}: ${tool.description || 'No description'}`);
    });

    console.log('   Closing connection...');
    await client.close();
    console.log('✅ Connection closed successfully');

    return true;
  } catch (error: any) {
    console.log(`❌ MCP Client connection failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    throw error;
  }
}

async function testPackageAvailability() {
  console.log('\n📌 Test 4: Test @modelcontextprotocol/server-filesystem package');

  return new Promise((resolve, reject) => {
    console.log('   Running: npx -y @modelcontextprotocol/server-filesystem --help');

    const proc = spawn(
      'npx',
      ['-y', '@modelcontextprotocol/server-filesystem', '--help'],
      { shell: true }
    );

    let output = '';
    let error = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      error += data.toString();
    });

    proc.on('close', (code) => {
      if (output || error.includes('Usage:')) {
        console.log('✅ Package is available and executable');
        console.log(`   Output: ${(output || error).substring(0, 200)}...`);
        resolve(true);
      } else {
        console.log(`❌ Package not available or not executable`);
        console.log(`   Exit code: ${code}`);
        console.log(`   Error: ${error}`);
        reject(new Error('Package not available'));
      }
    });

    proc.on('error', (err) => {
      console.log(`❌ Error running package: ${err.message}`);
      reject(err);
    });
  });
}

async function main() {
  const results: { test: string; passed: boolean; error?: string }[] = [];

  // Test 1: npx
  try {
    await testNpxCommand();
    results.push({ test: 'npx availability', passed: true });
  } catch (error: any) {
    results.push({ test: 'npx availability', passed: false, error: error.message });
  }

  // Test 2: Package availability
  try {
    await testPackageAvailability();
    results.push({ test: 'MCP package availability', passed: true });
  } catch (error: any) {
    results.push({ test: 'MCP package availability', passed: false, error: error.message });
  }

  // Test 3: Server spawn
  try {
    await testFilesystemServer();
    results.push({ test: 'Server spawn', passed: true });
  } catch (error: any) {
    results.push({ test: 'Server spawn', passed: false, error: error.message });
  }

  // Test 4: MCP Client connection
  try {
    await testMCPClientConnection();
    results.push({ test: 'MCP Client connection', passed: true });
  } catch (error: any) {
    results.push({ test: 'MCP Client connection', passed: false, error: error.message });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DIAGNOSTIC SUMMARY\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}\n`);

  if (failed > 0) {
    console.log('❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.test}: ${r.error}`);
    });
    console.log('');
  }

  // Recommendations
  console.log('💡 FINDINGS:\n');

  const failedTests = results.filter(r => !r.passed).map(r => r.test);

  if (failedTests.includes('npx availability')) {
    console.log('🔧 Issue: npx is not available');
    console.log('   Solution: Install Node.js from https://nodejs.org/');
    console.log('');
  }

  if (failedTests.includes('MCP package availability')) {
    console.log('🔧 Issue: @modelcontextprotocol/server-filesystem package not found');
    console.log('   Solution: The package should be auto-installed by npx -y');
    console.log('   Note: This is expected on first run, npx will download it');
    console.log('');
  }

  if (failedTests.includes('Server spawn') && !failedTests.includes('npx availability')) {
    console.log('🔧 Issue: Server fails to spawn');
    console.log('   Possible causes:');
    console.log('   1. Missing directory path argument');
    console.log('   2. Permission issues');
    console.log('   3. Package incompatibility');
    console.log('   Solution: Check the stderr output above for specific errors');
    console.log('');
  }

  if (failedTests.includes('MCP Client connection')) {
    console.log('🔧 Issue: MCP SDK Client cannot connect');
    console.log('   Possible causes:');
    console.log('   1. Server not responding on stdio');
    console.log('   2. Transport configuration issue');
    console.log('   3. SDK version mismatch');
    console.log('   Solution: Check that @modelcontextprotocol/sdk is installed correctly');
    console.log('');
  }

  if (passed === results.length) {
    console.log('✅ All tests passed! MCP filesystem server is working correctly.');
    console.log('');
    console.log('🎯 The installation should work. If it still fails in the UI:');
    console.log('   1. Check browser console for errors');
    console.log('   2. Check Next.js server logs');
    console.log('   3. Verify database tables exist');
    console.log('   4. Try manual installation via API');
    console.log('');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
