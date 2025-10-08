// Agent Testing Script
const baseUrl = 'http://localhost:3002';

const tests = {
  // Intelligence & Analysis Agents
  'Drive Intelligence': {
    method: 'GET',
    url: '/api/agents/drive-intelligence?userId=zach',
  },
  'Audio Intelligence': {
    method: 'GET',
    url: '/api/agents/audio-intelligence?action=capabilities',
  },
  'Knowledge Graph': {
    method: 'POST',
    url: '/api/agents/knowledge-graph',
    body: { action: 'stats' }
  },
  'Context Prediction': {
    method: 'GET',
    url: '/api/agents/context-prediction?type=status&userId=zach',
  },
  'Project Context': {
    method: 'GET',
    url: '/api/agents/project-context',
  },

  // Automation & Orchestration
  'Workflow Automation': {
    method: 'GET',
    url: '/api/agents/workflow-automation?userId=zach',
  },
  'Workspace Orchestrator': {
    method: 'GET',
    url: '/api/agents/workspace-orchestrator?userId=zach',
  },

  // System Management
  'Cost Monitor': {
    method: 'GET',
    url: '/api/agents/cost-monitor?userId=zach',
  },
  'Device Continuity': {
    method: 'GET',
    url: '/api/agents/continuity?deviceId=test-device&userId=zach',
  },
  'Security Perimeter': {
    method: 'GET',
    url: '/api/agents/security-perimeter?action=status',
  },
};

async function testAgent(name, config) {
  try {
    const options = {
      method: config.method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (config.body) {
      options.body = JSON.stringify(config.body);
    }

    const response = await fetch(baseUrl + config.url, options);
    const data = await response.json();

    return {
      name,
      status: response.status,
      success: response.ok || response.status === 401, // Auth-protected is OK
      data: data,
      authenticated: response.status !== 401
    };
  } catch (error) {
    return {
      name,
      status: 'ERROR',
      success: false,
      error: error.message
    };
  }
}

async function runAllTests() {
  console.log('🚀 Testing All Agent Systems...\n');

  const results = [];

  for (const [name, config] of Object.entries(tests)) {
    const result = await testAgent(name, config);
    results.push(result);

    const status = result.success ? '✅' : '❌';
    const authStatus = result.authenticated ? '🔓' : '🔒';
    console.log(`${status} ${authStatus} ${name}: ${result.status}`);
    if (result.error) console.log(`   Error: ${result.error}`);
  }

  console.log('\n📊 Test Summary:');
  console.log(`Total Agents: ${results.length}`);
  console.log(`Responding: ${results.filter(r => r.success).length}`);
  console.log(`Auth Protected: ${results.filter(r => !r.authenticated).length}`);
  console.log(`Errors: ${results.filter(r => !r.success).length}`);

  return results;
}

runAllTests().catch(console.error);
