/**
 * Check what Archie has actually done
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkStatus() {
  console.log('🔍 Checking Archie status...\n');

  // Check tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('agent_tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`📋 Tasks: ${tasks?.length || 0}`);
  tasks?.forEach((task: any) => {
    console.log(`  - [P${task.priority}] ${task.title} (${task.status})`);
  });

  // Check findings
  const { data: findings } = await supabase
    .from('agent_findings')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(10);

  console.log(`\n🔍 Findings: ${findings?.length || 0}`);
  findings?.forEach((finding: any) => {
    console.log(`  - [${finding.severity}] ${finding.title}`);
  });

  // Check logs
  const { data: logs } = await supabase
    .from('agent_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(5);

  console.log(`\n📝 Recent Logs: ${logs?.length || 0}`);
  logs?.forEach((log: any) => {
    const date = new Date(log.timestamp).toLocaleTimeString();
    console.log(`  - [${date}] ${log.message}`);
  });

  // Check agent state
  const { data: state } = await supabase
    .from('agent_state')
    .select('*')
    .eq('key', 'agent_enabled')
    .single();

  console.log(`\n⚙️ Agent Enabled: ${state?.value || 'unknown'}`);
}

checkStatus().catch(console.error);
