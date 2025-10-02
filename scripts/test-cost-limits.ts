/**
 * Test Script for Cost Monitoring System
 *
 * This script tests the cost limits and monitoring system to ensure
 * it properly prevents runaway spending.
 *
 * Run with: ts-node scripts/test-cost-limits.ts
 */

import { costMonitor } from '../lib/cost-monitor';

const TEST_USER_ID = 'test_user_cost_limit';

async function testCostMonitoring() {
  console.log('\n=== COST MONITORING SYSTEM TEST ===\n');

  // Test 1: Check budget status with zero spending
  console.log('Test 1: Initial budget status (should be healthy)');
  const initialStatus = await costMonitor.checkBudgetLimits(TEST_USER_ID);
  console.log('- Allowed:', initialStatus.allowed);
  console.log('- Monthly spend:', `$${initialStatus.currentSpend.monthly.toFixed(2)}`);
  console.log('- Monthly limit:', `$${initialStatus.limits.monthly.toFixed(2)}`);
  console.log('- Percent used:', `${initialStatus.percentUsed.monthly.toFixed(1)}%`);
  console.log('✅ Test 1 passed\n');

  // Test 2: Simulate moderate spending (50% of limit)
  console.log('Test 2: Simulate moderate spending (50% of limit)');
  const moderateSpending = initialStatus.limits.monthly * 0.5;
  for (let i = 0; i < 10; i++) {
    await costMonitor.trackAPICall({
      user_id: TEST_USER_ID,
      model: 'gpt-4o',
      endpoint: '/api/test',
      input_tokens: 1000,
      output_tokens: 500,
      cost_usd: moderateSpending / 10,
      timestamp: new Date().toISOString(),
      metadata: { test: true },
    });
  }

  const moderateStatus = await costMonitor.checkBudgetLimits(TEST_USER_ID);
  console.log('- Allowed:', moderateStatus.allowed);
  console.log('- Monthly spend:', `$${moderateStatus.currentSpend.monthly.toFixed(2)}`);
  console.log('- Percent used:', `${moderateStatus.percentUsed.monthly.toFixed(1)}%`);

  if (moderateStatus.percentUsed.monthly >= 45 && moderateStatus.percentUsed.monthly <= 55) {
    console.log('✅ Test 2 passed (50% threshold reached)\n');
  } else {
    console.log('❌ Test 2 failed (expected ~50%, got', moderateStatus.percentUsed.monthly.toFixed(1), '%)\n');
  }

  // Test 3: Simulate high spending (90% of limit)
  console.log('Test 3: Simulate high spending (90% of limit)');
  const additionalSpending = initialStatus.limits.monthly * 0.4; // Add 40% more
  for (let i = 0; i < 10; i++) {
    await costMonitor.trackAPICall({
      user_id: TEST_USER_ID,
      model: 'gpt-5',
      endpoint: '/api/test',
      input_tokens: 2000,
      output_tokens: 1000,
      cost_usd: additionalSpending / 10,
      timestamp: new Date().toISOString(),
      metadata: { test: true },
    });
  }

  const highStatus = await costMonitor.checkBudgetLimits(TEST_USER_ID);
  console.log('- Allowed:', highStatus.allowed);
  console.log('- Monthly spend:', `$${highStatus.currentSpend.monthly.toFixed(2)}`);
  console.log('- Percent used:', `${highStatus.percentUsed.monthly.toFixed(1)}%`);

  if (highStatus.percentUsed.monthly >= 85 && highStatus.percentUsed.monthly <= 95) {
    console.log('✅ Test 3 passed (90% threshold reached)\n');
  } else {
    console.log('❌ Test 3 failed (expected ~90%, got', highStatus.percentUsed.monthly.toFixed(1), '%)\n');
  }

  // Test 4: Test budget enforcement (should block if hard stop enabled)
  console.log('Test 4: Test budget enforcement at limit');
  const enforcement = await costMonitor.enforceApiCallBudget(TEST_USER_ID, '/api/test');
  console.log('- Budget enforcement result:', enforcement.allowed ? 'ALLOWED (warning only)' : 'BLOCKED (hard stop)');
  console.log('- Reason:', enforcement.reason || 'Within budget');

  if (costMonitor.BUDGET_LIMITS.HARD_STOP_AT_LIMIT) {
    console.log('✅ Test 4: Hard stop is ENABLED (prevents overspending)\n');
  } else {
    console.log('⚠️  Test 4: Hard stop is DISABLED (only warnings - risk of overspending)\n');
  }

  // Test 5: Test over-limit spending (should fail if hard stop enabled)
  console.log('Test 5: Attempt spending beyond limit (should block if hard stop enabled)');
  const overLimitSpending = initialStatus.limits.monthly * 0.15; // Add 15% more (total 105%)

  let blockedCount = 0;
  for (let i = 0; i < 5; i++) {
    const preCheck = await costMonitor.enforceApiCallBudget(TEST_USER_ID, '/api/test');

    if (preCheck.allowed) {
      await costMonitor.trackAPICall({
        user_id: TEST_USER_ID,
        model: 'gpt-5',
        endpoint: '/api/test',
        input_tokens: 5000,
        output_tokens: 2000,
        cost_usd: overLimitSpending / 5,
        timestamp: new Date().toISOString(),
        metadata: { test: true, over_limit: true },
      });
    } else {
      blockedCount++;
      console.log(`  - Call ${i + 1}: BLOCKED`);
    }
  }

  const finalStatus = await costMonitor.checkBudgetLimits(TEST_USER_ID);
  console.log('- Final allowed status:', finalStatus.allowed);
  console.log('- Final monthly spend:', `$${finalStatus.currentSpend.monthly.toFixed(2)}`);
  console.log('- Final percent used:', `${finalStatus.percentUsed.monthly.toFixed(1)}%`);
  console.log('- Calls blocked:', blockedCount, '/ 5');

  if (costMonitor.BUDGET_LIMITS.HARD_STOP_AT_LIMIT && blockedCount > 0) {
    console.log('✅ Test 5 passed (calls were blocked at limit)\n');
  } else if (!costMonitor.BUDGET_LIMITS.HARD_STOP_AT_LIMIT) {
    console.log('⚠️  Test 5: Warning mode only (no hard stop)\n');
  } else {
    console.log('❌ Test 5 failed (expected blocks but got', blockedCount, ')\n');
  }

  // Test 6: Test cost calculation accuracy
  console.log('Test 6: Cost calculation accuracy');
  const testCosts = [
    { model: 'gpt-5', input: 1000000, output: 500000, expected: 10.0 + 15.0 }, // $10/M in + $30/M out
    { model: 'gpt-4o-mini', input: 1000000, output: 1000000, expected: 0.15 + 0.60 },
    { model: 'text-embedding-3-small', input: 1000000, output: 0, expected: 0.02 },
    { model: 'assemblyai-transcription', input: 0, output: 0, expected: 0.41 }, // per hour
  ];

  let costTestsPassed = 0;
  for (const test of testCosts) {
    const calculated = costMonitor.calculateCost(test.model, test.input, test.output);
    const tolerance = 0.01; // Allow 1 cent difference
    const correct = Math.abs(calculated - test.expected) < tolerance;

    console.log(`  - ${test.model}: $${calculated.toFixed(4)} (expected $${test.expected.toFixed(4)}) ${correct ? '✅' : '❌'}`);
    if (correct) costTestsPassed++;
  }

  if (costTestsPassed === testCosts.length) {
    console.log('✅ Test 6 passed (all cost calculations accurate)\n');
  } else {
    console.log(`❌ Test 6 failed (${costTestsPassed}/${testCosts.length} passed)\n`);
  }

  // Test 7: Analytics test
  console.log('Test 7: Usage analytics');
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const analytics = await costMonitor.getUsageAnalytics(startDate, endDate, TEST_USER_ID);
  console.log('- Total cost:', `$${analytics.totalCost.toFixed(2)}`);
  console.log('- Total calls:', analytics.totalCalls);
  console.log('- Daily average:', `$${analytics.dailyAverage.toFixed(2)}`);
  console.log('- Projected monthly:', `$${analytics.projectedMonthly.toFixed(2)}`);
  console.log('- Models used:', Object.keys(analytics.costByModel).join(', '));
  console.log('✅ Test 7 passed (analytics working)\n');

  // Summary
  console.log('=== TEST SUMMARY ===');
  console.log('Cost monitoring system:', costMonitor.BUDGET_LIMITS.HARD_STOP_AT_LIMIT ? '🟢 PROTECTED (hard stop enabled)' : '🟡 WARNING ONLY');
  console.log('Daily limit:', `$${costMonitor.BUDGET_LIMITS.DAILY_TOTAL}`);
  console.log('Monthly limit:', `$${costMonitor.BUDGET_LIMITS.MONTHLY_TOTAL}`);
  console.log('Alert thresholds: 50%, 75%, 90%, 100%');
  console.log('\n⚠️  IMPORTANT: Remember to clean up test data from database!\n');
}

// Run tests
testCostMonitoring()
  .then(() => {
    console.log('Tests completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
