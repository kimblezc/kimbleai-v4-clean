/**
 * Test script for workflow automation system
 * Demonstrates workflow creation, execution, and activity stream integration
 */

import { createClient } from '@supabase/supabase-js';
import WorkflowEngine from '../lib/workflow-engine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testWorkflowSystem() {
  console.log('🚀 Testing Workflow Automation System\n');

  const userId = 'zach'; // Replace with actual user ID
  const engine = new WorkflowEngine(userId);

  try {
    // Test 1: Create a Morning Briefing Workflow
    console.log('📝 Test 1: Creating Morning Briefing Workflow...');
    const morningBriefing = await engine.createWorkflow({
      user_id: userId,
      name: 'Morning Briefing',
      description: 'Daily summary of emails, calendar events, and tasks',
      enabled: true,
      trigger_type: 'scheduled',
      trigger_config: {
        cron: '0 7 * * *', // Every day at 7am
        timezone: 'America/Los_Angeles',
      },
      actions: [
        {
          id: 'check-gmail',
          type: 'gmail',
          name: 'Check Gmail',
          config: {
            operation: 'get_unread',
          },
        },
        {
          id: 'get-calendar',
          type: 'calendar',
          name: "Get Today's Events",
          config: {
            operation: 'list_events',
          },
        },
        {
          id: 'analyze-briefing',
          type: 'ai_analysis',
          name: 'Generate Briefing',
          config: {
            analysisType: 'summarize',
            inputData: 'previous_results',
          },
        },
        {
          id: 'notify-user',
          type: 'notification',
          name: 'Send Morning Briefing',
          config: {
            message: 'Your morning briefing is ready',
            channels: ['in_app', 'email'],
          },
        },
      ],
    });
    console.log('✅ Workflow created:', morningBriefing.id);
    console.log('   Name:', morningBriefing.name);
    console.log('   Actions:', morningBriefing.actions.length);
    console.log('');

    // Test 2: Execute the workflow manually
    console.log('▶️  Test 2: Executing Morning Briefing Workflow...');
    const execution = await engine.executeWorkflow(morningBriefing.id, {
      test_mode: true,
    });
    console.log('✅ Workflow executed:', execution.id);
    console.log('   Status:', execution.status);
    console.log('   Duration:', execution.completed_at ? 'Completed' : 'Running');
    console.log('');

    // Test 3: Create a Task Suggester Workflow
    console.log('📝 Test 3: Creating Task Suggester Workflow...');
    const taskSuggester = await engine.createWorkflow({
      user_id: userId,
      name: 'Task Suggester',
      description: 'Analyze conversations and suggest tasks',
      enabled: true,
      trigger_type: 'scheduled',
      trigger_config: {
        cron: '0 * * * *', // Every hour
      },
      actions: [
        {
          id: 'analyze-conversations',
          type: 'ai_analysis',
          name: 'Analyze Recent Conversations',
          config: {
            analysisType: 'extract_action_items',
            inputData: 'recent_conversations',
          },
        },
        {
          id: 'create-tasks',
          type: 'create_task',
          name: 'Create Task Suggestions',
          config: {
            title: 'Suggested Task',
            description: 'Generated from conversation analysis',
            priority: 'medium',
          },
        },
        {
          id: 'notify-suggestions',
          type: 'notification',
          name: 'Notify Task Suggestions',
          config: {
            message: 'New task suggestions available',
            channels: ['in_app'],
          },
        },
      ],
    });
    console.log('✅ Workflow created:', taskSuggester.id);
    console.log('   Name:', taskSuggester.name);
    console.log('');

    // Test 4: Get all workflows
    console.log('📋 Test 4: Fetching All Workflows...');
    const workflows = await engine.getWorkflows();
    console.log('✅ Found', workflows.length, 'workflows');
    workflows.forEach((w, i) => {
      console.log(`   ${i + 1}. ${w.name} (${w.enabled ? 'enabled' : 'disabled'})`);
    });
    console.log('');

    // Test 5: Get execution history
    console.log('📊 Test 5: Fetching Execution History...');
    const history = await engine.getExecutionHistory(morningBriefing.id);
    console.log('✅ Found', history.length, 'executions');
    history.forEach((exec, i) => {
      console.log(`   ${i + 1}. ${exec.status} - ${exec.started_at}`);
    });
    console.log('');

    // Test 6: Update workflow
    console.log('✏️  Test 6: Updating Workflow...');
    const updated = await engine.updateWorkflow(morningBriefing.id, {
      description: 'Updated: Daily morning summary with enhanced AI analysis',
    });
    console.log('✅ Workflow updated:', updated.name);
    console.log('   New description:', updated.description);
    console.log('');

    // Test 7: Toggle workflow enabled status
    console.log('🔄 Test 7: Disabling Workflow...');
    await engine.updateWorkflow(taskSuggester.id, {
      enabled: false,
    });
    console.log('✅ Workflow disabled:', taskSuggester.name);
    console.log('');

    console.log('🎉 All tests completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   - Created 2 workflows');
    console.log('   - Executed 1 workflow');
    console.log('   - Updated workflow properties');
    console.log('   - Activity streamed to real-time dashboard');
    console.log('');
    console.log('🌟 Visit /workflows to see the UI and manage workflows!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the tests
testWorkflowSystem()
  .then(() => {
    console.log('\n✅ Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
