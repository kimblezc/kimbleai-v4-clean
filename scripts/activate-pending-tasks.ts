import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function activateTasks() {
  console.log('🔧 Setting scheduled_for on all pending tasks...\n');

  const now = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from('agent_tasks')
    .update({ scheduled_for: now })
    .eq('status', 'pending')
    .is('scheduled_for', null)
    .select('id, title');

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  const count = updated?.length || 0;
  console.log(`✅ Updated ${count} tasks to have scheduled_for = NOW`);
  console.log('\nAll pending tasks are now immediately processable!');

  if (updated && updated.length > 0) {
    console.log('\nUpdated tasks:');
    updated.slice(0, 10).forEach(t => {
      console.log(`  - ${t.title.substring(0, 70)}`);
    });
    if (updated.length > 10) {
      console.log(`  ... and ${updated.length - 10} more`);
    }
  }
}

activateTasks();
