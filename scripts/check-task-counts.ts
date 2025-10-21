import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkCounts() {
  const { data: allTasks } = await supabase
    .from('agent_tasks')
    .select('status');

  const counts = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    failed: 0
  };

  if (allTasks) {
    allTasks.forEach(t => {
      counts[t.status as keyof typeof counts]++;
    });
  }

  console.log('Task Status Breakdown:');
  console.log(`  Pending: ${counts.pending}`);
  console.log(`  In Progress: ${counts.in_progress}`);
  console.log(`  Completed: ${counts.completed}`);
  console.log(`  Failed: ${counts.failed}`);
  console.log(`  TOTAL: ${allTasks?.length || 0}`);

  // Check recent activity
  const { data: recentCompleted } = await supabase
    .from('agent_tasks')
    .select('title, completed_at')
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(5);

  console.log('\nRecently Completed Tasks:');
  if (recentCompleted && recentCompleted.length > 0) {
    recentCompleted.forEach(t => {
      const time = new Date(t.completed_at).toLocaleTimeString();
      console.log(`  - ${time}: ${t.title}`);
    });
  } else {
    console.log('  (none)');
  }
}

checkCounts();
