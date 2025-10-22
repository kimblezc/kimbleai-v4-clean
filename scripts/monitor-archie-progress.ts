import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function monitor() {
  const now = new Date();
  console.log(`\n[${ now.toLocaleTimeString()}] 🦉 ARCHIE MONITOR\n` + '='.repeat(60));

  // Get task counts
  const { data: tasks } = await supabase
    .from('agent_tasks')
    .select('status, task_type, title, description, created_at');

  const completed = tasks?.filter(t => t.status === 'completed') || [];
  const pending = tasks?.filter(t => t.status === 'pending') || [];
  const inProgress = tasks?.filter(t => t.status === 'in_progress') || [];

  // Get findings count
  const { data: findings } = await supabase
    .from('agent_findings')
    .select('id, related_task_id');

  const linkedFindings = findings?.filter(f => f.related_task_id) || [];
  const unlinkedFindings = findings?.filter(f => !f.related_task_id) || [];

  console.log('📊 COUNTS:');
  console.log(`   Total: ${tasks?.length || 0}`);
  console.log(`   ✅ Completed: ${completed.length}`);
  console.log(`   🔄 In Progress: ${inProgress.length}`);
  console.log(`   ⏳ Pending: ${pending.length}`);
  console.log(`   💡 Findings (linked): ${linkedFindings.length}`);
  console.log(`   💡 Findings (unlinked): ${unlinkedFindings.length}`);

  // Check for issues
  console.log('\n🔍 ISSUE CHECK:');

  // Check 1: Documentation update tasks
  const docTasks = pending.filter(t => t.task_type === 'documentation_update');
  if (docTasks.length > 0) {
    console.log(`   ⚠️  ${docTasks.length} documentation_update tasks found (should be 0)`);
  } else {
    console.log('   ✅ No documentation_update tasks');
  }

  // Check 2: Generic titles
  const genericTitles = pending.filter(t =>
    t.title === 'Improvement Suggestion' ||
    t.title?.includes('Archie Generated')
  );
  if (genericTitles.length > 0) {
    console.log(`   ⚠️  ${genericTitles.length} tasks with generic titles`);
  } else {
    console.log('   ✅ No generic titles');
  }

  // Check 3: Recent duplicates (same description in last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recentTasks = tasks?.filter(t => t.created_at > oneHourAgo) || [];

  const descriptionMap = new Map<string, number>();
  recentTasks.forEach(t => {
    const key = t.description?.substring(0, 100);
    if (key) {
      descriptionMap.set(key, (descriptionMap.get(key) || 0) + 1);
    }
  });

  const duplicates = Array.from(descriptionMap.entries()).filter(([, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log(`   ⚠️  ${duplicates.length} duplicate tasks created in last hour`);
    duplicates.forEach(([desc, count]) => {
      console.log(`      - "${desc.substring(0, 50)}..." (${count}x)`);
    });
  } else {
    console.log('   ✅ No duplicates in last hour');
  }

  // Check 4: Recent activity
  const recentCompleted = completed
    .filter(t => t.created_at > oneHourAgo)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (recentCompleted.length > 0) {
    console.log(`\n📝 RECENT ACTIVITY (${recentCompleted.length} completed in last hour):`);
    recentCompleted.forEach((t, i) => {
      const title = t.title.substring(0, 60);
      console.log(`   ${i + 1}. [${t.task_type}] ${title}`);
    });
  } else {
    console.log('\n📝 RECENT ACTIVITY: No tasks completed in last hour');
  }

  // Check 5: What's pending
  console.log(`\n⏳ PENDING QUEUE (${pending.length} tasks):`);
  pending
    .sort((a, b) => (b as any).priority - (a as any).priority)
    .slice(0, 5)
    .forEach((t, i) => {
      const title = t.title.substring(0, 60);
      console.log(`   ${i + 1}. [${t.task_type}] ${title}`);
    });

  // Overall status
  console.log('\n' + '='.repeat(60));
  if (docTasks.length === 0 && genericTitles.length === 0 && duplicates.length === 0) {
    console.log('✅ ALL CHECKS PASSED - Archie is working correctly!\n');
  } else {
    console.log('⚠️  ISSUES DETECTED - Waiting for deployment or need investigation\n');
  }
}

monitor();
