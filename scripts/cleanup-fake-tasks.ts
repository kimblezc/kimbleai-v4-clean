import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanup() {
  console.log('\n🧹 CLEANING UP FAKE TASKS\n' + '='.repeat(80));

  // Check what we're about to delete
  const { data: toDelete } = await supabase
    .from('agent_tasks')
    .select('id, title, description, task_type')
    .eq('task_type', 'documentation_update');

  console.log(`\nFound ${toDelete?.length || 0} documentation_update tasks`);

  if (!toDelete || toDelete.length === 0) {
    console.log('Nothing to clean up!');
    return;
  }

  // Show samples
  console.log('\nSample tasks to be deleted:');
  toDelete.slice(0, 5).forEach((t, i) => {
    const desc = t.description?.substring(0, 80) || 'No description';
    console.log(`  ${i + 1}. ${desc}...`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('PROCEEDING WITH DELETION...\n');

  // Step 1: Unlink findings from these tasks
  const taskIds = toDelete.map(t => t.id);

  const { error: unlinkError } = await supabase
    .from('agent_findings')
    .update({ related_task_id: null })
    .in('related_task_id', taskIds);

  if (unlinkError) {
    console.error('Error unlinking findings:', unlinkError);
    return;
  }

  console.log('✅ Unlinked findings from tasks');

  // Step 2: Delete fake documentation_update tasks
  const { error, count } = await supabase
    .from('agent_tasks')
    .delete()
    .eq('task_type', 'documentation_update');

  if (error) {
    console.error('Error deleting tasks:', error);
    return;
  }

  console.log(`✅ Deleted ${toDelete.length} fake documentation_update tasks`);

  // Check what's left
  const { data: remaining } = await supabase
    .from('agent_tasks')
    .select('status');

  const counts = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    failed: 0
  };

  remaining?.forEach(t => {
    counts[t.status as keyof typeof counts]++;
  });

  console.log('\n📊 Remaining tasks:');
  console.log(`   Completed: ${counts.completed}`);
  console.log(`   Pending: ${counts.pending}`);
  console.log(`   In Progress: ${counts.in_progress}`);
  console.log(`   Failed: ${counts.failed}`);
  console.log(`   TOTAL: ${remaining?.length || 0}`);

  console.log('\n✅ Cleanup complete!\n');
}

cleanup();
