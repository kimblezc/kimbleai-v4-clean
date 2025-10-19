/**
 * Comprehensive Archie Testing Suite
 * Tests all capabilities and database interactions
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function comprehensiveTest() {
  console.log('🧪 ARCHIE COMPREHENSIVE TEST SUITE\n');
  console.log('='.repeat(60));

  // Test 1: Agent State
  console.log('\n📊 TEST 1: Agent State & Health Check');
  console.log('-'.repeat(60));

  const { data: agentState } = await supabase
    .from('agent_state')
    .select('*');

  console.log(`Agent State Records: ${agentState?.length || 0}`);
  agentState?.forEach((state: any) => {
    console.log(`  - ${state.key}: ${state.value}`);
  });

  // Test 2: Tasks Analysis
  console.log('\n📋 TEST 2: Tasks Analysis');
  console.log('-'.repeat(60));

  const { data: allTasks } = await supabase
    .from('agent_tasks')
    .select('*')
    .order('priority', { ascending: false });

  console.log(`Total Tasks: ${allTasks?.length || 0}\n`);

  const tasksByStatus = {
    pending: allTasks?.filter((t: any) => t.status === 'pending').length || 0,
    in_progress: allTasks?.filter((t: any) => t.status === 'in_progress').length || 0,
    completed: allTasks?.filter((t: any) => t.status === 'completed').length || 0,
    failed: allTasks?.filter((t: any) => t.status === 'failed').length || 0,
  };

  console.log('Status Breakdown:');
  console.log(`  ⏸️  Pending: ${tasksByStatus.pending}`);
  console.log(`  🔄 In Progress: ${tasksByStatus.in_progress}`);
  console.log(`  ✅ Completed: ${tasksByStatus.completed}`);
  console.log(`  ❌ Failed: ${tasksByStatus.failed}`);

  console.log('\nTask Details:');
  allTasks?.forEach((task: any) => {
    const icon = task.status === 'completed' ? '✅' :
                 task.status === 'in_progress' ? '🔄' :
                 task.status === 'failed' ? '❌' : '⏸️';
    console.log(`  ${icon} [P${task.priority}] ${task.title}`);
    if (task.metadata?.tasks) {
      const completed = task.metadata.completed_tasks?.length || 0;
      const total = task.metadata.tasks.length;
      const progress = Math.round((completed / total) * 100);
      console.log(`      Progress: ${progress}% (${completed}/${total} subtasks)`);
    }
    if (task.result) {
      console.log(`      Result: ${task.result.slice(0, 100)}...`);
    }
  });

  // Test 3: Findings Analysis
  console.log('\n🔍 TEST 3: Findings Analysis');
  console.log('-'.repeat(60));

  const { data: allFindings } = await supabase
    .from('agent_findings')
    .select('*')
    .order('detected_at', { ascending: false });

  console.log(`Total Findings: ${allFindings?.length || 0}\n`);

  const findingsBySeverity = {
    critical: allFindings?.filter((f: any) => f.severity === 'critical').length || 0,
    high: allFindings?.filter((f: any) => f.severity === 'high').length || 0,
    medium: allFindings?.filter((f: any) => f.severity === 'medium').length || 0,
    low: allFindings?.filter((f: any) => f.severity === 'low').length || 0,
    info: allFindings?.filter((f: any) => f.severity === 'info').length || 0,
  };

  console.log('Severity Breakdown:');
  console.log(`  🔴 Critical: ${findingsBySeverity.critical}`);
  console.log(`  🟠 High: ${findingsBySeverity.high}`);
  console.log(`  🟡 Medium: ${findingsBySeverity.medium}`);
  console.log(`  🟢 Low: ${findingsBySeverity.low}`);
  console.log(`  ℹ️  Info: ${findingsBySeverity.info}`);

  console.log('\nRecent Findings:');
  allFindings?.slice(0, 10).forEach((finding: any) => {
    const severityIcon = finding.severity === 'critical' ? '🔴' :
                         finding.severity === 'high' ? '🟠' :
                         finding.severity === 'medium' ? '🟡' :
                         finding.severity === 'low' ? '🟢' : 'ℹ️';
    console.log(`  ${severityIcon} [${finding.finding_type}] ${finding.title}`);
    console.log(`      ${finding.description.slice(0, 100)}...`);
  });

  // Test 4: Logs Analysis
  console.log('\n📝 TEST 4: Logs Analysis');
  console.log('-'.repeat(60));

  const { data: allLogs } = await supabase
    .from('agent_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(50);

  console.log(`Total Recent Logs: ${allLogs?.length || 0}\n`);

  const logsByLevel = {
    error: allLogs?.filter((l: any) => l.log_level === 'error').length || 0,
    warn: allLogs?.filter((l: any) => l.log_level === 'warn').length || 0,
    info: allLogs?.filter((l: any) => l.log_level === 'info').length || 0,
  };

  console.log('Log Level Breakdown:');
  console.log(`  ❌ Errors: ${logsByLevel.error}`);
  console.log(`  ⚠️  Warnings: ${logsByLevel.warn}`);
  console.log(`  ℹ️  Info: ${logsByLevel.info}`);

  console.log('\nRecent Log Messages:');
  allLogs?.slice(0, 15).forEach((log: any) => {
    const time = new Date(log.timestamp).toLocaleTimeString();
    const levelIcon = log.log_level === 'error' ? '❌' :
                      log.log_level === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`  ${levelIcon} [${time}] ${log.message}`);
  });

  // Test 5: Reports Analysis
  console.log('\n📊 TEST 5: Reports Analysis');
  console.log('-'.repeat(60));

  const { data: reports } = await supabase
    .from('agent_reports')
    .select('*')
    .order('generated_at', { ascending: false });

  console.log(`Total Reports: ${reports?.length || 0}\n`);

  if (reports && reports.length > 0) {
    console.log('Latest Report:');
    const latest = reports[0];
    console.log(`  Type: ${latest.report_type}`);
    console.log(`  Generated: ${new Date(latest.generated_at).toLocaleString()}`);
    console.log(`  Tasks Completed: ${latest.tasks_completed || 0}`);
    console.log(`  Issues Found: ${latest.issues_found || 0}`);
    console.log(`  Issues Fixed: ${latest.issues_fixed || 0}`);
    console.log(`  Summary: ${latest.executive_summary?.slice(0, 150)}...`);
  } else {
    console.log('  No reports generated yet');
  }

  // Test 6: Self-Improvement Findings
  console.log('\n🧠 TEST 6: Self-Improvement Analysis');
  console.log('-'.repeat(60));

  const { data: selfImprovements } = await supabase
    .from('agent_findings')
    .select('*')
    .eq('detection_method', 'self_analysis')
    .order('detected_at', { ascending: false });

  console.log(`Self-Improvement Findings: ${selfImprovements?.length || 0}\n`);

  selfImprovements?.forEach((finding: any) => {
    console.log(`  🧠 ${finding.title}`);
    console.log(`     ${finding.description.slice(0, 100)}...`);
  });

  // Test 7: Code Generation Findings
  console.log('\n🤖 TEST 7: Code Generation Analysis');
  console.log('-'.repeat(60));

  const { data: codeChanges } = await supabase
    .from('agent_findings')
    .select('*')
    .eq('detection_method', 'autonomous_code_generation')
    .order('detected_at', { ascending: false });

  console.log(`Code Generation Findings: ${codeChanges?.length || 0}\n`);

  codeChanges?.forEach((finding: any) => {
    console.log(`  💻 ${finding.title}`);
    if (finding.evidence?.files) {
      console.log(`     Files to modify: ${finding.evidence.files.length}`);
      finding.evidence.files.forEach((file: any) => {
        console.log(`       - ${file.path} (${file.action})`);
      });
    }
  });

  // Test 8: Performance Metrics
  console.log('\n⚡ TEST 8: Performance Metrics');
  console.log('-'.repeat(60));

  const { data: completedTasks } = await supabase
    .from('agent_tasks')
    .select('duration_ms')
    .eq('status', 'completed')
    .not('duration_ms', 'is', null);

  if (completedTasks && completedTasks.length > 0) {
    const avgDuration = completedTasks.reduce((sum: number, t: any) => sum + (t.duration_ms || 0), 0) / completedTasks.length;
    console.log(`  Average Task Duration: ${Math.round(avgDuration)}ms`);
    console.log(`  Fastest: ${Math.min(...completedTasks.map((t: any) => t.duration_ms || 0))}ms`);
    console.log(`  Slowest: ${Math.max(...completedTasks.map((t: any) => t.duration_ms || 0))}ms`);
  } else {
    console.log('  No completed tasks with duration data yet');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  const totalActivity = (allTasks?.length || 0) + (allFindings?.length || 0) + (allLogs?.length || 0);

  console.log(`Total Activity Records: ${totalActivity}`);
  console.log(`  📋 Tasks: ${allTasks?.length || 0}`);
  console.log(`  🔍 Findings: ${allFindings?.length || 0}`);
  console.log(`  📝 Logs: ${allLogs?.length || 0}`);
  console.log(`  📊 Reports: ${reports?.length || 0}`);

  const healthStatus = findingsBySeverity.critical > 0 ? '🔴 Critical Issues' :
                       findingsBySeverity.high > 0 ? '🟡 Needs Attention' :
                       tasksByStatus.failed > 0 ? '🟠 Some Failures' :
                       '🟢 Healthy';

  console.log(`\nSystem Health: ${healthStatus}`);
  console.log(`Active Tasks: ${tasksByStatus.in_progress}`);
  console.log(`Pending Work: ${tasksByStatus.pending}`);

  console.log('\n✅ COMPREHENSIVE TEST COMPLETE');
}

comprehensiveTest().catch(console.error);
