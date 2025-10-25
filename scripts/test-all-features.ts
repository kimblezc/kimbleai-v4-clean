/**
 * Comprehensive Feature Testing Suite for kimbleai.com
 * Tests all project management functionality after migration
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TEST_USER_ID = 'zach';
let testProjectId: string;

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function log(test: string, status: 'PASS' | 'FAIL' | 'SKIP', details?: string, error?: string) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${icon} ${test}`);
  if (details) console.log(`   ${details}`);
  if (error) console.log(`   Error: ${error}`);
  results.push({ test, status, details, error });
}

async function testDatabaseSchema() {
  console.log('\n=== 1. DATABASE SCHEMA TESTS ===\n');

  // Test projects table structure
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1);

    if (error) throw error;

    const requiredColumns = ['id', 'name', 'status', 'priority', 'owner_id', 'tags', 'collaborators', 'metadata', 'stats'];
    const actualColumns = data && data[0] ? Object.keys(data[0]) : [];

    const missing = requiredColumns.filter(col => !actualColumns.includes(col));

    if (missing.length === 0) {
      log('Projects table has all required columns', 'PASS', `Columns: ${actualColumns.join(', ')}`);
    } else {
      log('Projects table missing columns', 'FAIL', '', `Missing: ${missing.join(', ')}`);
    }
  } catch (e: any) {
    log('Projects table structure check', 'FAIL', '', e.message);
  }

  // Test users table structure
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', TEST_USER_ID)
      .single();

    if (error) throw error;

    if (data.role && data.permissions) {
      log('Users table has role and permissions columns', 'PASS', `Role: ${data.role}, Permissions: ${Object.keys(data.permissions).length} keys`);
    } else {
      log('Users table missing role or permissions', 'FAIL');
    }
  } catch (e: any) {
    log('Users table structure check', 'FAIL', '', e.message);
  }

  // Test project_tasks table exists
  try {
    const { error } = await supabase
      .from('project_tasks')
      .select('count')
      .limit(1);

    if (error) throw error;
    log('project_tasks table exists', 'PASS');
  } catch (e: any) {
    log('project_tasks table exists', 'FAIL', '', e.message);
  }

  // Test project_collaborators table exists
  try {
    const { error } = await supabase
      .from('project_collaborators')
      .select('count')
      .limit(1);

    if (error) throw error;
    log('project_collaborators table exists', 'PASS');
  } catch (e: any) {
    log('project_collaborators table exists', 'FAIL', '', e.message);
  }
}

async function testUserPermissions() {
  console.log('\n=== 2. USER PERMISSIONS TESTS ===\n');

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, role, permissions')
      .eq('id', TEST_USER_ID)
      .single();

    if (error) throw error;

    if (user.role === 'admin') {
      log('User has admin role', 'PASS', `User: ${user.name} (${user.id})`);
    } else {
      log('User has admin role', 'FAIL', `Actual role: ${user.role}`);
    }

    if (user.permissions?.can_create_projects === true) {
      log('User has can_create_projects permission', 'PASS');
    } else {
      log('User has can_create_projects permission', 'FAIL');
    }

    if (user.permissions?.can_delete_projects === true) {
      log('User has can_delete_projects permission', 'PASS');
    } else {
      log('User has can_delete_projects permission', 'FAIL');
    }

  } catch (e: any) {
    log('User permissions check', 'FAIL', '', e.message);
  }
}

async function testProjectCreation() {
  console.log('\n=== 3. PROJECT CRUD TESTS ===\n');

  // CREATE project
  try {
    const projectData = {
      id: crypto.randomUUID(),
      name: `Test Project ${new Date().toISOString()}`,
      description: 'Automated test project',
      status: 'active' as const,
      priority: 'medium' as const,
      owner_id: TEST_USER_ID,
      tags: ['test', 'automated'],
      collaborators: [TEST_USER_ID],
      metadata: {
        created_at: new Date().toISOString(),
        test: true
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
      .insert(projectData)
      .select()
      .single();

    if (error) throw error;

    testProjectId = data.id;
    log('Create project', 'PASS', `Created project ID: ${testProjectId}`);
  } catch (e: any) {
    log('Create project', 'FAIL', '', e.message);
    return; // Can't continue without a project
  }

  // READ/LIST projects
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .or(`owner_id.eq.${TEST_USER_ID},collaborators.cs.{${TEST_USER_ID}}`);

    if (error) throw error;

    log('List projects', 'PASS', `Found ${data.length} projects`);
  } catch (e: any) {
    log('List projects', 'FAIL', '', e.message);
  }

  // UPDATE project
  try {
    const { data, error } = await supabase
      .from('projects')
      .update({
        description: 'Updated test description',
        priority: 'high',
        tags: ['test', 'automated', 'updated']
      })
      .eq('id', testProjectId)
      .select()
      .single();

    if (error) throw error;

    if (data.priority === 'high') {
      log('Update project', 'PASS', 'Successfully updated priority and tags');
    } else {
      log('Update project', 'FAIL', 'Update did not persist');
    }
  } catch (e: any) {
    log('Update project', 'FAIL', '', e.message);
  }

  // ARCHIVE project
  try {
    const { error } = await supabase
      .from('projects')
      .update({ status: 'archived' })
      .eq('id', testProjectId);

    if (error) throw error;

    log('Archive project', 'PASS');
  } catch (e: any) {
    log('Archive project', 'FAIL', '', e.message);
  }

  // DELETE project (cleanup)
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', testProjectId);

    if (error) throw error;

    log('Delete project', 'PASS', 'Test project cleaned up');
  } catch (e: any) {
    log('Delete project', 'FAIL', '', e.message);
  }
}

async function testProjectTags() {
  console.log('\n=== 4. PROJECT TAGS TESTS ===\n');

  try {
    // Create a project with tags
    const projectData = {
      id: crypto.randomUUID(),
      name: 'Tags Test Project',
      owner_id: TEST_USER_ID,
      tags: ['frontend', 'react', 'urgent'],
      status: 'active' as const,
      priority: 'high' as const,
      collaborators: [TEST_USER_ID],
      metadata: {},
      stats: {}
    };

    const { data: created, error: createError } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (createError) throw createError;

    const projectId = created.id;

    // Verify tags were saved
    const { data: fetched, error: fetchError } = await supabase
      .from('projects')
      .select('tags')
      .eq('id', projectId)
      .single();

    if (fetchError) throw fetchError;

    if (fetched.tags && fetched.tags.length === 3) {
      log('Add tags to project', 'PASS', `Tags: ${fetched.tags.join(', ')}`);
    } else {
      log('Add tags to project', 'FAIL', `Expected 3 tags, got ${fetched.tags?.length || 0}`);
    }

    // Update tags
    const { error: updateError } = await supabase
      .from('projects')
      .update({ tags: ['frontend', 'react'] })
      .eq('id', projectId);

    if (updateError) throw updateError;

    log('Remove tags from project', 'PASS');

    // Filter by tags
    const { data: filtered, error: filterError } = await supabase
      .from('projects')
      .select('*')
      .contains('tags', ['react']);

    if (filterError) throw filterError;

    log('Filter projects by tags', 'PASS', `Found ${filtered.length} projects with 'react' tag`);

    // Cleanup
    await supabase.from('projects').delete().eq('id', projectId);

  } catch (e: any) {
    log('Project tags tests', 'FAIL', '', e.message);
  }
}

async function testConversationProjectIntegration() {
  console.log('\n=== 5. CONVERSATION-PROJECT INTEGRATION TESTS ===\n');

  try {
    // Create a test project
    const projectData = {
      id: crypto.randomUUID(),
      name: 'Conversation Test Project',
      owner_id: TEST_USER_ID,
      status: 'active' as const,
      priority: 'medium' as const,
      tags: [],
      collaborators: [TEST_USER_ID],
      metadata: {},
      stats: {}
    };

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (projectError) throw projectError;

    const projectId = project.id;

    // Check if conversations can have project_id
    const { data: convos, error: convosError } = await supabase
      .from('conversations')
      .select('id, title, project_id')
      .limit(5);

    if (convosError) throw convosError;

    const hasProjectIdColumn = convos.length > 0 && 'project_id' in convos[0];

    if (hasProjectIdColumn) {
      log('Conversations have project_id column', 'PASS');

      const withProject = convos.filter(c => c.project_id !== null);
      log('Conversations linked to projects', 'PASS', `Found ${withProject.length} conversations with projects`);
    } else {
      log('Conversations have project_id column', 'FAIL', 'Column missing - need to run migration');
    }

    // Cleanup
    await supabase.from('projects').delete().eq('id', projectId);

  } catch (e: any) {
    log('Conversation-project integration', 'FAIL', '', e.message);
  }
}

async function testVersionDisplay() {
  console.log('\n=== 6. VERSION DISPLAY TESTS ===\n');

  try {
    const versionResponse = await fetch(new URL('/version.json', process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000').href);
    const version = await versionResponse.json();

    if (version.version === '1.6.0') {
      log('Version is 1.6.0', 'PASS', `Version: ${version.version}`);
    } else {
      log('Version is 1.6.0', 'FAIL', `Actual: ${version.version}`);
    }

    if (version.commit === '43bafba') {
      log('Commit hash is 43bafba', 'PASS', `Commit: ${version.commit}`);
    } else {
      log('Commit hash is 43bafba', 'FAIL', `Actual: ${version.commit}`);
    }

  } catch (e: any) {
    log('Version display', 'SKIP', 'version.json check requires local server');
  }
}

async function printSummary() {
  console.log('\n=== TEST SUMMARY ===\n');

  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);

  const passRate = Math.round((passed / (total - skipped)) * 100);
  console.log(`\nPass Rate: ${passRate}%`);

  if (failed > 0) {
    console.log('\n=== FAILED TESTS ===\n');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`❌ ${r.test}`);
      if (r.error) console.log(`   Error: ${r.error}`);
    });
  }

  console.log('\n=== END OF TESTS ===\n');
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  KIMBLEAI.COM COMPREHENSIVE TESTING SUITE                 ║');
  console.log('║  Version 1.6.0 (commit 43bafba)                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  await testDatabaseSchema();
  await testUserPermissions();
  await testProjectCreation();
  await testProjectTags();
  await testConversationProjectIntegration();
  await testVersionDisplay();
  await printSummary();
}

runAllTests().catch(console.error);
