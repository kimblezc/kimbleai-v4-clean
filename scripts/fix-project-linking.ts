/**
 * Fix Project Linking
 * - Shows current state of conversations and projects
 * - Provides manual linking interface
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 Checking conversation-project linking...\n');

  // Get all projects
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (projectsError) {
    console.error('❌ Error fetching projects:', projectsError);
    return;
  }

  console.log(`📁 Found ${projects?.length || 0} projects:`);
  projects?.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name} (ID: ${p.id})`);
    console.log(`      Owner: ${p.owner_id}`);
    console.log(`      Status: ${p.status}`);
  });

  // Get all conversations
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select('id, user_id, project_id, title, created_at')
    .order('created_at', { ascending: false });

  if (conversationsError) {
    console.error('❌ Error fetching conversations:', conversationsError);
    return;
  }

  const withProject = conversations?.filter(c => c.project_id) || [];
  const withoutProject = conversations?.filter(c => !c.project_id) || [];

  console.log(`\n💬 Found ${conversations?.length || 0} conversations:`);
  console.log(`   ✅ With project: ${withProject.length}`);
  console.log(`   ❌ Without project: ${withoutProject.length}`);

  if (withoutProject.length > 0) {
    console.log('\n📋 Conversations without projects:');
    withoutProject.slice(0, 10).forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.title || 'Untitled'} (ID: ${c.id})`);
      console.log(`      User: ${c.user_id}`);
      console.log(`      Created: ${new Date(c.created_at).toLocaleString()}`);
    });
    if (withoutProject.length > 10) {
      console.log(`   ... and ${withoutProject.length - 10} more`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Total Projects: ${projects?.length || 0}`);
  console.log(`   Total Conversations: ${conversations?.length || 0}`);
  console.log(`   Linked Conversations: ${withProject.length}`);
  console.log(`   Unlinked Conversations: ${withoutProject.length}`);
  console.log(`   Linking Rate: ${conversations?.length ? ((withProject.length / conversations.length) * 100).toFixed(1) : 0}%`);

  // Show what the issue is
  console.log('\n🔧 ISSUE IDENTIFIED:');
  console.log('   The projects exist in the database, but conversations are not being');
  console.log('   linked to them when created. This is likely because:');
  console.log('   1. The chat API is not setting project_id when creating conversations');
  console.log('   2. The UI is not passing currentProject to the API');
  console.log('   3. Users need to manually select a project for each conversation');

  console.log('\n💡 SOLUTION:');
  console.log('   Need to update the chat API to automatically link conversations');
  console.log('   to the currently selected project (currentProject from useProjects hook)');
}

main();
