/**
 * Verify Database Migration Status
 * Checks if migration was applied successfully
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyMigration() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  DATABASE MIGRATION VERIFICATION                         ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  let passCount = 0;
  let failCount = 0;

  // Check projects table columns
  console.log('1. Checking projects table columns...\n');

  const projectsCheck = async (column: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(column)
        .limit(1);

      if (error) {
        console.log(`   ❌ ${column} - MISSING`);
        failCount++;
        return false;
      } else {
        console.log(`   ✅ ${column}`);
        passCount++;
        return true;
      }
    } catch (e) {
      console.log(`   ❌ ${column} - ERROR`);
      failCount++;
      return false;
    }
  };

  await projectsCheck('id');
  await projectsCheck('name');
  await projectsCheck('status');
  await projectsCheck('priority');
  await projectsCheck('owner_id');
  await projectsCheck('collaborators');
  await projectsCheck('tags');
  await projectsCheck('metadata');
  await projectsCheck('stats');

  // Check users table columns
  console.log('\n2. Checking users table columns...\n');

  const usersCheck = async (column: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(column)
        .limit(1);

      if (error) {
        console.log(`   ❌ ${column} - MISSING`);
        failCount++;
        return false;
      } else {
        console.log(`   ✅ ${column}`);
        passCount++;
        return true;
      }
    } catch (e) {
      console.log(`   ❌ ${column} - ERROR`);
      failCount++;
      return false;
    }
  };

  await usersCheck('id');
  await usersCheck('name');
  await usersCheck('email');
  await usersCheck('role');
  await usersCheck('permissions');

  // Check user 'zach' permissions
  console.log('\n3. Checking user "zach" permissions...\n');

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, role, permissions')
      .eq('id', 'zach')
      .single();

    if (error) {
      console.log('   ❌ User "zach" not found');
      failCount++;
    } else {
      console.log(`   ✅ User found: ${user.name} (${user.id})`);
      passCount++;

      if (user.role === 'admin') {
        console.log('   ✅ Role: admin');
        passCount++;
      } else {
        console.log(`   ❌ Role: ${user.role} (expected: admin)`);
        failCount++;
      }

      if (user.permissions?.can_create_projects === true) {
        console.log('   ✅ can_create_projects: true');
        passCount++;
      } else {
        console.log('   ❌ can_create_projects: false or missing');
        failCount++;
      }

      if (user.permissions?.can_delete_projects === true) {
        console.log('   ✅ can_delete_projects: true');
        passCount++;
      } else {
        console.log('   ❌ can_delete_projects: false or missing');
        failCount++;
      }
    }
  } catch (e: any) {
    console.log('   ❌ Error checking user:', e.message);
    failCount++;
  }

  // Check new tables exist
  console.log('\n4. Checking new tables...\n');

  const tableCheck = async (tableName: string) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('count')
        .limit(1);

      if (error) {
        console.log(`   ❌ ${tableName} table - MISSING`);
        failCount++;
        return false;
      } else {
        console.log(`   ✅ ${tableName} table exists`);
        passCount++;
        return true;
      }
    } catch (e) {
      console.log(`   ❌ ${tableName} table - ERROR`);
      failCount++;
      return false;
    }
  };

  await tableCheck('project_tasks');
  await tableCheck('project_collaborators');

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('VERIFICATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const total = passCount + failCount;
  const passRate = Math.round((passCount / total) * 100);

  console.log(`Total Checks: ${total}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Pass Rate: ${passRate}%\n`);

  if (failCount === 0) {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ MIGRATION SUCCESSFUL                                 ║');
    console.log('║  All required columns and tables exist                   ║');
    console.log('║  You can now create projects without errors!            ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
  } else {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  ❌ MIGRATION INCOMPLETE                                 ║');
    console.log('║  Some columns or tables are missing                      ║');
    console.log('║  Please run: database/QUICK_FIX_PROJECTS.sql            ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log('Next steps:');
    console.log('1. Go to: https://gbmefnaqsxtoseufjixp.supabase.co');
    console.log('2. Open: SQL Editor');
    console.log('3. Run: database/QUICK_FIX_PROJECTS.sql');
    console.log('4. Re-run this script to verify\n');
  }
}

verifyMigration().catch(console.error);
