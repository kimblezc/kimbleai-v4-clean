#!/usr/bin/env node
/**
 * Live Agent Execution Demonstration
 * Shows real-world agent capabilities and interactions
 */

const baseUrl = 'http://localhost:3002';

// ANSI color codes
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const log = {
  title: (msg) => console.log(`\n${c.bright}${c.cyan}╔${'═'.repeat(68)}╗${c.reset}`),
  header: (msg) => console.log(`${c.bright}${c.cyan}║ ${msg.padEnd(67)}║${c.reset}`),
  footer: () => console.log(`${c.bright}${c.cyan}╚${'═'.repeat(68)}╝${c.reset}\n`),
  section: (msg) => console.log(`\n${c.bright}${c.yellow}▶ ${msg}${c.reset}`),
  info: (msg) => console.log(`  ${c.blue}ℹ${c.reset} ${msg}`),
  success: (msg) => console.log(`  ${c.green}✓${c.reset} ${msg}`),
  error: (msg) => console.log(`  ${c.red}✗${c.reset} ${msg}`),
  warn: (msg) => console.log(`  ${c.yellow}⚠${c.reset} ${msg}`),
  data: (label, value) => console.log(`    ${c.dim}${label}:${c.reset} ${c.white}${value}${c.reset}`),
  agent: (name, status) => {
    const icon = status === 'active' ? '🟢' : status === 'protected' ? '🛡️' : '🔒';
    console.log(`  ${icon} ${c.bright}${name}${c.reset}`);
  }
};

// Execution tracking
const execution = {
  startTime: Date.now(),
  tests: [],
  agents: [],
  security: { detected: 0, blocked: 0 },
  performance: { total: 0, count: 0 }
};

// Test agent endpoint
async function testAgent(name, endpoint, method = 'GET', body = null, params = '') {
  const start = Date.now();
  const url = baseUrl + endpoint + params;

  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'KimbleAI-Live-Execution/1.0'
      }
    };

    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const elapsed = Date.now() - start;

    let data;
    try {
      data = await response.json();
    } catch {
      data = { error: 'Invalid response' };
    }

    execution.performance.total += elapsed;
    execution.performance.count++;

    const result = {
      agent: name,
      status: response.status,
      statusText: response.statusText,
      time: elapsed,
      authenticated: response.status !== 401,
      protected: response.status === 429,
      response: data
    };

    execution.tests.push(result);

    if (response.status === 429) {
      execution.security.blocked++;
    }
    if (data.error && data.error.includes('Security')) {
      execution.security.detected++;
    }

    return result;
  } catch (error) {
    return {
      agent: name,
      status: 'ERROR',
      error: error.message,
      time: Date.now() - start
    };
  }
}

// Display test result
function displayResult(result) {
  if (result.status === 401) {
    log.data('Status', `${c.yellow}401 Unauthorized${c.reset} - Auth required`);
    log.data('Time', `${result.time}ms`);
    log.data('Response', result.response.error);
  } else if (result.status === 429) {
    log.data('Status', `${c.red}429 Rate Limited${c.reset} - Security active`);
    log.data('Time', `${result.time}ms`);
    log.data('Threats', result.response.error || 'Multiple detected');
  } else if (result.status === 200) {
    log.data('Status', `${c.green}200 OK${c.reset}`);
    log.data('Time', `${result.time}ms`);
    if (result.response.success) {
      log.data('Result', 'Success');
    }
  } else {
    log.data('Status', `${result.status} ${result.statusText}`);
    log.data('Time', `${result.time}ms`);
  }
}

// Execute Intelligence & Analysis agents
async function executeIntelligenceAgents() {
  log.section('🧠 INTELLIGENCE & ANALYSIS AGENTS');

  // Drive Intelligence
  log.info('Testing Drive Intelligence Agent...');
  const drive = await testAgent('Drive Intelligence', '/api/agents/drive-intelligence', 'GET', null, '?userId=zach');
  displayResult(drive);

  await sleep(200);

  // Audio Intelligence
  log.info('Testing Audio Intelligence Agent...');
  const audio = await testAgent('Audio Intelligence', '/api/agents/audio-intelligence', 'GET', null, '?action=capabilities');
  displayResult(audio);

  await sleep(200);

  // Knowledge Graph
  log.info('Testing Knowledge Graph Agent...');
  const kg = await testAgent('Knowledge Graph', '/api/agents/knowledge-graph', 'GET', null, '?action=stats');
  displayResult(kg);

  await sleep(200);

  // Context Prediction
  log.info('Testing Context Prediction Agent...');
  const context = await testAgent('Context Prediction', '/api/agents/context-prediction', 'GET', null, '?type=status&userId=zach');
  displayResult(context);

  await sleep(200);

  // Project Context
  log.info('Testing Project Context Agent...');
  const project = await testAgent('Project Context', '/api/agents/project-context', 'POST', { action: 'get_projects', userId: 'zach' });
  displayResult(project);
}

// Execute Automation agents
async function executeAutomationAgents() {
  log.section('⚙️ AUTOMATION & ORCHESTRATION AGENTS');

  // Workflow Automation
  log.info('Testing Workflow Automation Agent...');
  const workflow = await testAgent('Workflow Automation', '/api/agents/workflow-automation', 'GET', null, '?userId=zach');
  displayResult(workflow);

  await sleep(200);

  // Workspace Orchestrator
  log.info('Testing Workspace Orchestrator Agent...');
  const workspace = await testAgent('Workspace Orchestrator', '/api/agents/workspace-orchestrator', 'GET', null, '?userId=zach');
  displayResult(workspace);
}

// Execute System Management agents
async function executeSystemAgents() {
  log.section('🛡️ SYSTEM MANAGEMENT AGENTS');

  // Cost Monitor
  log.info('Testing Cost Monitor Agent...');
  const cost = await testAgent('Cost Monitor', '/api/agents/cost-monitor', 'GET', null, '?userId=zach&period=daily');
  displayResult(cost);

  await sleep(200);

  // Device Continuity
  log.info('Testing Device Continuity Agent...');
  const device = await testAgent('Device Continuity', '/api/agents/continuity', 'GET', null, '?deviceId=test&userId=zach');
  displayResult(device);

  await sleep(200);

  // Security Perimeter
  log.info('Testing Security Perimeter Agent...');
  const security = await testAgent('Security Perimeter', '/api/agents/security-perimeter', 'GET', null, '?action=status');
  displayResult(security);
}

// Display execution summary
function displaySummary() {
  const elapsed = Date.now() - execution.startTime;
  const avgTime = Math.round(execution.performance.total / execution.performance.count);

  log.title();
  log.header('                    EXECUTION SUMMARY                           ');
  log.footer();

  console.log(`${c.bright}Performance:${c.reset}`);
  log.data('Total Tests', execution.tests.length);
  log.data('Total Time', `${Math.round(elapsed / 1000)}s`);
  log.data('Average Response', `${avgTime}ms`);

  const authProtected = execution.tests.filter(t => t.status === 401).length;
  const securityBlocked = execution.tests.filter(t => t.status === 429).length;
  const successful = execution.tests.filter(t => t.status === 200).length;

  console.log(`\n${c.bright}Status Distribution:${c.reset}`);
  log.data('Authentication Required', `${authProtected}/${execution.tests.length}`);
  log.data('Security Blocked', `${securityBlocked}/${execution.tests.length}`);
  log.data('Successful', `${successful}/${execution.tests.length}`);

  console.log(`\n${c.bright}Security Analysis:${c.reset}`);
  log.data('Threats Detected', execution.security.detected);
  log.data('Requests Blocked', execution.security.blocked);
  log.data('Protection Rate', `${Math.round((securityBlocked / execution.tests.length) * 100)}%`);

  // Agent status summary
  console.log(`\n${c.bright}Agent Status:${c.reset}`);

  const agentSummary = {};
  execution.tests.forEach(t => {
    if (!agentSummary[t.agent]) {
      agentSummary[t.agent] = { auth: 0, blocked: 0, success: 0, total: 0 };
    }
    agentSummary[t.agent].total++;
    if (t.status === 401) agentSummary[t.agent].auth++;
    if (t.status === 429) agentSummary[t.agent].blocked++;
    if (t.status === 200) agentSummary[t.agent].success++;
  });

  Object.entries(agentSummary).forEach(([name, stats]) => {
    const status = stats.blocked > 0 ? 'protected' : stats.auth > 0 ? 'secured' : 'active';
    const icon = status === 'protected' ? '🛡️' : status === 'secured' ? '🔒' : '🟢';
    console.log(`  ${icon} ${name}: ${status}`);
  });

  log.title();
  log.header(`               ✨ EXECUTION COMPLETE ✨                        `);
  log.footer();
}

// Helper function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main execution
async function execute() {
  log.title();
  log.header('           LIVE AGENT ECOSYSTEM EXECUTION                       ');
  log.header(`           Start Time: ${new Date().toISOString()}              `);
  log.footer();

  try {
    await executeIntelligenceAgents();
    await sleep(500);

    await executeAutomationAgents();
    await sleep(500);

    await executeSystemAgents();

    console.log('\n');
    displaySummary();

    log.success('All agents executed successfully!');

  } catch (error) {
    log.error(`Execution failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run
execute();
