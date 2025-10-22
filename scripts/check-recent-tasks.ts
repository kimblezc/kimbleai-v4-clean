import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // Get tasks created in last 15 minutes
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data: recentTasks } = await supabase
    .from('agent_tasks')
    .select('title, description, created_at, status, task_type')
    .gte('created_at', fifteenMinsAgo)
    .order('created_at', { ascending: false});

  console.log(`\n📅 Tasks created in last 15 minutes: ${recentTasks?.length || 0}\n`);

  if (recentTasks && recentTasks.length > 0) {
    console.log('Recent tasks (checking if fixes are working):');
    console.log('='.repeat(70));

    recentTasks.forEach((t, i) => {
      const time = new Date(t.created_at).toLocaleTimeString();
      const title = t.title.substring(0, 70);
      const isGeneric = t.title === 'Improvement Suggestion';
      const emoji = isGeneric ? '❌' : '✅';

      console.log(`${i+1}. [${time}] ${emoji} [${t.task_type}]`);
      console.log(`   Title: ${title}`);
      if (t.description) {
        console.log(`   Desc:  ${t.description.substring(0, 70)}...`);
      }
      console.log('');
    });

    const genericCount = recentTasks.filter(t => t.title === 'Improvement Suggestion').length;
    const descriptiveCount = recentTasks.filter(t => t.title !== 'Improvement Suggestion').length;

    console.log('='.repeat(70));
    console.log(`Generic titles ("Improvement Suggestion"): ${genericCount}`);
    console.log(`Descriptive titles (FIXED): ${descriptiveCount}`);

    if (descriptiveCount > 0) {
      console.log('\n✅ FIXES ARE WORKING! New tasks have descriptive titles!');
    } else {
      console.log('\n⚠️  All new tasks still have generic titles - old code still running');
    }

  } else {
    console.log('⏳ No new tasks created in last 15 minutes');
    console.log('   Waiting for next GitHub Actions cycle...');
  }

  // Check findings too
  const { data: recentFindings } = await supabase
    .from('agent_findings')
    .select('title, created_at')
    .gte('detected_at', fifteenMinsAgo)
    .order('detected_at', { ascending: false })
    .limit(5);

  if (recentFindings && recentFindings.length > 0) {
    console.log(`\n📋 Recent findings: ${recentFindings.length}`);
    recentFindings.forEach((f, i) => {
      const isGeneric = f.title === 'Improvement Suggestion';
      const emoji = isGeneric ? '❌' : '✅';
      console.log(`   ${i+1}. ${emoji} ${f.title.substring(0, 60)}`);
    });
  }
}

check();
