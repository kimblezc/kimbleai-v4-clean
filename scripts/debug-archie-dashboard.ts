/**
 * Debug script to check Archie dashboard data
 * Run with: npx ts-node scripts/debug-archie-dashboard.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugArchie() {
  console.log('🔍 ARCHIE DASHBOARD DEBUG\n');
  console.log('=' .repeat(60));

  // Check tasks
  const { data: allTasks, error: tasksError } = await supabase
    .from('agent_tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (tasksError) {
    console.log('❌ Tasks error:', tasksError.message);
  } else {
    console.log(`\n📋 TASKS: ${allTasks?.length || 0} total`);

    const byStatus = {
      pending: allTasks?.filter(t => t.status === 'pending').length || 0,
      in_progress: allTasks?.filter(t => t.status === 'in_progress').length || 0,
      completed: allTasks?.filter(t => t.status === 'completed').length || 0,
      failed: allTasks?.filter(t => t.status === 'failed').length || 0
    };

    console.log('  Status breakdown:', byStatus);

    if (allTasks && allTasks.length > 0) {
      console.log('\n  Sample task:');
      console.log('  ---');
      const sample = allTasks[0];
      console.log(`  Title: ${sample.title}`);
      console.log(`  Description: ${sample.description?.substring(0, 100)}...`);
      console.log(`  Status: ${sample.status}`);
      console.log(`  Priority: ${sample.priority}`);
      console.log(`  Created: ${new Date(sample.created_at).toLocaleString()}`);
    }
  }

  // Check findings
  const { data: allFindings, error: findingsError } = await supabase
    .from('agent_findings')
    .select('*')
    .order('detected_at', { ascending: false });

  if (findingsError) {
    console.log('\n❌ Findings error:', findingsError.message);
  } else {
    console.log(`\n💡 FINDINGS: ${allFindings?.length || 0} total`);

    const byType = {
      error: allFindings?.filter(f => f.finding_type === 'error').length || 0,
      warning: allFindings?.filter(f => f.finding_type === 'warning').length || 0,
      optimization: allFindings?.filter(f => f.finding_type === 'optimization').length || 0,
      improvement: allFindings?.filter(f => f.finding_type === 'improvement').length || 0,
      insight: allFindings?.filter(f => f.finding_type === 'insight').length || 0
    };

    console.log('  Type breakdown:', byType);

    if (allFindings && allFindings.length > 0) {
      console.log('\n  Sample findings (first 5):');
      console.log('  ---');
      allFindings.slice(0, 5).forEach((finding, i) => {
        console.log(`  ${i + 1}. [${finding.finding_type}] ${finding.title}`);
        console.log(`     "${finding.description?.substring(0, 80)}..."`);
        console.log(`     Detected: ${new Date(finding.detected_at).toLocaleString()}`);
        console.log('');
      });
    }
  }

  // Check logs
  const { data: recentLogs, error: logsError } = await supabase
    .from('agent_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(10);

  if (logsError) {
    console.log('\n❌ Logs error:', logsError.message);
  } else {
    console.log(`\n📝 RECENT LOGS: ${recentLogs?.length || 0} (last 10)`);
    if (recentLogs && recentLogs.length > 0) {
      console.log('  ---');
      recentLogs.slice(0, 5).forEach((log, i) => {
        console.log(`  ${i + 1}. [${log.log_level.toUpperCase()}] ${log.message}`);
        console.log(`     ${new Date(log.timestamp).toLocaleString()}`);
      });
    }
  }

  // Check agent state
  const { data: agentState } = await supabase
    .from('agent_state')
    .select('*');

  console.log(`\n⚙️  AGENT STATE:`);
  if (agentState) {
    agentState.forEach(state => {
      console.log(`  ${state.key}: ${JSON.stringify(state.value)}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Debug complete');
}

debugArchie().catch(console.error);
