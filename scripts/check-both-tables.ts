import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('=== AGENT_TASKS ===');
  const { data: tasks } = await supabase
    .from('agent_tasks')
    .select('status, title, task_type, description');

  const tasksByStatus = {
    completed: tasks?.filter(t => t.status === 'completed') || [],
    in_progress: tasks?.filter(t => t.status === 'in_progress') || [],
    pending: tasks?.filter(t => t.status === 'pending') || []
  };

  console.log('Completed:', tasksByStatus.completed.length);
  console.log('In Progress:', tasksByStatus.in_progress.length);
  console.log('Pending:', tasksByStatus.pending.length);

  console.log('\nSample completed tasks:');
  tasksByStatus.completed.slice(0, 3).forEach(t => {
    console.log(`  - [${t.task_type}] ${t.title}`);
  });

  console.log('\nSample pending tasks:');
  tasksByStatus.pending.slice(0, 3).forEach(t => {
    console.log(`  - [${t.task_type}] ${t.title}`);
    if (t.description) {
      console.log(`    ${t.description.substring(0, 100)}...`);
    }
  });

  console.log('\n=== AGENT_FINDINGS ===');
  const { data: findings } = await supabase
    .from('agent_findings')
    .select('finding_type, severity, title, description');

  console.log('Total findings:', findings?.length || 0);

  const suggestions = findings?.filter(f =>
    f.finding_type === 'improvement' ||
    f.finding_type === 'optimization' ||
    f.severity === 'low'
  ) || [];

  console.log('Suggestions (improvement/optimization/low severity):', suggestions.length);

  // Group by finding type
  const byType: Record<string, number> = {};
  findings?.forEach(f => {
    byType[f.finding_type] = (byType[f.finding_type] || 0) + 1;
  });

  console.log('\nFindings by type:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  console.log('\nSample suggestions:');
  suggestions.slice(0, 5).forEach(f => {
    console.log(`  - [${f.finding_type}] ${f.title || 'No title'}`);
  });
}

main();
