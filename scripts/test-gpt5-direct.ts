/**
 * Direct GPT-5 Fix Test - Bypasses middleware by directly testing OpenAI calls
 * Tests the model selection and temperature configuration
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

interface TestCase {
  name: string;
  model: string;
  prompt: string;
  temperature?: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
  description: string;
}

interface TestResult {
  testName: string;
  passed: boolean;
  model: string;
  temperature?: number;
  responseLength?: number;
  hasError?: boolean;
  errorMessage?: string;
  responseTime?: number;
  finishReason?: string;
  usageTokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

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

// Test cases covering different GPT-5 models with temperature=1
const testCases: TestCase[] = [
  // GPT-5 Nano tests
  {
    name: 'GPT-5-Nano - Simple Question',
    model: 'gpt-5-nano',
    prompt: 'What is the capital of France?',
    temperature: 1,
    description: 'Test gpt-5-nano with temperature=1'
  },
  {
    name: 'GPT-5-Nano - Math',
    model: 'gpt-5-nano',
    prompt: 'Calculate 234 + 567',
    temperature: 1,
    description: 'Test basic arithmetic'
  },
  {
    name: 'GPT-5-Nano - Code',
    model: 'gpt-5-nano',
    prompt: 'Write a Python function to reverse a string',
    temperature: 1,
    description: 'Test simple code generation'
  },

  // GPT-5 Mini tests
  {
    name: 'GPT-5-Mini - Explanation',
    model: 'gpt-5-mini',
    prompt: 'Explain the difference between TCP and UDP protocols.',
    temperature: 1,
    description: 'Test gpt-5-mini with temperature=1'
  },
  {
    name: 'GPT-5-Mini - Analysis',
    model: 'gpt-5-mini',
    prompt: 'What are the pros and cons of microservices architecture?',
    temperature: 1,
    description: 'Test analytical task'
  },

  // GPT-5 with reasoning efforts
  {
    name: 'GPT-5 - Low Reasoning',
    model: 'gpt-5',
    prompt: 'Solve this logic puzzle: If all roses are flowers and some flowers fade quickly, what can we conclude about roses?',
    temperature: 1,
    reasoningEffort: 'low',
    description: 'Test GPT-5 with low reasoning effort'
  },
  {
    name: 'GPT-5 - Medium Reasoning',
    model: 'gpt-5',
    prompt: 'Design a simple REST API for a todo list application. Include endpoints for CRUD operations.',
    temperature: 1,
    reasoningEffort: 'medium',
    description: 'Test GPT-5 with medium reasoning effort'
  },
  {
    name: 'GPT-5 - High Reasoning',
    model: 'gpt-5',
    prompt: 'You have 3 coins. Two are normal, one is fake (lighter). You have a balance scale and can use it twice. Explain the optimal strategy to find the fake coin.',
    temperature: 1,
    reasoningEffort: 'high',
    description: 'Test GPT-5 with high reasoning effort'
  },

  // Edge cases
  {
    name: 'GPT-5 - Complex System Design',
    model: 'gpt-5',
    prompt: 'Design a distributed caching system that handles 1 million requests per second. Consider consistency, availability, and partition tolerance.',
    temperature: 1,
    reasoningEffort: 'high',
    description: 'Complex system design task'
  },
  {
    name: 'GPT-5-Nano - Creative',
    model: 'gpt-5-nano',
    prompt: 'Write a haiku about coding',
    temperature: 1,
    description: 'Creative task on simple model'
  },
];

async function testOpenAICall(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log(`\n${colors.cyan}Testing: ${testCase.name}${colors.reset}`);
    console.log(`Description: ${testCase.description}`);
    console.log(`Model: ${testCase.model}, Temperature: ${testCase.temperature || 1}`);

    const params: any = {
      model: testCase.model,
      messages: [
        { role: 'user', content: testCase.prompt }
      ],
      temperature: testCase.temperature || 1,
    };

    // Add reasoning_effort for GPT-5
    if (testCase.model.startsWith('gpt-5') && testCase.reasoningEffort) {
      params.reasoning_effort = testCase.reasoningEffort;
      console.log(`Reasoning effort: ${testCase.reasoningEffort}`);
    }

    // Make the API call
    console.log(`${colors.yellow}Calling OpenAI API...${colors.reset}`);
    const completion = await openai.chat.completions.create(params);

    const responseTime = Date.now() - startTime;
    const message = completion.choices[0].message;
    const content = message.content || '';
    const finishReason = completion.choices[0].finish_reason;

    // Check for the specific error message
    const hasTargetError = content.includes('I apologize, but I could not generate a response');

    // Determine success
    const passed = !hasTargetError && content.length > 0;

    const result: TestResult = {
      testName: testCase.name,
      passed,
      model: testCase.model,
      temperature: testCase.temperature,
      responseLength: content.length,
      hasError: hasTargetError,
      errorMessage: hasTargetError ? 'Received target error message' : undefined,
      responseTime,
      finishReason,
      usageTokens: {
        prompt: completion.usage?.prompt_tokens || 0,
        completion: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0
      }
    };

    // Log result
    if (passed) {
      console.log(`${colors.green}✓ PASSED${colors.reset}`);
      console.log(`  Response length: ${content.length} chars`);
      console.log(`  Finish reason: ${finishReason}`);
      console.log(`  Tokens: ${result.usageTokens?.total} (${result.usageTokens?.prompt} prompt + ${result.usageTokens?.completion} completion)`);
      console.log(`  Time: ${responseTime}ms`);
      console.log(`  Response preview: ${content.substring(0, 100)}...`);
    } else {
      console.log(`${colors.red}✗ FAILED${colors.reset}`);
      console.log(`  Error: ${result.errorMessage}`);
      console.log(`  Content: ${content.substring(0, 200)}`);
      console.log(`  Time: ${responseTime}ms`);
    }

    return result;

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.log(`${colors.red}✗ EXCEPTION${colors.reset}`);
    console.log(`  Error: ${error.message}`);
    console.log(`  Status: ${error.status}`);
    console.log(`  Code: ${error.code}`);

    return {
      testName: testCase.name,
      passed: false,
      model: testCase.model,
      hasError: true,
      errorMessage: error.message,
      responseTime
    };
  }
}

async function runTests() {
  console.log(`${colors.bold}${colors.magenta}`);
  console.log('='.repeat(80));
  console.log('GPT-5 FIX DIRECT OPENAI TEST SUITE');
  console.log('='.repeat(80));
  console.log(`${colors.reset}`);
  console.log(`Testing OpenAI models directly`);
  console.log(`Total test cases: ${testCases.length}`);
  console.log(`Focus: Verifying temperature=1 requirement for GPT-5 models`);
  console.log('');

  if (!process.env.OPENAI_API_KEY) {
    console.log(`${colors.red}ERROR: OPENAI_API_KEY not set in environment${colors.reset}`);
    process.exit(1);
  }

  const results: TestResult[] = [];

  // Run tests sequentially
  for (let i = 0; i < testCases.length; i++) {
    console.log(`\n${colors.bold}[${i + 1}/${testCases.length}]${colors.reset}`);
    const result = await testOpenAICall(testCases[i]);
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
  const modelStats: Record<string, { passed: number; failed: number; totalTokens: number }> = {};
  results.forEach(r => {
    const model = r.model || 'unknown';
    if (!modelStats[model]) {
      modelStats[model] = { passed: 0, failed: 0, totalTokens: 0 };
    }
    if (r.passed) {
      modelStats[model].passed++;
    } else {
      modelStats[model].failed++;
    }
    modelStats[model].totalTokens += r.usageTokens?.total || 0;
  });

  Object.entries(modelStats).forEach(([model, stats]) => {
    const total = stats.passed + stats.failed;
    const passRate = ((stats.passed / total) * 100).toFixed(1);
    console.log(`  ${model}:`);
    console.log(`    Tests: ${stats.passed}/${total} passed (${passRate}%)`);
    console.log(`    Tokens: ${stats.totalTokens} total`);
  });

  // Failed tests detail
  if (failed > 0) {
    console.log(`\n${colors.bold}${colors.red}Failed Tests Detail:${colors.reset}`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n  ${colors.red}✗${colors.reset} ${r.testName}`);
      console.log(`    Model: ${r.model}`);
      console.log(`    Error: ${r.errorMessage}`);
      console.log(`    Time: ${r.responseTime}ms`);
    });
  }

  // Performance stats
  const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;
  const maxResponseTime = Math.max(...results.map(r => r.responseTime || 0));
  const minResponseTime = Math.min(...results.filter(r => r.responseTime).map(r => r.responseTime || 0));
  const totalTokens = results.reduce((sum, r) => sum + (r.usageTokens?.total || 0), 0);

  console.log(`\n${colors.bold}Performance Statistics:${colors.reset}`);
  console.log(`  Average response time: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`  Min response time: ${minResponseTime}ms`);
  console.log(`  Max response time: ${maxResponseTime}ms`);
  console.log(`  Total tokens used: ${totalTokens}`);

  // Recommendations
  console.log(`\n${colors.bold}${colors.cyan}Analysis:${colors.reset}`);
  if (withTargetError > 0) {
    console.log(`  ${colors.red}⚠ CRITICAL: Target error still occurring (${withTargetError} cases)${colors.reset}`);
    console.log(`    The "I apologize, but I could not generate a response" error persists.`);
    console.log(`    This suggests the temperature=1 fix may not be working correctly.`);
  } else if (failed > 0) {
    console.log(`  ${colors.yellow}⚠ Tests failing for other reasons (${failed} cases)${colors.reset}`);
    console.log(`    Check API errors, rate limits, or model availability.`);
  } else {
    console.log(`  ${colors.green}✓ SUCCESS: All tests passed!${colors.reset}`);
    console.log(`    All GPT-5 models are working correctly with temperature=1.`);
    console.log(`    No "I apologize, but I could not generate a response" errors found.`);
  }

  // Temperature verification
  console.log(`\n${colors.bold}Temperature Configuration:${colors.reset}`);
  const tempUsed = results.filter(r => r.temperature === 1).length;
  console.log(`  ${tempUsed}/${results.length} tests used temperature=1`);
  if (tempUsed === results.length) {
    console.log(`  ${colors.green}✓ All tests correctly configured with temperature=1${colors.reset}`);
  }

  console.log(`\n${colors.magenta}${'='.repeat(80)}${colors.reset}\n`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}${colors.bold}Fatal error running test suite:${colors.reset}`, error);
  process.exit(1);
});
