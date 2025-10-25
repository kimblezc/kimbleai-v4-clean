import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

async function verifyQueries() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('\n🧪 TESTING ARCHIE DASHBOARD QUERIES\n');
  console.log('=' .repeat(60));

  const userId = 'zach';

  // Test 1: Transcriptions
  console.log('\n📝 Test 1: Transcriptions Query');
  console.log('-'.repeat(60));
  const { count: transcriptionCount, error: transcriptionError } = await supabase
    .from('audio_transcriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (transcriptionError) {
    console.log(`   ❌ ERROR: ${transcriptionError.message}`);
  } else {
    console.log(`   ✅ Success: ${transcriptionCount ?? 0} transcriptions`);
  }

  // Test 2: Device Sessions
  console.log('\n📱 Test 2: Device Sessions Query');
  console.log('-'.repeat(60));
  const { count: deviceCount, error: deviceError } = await supabase
    .from('device_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);

  if (deviceError) {
    console.log(`   ❌ ERROR: ${deviceError.message}`);
  } else {
    console.log(`   ✅ Success: ${deviceCount ?? 0} active devices`);
  }

  // Test 3: Agent Tasks
  console.log('\n✅ Test 3: Agent Tasks Query');
  console.log('-'.repeat(60));
  const { count: allTasksCount, error: allTasksError } = await supabase
    .from('agent_tasks')
    .select('*', { count: 'exact', head: true });

  if (allTasksError) {
    console.log(`   ❌ ERROR: ${allTasksError.message}`);
  } else {
    console.log(`   ✅ Success: ${allTasksCount ?? 0} total tasks`);
  }

  const { count: pendingTasksCount, error: pendingTasksError } = await supabase
    .from('agent_tasks')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'in_progress']);

  if (pendingTasksError) {
    console.log(`   ❌ ERROR: ${pendingTasksError.message}`);
  } else {
    console.log(`   ✅ Success: ${pendingTasksCount ?? 0} pending tasks`);
  }

  // Test 4: Agent Findings
  console.log('\n🔍 Test 4: Agent Findings Query');
  console.log('-'.repeat(60));
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: insightCount, error: insightError } = await supabase
    .from('agent_findings')
    .select('*', { count: 'exact', head: true })
    .gte('detected_at', weekAgo);

  if (insightError) {
    console.log(`   ❌ ERROR: ${insightError.message}`);
  } else {
    console.log(`   ✅ Success: ${insightCount ?? 0} recent insights (last 7 days)`);
  }

  // Test 5: Agent Logs
  console.log('\n📊 Test 5: Agent Logs Query');
  console.log('-'.repeat(60));
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: activityCount, error: activityError } = await supabase
    .from('agent_logs')
    .select('*', { count: 'exact', head: true })
    .gte('timestamp', dayAgo);

  if (activityError) {
    console.log(`   ❌ ERROR: ${activityError.message}`);
  } else {
    console.log(`   ✅ Success: ${activityCount ?? 0} activity logs (last 24h)`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 DASHBOARD STATS SUMMARY\n');

  const hasErrors = !!(transcriptionError || deviceError || allTasksError || insightError || activityError);

  const stats = {
    transcriptions: transcriptionCount ?? 0,
    devices: deviceCount ?? 0,
    tasks: pendingTasksCount ?? 0,
    allTasks: allTasksCount ?? 0,
    insights: insightCount ?? 0,
    activity: activityCount ?? 0,
    hasErrors
  };

  console.log(`Transcriptions: ${stats.transcriptions}`);
  console.log(`Active Devices: ${stats.devices}`);
  console.log(`Pending Tasks: ${stats.tasks} (${stats.allTasks} total)`);
  console.log(`Recent Insights: ${stats.insights}`);
  console.log(`24h Activity: ${stats.activity}`);
  console.log(`\nErrors: ${hasErrors ? 'YES ⚠️' : 'NO ✅'}`);

  if (stats.allTasks > 0) {
    console.log('\n✅ Dashboard should show: "Archie is Active" message');
    console.log(`   "${stats.allTasks} tasks completed, ${stats.insights} insights"`);
  } else if (!hasErrors && stats.transcriptions === 0 && stats.allTasks === 0 && stats.insights === 0) {
    console.log('\n📭 Dashboard should show: "Getting Started" message');
  }

  console.log('\n');
}

verifyQueries();
