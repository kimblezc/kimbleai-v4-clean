import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('\n🦉 ARCHIE STATUS SUMMARY\n' + '='.repeat(80));

  // Get tasks
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
    f.finding_type === 'improvement' ||
    f.finding_type === 'optimization' ||
    f.severity === 'low'
  ) || [];

  console.log(`
📊 COUNTS:
   ✅ Completed:    ${completed.length}
   🔄 In Progress:  ${inProgress.length}  ${inProgress.length === 0 ? '← NOTHING ACTIVELY RUNNING' : ''}
   ⏳ Pending:      ${pending.length}
   💡 Suggestions:  ${suggestions.length}
`);

  console.log('='.repeat(80));
  console.log('\n🔍 THE PROBLEM: Everything says "Improvement Suggestion"');
  console.log('   → Titles are generic. Real info is in descriptions.\n');

  console.log('='.repeat(80));
  console.log('\n📋 PENDING vs SUGGESTIONS - What\'s the difference?\n');

  console.log('⏳ PENDING TASKS (121) - Queued work for Archie to execute:');
  console.log('   These are actionable tasks waiting to be processed\n');

  // Analyze pending by type
  const pendingByType: Record<string, any[]> = {};
  pending.forEach(t => {
    const type = t.task_type || 'unknown';
    if (!pendingByType[type]) pendingByType[type] = [];
    pendingByType[type].push(t);
  });

  Object.entries(pendingByType)
    .sort(([, a], [, b]) => b.length - a.length)
    .forEach(([type, items]) => {
      console.log(`   ${type}: ${items.length}`);

      // Show a real example
      const sample = items[0];
      const desc = sample.description?.substring(0, 120) || 'No description';
      console.log(`      Example: ${desc}...\n`);
    });

  console.log('\n💡 SUGGESTIONS (78) - Ideas/insights from analysis:');
  console.log('   These are findings from code analysis, NOT executable tasks\n');

  const suggestionsByType: Record<string, any[]> = {};
  suggestions.forEach(f => {
    const type = f.finding_type;
    if (!suggestionsByType[type]) suggestionsByType[type] = [];
    suggestionsByType[type].push(f);
  });

  Object.entries(suggestionsByType)
    .sort(([, a], [, b]) => b.length - a.length)
    .forEach(([type, items]) => {
      console.log(`   ${type}: ${items.length}`);

      // Show a real example with description
      const sample = items[0];
      const desc = sample.description?.substring(0, 120) || 'No description';
      console.log(`      Example: ${desc}...\n`);
    });

  console.log('='.repeat(80));
  console.log('\n✅ WHAT ARCHIE HAS COMPLETED (91):\n');

  const completedByType: Record<string, any[]> = {};
  completed.forEach(t => {
    const type = t.task_type || 'unknown';
    if (!completedByType[type]) completedByType[type] = [];
    completedByType[type].push(t);
  });

  Object.entries(completedByType)
    .sort(([, a], [, b]) => b.length - a.length)
    .forEach(([type, items]) => {
      console.log(`   ${type}: ${items.length}`);

      // Extract actual work from descriptions
      const realWork = new Set<string>();
      items.forEach(item => {
        const desc = item.description || '';
        // Try to extract meaningful work
        if (desc.includes('try-catch')) realWork.add('Added error handling (try-catch blocks)');
        if (desc.includes('error boundaries')) realWork.add('Added React error boundaries');
        if (desc.includes('AutoReferenceButler')) realWork.add('Optimized AutoReferenceButler queries');
        if (desc.includes('database')) realWork.add('Database optimizations');
        if (desc.includes('performance')) realWork.add('Performance improvements');
      });

      if (realWork.size > 0) {
        realWork.forEach(work => {
          console.log(`      - ${work}`);
        });
      }
      console.log('');
    });

  console.log('='.repeat(80));
  console.log('\n⚠️  KEY ISSUES:\n');
  console.log('   1. Nothing is actively running (in_progress = 0)');
  console.log('   2. Titles are all "Improvement Suggestion" - not descriptive');
  console.log('   3. 109 pending tasks are "documentation_update" - likely Archie\'s');
  console.log('      code change proposals waiting for deployment/approval');
  console.log('   4. Can\'t easily see what work is actually queued\n');

  console.log('='.repeat(80));
}

main();
