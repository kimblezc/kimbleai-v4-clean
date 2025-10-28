/**
 * Clean up generic "Improvement Suggestion" tasks from Archie dashboard
 *
 * Problem: 80+ boxes all saying "improvement suggestion" with no useful info
 * Solution: Delete tasks with generic titles that came from insight findings
 *
 * Run: npx tsx scripts/clean-generic-tasks.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanGenericTasks() {
  console.log('🧹 Cleaning up generic improvement suggestion tasks...\n');

  try {
    // Find all tasks with generic "Improvement Suggestion" title
    const { data: genericTasks, error: fetchError } = await supabase
      .from('agent_tasks')
      .select('id, title, description, status, created_at')
      .ilike('title', '%improvement suggestion%');

    if (fetchError) {
      console.error('❌ Error fetching tasks:', fetchError);
      return;
    }

    if (!genericTasks || genericTasks.length === 0) {
      console.log('✅ No generic tasks found - dashboard is clean!');
      return;
    }

    console.log(`📊 Found ${genericTasks.length} generic tasks\n`);

    // Show sample of what will be deleted
    console.log('Sample of tasks to be deleted:');
    genericTasks.slice(0, 5).forEach((task, idx) => {
      console.log(`\n${idx + 1}. ${task.title}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
      if (task.description) {
        console.log(`   Description: ${task.description.substring(0, 100)}...`);
      }
    });

    if (genericTasks.length > 5) {
      console.log(`\n... and ${genericTasks.length - 5} more`);
    }

    // Delete them
    console.log(`\n🗑️  Deleting ${genericTasks.length} generic tasks...`);

    const { error: deleteError } = await supabase
      .from('agent_tasks')
      .delete()
      .ilike('title', '%improvement suggestion%');

    if (deleteError) {
      console.error('❌ Error deleting tasks:', deleteError);
      return;
    }

    console.log(`✅ Successfully deleted ${genericTasks.length} generic tasks!`);
    console.log('\n📊 Dashboard should now show only actionable tasks');

    // Show remaining task count by type
    const { data: remainingTasks } = await supabase
      .from('agent_tasks')
      .select('task_type, status');

    if (remainingTasks) {
      console.log(`\n📈 Remaining tasks: ${remainingTasks.length} total`);

      // Count by type
      const byType: Record<string, number> = {};
      remainingTasks.forEach(task => {
        byType[task.task_type] = (byType[task.task_type] || 0) + 1;
      });

      console.log('\nBy type:');
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });

      // Count by status
      const byStatus: Record<string, number> = {};
      remainingTasks.forEach(task => {
        byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      });

      console.log('\nBy status:');
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    }

    console.log('\n✨ Dashboard cleanup complete!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the cleanup
cleanGenericTasks();
