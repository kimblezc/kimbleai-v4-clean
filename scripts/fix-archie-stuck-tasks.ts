/**
 * Fix Archie's Stuck Tasks
 *
 * Resets tasks stuck in "in_progress" status and ensures
 * findings are converted to actionable tasks across all 4 categories:
 * 1. Debugging (errors, bugs)
 * 2. Optimization (performance, cost)
 * 3. Testing (validation, quality)
 * 4. Deployment (releases, updates)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixStuckTasks() {
  console.log('🔧 Fixing Archie\'s Stuck Tasks...\n');

  // 1. Find and reset stuck "in_progress" tasks
  console.log('📋 Step 1: Resetting stuck in_progress tasks...');

  const { data: stuckTasks, error: stuckError } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('status', 'in_progress');

  if (stuckError) {
    console.error('Error fetching stuck tasks:', stuckError);
  } else if (stuckTasks && stuckTasks.length > 0) {
    console.log(`Found ${stuckTasks.length} stuck tasks:`);
    stuckTasks.forEach(task => {
      console.log(`  - [P${task.priority}] ${task.title}`);
    });

    // Reset them to pending
    const { error: resetError } = await supabase
      .from('agent_tasks')
      .update({
        status: 'pending',
        error_message: 'Reset from stuck in_progress state'
      })
      .eq('status', 'in_progress');

    if (resetError) {
      console.error('Error resetting tasks:', resetError);
    } else {
      console.log(`✅ Reset ${stuckTasks.length} tasks to pending\n`);
    }
  } else {
    console.log('✅ No stuck tasks found\n');
  }

  // 2. Check pending tasks count by category
  console.log('📊 Step 2: Checking task distribution across categories...');

  const { data: tasksByType } = await supabase
    .from('agent_tasks')
    .select('task_type, status')
    .eq('status', 'pending');

  if (tasksByType) {
    const categories = {
      debugging: ['fix_bugs', 'security_scan'],
      optimization: ['optimize_performance', 'code_cleanup'],
      testing: ['run_tests'],
      deployment: ['dependency_update', 'documentation_update']
    };

    console.log('\nCategory Distribution (Pending Tasks):');
    for (const [category, types] of Object.entries(categories)) {
      const count = tasksByType.filter(t => types.includes(t.task_type)).length;
      console.log(`  ${category.toUpperCase()}: ${count} tasks`);
    }
  }

  // 3. Convert findings to tasks for 4 categories
  console.log('\n📝 Step 3: Converting findings to actionable tasks...');

  const { data: findings, error: findingsError } = await supabase
    .from('agent_findings')
    .select('*')
    .is('related_task_id', null) // Findings not yet converted to tasks
    .order('severity', { ascending: true })
    .limit(30);

  if (findingsError) {
    console.error('Error fetching findings:', findingsError);
  } else if (findings && findings.length > 0) {
    console.log(`Found ${findings.length} findings to convert:\n`);

    const taskMapping = {
      error: { type: 'fix_bugs', priority: 9, category: 'debugging' },
      bug: { type: 'fix_bugs', priority: 8, category: 'debugging' },
      security: { type: 'security_scan', priority: 10, category: 'debugging' },
      optimization: { type: 'optimize_performance', priority: 7, category: 'optimization' },
      performance: { type: 'optimize_performance', priority: 8, category: 'optimization' },
      improvement: { type: 'code_cleanup', priority: 6, category: 'optimization' },
      warning: { type: 'run_tests', priority: 5, category: 'testing' },
      insight: { type: 'documentation_update', priority: 4, category: 'deployment' }
    };

    let converted = 0;
    for (const finding of findings) {
      const mapping = taskMapping[finding.finding_type as keyof typeof taskMapping] || taskMapping.improvement;

      // Create task from finding
      const { data: newTask, error: taskError } = await supabase
        .from('agent_tasks')
        .insert({
          task_type: mapping.type,
          priority: mapping.priority,
          status: 'pending',
          title: finding.title,
          description: finding.description,
          file_paths: finding.location ? [finding.location] : [],
          metadata: {
            finding_id: finding.id,
            category: mapping.category,
            severity: finding.severity,
            detection_method: finding.detection_method,
            evidence: finding.evidence
          }
        })
        .select()
        .single();

      if (taskError) {
        console.error(`  ❌ Failed to create task for: ${finding.title}`);
      } else if (newTask) {
        // Link task back to finding
        await supabase
          .from('agent_findings')
          .update({ related_task_id: newTask.id })
          .eq('id', finding.id);

        console.log(`  ✅ [${mapping.category.toUpperCase()}] Created P${mapping.priority} task: ${finding.title}`);
        converted++;
      }
    }

    console.log(`\n✅ Converted ${converted}/${findings.length} findings to tasks\n`);
  } else {
    console.log('✅ No unconverted findings found\n');
  }

  // 4. Summary
  console.log('📊 Step 4: Final Summary...');

  const { data: allTasks } = await supabase
    .from('agent_tasks')
    .select('status')
    .in('status', ['pending', 'in_progress', 'completed', 'failed']);

  if (allTasks) {
    const summary = {
      pending: allTasks.filter(t => t.status === 'pending').length,
      in_progress: allTasks.filter(t => t.status === 'in_progress').length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      failed: allTasks.filter(t => t.status === 'failed').length
    };

    console.log('\nTask Status Summary:');
    console.log(`  ⏳ Pending: ${summary.pending}`);
    console.log(`  🔄 In Progress: ${summary.in_progress}`);
    console.log(`  ✅ Completed: ${summary.completed}`);
    console.log(`  ❌ Failed: ${summary.failed}`);
  }

  console.log('\n🎉 Archie is now ready to work on all 4 categories!');
  console.log('\nNext steps:');
  console.log('  1. Trigger Archie manually: curl https://www.kimbleai.com/api/agent/cron?trigger=archie-now');
  console.log('  2. Monitor progress: Check /agent dashboard');
  console.log('  3. Review tasks: SELECT * FROM agent_tasks WHERE status=\'pending\' ORDER BY priority DESC;');
}

// Run the fix
fixStuckTasks().catch(error => {
  console.error('Failed to fix stuck tasks:', error);
  process.exit(1);
});
