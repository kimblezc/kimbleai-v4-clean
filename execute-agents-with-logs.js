// Comprehensive Agent Execution Script with Detailed Logging
const fs = require('fs');
const baseUrl = 'http://localhost:3002';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.magenta}━━━ ${msg} ━━━${colors.reset}`),
};

// Execution log storage
const executionLog = {
  startTime: new Date().toISOString(),
  agents: [],
  summary: {},
};

// Agent test configurations
const agentTests = {
  'Drive Intelligence': {
    category: 'Intelligence & Analysis',
    endpoint: '/api/agents/drive-intelligence',
    tests: [
      { method: 'GET', params: '?userId=zach', description: 'Get Drive status' },
      { method: 'POST', body: { action: 'analyze', userId: 'zach' }, description: 'Analyze Drive structure' },
    ]
  },
  'Audio Intelligence': {
    category: 'Intelligence & Analysis',
    endpoint: '/api/agents/audio-intelligence',
    tests: [
      { method: 'GET', params: '?action=capabilities', description: 'Get capabilities' },
      { method: 'GET', params: '?action=sessions&userId=zach', description: 'Get user sessions' },
    ]
  },
  'Knowledge Graph': {
    category: 'Intelligence & Analysis',
    endpoint: '/api/agents/knowledge-graph',
    tests: [
      { method: 'GET', params: '?action=stats', description: 'Get graph statistics' },
      { method: 'POST', body: { action: 'initialize' }, description: 'Initialize knowledge graph' },
    ]
  },
  'Context Prediction': {
    category: 'Intelligence & Analysis',
    endpoint: '/api/agents/context-prediction',
    tests: [
      { method: 'GET', params: '?type=status&userId=zach', description: 'Get system status' },
      { method: 'GET', params: '?type=model_performance', description: 'Get model performance' },
    ]
  },
  'Project Context': {
    category: 'Intelligence & Analysis',
    endpoint: '/api/agents/project-context',
    tests: [
      { method: 'GET', params: '', description: 'Get agent status' },
      { method: 'POST', body: { action: 'get_projects', userId: 'zach' }, description: 'Get user projects' },
    ]
  },
  'Workflow Automation': {
    category: 'Automation & Orchestration',
    endpoint: '/api/agents/workflow-automation',
    tests: [
      { method: 'GET', params: '?userId=zach', description: 'Get user workflows' },
      { method: 'POST', body: { action: 'get_workflow_templates', userId: 'zach' }, description: 'Get templates' },
    ]
  },
  'Workspace Orchestrator': {
    category: 'Automation & Orchestration',
    endpoint: '/api/agents/workspace-orchestrator',
    tests: [
      { method: 'GET', params: '?userId=zach', description: 'Get orchestrator status' },
      { method: 'POST', body: { action: 'analyze_workspace_patterns', userId: 'zach' }, description: 'Analyze patterns' },
    ]
  },
  'Cost Monitor': {
    category: 'System Management',
    endpoint: '/api/agents/cost-monitor',
    tests: [
      { method: 'GET', params: '?userId=zach&period=daily', description: 'Get daily costs' },
      { method: 'GET', params: '?userId=zach&period=weekly', description: 'Get weekly costs' },
    ]
  },
  'Device Continuity': {
    category: 'System Management',
    endpoint: '/api/agents/continuity',
    tests: [
      { method: 'GET', params: '?deviceId=test-device&userId=zach', description: 'Get device state' },
      { method: 'POST', body: { action: 'get_active_devices', userId: 'zach' }, description: 'Get active devices' },
    ]
  },
  'Security Perimeter': {
    category: 'System Management',
    endpoint: '/api/agents/security-perimeter',
    tests: [
      { method: 'GET', params: '?action=status', description: 'Get security status' },
      { method: 'GET', params: '?action=config', description: 'Get security config' },
    ]
  },
};

// Execute a single test
async function executeTest(agentName, test, endpoint) {
  const startTime = Date.now();
  const testLog = {
    method: test.method,
    description: test.description,
    timestamp: new Date().toISOString(),
  };

  try {
    const url = baseUrl + endpoint + (test.params || '');
    const options = {
      method: test.method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (test.body) {
      options.body = JSON.stringify(test.body);
    }

    const response = await fetch(url, options);
    const responseTime = Date.now() - startTime;

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { error: 'Invalid JSON response' };
    }

    testLog.status = response.status;
    testLog.statusText = response.statusText;
    testLog.responseTime = responseTime;
    testLog.success = response.ok || response.status === 401;
    testLog.authenticated = response.status !== 401;
    testLog.response = data;

    // Log the result
    const statusIcon = testLog.success ? '✓' : '✗';
    const authIcon = testLog.authenticated ? '🔓' : '🔒';
    const timeStr = `${responseTime}ms`;

    console.log(`  ${statusIcon} ${authIcon} ${test.description}`);
    console.log(`     Status: ${response.status} ${response.statusText} | Time: ${timeStr}`);

    if (data.error) {
      console.log(`     ${colors.yellow}Response: ${data.error}${colors.reset}`);
    } else if (data.success !== undefined) {
      console.log(`     ${colors.green}Success: ${data.success}${colors.reset}`);
    }

    return testLog;
  } catch (error) {
    testLog.status = 'ERROR';
    testLog.error = error.message;
    testLog.success = false;

    log.error(`  ${test.description}: ${error.message}`);
    return testLog;
  }
}

// Execute all tests for an agent
async function executeAgent(agentName, config) {
  log.section(`${agentName} (${config.category})`);
  log.info(`Endpoint: ${config.endpoint}`);

  const agentLog = {
    name: agentName,
    category: config.category,
    endpoint: config.endpoint,
    tests: [],
    startTime: new Date().toISOString(),
  };

  for (const test of config.tests) {
    const testLog = await executeTest(agentName, test, config.endpoint);
    agentLog.tests.push(testLog);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between tests
  }

  agentLog.endTime = new Date().toISOString();
  agentLog.totalTests = agentLog.tests.length;
  agentLog.successfulTests = agentLog.tests.filter(t => t.success).length;
  agentLog.authenticated = agentLog.tests.filter(t => t.authenticated).length;
  agentLog.avgResponseTime = Math.round(
    agentLog.tests.reduce((sum, t) => sum + (t.responseTime || 0), 0) / agentLog.tests.length
  );

  executionLog.agents.push(agentLog);

  console.log(`  ${colors.bright}Summary:${colors.reset} ${agentLog.successfulTests}/${agentLog.totalTests} tests successful | Avg: ${agentLog.avgResponseTime}ms`);

  return agentLog;
}

// Generate summary statistics
function generateSummary() {
  const totalAgents = executionLog.agents.length;
  const totalTests = executionLog.agents.reduce((sum, a) => sum + a.totalTests, 0);
  const successfulTests = executionLog.agents.reduce((sum, a) => sum + a.successfulTests, 0);
  const authenticatedTests = executionLog.agents.reduce((sum, a) => sum + a.authenticated, 0);
  const avgResponseTime = Math.round(
    executionLog.agents.reduce((sum, a) => sum + a.avgResponseTime, 0) / totalAgents
  );

  const byCategory = {};
  executionLog.agents.forEach(agent => {
    if (!byCategory[agent.category]) {
      byCategory[agent.category] = { agents: 0, tests: 0, successful: 0 };
    }
    byCategory[agent.category].agents++;
    byCategory[agent.category].tests += agent.totalTests;
    byCategory[agent.category].successful += agent.successfulTests;
  });

  executionLog.summary = {
    totalAgents,
    totalTests,
    successfulTests,
    authenticatedTests,
    avgResponseTime,
    byCategory,
    executionTime: new Date() - new Date(executionLog.startTime),
  };
}

// Display final summary
function displaySummary() {
  log.header('═══════════════════════════════════════════════════════════');
  log.header('                    EXECUTION SUMMARY                      ');
  log.header('═══════════════════════════════════════════════════════════');

  const s = executionLog.summary;

  console.log(`\n${colors.bright}Overall Performance:${colors.reset}`);
  console.log(`  Total Agents:        ${s.totalAgents}`);
  console.log(`  Total Tests:         ${s.totalTests}`);
  console.log(`  Successful:          ${s.successfulTests}/${s.totalTests} (${Math.round(s.successfulTests/s.totalTests*100)}%)`);
  console.log(`  Authenticated:       ${s.authenticatedTests}/${s.totalTests}`);
  console.log(`  Avg Response Time:   ${s.avgResponseTime}ms`);
  console.log(`  Total Execution:     ${Math.round(s.executionTime/1000)}s`);

  console.log(`\n${colors.bright}By Category:${colors.reset}`);
  Object.entries(s.byCategory).forEach(([category, stats]) => {
    const successRate = Math.round(stats.successful/stats.tests*100);
    console.log(`  ${category}:`);
    console.log(`    Agents: ${stats.agents} | Tests: ${stats.successful}/${stats.tests} (${successRate}%)`);
  });

  console.log(`\n${colors.bright}Agent Details:${colors.reset}`);
  executionLog.agents.forEach(agent => {
    const icon = agent.successfulTests === agent.totalTests ? '✓' : '✗';
    const authStatus = agent.authenticated > 0 ? '🔓' : '🔒';
    console.log(`  ${icon} ${authStatus} ${agent.name}`);
    console.log(`     Tests: ${agent.successfulTests}/${agent.totalTests} | Avg: ${agent.avgResponseTime}ms`);
  });

  log.header('═══════════════════════════════════════════════════════════');
}

// Save execution log to file
function saveExecutionLog() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `execution-log-${timestamp}.json`;

  fs.writeFileSync(filename, JSON.stringify(executionLog, null, 2));
  log.success(`Execution log saved to: ${filename}`);

  return filename;
}

// Main execution function
async function runExecution() {
  log.header('🚀 AGENT EXECUTION WITH DETAILED LOGGING');
  log.info(`Start Time: ${executionLog.startTime}`);
  log.info(`Target: ${baseUrl}`);

  console.log('');

  // Group agents by category
  const categories = {
    'Intelligence & Analysis': [],
    'Automation & Orchestration': [],
    'System Management': [],
  };

  Object.entries(agentTests).forEach(([name, config]) => {
    categories[config.category].push({ name, config });
  });

  // Execute each category
  for (const [category, agents] of Object.entries(categories)) {
    log.header(`\n${category.toUpperCase()}`);

    for (const { name, config } of agents) {
      await executeAgent(name, config);
    }
  }

  // Generate and display summary
  executionLog.endTime = new Date().toISOString();
  generateSummary();
  console.log('');
  displaySummary();

  // Save log
  console.log('');
  const logFile = saveExecutionLog();

  log.success('Execution completed successfully!');

  return { summary: executionLog.summary, logFile };
}

// Run the execution
runExecution().catch(error => {
  log.error(`Execution failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
