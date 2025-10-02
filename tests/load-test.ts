/**
 * LOAD TESTING SUITE FOR KIMBLEAI
 *
 * Comprehensive load testing to identify performance bottlenecks
 * under realistic traffic conditions
 *
 * Features:
 * - Concurrent user simulation (up to 100 users)
 * - Realistic test scenarios
 * - Performance metrics collection
 * - Response time analysis
 * - Error rate tracking
 * - Throughput measurement
 *
 * Usage:
 *   npm run load-test              # Run default test (50 concurrent users)
 *   npm run load-test -- --users=100  # Custom user count
 *   npm run load-test -- --duration=60  # Custom duration in seconds
 */

import { performance } from 'perf_hooks';

// Configuration
const CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  defaultConcurrentUsers: 50,
  defaultDurationSeconds: 30,
  requestTimeoutMs: 30000
};

// Test scenarios
interface TestScenario {
  name: string;
  weight: number; // Probability of being selected (1-10)
  execute: () => Promise<TestResult>;
}

interface TestResult {
  scenario: string;
  duration: number;
  status: 'success' | 'error';
  statusCode?: number;
  error?: string;
}

interface LoadTestResults {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDuration: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50: number;
  p95: number;
  p99: number;
  requestsPerSecond: number;
  errorRate: number;
  scenarios: Map<string, ScenarioStats>;
}

interface ScenarioStats {
  name: string;
  requests: number;
  successes: number;
  failures: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
}

class LoadTester {
  private scenarios: TestScenario[];
  private results: TestResult[];
  private startTime: number;
  private endTime: number;

  constructor() {
    this.scenarios = this.createScenarios();
    this.results = [];
    this.startTime = 0;
    this.endTime = 0;
  }

  /**
   * Define test scenarios with realistic user behavior
   */
  private createScenarios(): TestScenario[] {
    return [
      {
        name: 'Chat Request - Simple Query',
        weight: 5,
        execute: async () => this.testChatEndpoint('What is the weather today?')
      },
      {
        name: 'Chat Request - Complex Query with Context',
        weight: 3,
        execute: async () =>
          this.testChatEndpoint(
            'Can you analyze the recent project updates and summarize the key decisions made in the last week?'
          )
      },
      {
        name: 'Knowledge Search - Simple',
        weight: 4,
        execute: async () => this.testKnowledgeSearch('project documentation')
      },
      {
        name: 'Knowledge Search - Complex with Filters',
        weight: 2,
        execute: async () =>
          this.testKnowledgeSearch('technical decisions', {
            source_type: 'conversation',
            min_importance: 0.7
          })
      },
      {
        name: 'List Conversations',
        weight: 3,
        execute: async () => this.testListConversations()
      },
      {
        name: 'File Upload',
        weight: 1,
        execute: async () => this.testFileUpload()
      },
      {
        name: 'Get Performance Metrics',
        weight: 2,
        execute: async () => this.testPerformanceMetrics()
      }
    ];
  }

  /**
   * Test chat endpoint
   */
  private async testChatEndpoint(message: string): Promise<TestResult> {
    const start = performance.now();

    try {
      const response = await fetch(`${CONFIG.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          userId: 'load-test-user',
          conversationId: `load-test-${Date.now()}`
        }),
        signal: AbortSignal.timeout(CONFIG.requestTimeoutMs)
      });

      const duration = performance.now() - start;

      if (!response.ok) {
        return {
          scenario: 'Chat Request',
          duration,
          status: 'error',
          statusCode: response.status,
          error: await response.text()
        };
      }

      await response.json(); // Consume response

      return {
        scenario: 'Chat Request',
        duration,
        status: 'success',
        statusCode: response.status
      };
    } catch (error: any) {
      return {
        scenario: 'Chat Request',
        duration: performance.now() - start,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Test knowledge search endpoint
   */
  private async testKnowledgeSearch(
    query: string,
    filters?: any
  ): Promise<TestResult> {
    const start = performance.now();

    try {
      const response = await fetch(`${CONFIG.baseUrl}/api/knowledge/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          userId: 'load-test-user',
          searchType: 'hybrid',
          filters: filters || {},
          limit: 10
        }),
        signal: AbortSignal.timeout(CONFIG.requestTimeoutMs)
      });

      const duration = performance.now() - start;

      if (!response.ok) {
        return {
          scenario: 'Knowledge Search',
          duration,
          status: 'error',
          statusCode: response.status
        };
      }

      await response.json();

      return {
        scenario: 'Knowledge Search',
        duration,
        status: 'success',
        statusCode: response.status
      };
    } catch (error: any) {
      return {
        scenario: 'Knowledge Search',
        duration: performance.now() - start,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Test list conversations endpoint
   */
  private async testListConversations(): Promise<TestResult> {
    const start = performance.now();

    try {
      const response = await fetch(
        `${CONFIG.baseUrl}/api/conversations?userId=load-test-user&limit=20`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(CONFIG.requestTimeoutMs)
        }
      );

      const duration = performance.now() - start;

      if (!response.ok) {
        return {
          scenario: 'List Conversations',
          duration,
          status: 'error',
          statusCode: response.status
        };
      }

      await response.json();

      return {
        scenario: 'List Conversations',
        duration,
        status: 'success',
        statusCode: response.status
      };
    } catch (error: any) {
      return {
        scenario: 'List Conversations',
        duration: performance.now() - start,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Test file upload endpoint
   */
  private async testFileUpload(): Promise<TestResult> {
    const start = performance.now();

    try {
      // Create a small test file
      const testFile = new Blob(['Test file content for load testing'], {
        type: 'text/plain'
      });
      const formData = new FormData();
      formData.append('file', testFile, 'test.txt');
      formData.append('userId', 'load-test-user');

      const response = await fetch(`${CONFIG.baseUrl}/api/upload`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(CONFIG.requestTimeoutMs)
      });

      const duration = performance.now() - start;

      if (!response.ok) {
        return {
          scenario: 'File Upload',
          duration,
          status: 'error',
          statusCode: response.status
        };
      }

      await response.json();

      return {
        scenario: 'File Upload',
        duration,
        status: 'success',
        statusCode: response.status
      };
    } catch (error: any) {
      return {
        scenario: 'File Upload',
        duration: performance.now() - start,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Test performance metrics endpoint
   */
  private async testPerformanceMetrics(): Promise<TestResult> {
    const start = performance.now();

    try {
      const response = await fetch(`${CONFIG.baseUrl}/api/performance?action=summary`, {
        method: 'GET',
        signal: AbortSignal.timeout(CONFIG.requestTimeoutMs)
      });

      const duration = performance.now() - start;

      if (!response.ok) {
        return {
          scenario: 'Performance Metrics',
          duration,
          status: 'error',
          statusCode: response.status
        };
      }

      await response.json();

      return {
        scenario: 'Performance Metrics',
        duration,
        status: 'success',
        statusCode: response.status
      };
    } catch (error: any) {
      return {
        scenario: 'Performance Metrics',
        duration: performance.now() - start,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Select a random scenario based on weights
   */
  private selectScenario(): TestScenario {
    const totalWeight = this.scenarios.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;

    for (const scenario of this.scenarios) {
      random -= scenario.weight;
      if (random <= 0) {
        return scenario;
      }
    }

    return this.scenarios[0]; // Fallback
  }

  /**
   * Simulate a single virtual user
   */
  private async simulateUser(userId: number, durationSeconds: number): Promise<void> {
    const endTime = Date.now() + durationSeconds * 1000;

    while (Date.now() < endTime) {
      const scenario = this.selectScenario();

      try {
        const result = await scenario.execute();
        this.results.push(result);
      } catch (error: any) {
        this.results.push({
          scenario: scenario.name,
          duration: 0,
          status: 'error',
          error: error.message
        });
      }

      // Random delay between requests (0.5-2 seconds)
      const delay = 500 + Math.random() * 1500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Run load test with specified concurrent users
   */
  async run(
    concurrentUsers: number = CONFIG.defaultConcurrentUsers,
    durationSeconds: number = CONFIG.defaultDurationSeconds
  ): Promise<LoadTestResults> {
    console.log('\n========================================');
    console.log('  KIMBLEAI LOAD TEST');
    console.log('========================================');
    console.log(`Concurrent Users: ${concurrentUsers}`);
    console.log(`Duration: ${durationSeconds} seconds`);
    console.log(`Target URL: ${CONFIG.baseUrl}`);
    console.log('========================================\n');

    this.results = [];
    this.startTime = Date.now();

    // Create virtual users
    const users = Array.from({ length: concurrentUsers }, (_, i) => i + 1);

    console.log('Starting load test...\n');

    // Run all users concurrently
    await Promise.all(users.map(userId => this.simulateUser(userId, durationSeconds)));

    this.endTime = Date.now();

    // Analyze results
    const analysis = this.analyzeResults();

    // Print summary
    this.printSummary(analysis);

    return analysis;
  }

  /**
   * Analyze test results
   */
  private analyzeResults(): LoadTestResults {
    const durations = this.results.map(r => r.duration).sort((a, b) => a - b);
    const successCount = this.results.filter(r => r.status === 'success').length;
    const totalDuration = (this.endTime - this.startTime) / 1000; // in seconds

    // Calculate percentiles
    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    // Group by scenario
    const scenarioStats = new Map<string, ScenarioStats>();

    for (const result of this.results) {
      let stats = scenarioStats.get(result.scenario);
      if (!stats) {
        stats = {
          name: result.scenario,
          requests: 0,
          successes: 0,
          failures: 0,
          avgDuration: 0,
          minDuration: Infinity,
          maxDuration: 0
        };
        scenarioStats.set(result.scenario, stats);
      }

      stats.requests++;
      if (result.status === 'success') {
        stats.successes++;
      } else {
        stats.failures++;
      }
      stats.minDuration = Math.min(stats.minDuration, result.duration);
      stats.maxDuration = Math.max(stats.maxDuration, result.duration);
    }

    // Calculate average durations per scenario
    for (const [name, stats] of scenarioStats) {
      const scenarioDurations = this.results
        .filter(r => r.scenario === name && r.status === 'success')
        .map(r => r.duration);

      stats.avgDuration =
        scenarioDurations.reduce((sum, d) => sum + d, 0) / scenarioDurations.length || 0;
    }

    return {
      totalRequests: this.results.length,
      successfulRequests: successCount,
      failedRequests: this.results.length - successCount,
      totalDuration,
      avgResponseTime:
        durations.reduce((sum, d) => sum + d, 0) / durations.length || 0,
      minResponseTime: durations[0] || 0,
      maxResponseTime: durations[durations.length - 1] || 0,
      p50: durations[p50Index] || 0,
      p95: durations[p95Index] || 0,
      p99: durations[p99Index] || 0,
      requestsPerSecond: this.results.length / totalDuration,
      errorRate: ((this.results.length - successCount) / this.results.length) * 100,
      scenarios: scenarioStats
    };
  }

  /**
   * Print test summary
   */
  private printSummary(results: LoadTestResults): void {
    console.log('\n========================================');
    console.log('  LOAD TEST RESULTS');
    console.log('========================================\n');

    console.log('OVERALL METRICS:');
    console.log(`  Total Requests: ${results.totalRequests}`);
    console.log(`  Successful: ${results.successfulRequests}`);
    console.log(`  Failed: ${results.failedRequests}`);
    console.log(`  Error Rate: ${results.errorRate.toFixed(2)}%`);
    console.log(`  Duration: ${results.totalDuration.toFixed(2)}s`);
    console.log(
      `  Throughput: ${results.requestsPerSecond.toFixed(2)} requests/second\n`
    );

    console.log('RESPONSE TIMES:');
    console.log(`  Average: ${results.avgResponseTime.toFixed(2)}ms`);
    console.log(`  Minimum: ${results.minResponseTime.toFixed(2)}ms`);
    console.log(`  Maximum: ${results.maxResponseTime.toFixed(2)}ms`);
    console.log(`  P50 (Median): ${results.p50.toFixed(2)}ms`);
    console.log(`  P95: ${results.p95.toFixed(2)}ms`);
    console.log(`  P99: ${results.p99.toFixed(2)}ms\n`);

    console.log('BY SCENARIO:');
    for (const [name, stats] of results.scenarios) {
      const successRate = (stats.successes / stats.requests) * 100;
      console.log(`\n  ${name}:`);
      console.log(`    Requests: ${stats.requests}`);
      console.log(`    Success Rate: ${successRate.toFixed(2)}%`);
      console.log(`    Avg Response: ${stats.avgDuration.toFixed(2)}ms`);
      console.log(`    Min/Max: ${stats.minDuration.toFixed(2)}ms / ${stats.maxDuration.toFixed(2)}ms`);
    }

    console.log('\n========================================\n');

    // Performance assessment
    const assessment = this.assessPerformance(results);
    console.log('PERFORMANCE ASSESSMENT:');
    console.log(`  Status: ${assessment.status}`);
    console.log('  Issues:');
    assessment.issues.forEach(issue => console.log(`    - ${issue}`));
    console.log('  Recommendations:');
    assessment.recommendations.forEach(rec => console.log(`    - ${rec}`));
    console.log('\n========================================\n');
  }

  /**
   * Assess performance and provide recommendations
   */
  private assessPerformance(results: LoadTestResults): {
    status: string;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check error rate
    if (results.errorRate > 5) {
      issues.push(`High error rate: ${results.errorRate.toFixed(2)}%`);
      recommendations.push('Investigate error logs and add error handling');
    }

    // Check response times
    if (results.avgResponseTime > 1000) {
      issues.push(`Slow average response time: ${results.avgResponseTime.toFixed(2)}ms`);
      recommendations.push('Consider adding caching and database indexes');
    }

    if (results.p95 > 2000) {
      issues.push(`95th percentile is slow: ${results.p95.toFixed(2)}ms`);
      recommendations.push('Optimize slowest queries and endpoints');
    }

    // Check throughput
    if (results.requestsPerSecond < 5) {
      issues.push(
        `Low throughput: ${results.requestsPerSecond.toFixed(2)} requests/second`
      );
      recommendations.push('Consider horizontal scaling or optimizing bottlenecks');
    }

    const status =
      issues.length === 0
        ? '✅ EXCELLENT'
        : issues.length <= 2
        ? '⚠️ NEEDS IMPROVEMENT'
        : '❌ CRITICAL';

    if (issues.length === 0) {
      issues.push('No major performance issues detected');
      recommendations.push('Continue monitoring under production load');
    }

    return { status, issues, recommendations };
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const users =
    parseInt(args.find(a => a.startsWith('--users='))?.split('=')[1] || '') ||
    CONFIG.defaultConcurrentUsers;
  const duration =
    parseInt(args.find(a => a.startsWith('--duration='))?.split('=')[1] || '') ||
    CONFIG.defaultDurationSeconds;

  const tester = new LoadTester();
  tester.run(users, duration).catch(error => {
    console.error('Load test failed:', error);
    process.exit(1);
  });
}

export { LoadTester };
export type { LoadTestResults };
