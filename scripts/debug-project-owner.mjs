import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugProjectOwnership() {
  console.log('\n=== DEBUGGING PROJECT OWNERSHIP ===\n');

  // Get Zach's UUID
  const { data: zachUser, error: zachError } = await supabase
    .from('users')
    .select('id, name')
    .ilike('name', 'Zach')
    .single();

  if (zachError) {
    console.log('❌ Could not find Zach:', zachError.message);
    return;
  }

  console.log('✅ Zach User:');
  console.log('   Name:', zachUser.name);
  console.log('   UUID:', zachUser.id);

  // Get all projects
  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('id, name, owner_id')
    .limit(10);

  if (projError) {
    console.log('\n❌ Could not fetch projects:', projError.message);
    return;
  }

  console.log('\n📁 Projects and their owners:');
  projects.forEach(p => {
    const matchesZach = p.owner_id === zachUser.id;
    console.log(`\n  ${p.name}`);
    console.log(`    ID: ${p.id}`);
    console.log(`    Owner ID: ${p.owner_id}`);
    console.log(`    Matches Zach? ${matchesZach ? '✅ YES' : '❌ NO'}`);
  });

  console.log('\n\n=== TESTING DELETE PERMISSION ===\n');

  // Check permissions
  const { data: permissions, error: permError } = await supabase
    .from('users')
    .select('permissions')
    .eq('id', zachUser.id)
    .single();

  if (permError) {
    console.log('❌ Could not fetch permissions');
  } else {
    console.log('Zach permissions:', JSON.stringify(permissions.permissions, null, 2));
    if (permissions.permissions?.can_delete_projects) {
      console.log('\n✅ Zach HAS can_delete_projects permission');
    } else {
      console.log('\n❌ Zach MISSING can_delete_projects permission');
    }
  }
}

debugProjectOwnership();
