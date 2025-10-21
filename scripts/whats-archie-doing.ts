import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('\n🦉 WHAT IS ARCHIE ACTUALLY DOING?\n' + '='.repeat(80) + '\n');

  const { data: tasks } = await supabase
    .from('agent_tasks')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: findings } = await supabase
    .from('agent_findings')
    .select('*')
    .order('detected_at', { ascending: false });

  const completed = tasks?.filter(t => t.status === 'completed') || [];
  const inProgress = tasks?.filter(t => t.status === 'in_progress') || [];
  const pending = tasks?.filter(t => t.status === 'pending') || [];
  const suggestions = findings?.filter(f =>
    f.finding_type === 'improvement' || f.finding_type === 'optimization' || f.severity === 'low'
  ) || [];

  // Extract useful title from description
  function getReadableTitle(task: any): string {
    if (!task.description) return task.title;

    // If title is generic, use description
    if (task.title === 'Improvement Suggestion' || task.title?.includes('Archie Generated')) {
      return task.description.substring(0, 100).replace(/\n/g, ' ');
    }

    return task.title;
  }

  console.log('📊 SUMMARY:');
  console.log(`   ✅ Completed:    ${completed.length}`);
  console.log(`   🔄 In Progress:  ${inProgress.length}`);
  console.log(`   ⏳ Pending:      ${pending.length}`);
  console.log(`   💡 Suggestions:  ${suggestions.length}\n`);

  console.log('='.repeat(80));
  console.log('\n✅ WHAT ARCHIE HAS COMPLETED (Last 20):\n');

  completed.slice(0, 20).forEach((task, i) => {
    const title = getReadableTitle(task);
    const time = new Date(task.completed_at).toLocaleString();
    console.log(`${i + 1}. [${task.task_type}] ${title}`);
    console.log(`   Completed: ${time}\n`);
  });

  console.log('='.repeat(80));
  console.log('\n⏳ WHAT ARCHIE WILL DO NEXT (Top 15 Pending):\n');

  pending
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 15)
    .forEach((task, i) => {
      const title = getReadableTitle(task);
      console.log(`${i + 1}. [Priority ${task.priority}] [${task.task_type}] ${title}\n`);
    });

  console.log('='.repeat(80));
  console.log('\n💡 SUGGESTIONS FROM ANALYSIS (Top 10):\n');

  suggestions.slice(0, 10).forEach((finding, i) => {
    const desc = finding.description?.substring(0, 150) || 'No description';
    console.log(`${i + 1}. [${finding.finding_type}] ${desc}...\n`);
  });

  console.log('='.repeat(80));
  console.log('\n📋 TASK BREAKDOWN BY TYPE:\n');

  const pendingByType: Record<string, number> = {};
  pending.forEach(t => {
    pendingByType[t.task_type] = (pendingByType[t.task_type] || 0) + 1;
  });

  console.log('Pending Tasks:');
  Object.entries(pendingByType)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

  const completedByType: Record<string, number> = {};
  completed.forEach(t => {
    completedByType[t.task_type] = (completedByType[t.task_type] || 0) + 1;
  });

  console.log('\nCompleted Tasks:');
  Object.entries(completedByType)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

  console.log('\n' + '='.repeat(80));
  console.log('\n⚠️  NOTE: If you see "Archie analyzed the task..." - those are NOT real');
  console.log('   executable tasks. They\'re just documentation of Archie\'s analysis.\n');
  console.log('   See ARCHIE_SYSTEM_EXPLAINED.md for full details.\n');
}

main();
