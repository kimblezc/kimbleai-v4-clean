/**
 * Check actual schema of projects table in production
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
  console.log('=== Checking Production Schema ===\n');

  // Check existing projects to see their structure
  console.log('1. Fetching existing projects...');
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Found projects:', projects?.length || 0);
    if (projects && projects.length > 0) {
      console.log('\nSample project structure:');
      console.log(JSON.stringify(projects[0], null, 2));
    }
  }

  console.log('\n2. Checking users...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, email, role, permissions')
    .limit(5);

  if (usersError) {
    console.error('Users error:', usersError.message);
  } else {
    console.log('Found users:', users?.length || 0);
    users?.forEach(user => {
      console.log(`  - ${user.name} (${user.id}) - ${user.role}`);
      console.log(`    Permissions:`, user.permissions);
    });
  }

  console.log('\n3. Checking conversations with project_id...');
  const { data: convos, error: convosError } = await supabase
    .from('conversations')
    .select('id, title, project_id, user_id')
    .not('project_id', 'is', null)
    .limit(5);

  if (convosError) {
    console.error('Conversations error:', convosError.message);
  } else {
    console.log('Conversations with project_id:', convos?.length || 0);
    convos?.forEach(c => {
      console.log(`  - ${c.title} -> Project: ${c.project_id}`);
    });
  }
}

checkSchema().catch(console.error);
