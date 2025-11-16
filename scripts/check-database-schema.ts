/**
 * Check Database Schema
 * Connects to Supabase and checks if projects tables exist
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema...\n');

  try {
    // Check if projects table exists
    console.log('1. Checking projects table...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(5);

    if (projectsError) {
      console.error('❌ projects table ERROR:', projectsError.message);
      console.error('   Code:', projectsError.code);
      console.error('   Details:', projectsError.details);
    } else {
      console.log('✅ projects table exists');
      console.log(`   Found ${projects?.length || 0} projects`);
      if (projects && projects.length > 0) {
        console.log('   Sample project columns:', Object.keys(projects[0]));
      }
    }

    // Check if project_tasks table exists
    console.log('\n2. Checking project_tasks table...');
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('*')
      .limit(5);

    if (tasksError) {
      console.error('❌ project_tasks table ERROR:', tasksError.message);
    } else {
      console.log('✅ project_tasks table exists');
      console.log(`   Found ${tasks?.length || 0} tasks`);
    }

    // Check if project_collaborators table exists
    console.log('\n3. Checking project_collaborators table...');
    const { data: collaborators, error: collaboratorsError } = await supabase
      .from('project_collaborators')
      .select('*')
      .limit(5);

    if (collaboratorsError) {
      console.error('❌ project_collaborators table ERROR:', collaboratorsError.message);
    } else {
      console.log('✅ project_collaborators table exists');
      console.log(`   Found ${collaborators?.length || 0} collaborators`);
    }

    // Check conversations table and project_id column
    console.log('\n4. Checking conversations table...');
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('id, user_id, project_id, title, created_at')
      .limit(5);

    if (conversationsError) {
      console.error('❌ conversations table ERROR:', conversationsError.message);
    } else {
      console.log('✅ conversations table exists');
      console.log(`   Found ${conversations?.length || 0} conversations`);
      if (conversations && conversations.length > 0) {
        console.log('   Sample conversation columns:', Object.keys(conversations[0]));
        const withProject = conversations.filter(c => c.project_id);
        console.log(`   Conversations with project_id: ${withProject.length}`);
      }
    }

    // Check users table
    console.log('\n5. Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .limit(5);

    if (usersError) {
      console.error('❌ users table ERROR:', usersError.message);
    } else {
      console.log('✅ users table exists');
      console.log(`   Found ${users?.length || 0} users`);
      if (users && users.length > 0) {
        console.log('   Users:', users.map(u => `${u.name} (${u.id})`).join(', '));
      }
    }

    console.log('\n✅ Schema check complete!');
  } catch (error) {
    console.error('💥 Fatal error checking schema:', error);
  }
}

checkDatabaseSchema();
