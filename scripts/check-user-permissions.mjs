import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
  console.log('\n=== CHECKING USER PERMISSIONS ===\n');

  // Check for zach-admin-001
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, role, permissions')
    .eq('id', 'zach-admin-001')
    .single();

  if (error) {
    console.log('❌ User zach-admin-001 NOT FOUND in database');
    console.log('Error:', error.message);
    console.log('\nThis means hasPermission will use fallback logic.');

    // Check if users table exists
    const { data: allUsers, error: listError } = await supabase
      .from('users')
      .select('id, name, role')
      .limit(5);

    if (listError) {
      console.log('\n❌ Users table may not exist:', listError.message);
    } else {
      console.log('\n✅ Users table exists, found', allUsers.length, 'users:');
      allUsers.forEach(u => console.log(`  - ${u.name} (${u.id}) - ${u.role}`));
    }
  } else {
    console.log('✅ User found:', user.name);
    console.log('Role:', user.role);
    console.log('Permissions:', JSON.stringify(user.permissions, null, 2));

    if (user.permissions?.can_delete_projects) {
      console.log('\n✅ User HAS can_delete_projects permission');
    } else {
      console.log('\n❌ User MISSING can_delete_projects permission');
      console.log('This is why delete is failing with 403!');
    }
  }
}

checkUser();
