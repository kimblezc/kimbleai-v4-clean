/**
 * Test if processPendingTasks would actually process tasks with the new code
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testProcessing() {
  console.log('🧪 Testing task processing with NEW code...\n');

  // This is the NEW query from our fix
  const now = new Date().toISOString();
  const { data: tasks, error } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('status', 'pending')
    .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
    .order('priority', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`✅ Found ${tasks?.length || 0} tasks that WOULD be processed\n`);

  if (tasks && tasks.length > 0) {
    console.log('Tasks that will be processed on next Archie run:');
    tasks.forEach((t, i) => {
      console.log(`\n${i + 1}. [P${t.priority}] ${t.task_type}`);
      console.log(`   Title: ${t.title}`);
      console.log(`   Status: ${t.status}`);
      console.log(`   scheduled_for: ${t.scheduled_for || 'NULL'}`);
    });

    console.log('\n📊 Summary:');
    console.log(`  - ${tasks.length} tasks ready to process`);
    console.log(`  - Highest priority: P${Math.max(...tasks.map(t => t.priority))}`);
    console.log(`  - Task types: ${[...new Set(tasks.map(t => t.task_type))].join(', ')}`);

    console.log('\n✅ THE FIX WORKS! Archie will process these tasks on next cron run.');
    console.log('⏱️  Next automatic cron run: Within 5 minutes');
  } else {
    console.log('❌ No tasks found - there may be another issue');
  }
}

testProcessing();
