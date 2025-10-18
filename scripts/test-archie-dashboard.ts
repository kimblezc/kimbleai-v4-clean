/**
 * Test script to verify Archie dashboard is working
 * Creates test data in agent tables
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testArchie() {
  console.log('🦉 Testing Archie dashboard...\n');

  // 1. Create a test task
  console.log('1️⃣ Creating test task...');
  const { data: task, error: taskError } = await supabase
    .from('agent_tasks')
    .insert({
      task_type: 'optimize_performance',
      priority: 10,
      title: 'TEST: Gmail Search Optimization',
      description: 'Test task to verify dashboard is working',
      status: 'pending',
      metadata: {
        test: true,
        goal: 'Goal #1 - Gmail Integration'
      }
    })
    .select()
    .single();

  if (taskError) {
    console.error('❌ Failed to create task:', taskError.message);
  } else {
    console.log('✅ Test task created:', task.id);
  }

  // 2. Create a test finding
  console.log('\n2️⃣ Creating test finding...');
  const { data: finding, error: findingError } = await supabase
    .from('agent_findings')
    .insert({
      finding_type: 'insight',
      severity: 'info',
      title: 'TEST: Dashboard Verification',
      description: 'This is a test finding to verify Archie dashboard is displaying data correctly',
      detection_method: 'manual_test',
      status: 'open'
    })
    .select()
    .single();

  if (findingError) {
    console.error('❌ Failed to create finding:', findingError.message);
  } else {
    console.log('✅ Test finding created:', finding.id);
  }

  // 3. Create a test log entry
  console.log('\n3️⃣ Creating test log...');
  const { data: log, error: logError } = await supabase
    .from('agent_logs')
    .insert({
      log_level: 'info',
      message: '🦉 Archie dashboard test - If you see this, the dashboard is working!',
      details: { test: true, timestamp: new Date().toISOString() }
    })
    .select()
    .single();

  if (logError) {
    console.error('❌ Failed to create log:', logError.message);
  } else {
    console.log('✅ Test log created:', log.id);
  }

  // 4. Verify data is retrievable
  console.log('\n4️⃣ Verifying data retrieval...');
  const { data: tasks, error: tasksError } = await supabase
    .from('agent_tasks')
    .select('*')
    .limit(5);

  if (tasksError) {
    console.error('❌ Failed to retrieve tasks:', tasksError.message);
  } else {
    console.log(`✅ Retrieved ${tasks.length} task(s) from database`);
  }

  const { data: findings, error: findingsError } = await supabase
    .from('agent_findings')
    .select('*')
    .limit(5);

  if (findingsError) {
    console.error('❌ Failed to retrieve findings:', findingsError.message);
  } else {
    console.log(`✅ Retrieved ${findings.length} finding(s) from database`);
  }

  const { data: logs, error: logsError } = await supabase
    .from('agent_logs')
    .select('*')
    .limit(5);

  if (logsError) {
    console.error('❌ Failed to retrieve logs:', logsError.message);
  } else {
    console.log(`✅ Retrieved ${logs.length} log(s) from database`);
  }

  console.log('\n🎯 Test complete!');
  console.log('\n📊 Now refresh the dashboard at: https://kimbleai.com/agent');
  console.log('You should see:');
  console.log('  - Tasks: 1');
  console.log('  - Findings: 1');
  console.log('  - Logs: 1');
}

testArchie().catch(console.error);
