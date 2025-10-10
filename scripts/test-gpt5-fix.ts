/**
 * Comprehensive GPT-5 Fix Test Suite
 * Tests the /api/chat endpoint with various message complexities and models
 */

interface TestCase {
  name: string;
  messages: Array<{ role: string; content: string }>;
  expectedModel?: string;
  expectedComplexity?: string;
  description: string;
}

interface TestResult {
  testName: string;
  passed: boolean;
  model?: string;
  temperature?: number;
  responseLength?: number;
  hasError?: boolean;
  errorMessage?: string;
  responseTime?: number;
  details?: any;
}

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const USER_ID = 'zach';
const CONVERSATION_ID = 'test-gpt5-fix';

// Add delay to allow server startup
const STARTUP_DELAY = process.env.SKIP_STARTUP_DELAY ? 0 : 5000;

// Test cases covering various complexities and use cases
const testCases: TestCase[] = [
  // 1. Simple questions (should use gpt-5-nano)
  {
    name: 'Simple Question - Capital',
    messages: [{ role: 'user', content: 'What is the capital of France?' }],
    expectedModel: 'gpt-5-nano',
    expectedComplexity: 'simple',
    description: 'Basic factual question that should route to gpt-5-nano'
  },
  {
    name: 'Simple Question - Math',
    messages: [{ role: 'user', content: 'What is 25 + 17?' }],
    expectedModel: 'gpt-5-nano',
    expectedComplexity: 'simple',
    description: 'Simple arithmetic'
  },
  {
    name: 'Simple Question - Definition',
    messages: [{ role: 'user', content: 'Define photosynthesis.' }],
    expectedModel: 'gpt-5-nano',
    expectedComplexity: 'simple',
    description: 'Simple definition request'
  },

  // 2. Medium complexity (should use gpt-5-mini)
  {
    name: 'Medium - Explanation',
    messages: [{
      role: 'user',
      content: 'Explain the difference between TCP and UDP protocols and when to use each one.'
    }],
    expectedModel: 'gpt-5-mini',
    expectedComplexity: 'medium',
    description: 'Technical comparison requiring moderate depth'
  },
  {
    name: 'Medium - Analysis',
    messages: [{
      role: 'user',
      content: 'Analyze the pros and cons of remote work for software developers.'
    }],
    expectedModel: 'gpt-5-mini',
    expectedComplexity: 'medium',
    description: 'Balanced analysis task'
  },
  {
    name: 'Medium - Multi-step Problem',
    messages: [{
      role: 'user',
      content: 'I have a list of 100 numbers. How would I find the median and explain why it differs from the mean?'
    }],
    expectedModel: 'gpt-5-mini',
    expectedComplexity: 'medium',
    description: 'Multi-step problem with explanation'
  },

  // 3. Complex reasoning tasks (should use gpt-5 with high reasoning)
  {
    name: 'Complex - Logic Puzzle',
    messages: [{
      role: 'user',
      content: 'Three friends each have a different pet (dog, cat, bird) and live in different colored houses (red, blue, green). The person with the dog lives in the red house. The person in the blue house has a cat. Sarah doesn\'t live in the green house and doesn\'t have a bird. Tom has a bird. Who lives where and has which pet?'
    }],
    expectedModel: 'gpt-5',
    expectedComplexity: 'complex',
    description: 'Logic puzzle requiring deductive reasoning'
  },
  {
    name: 'Complex - System Design',
    messages: [{
      role: 'user',
      content: 'Design a scalable microservices architecture for a real-time collaborative document editing platform like Google Docs. Include considerations for conflict resolution, data consistency, WebSocket connections, and horizontal scaling. Explain your design choices and trade-offs.'
    }],
    expectedModel: 'gpt-5',
    expectedComplexity: 'complex',
    description: 'Complex system design with multiple constraints'
  },
  {
    name: 'Complex - Philosophical Reasoning',
    messages: [{
      role: 'user',
      content: 'Is it ethical for AI systems to make life-or-death decisions in autonomous vehicles? Consider utilitarian vs deontological perspectives, the trolley problem, and the role of human agency. Provide a nuanced analysis with counterarguments.'
    }],
    expectedModel: 'gpt-5',
    expectedComplexity: 'complex',
    description: 'Deep philosophical analysis with multiple frameworks'
  },

  // 4. Code generation tasks
  {
    name: 'Code - Simple Function',
    messages: [{
      role: 'user',
      content: 'Write a Python function to reverse a string.'
    }],
    expectedModel: 'gpt-5-nano',
    expectedComplexity: 'simple',
    description: 'Basic code generation'
  },
  {
    name: 'Code - Algorithm Implementation',
    messages: [{
      role: 'user',
      content: 'Implement a binary search tree in TypeScript with insert, delete, and search methods. Include proper type annotations and handle edge cases.'
    }],
    expectedModel: 'gpt-5-mini',
    expectedComplexity: 'medium',
    description: 'Data structure implementation'
  },
  {
    name: 'Code - Complex System',
    messages: [{
      role: 'user',
      content: 'Create a React component that implements a virtual scrolling list with dynamic height items, supports search filtering, and uses React Query for data fetching. Include proper TypeScript types, error handling, and loading states. Explain your optimization strategies.'
    }],
    expectedModel: 'gpt-5',
    expectedComplexity: 'complex',
    description: 'Complex component with multiple features'
  },

  // 5. Creative writing tasks
  {
    name: 'Creative - Short Poem',
    messages: [{
      role: 'user',
      content: 'Write a haiku about autumn leaves.'
    }],
    expectedModel: 'gpt-5-nano',
    expectedComplexity: 'simple',
    description: 'Simple creative task'
  },
  {
    name: 'Creative - Story Outline',
    messages: [{
      role: 'user',
      content: 'Create an outline for a science fiction short story about first contact with an alien civilization. Include plot points and character arcs.'
    }],
    expectedModel: 'gpt-5-mini',
    expectedComplexity: 'medium',
    description: 'Structured creative planning'
  },

  // 6. Edge cases
  {
    name: 'Edge - Very Long Prompt',
    messages: [{
      role: 'user',
      content: 'Analyze the following scenario: ' + 'A '.repeat(500) + 'company is developing a new product. What are the key considerations for market research, product development, pricing strategy, distribution channels, and marketing campaigns? Provide a comprehensive analysis with specific recommendations.'
    }],
    expectedComplexity: 'complex',
    description: 'Very long prompt to test token handling'
  },
  {
    name: 'Edge - Multi-turn Context',
    messages: [
      { role: 'user', content: 'I am planning a vacation to Japan.' },
      { role: 'assistant', content: 'That sounds exciting! Japan is a wonderful destination.' },
      { role: 'user', content: 'What should I see in Tokyo?' },
      { role: 'assistant', content: 'Tokyo has many attractions like Senso-ji Temple, Shibuya Crossing, and the Tokyo Skytree.' },
      { role: 'user', content: 'Now create a detailed 7-day itinerary for Tokyo including day trips to nearby cities, budget estimates, transportation options, and cultural etiquette tips.' }
    ],
    expectedComplexity: 'complex',
    description: 'Multi-turn conversation with complex final request'
  },

  // 7. File processing scenario
  {
    name: 'File Processing Simulation',
    messages: [{
      role: 'user',
      content: 'I have a CSV file with columns: name, age, city, salary. Write Python code to: 1) Load the CSV, 2) Filter people over 30, 3) Group by city and calculate average salary, 4) Save results to a new CSV. Include error handling and type hints.'
    }],
    expectedModel: 'gpt-5-mini',
    expectedComplexity: 'medium',
    description: 'Multi-step data processing task'
  }
];

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

async function runTest(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log(`\n${colors.cyan}Testing: ${testCase.name}${colors.reset}`);
    console.log(`Description: ${testCase.description}`);

    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: testCase.messages,
        userId: USER_ID,
        conversationId: `${CONVERSATION_ID}-${Date.now()}-${Math.random()}`, // Unique per test
        metadata: {
          testCase: testCase.name,
          expectedModel: testCase.expectedModel,
          expectedComplexity: testCase.expectedComplexity
        }
      })
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    // Check for error responses
    if (!response.ok || data.error) {
      return {
        testName: testCase.name,
        passed: false,
        hasError: true,
        errorMessage: data.error || data.details || `HTTP ${response.status}`,
        responseTime,
        details: data
      };
    }

    // Check for the specific error message we're testing for
    const hasTargetError = data.content?.includes('I apologize, but I could not generate a response');

    // Extract response details
    const responseLength = data.content?.length || 0;
    const model = data.model;

    // Determine if test passed
    const passed = !hasTargetError && responseLength > 0 && !data.error;

    const result: TestResult = {
      testName: testCase.name,
      passed,
      model,
      responseLength,
      hasError: hasTargetError,
      errorMessage: hasTargetError ? 'Received target error message' : undefined,
      responseTime,
      details: {
        expectedModel: testCase.expectedModel,
        expectedComplexity: testCase.expectedComplexity,
        actualResponse: data.content?.substring(0, 200) + (data.content?.length > 200 ? '...' : '')
      }
    };

    // Log result
    if (passed) {
      console.log(`${colors.green}✓ PASSED${colors.reset}`);
      console.log(`  Model: ${model || 'unknown'}`);
      console.log(`  Response length: ${responseLength} chars`);
      console.log(`  Time: ${responseTime}ms`);
    } else {
      console.log(`${colors.red}✗ FAILED${colors.reset}`);
      console.log(`  Error: ${result.errorMessage}`);
      console.log(`  Model: ${model || 'unknown'}`);
      console.log(`  Time: ${responseTime}ms`);
    }

    return result;

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.log(`${colors.red}✗ EXCEPTION${colors.reset}`);
    console.log(`  Error: ${error.message}`);

    return {
      testName: testCase.name,
      passed: false,
      hasError: true,
      errorMessage: error.message,
      responseTime
    };
  }
}

async function runTestSuite() {
  console.log(`${colors.bold}${colors.magenta}`);
  console.log('='.repeat(80));
  console.log('GPT-5 FIX COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(80));
  console.log(`${colors.reset}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`User ID: ${USER_ID}`);
  console.log(`Total test cases: ${testCases.length}`);
  console.log('');

  // Wait for server startup if needed
  if (STARTUP_DELAY > 0) {
    console.log(`${colors.yellow}Waiting ${STARTUP_DELAY/1000}s for server startup...${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, STARTUP_DELAY));
  }

  // Test server connectivity
  try {
    console.log(`${colors.cyan}Testing server connectivity...${colors.reset}`);
    const healthCheck = await fetch(`${BASE_URL}/api/chat`, { method: 'GET' });
    const healthData = await healthCheck.json();
    console.log(`${colors.green}✓ Server is accessible${colors.reset}`);
    console.log(`  Version: ${healthData.version}`);
    console.log(`  Features: ${Object.keys(healthData.features || {}).join(', ')}`);
  } catch (error: any) {
    console.log(`${colors.red}✗ Server is not accessible: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}Please ensure the development server is running with: npm run dev${colors.reset}`);
    process.exit(1);
  }
  console.log('');

  const results: TestResult[] = [];

  // Run tests sequentially to avoid rate limiting
  for (let i = 0; i < testCases.length; i++) {
    console.log(`\n${colors.bold}[${i + 1}/${testCases.length}]${colors.reset}`);
    const result = await runTest(testCases[i]);
    results.push(result);

    // Brief delay between tests to avoid rate limiting
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Generate summary report
  console.log(`\n\n${colors.bold}${colors.magenta}`);
  console.log('='.repeat(80));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log(`${colors.reset}`);

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const withTargetError = results.filter(r => r.hasError && r.errorMessage?.includes('I apologize')).length;

  console.log(`\n${colors.bold}Overall Results:${colors.reset}`);
  console.log(`  ${colors.green}Passed: ${passed}/${testCases.length}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failed}/${testCases.length}${colors.reset}`);
  console.log(`  ${colors.yellow}Target Error Found: ${withTargetError}${colors.reset}`);

  // Breakdown by model
  console.log(`\n${colors.bold}Results by Model:${colors.reset}`);
  const modelStats: Record<string, { passed: number; failed: number }> = {};
  results.forEach(r => {
    const model = r.model || 'unknown';
    if (!modelStats[model]) {
      modelStats[model] = { passed: 0, failed: 0 };
    }
    if (r.passed) {
      modelStats[model].passed++;
    } else {
      modelStats[model].failed++;
    }
  });

  Object.entries(modelStats).forEach(([model, stats]) => {
    const total = stats.passed + stats.failed;
    const passRate = ((stats.passed / total) * 100).toFixed(1);
    console.log(`  ${model}: ${stats.passed}/${total} passed (${passRate}%)`);
  });

  // Failed tests detail
  if (failed > 0) {
    console.log(`\n${colors.bold}${colors.red}Failed Tests Detail:${colors.reset}`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n  ${colors.red}✗${colors.reset} ${r.testName}`);
      console.log(`    Model: ${r.model || 'unknown'}`);
      console.log(`    Error: ${r.errorMessage}`);
      console.log(`    Time: ${r.responseTime}ms`);
      if (r.details) {
        console.log(`    Expected: ${r.details.expectedModel} (${r.details.expectedComplexity})`);
      }
    });
  }

  // Performance stats
  const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;
  const maxResponseTime = Math.max(...results.map(r => r.responseTime || 0));
  const minResponseTime = Math.min(...results.filter(r => r.responseTime).map(r => r.responseTime || 0));

  console.log(`\n${colors.bold}Performance Statistics:${colors.reset}`);
  console.log(`  Average response time: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`  Min response time: ${minResponseTime}ms`);
  console.log(`  Max response time: ${maxResponseTime}ms`);

  // Recommendations
  console.log(`\n${colors.bold}${colors.cyan}Recommendations:${colors.reset}`);
  if (withTargetError > 0) {
    console.log(`  ${colors.red}⚠ Target error still occurring (${withTargetError} cases)${colors.reset}`);
    console.log(`    - Review OpenAI API logs for error details`);
    console.log(`    - Check if temperature=1 is being set correctly`);
    console.log(`    - Verify model availability and quotas`);
  }
  if (failed > 0 && withTargetError === 0) {
    console.log(`  ${colors.yellow}⚠ Tests failing for other reasons${colors.reset}`);
    console.log(`    - Check network connectivity`);
    console.log(`    - Verify API endpoint is accessible`);
    console.log(`    - Review error messages for patterns`);
  }
  if (passed === testCases.length) {
    console.log(`  ${colors.green}✓ All tests passed! GPT-5 fix is working correctly${colors.reset}`);
  }

  console.log(`\n${colors.magenta}${'='.repeat(80)}${colors.reset}\n`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run the test suite
runTestSuite().catch(error => {
  console.error(`${colors.red}${colors.bold}Fatal error running test suite:${colors.reset}`, error);
  process.exit(1);
});
