/**
 * Test Project Deletion
 * Diagnoses why project deletion is failing
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Project Deletion Diagnostic\n');
console.log('='.repeat(60));

async function main() {
  // Step 1: List all projects
  console.log('\n📋 Step 1: List all projects');
  const { data: projects, error: listError } = await supabase
    .from('projects')
    .select('id, name, owner_id, status')
    .order('created_at', { ascending: false })
    .limit(10);

  if (listError) {
    console.log('❌ Error listing projects:', listError.message);
    return;
  }

  console.log(`✅ Found ${projects.length} projects:`);
  projects.forEach(p => {
    console.log(`   - ${p.id}: "${p.name}" (status: ${p.status}, owner: ${p.owner_id})`);
  });

  // Find "Project 3" or any test project
  const project3 = projects.find(p => p.name.toLowerCase().includes('project 3') || p.name.toLowerCase().includes('test'));

  if (!project3) {
    console.log('\n⚠️  No "Project 3" or test project found');
    console.log('   Please create a test project first or specify an ID manually');
    return;
  }

  const projectId = project3.id;
  console.log(`\n🎯 Testing deletion of project: ${project3.name} (${projectId})`);

  // Step 2: Check if project exists
  console.log('\n📋 Step 2: Verify project exists');
  const { data: projectCheck, error: checkError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (checkError) {
    console.log('❌ Error checking project:', checkError.message);
    return;
  }

  console.log('✅ Project exists:');
  console.log(`   Name: ${projectCheck.name}`);
  console.log(`   Status: ${projectCheck.status}`);
  console.log(`   Owner: ${projectCheck.owner_id}`);

  // Step 3: Check for related records
  console.log('\n📋 Step 3: Check for related records (foreign keys)');

  const { count: tasksCount } = await supabase
    .from('project_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  console.log(`   Tasks: ${tasksCount || 0}`);

  const { count: conversationsCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  console.log(`   Conversations: ${conversationsCount || 0}`);

  const { count: collaboratorsCount } = await supabase
    .from('project_collaborators')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  console.log(`   Collaborators: ${collaboratorsCount || 0}`);

  // Step 4: Check RLS policies
  console.log('\n📋 Step 4: Check RLS policies');
  console.log('   Using service role key (bypasses RLS): YES');

  // Step 5: Attempt deletion
  console.log('\n📋 Step 5: Attempt deletion');

  const { error: deleteError, data: deleteData, status, statusText } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .select();

  if (deleteError) {
    console.log('❌ Deletion FAILED:');
    console.log(`   Error code: ${deleteError.code}`);
    console.log(`   Error message: ${deleteError.message}`);
    console.log(`   Error details: ${JSON.stringify(deleteError.details, null, 2)}`);
    console.log(`   Error hint: ${deleteError.hint}`);
    console.log(`   HTTP status: ${status} ${statusText}`);

    // Check if it's a foreign key constraint error
    if (deleteError.code === '23503' || deleteError.message.includes('foreign key')) {
      console.log('\n💡 DIAGNOSIS: Foreign key constraint violation');
      console.log('   The project has related records that must be deleted first:');
      if (tasksCount) console.log(`   - ${tasksCount} tasks in project_tasks`);
      if (conversationsCount) console.log(`   - ${conversationsCount} conversations`);
      if (collaboratorsCount) console.log(`   - ${collaboratorsCount} collaborators`);
      console.log('\n🔧 FIX: Need to implement CASCADE delete or delete related records first');
    }

    return;
  }

  console.log('✅ Deletion SUCCESSFUL!');
  console.log(`   Deleted data:`, deleteData);

  // Step 6: Verify deletion
  console.log('\n📋 Step 6: Verify deletion');
  const { data: verifyCheck, error: verifyError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .single();

  if (verifyError && verifyError.code === 'PGRST116') {
    console.log('✅ Project confirmed deleted (no longer exists)');
  } else if (verifyCheck) {
    console.log('❌ WARNING: Project still exists after deletion!');
  } else {
    console.log(`⚠️  Verification error: ${verifyError?.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY\n');
  console.log('If deletion failed due to foreign key constraints:');
  console.log('1. Add ON DELETE CASCADE to foreign key constraints');
  console.log('2. Or manually delete related records first');
  console.log('3. Or implement a deleteProjectCascade() method');
  console.log('');
  console.log('Recommended: Update database schema with CASCADE deletes');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
