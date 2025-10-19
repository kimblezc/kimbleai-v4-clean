/**
 * Quick database check script
 * Uses process.env directly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'present' : 'MISSING');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'present' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🦉 Checking database...\n');

  // Check tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('agent_tasks')
    .select('id, title, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (tasksError) {
    console.error('❌ Error fetching tasks:', tasksError);
    return;
  }

  console.log(`📝 Found ${tasks.length} recent tasks:`);
  tasks.forEach(task => {
    console.log(`  - [${task.status}] ${task.title}`);
  });

  // Check findings
  const { data: findings, error: findingsError } = await supabase
    .from('agent_findings')
    .select('id, title, severity, detected_at')
    .order('detected_at', { ascending: false })
    .limit(10);

  if (findingsError) {
    console.error('❌ Error fetching findings:', findingsError);
    return;
  }

  console.log(`\n🔍 Found ${findings.length} recent findings:`);
  findings.forEach(finding => {
    console.log(`  - [${finding.severity}] ${finding.title}`);
  });

  // Get counts
  const { count: taskCount } = await supabase
    .from('agent_tasks')
    .select('*', { count: 'exact', head: true });

  const { count: findingCount } = await supabase
    .from('agent_findings')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total counts:`);
  console.log(`  Tasks: ${taskCount}`);
  console.log(`  Findings: ${findingCount}`);
}

checkDatabase().catch(console.error);
