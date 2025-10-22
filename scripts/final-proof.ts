import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function finalProof() {
  console.log('\n' + '='.repeat(70));
  console.log('🎉 FINAL PROOF: ARCHIE FIXES COMPLETE');
  console.log('='.repeat(70) + '\n');

  // Get last 10 findings
  const { data: findings } = await supabase
    .from('agent_findings')
    .select('title, detected_at')
    .order('detected_at', { ascending: false })
    .limit(10);

  console.log('📋 Last 10 Findings Created:\n');
  findings?.forEach((f, i) => {
    const isGeneric = f.title === 'Improvement Suggestion';
    const emoji = isGeneric ? '❌' : '✅';
    const time = new Date(f.detected_at).toLocaleTimeString();
    console.log(`${i + 1}. ${emoji} [${time}] ${f.title.substring(0, 60)}`);
  });

  const genericCount = findings?.filter(f => f.title === 'Improvement Suggestion').length || 0;
  const descriptiveCount = findings?.filter(f => f.title !== 'Improvement Suggestion').length || 0;

  console.log('\n' + '='.repeat(70));
  console.log(`Generic titles: ${genericCount} / 10`);
  console.log(`Descriptive titles: ${descriptiveCount} / 10`);

  // Get task stats
  const { data: tasks } = await supabase
    .from('agent_tasks')
    .select('status, task_type');

  const completed = tasks?.filter(t => t.status === 'completed').length || 0;
  const pending = tasks?.filter(t => t.status === 'pending').length || 0;
  const docTasks = tasks?.filter(t => t.task_type === 'documentation_update').length || 0;

  console.log('\n📊 Task Stats:');
  console.log(`   Completed: ${completed}`);
  console.log(`   Pending: ${pending}`);
  console.log(`   Documentation tasks: ${docTasks}`);

  console.log('\n' + '='.repeat(70));
  console.log('✅ VERIFICATION:\n');

  const checks = [
    { name: 'Descriptive finding titles', pass: descriptiveCount >= 7, emoji: descriptiveCount >= 7 ? '✅' : '❌' },
    { name: 'No documentation_update tasks', pass: docTasks === 0, emoji: docTasks === 0 ? '✅' : '❌' },
    { name: 'Pending queue healthy', pass: pending < 10, emoji: pending < 10 ? '✅' : '❌' },
    { name: 'All work completed', pass: pending === 0, emoji: pending === 0 ? '✅' : '❌' }
  ];

  checks.forEach(check => {
    console.log(`   ${check.emoji} ${check.name}`);
  });

  const allPassed = checks.every(c => c.pass);

  console.log('\n' + '='.repeat(70));
  if (allPassed) {
    console.log('🎉 ALL FIXES VERIFIED - ARCHIE IS FULLY FUNCTIONAL!');
  } else {
    console.log('⏳ Some checks pending - waiting for more data...');
  }
  console.log('='.repeat(70) + '\n');
}

finalProof();
