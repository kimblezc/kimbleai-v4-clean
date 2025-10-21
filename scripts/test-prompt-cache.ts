/**
 * Prompt Cache Test Script
 *
 * Tests the effectiveness of the prompt caching system by:
 * 1. Making identical queries to trigger cache hits
 * 2. Making similar queries to test hash matching
 * 3. Measuring response time improvements
 * 4. Checking cache statistics
 */

import { createClient } from '@supabase/supabase-js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TestResult {
  testName: string;
  responseTime: number;
  success: boolean;
  cacheHit?: boolean;
  error?: string;
}

/**
 * Make a chat API call and measure response time
 */
async function makeChagRequest(
  testName: string,
  userMessage: string,
  conversationId: string = 'test-conv-cache'
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ],
        userId: 'zach',
        conversationId: conversationId
      })
    });

    const endTime = Date.now();
    const data = await response.json();

    if (!response.ok) {
      return {
        testName,
        responseTime: endTime - startTime,
        success: false,
        error: data.error || 'Unknown error'
      };
    }

    return {
      testName,
      responseTime: endTime - startTime,
      success: true
    };

  } catch (error: any) {
    const endTime = Date.now();
    return {
      testName,
      responseTime: endTime - startTime,
      success: false,
      error: error.message
    };
  }
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  try {
    const response = await fetch(`${API_BASE}/api/prompt-cache-stats`);
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Failed to get cache stats:', error);
    return null;
  }
}

/**
 * Clear cache
 */
async function clearCache() {
  try {
    const response = await fetch(`${API_BASE}/api/prompt-cache-stats`, {
      method: 'DELETE'
    });
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Failed to clear cache:', error);
    return null;
  }
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('='.repeat(80));
  console.log('  PROMPT CACHE EFFECTIVENESS TEST');
  console.log('='.repeat(80));
  console.log();
  console.log(`📅 Test Date: ${new Date().toLocaleString()}`);
  console.log(`🔗 API Base: ${API_BASE}`);
  console.log();

  const results: TestResult[] = [];

  // Clear cache before testing
  console.log('🧹 Clearing cache before tests...');
  await clearCache();
  console.log('✅ Cache cleared\n');

  // Test 1: First request (cache miss expected)
  console.log('📝 Test 1: First request (cache miss expected)');
  const test1 = await makeChagRequest('Test 1 - Cache Miss', 'What is the capital of France?', 'cache-test-1');
  results.push(test1);
  console.log(`  ⏱️  Response time: ${test1.responseTime}ms`);
  console.log(`  ${test1.success ? '✅' : '❌'} ${test1.success ? 'Success' : 'Failed: ' + test1.error}`);
  console.log();

  // Wait 1 second
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Identical request (cache hit expected)
  console.log('📝 Test 2: Identical request (cache hit expected)');
  const test2 = await makeChagRequest('Test 2 - Cache Hit', 'What is the capital of France?', 'cache-test-1');
  results.push(test2);
  console.log(`  ⏱️  Response time: ${test2.responseTime}ms`);
  console.log(`  ${test2.success ? '✅' : '❌'} ${test2.success ? 'Success' : 'Failed: ' + test2.error}`);
  const improvement1 = test1.responseTime - test2.responseTime;
  const percentImprovement1 = ((improvement1 / test1.responseTime) * 100).toFixed(1);
  console.log(`  ⚡ Improvement: ${improvement1}ms (${percentImprovement1}% faster)`);
  console.log();

  // Wait 1 second
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Similar request (different wording)
  console.log('📝 Test 3: Different question (cache miss expected)');
  const test3 = await makeChagRequest('Test 3 - Different Query', 'Tell me about quantum computing', 'cache-test-2');
  results.push(test3);
  console.log(`  ⏱️  Response time: ${test3.responseTime}ms`);
  console.log(`  ${test3.success ? '✅' : '❌'} ${test3.success ? 'Success' : 'Failed: ' + test3.error}`);
  console.log();

  // Wait 1 second
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 4: Repeat of test 3 (cache hit expected)
  console.log('📝 Test 4: Repeat of test 3 (cache hit expected)');
  const test4 = await makeChagRequest('Test 4 - Cache Hit', 'Tell me about quantum computing', 'cache-test-2');
  results.push(test4);
  console.log(`  ⏱️  Response time: ${test4.responseTime}ms`);
  console.log(`  ${test4.success ? '✅' : '❌'} ${test4.success ? 'Success' : 'Failed: ' + test4.error}`);
  const improvement2 = test3.responseTime - test4.responseTime;
  const percentImprovement2 = ((improvement2 / test3.responseTime) * 100).toFixed(1);
  console.log(`  ⚡ Improvement: ${improvement2}ms (${percentImprovement2}% faster)`);
  console.log();

  // Get cache statistics
  console.log('📊 Fetching Cache Statistics...');
  const stats = await getCacheStats();
  if (stats && stats.success) {
    console.log();
    console.log('📈 Cache Statistics:');
    console.log(`  Cache Size: ${stats.cacheStats.size} / ${stats.cacheStats.maxSize}`);
    console.log(`  Cache TTL: ${stats.cacheStats.ttl}ms`);
    console.log(`  Hit Rate: ${stats.cacheStats.hitRate}`);
    console.log(`  Total Hits: ${stats.cacheStats.hits}`);
    console.log(`  Total Misses: ${stats.cacheStats.misses}`);
    console.log(`  💰 Cost Saved: $${stats.cacheStats.totalCostSaved}`);
    console.log(`  📊 Monthly Projection: ~$${stats.cacheStats.estimatedMonthlySavings}/month`);
    console.log();
    console.log('💡 Interpretation:', stats.interpretation.efficiency);
  }

  // Summary
  console.log();
  console.log('='.repeat(80));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(80));

  const avgCacheMissTime = (test1.responseTime + test3.responseTime) / 2;
  const avgCacheHitTime = (test2.responseTime + test4.responseTime) / 2;
  const avgImprovement = avgCacheMissTime - avgCacheHitTime;
  const avgPercentImprovement = ((avgImprovement / avgCacheMissTime) * 100).toFixed(1);

  console.log(`📊 Average Cache Miss Time: ${avgCacheMissTime.toFixed(0)}ms`);
  console.log(`⚡ Average Cache Hit Time: ${avgCacheHitTime.toFixed(0)}ms`);
  console.log(`🚀 Average Improvement: ${avgImprovement.toFixed(0)}ms (${avgPercentImprovement}% faster)`);
  console.log();

  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Successful Tests: ${successCount} / ${results.length}`);

  if (stats && stats.cacheStats) {
    console.log(`💾 Cache Hit Rate: ${stats.cacheStats.hitRate}`);
    console.log(`💰 Estimated Monthly Savings: ~$${stats.cacheStats.estimatedMonthlySavings}`);
  }

  console.log();
  console.log('🎉 Testing Complete!');
  console.log('='.repeat(80));

  // Save results to JSON
  const report = {
    timestamp: new Date().toISOString(),
    apiBase: API_BASE,
    results: results,
    summary: {
      avgCacheMissTime,
      avgCacheHitTime,
      avgImprovement,
      avgPercentImprovement: parseFloat(avgPercentImprovement),
      successRate: (successCount / results.length) * 100
    },
    cacheStats: stats
  };

  const fs = require('fs');
  const path = require('path');
  const outputPath = path.join(process.cwd(), 'prompt-cache-test-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`💾 Results saved to: ${outputPath}`);
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
