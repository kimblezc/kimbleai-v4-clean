/**
 * Check Production Database Status
 * Verifies projects table and user permissions
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkProductionDB() {
  console.log('=== Production Database Diagnostics ===\n');

  // 1. Check if projects table exists
  console.log('1. Checking if projects table exists...');
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Projects table does NOT exist or has issues:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error details:', error.details);
    } else {
      console.log('✅ Projects table exists');

      // Get total count
      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });
      console.log(`   Total projects: ${count || 0}`);
    }
  } catch (e: any) {
    console.error('❌ Error checking projects table:', e.message);
  }

  console.log('');

  // 2. Check if users table exists
  console.log('2. Checking users table...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 'zach-admin-001')
      .single();

    if (error) {
      console.error('❌ User "zach-admin-001" not found:', error.message);
    } else if (data) {
      console.log('✅ User "zach-admin-001" found');
      console.log('   Name:', data.name);
      console.log('   Role:', data.role);
      console.log('   Permissions:', JSON.stringify(data.permissions, null, 2));
    }
  } catch (e: any) {
    console.error('❌ Error checking user:', e.message);
  }

  console.log('');

  // 3. Try to create a test project
  console.log('3. Testing project creation...');
  try {
    const testProject = {
      id: `test_proj_${Date.now()}`,
      name: 'Test Project - Database Check',
      description: 'Automated test to verify project creation',
      owner_id: 'zach-admin-001',
      status: 'active',
      priority: 'medium',
      tags: ['test'],
      collaborators: ['zach-admin-001'],
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      stats: {
        total_conversations: 0,
        total_messages: 0,
        active_tasks: 0,
        completed_tasks: 0,
        last_activity: new Date().toISOString()
      }
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(testProject)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create test project:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error details:', error.details);
      console.log('   Error hint:', error.hint);
    } else {
      console.log('✅ Successfully created test project:', data.id);

      // Clean up test project
      await supabase
        .from('projects')
        .delete()
        .eq('id', data.id);
      console.log('✅ Test project cleaned up');
    }
  } catch (e: any) {
    console.error('❌ Error during project creation test:', e.message);
  }

  console.log('');

  // 4. Check database tables list
  console.log('4. Checking all database tables...');
  try {
    const { data, error } = await supabase.rpc('get_schema_info');
    if (data) {
      console.log('Available tables:', data);
    }
  } catch (e: any) {
    console.log('   (Could not fetch table list - this is normal)');
  }

  console.log('\n=== Diagnostics Complete ===');
}

checkProductionDB().catch(console.error);
