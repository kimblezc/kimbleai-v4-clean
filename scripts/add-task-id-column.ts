/**
 * Add task_id column to agent_findings table
 *
 * This migration adds a foreign key relationship between findings and tasks,
 * allowing Archie to properly track which findings have been converted to tasks.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function addTaskIdColumn() {
  console.log('🔧 Adding task_id column to agent_findings table...\n');

  try {
    // Add task_id column
    console.log('📝 Step 1: Adding task_id column...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE agent_findings
        ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES agent_tasks(id);
      `
    });

    if (alterError) {
      // Try direct query if RPC doesn't exist
      console.log('Attempting direct schema modification...');

      // Check current schema
      const { data: currentFindings, error: fetchError } = await supabase
        .from('agent_findings')
        .select('*')
        .limit(1);

      if (fetchError) {
        console.error('Error checking schema:', fetchError);
        throw fetchError;
      }

      console.log('Current agent_findings columns:', Object.keys(currentFindings?.[0] || {}));

      console.log('\n⚠️  Manual SQL migration required:');
      console.log('\nRun this SQL in Supabase SQL Editor:');
      console.log('-----------------------------------');
      console.log('ALTER TABLE agent_findings');
      console.log('ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES agent_tasks(id);');
      console.log('');
      console.log('CREATE INDEX IF NOT EXISTS idx_agent_findings_task_id ON agent_findings(task_id);');
      console.log('-----------------------------------\n');
    } else {
      console.log('✅ task_id column added successfully');

      // Create index
      console.log('\n📝 Step 2: Creating index...');
      const { error: indexError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE INDEX IF NOT EXISTS idx_agent_findings_task_id ON agent_findings(task_id);
        `
      });

      if (!indexError) {
        console.log('✅ Index created successfully');
      }
    }

    // Check findings
    console.log('\n📊 Step 3: Checking findings status...');
    const { data: findings, error: findingsError } = await supabase
      .from('agent_findings')
      .select('id, finding_type, title, detected_at')
      .order('detected_at', { ascending: false })
      .limit(30);

    if (findingsError) {
      console.error('Error fetching findings:', findingsError);
    } else if (findings) {
      console.log(`Found ${findings.length} total findings\n`);

      // Group by type
      const byType: Record<string, number> = {};
      findings.forEach(f => {
        byType[f.finding_type] = (byType[f.finding_type] || 0) + 1;
      });

      console.log('Findings by type:');
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }

    // Check tasks
    console.log('\n📊 Step 4: Checking tasks status...');
    const { data: tasks, error: tasksError } = await supabase
      .from('agent_tasks')
      .select('status, task_type, metadata')
      .order('created_at', { ascending: false })
      .limit(50);

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
    } else if (tasks) {
      const byStatus: Record<string, number> = {};
      const byCategory: Record<string, number> = {};

      tasks.forEach(t => {
        byStatus[t.status] = (byStatus[t.status] || 0) + 1;
        const category = t.metadata?.category || 'unknown';
        byCategory[category] = (byCategory[category] || 0) + 1;
      });

      console.log('\nTask Status Summary:');
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });

      console.log('\nTask Category Distribution:');
      Object.entries(byCategory).forEach(([category, count]) => {
        console.log(`  ${category}: ${count}`);
      });
    }

    console.log('\n✅ Migration check complete!');
    console.log('\nNext: Run fix-archie-stuck-tasks.ts to convert findings to tasks');

  } catch (error: any) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
addTaskIdColumn().catch(error => {
  console.error('Failed to add task_id column:', error);
  process.exit(1);
});
