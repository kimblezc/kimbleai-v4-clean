import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { GoogleWorkspaceOrchestrator } from '../../../../lib/google-orchestration';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const {
      action,
      userId = 'zach',
      workflowType,
      params = {},
      config = {}
    } = await request.json();

    // Get user's Google tokens
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json({
        error: 'User not authenticated with Google'
      }, { status: 401 });
    }

    // Initialize OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    // Initialize orchestrator
    const orchestrator = new GoogleWorkspaceOrchestrator(oauth2Client, userId);

    switch (action) {
      case 'execute_workflow':
        return await executeWorkflow(orchestrator, workflowType, params, config);

      case 'smart_email_filing':
        return await smartEmailFiling(orchestrator, params);

      case 'calendar_optimization':
        return await calendarOptimization(orchestrator, params);

      case 'drive_organization':
        return await driveOrganization(orchestrator, params);

      case 'cross_service_automation':
        return await crossServiceAutomation(orchestrator, params);

      case 'intelligent_notifications':
        return await intelligentNotifications(orchestrator, params);

      case 'meeting_preparation':
        return await meetingPreparation(orchestrator, params);

      case 'email_to_task_conversion':
        return await emailToTaskConversion(orchestrator, params);

      case 'calendar_drive_integration':
        return await calendarDriveIntegration(orchestrator, params);

      case 'contact_relationship_mapping':
        return await contactRelationshipMapping(orchestrator, params);

      case 'get_orchestrator_status':
        return await getOrchestratorStatus(orchestrator);

      case 'configure_automation_rules':
        return await configureAutomationRules(orchestrator, params);

      case 'analyze_workspace_patterns':
        return await analyzeWorkspacePatterns(orchestrator, params);

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: [
            'execute_workflow',
            'smart_email_filing',
            'calendar_optimization',
            'drive_organization',
            'cross_service_automation',
            'intelligent_notifications',
            'meeting_preparation',
            'email_to_task_conversion',
            'calendar_drive_integration',
            'contact_relationship_mapping',
            'get_orchestrator_status',
            'configure_automation_rules',
            'analyze_workspace_patterns'
          ]
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Workspace Orchestrator error:', error);
    return NextResponse.json({
      error: 'Workspace orchestration failed',
      details: error.message
    }, { status: 500 });
  }
}

async function executeWorkflow(
  orchestrator: GoogleWorkspaceOrchestrator,
  workflowType: string,
  params: any,
  config: any
) {
  const result = await orchestrator.executeWorkflow(workflowType, params, config);

  return NextResponse.json({
    success: true,
    workflowType,
    result,
    executedAt: new Date().toISOString()
  });
}

async function smartEmailFiling(orchestrator: GoogleWorkspaceOrchestrator, params: any) {
  const {
    maxEmails = 50,
    timeRange = '7d',
    autoApply = false,
    filingRules = []
  } = params;

  const result = await orchestrator.smartEmailFiling({
    maxEmails,
    timeRange,
    autoApply,
    filingRules
  });

  return NextResponse.json({
    success: true,
    action: 'smart_email_filing',
    result: {
      emailsProcessed: result.emailsProcessed,
      categorized: result.categorized,
      filed: result.filed,
      suggestions: result.suggestions,
      statistics: result.statistics
    }
  });
}

async function calendarOptimization(orchestrator: GoogleWorkspaceOrchestrator, params: any) {
  const {
    optimizationType = 'schedule',
    timeRange = '30d',
    preferences = {},
    travelTimeEnabled = true
  } = params;

  const result = await orchestrator.optimizeCalendar({
    optimizationType,
    timeRange,
    preferences,
    travelTimeEnabled
  });

  return NextResponse.json({
    success: true,
    action: 'calendar_optimization',
    result: {
      conflictsResolved: result.conflictsResolved,
      optimizations: result.optimizations,
      travelTimeAdjustments: result.travelTimeAdjustments,
      recommendations: result.recommendations
    }
  });
}

async function driveOrganization(orchestrator: GoogleWorkspaceOrchestrator, params: any) {
  const {
    organizationType = 'auto',
    includeDuplicates = true,
    folderStructure = 'project-based',
    maxFiles = 1000
  } = params;

  const result = await orchestrator.organizeDrive({
    organizationType,
    includeDuplicates,
    folderStructure,
    maxFiles
  });

  return NextResponse.json({
    success: true,
    action: 'drive_organization',
    result: {
      filesOrganized: result.filesOrganized,
      duplicatesFound: result.duplicatesFound,
      foldersCreated: result.foldersCreated,
      organizationReport: result.organizationReport
    }
  });
}

async function crossServiceAutomation(orchestrator: GoogleWorkspaceOrchestrator, params: any) {
  const {
    automationType,
    sourceService,
    targetService,
    automationRules = [],
    triggerConditions = {}
  } = params;

  const result = await orchestrator.executeCrossServiceAutomation({
    automationType,
    sourceService,
    targetService,
    automationRules,
    triggerConditions
  });

  return NextResponse.json({
    success: true,
    action: 'cross_service_automation',
    result: {
      automationsExecuted: result.automationsExecuted,
      crossServiceActions: result.crossServiceActions,
      workflowResults: result.workflowResults
    }
  });
}

async function intelligentNotifications(orchestrator: GoogleWorkspaceOrchestrator, params: any) {
  const {
    notificationTypes = ['priority', 'deadlines', 'conflicts'],
    urgencyLevel = 'medium',
    deliveryMethod = 'digest',
    timePreferences = {}
  } = params;

  const result = await orchestrator.generateIntelligentNotifications({
    notificationTypes,
    urgencyLevel,
    deliveryMethod,
    timePreferences
  });

  return NextResponse.json({
    success: true,
    action: 'intelligent_notifications',
    result: {
      notifications: result.notifications,
      priorityItems: result.priorityItems,
      digest: result.digest,
      nextNotificationTime: result.nextNotificationTime
    }
  });
}

async function meetingPreparation(orchestrator: GoogleWorkspaceOrchestrator, params: any) {
  const {
    meetingId,
    eventId,
    preparationType = 'comprehensive',
    includeFiles = true,
    includeContext = true,
    generateAgenda = true
  } = params;

  const result = await orchestrator.prepareMeeting({
    meetingId,
    eventId,
    preparationType,
    includeFiles,
    includeContext,
    generateAgenda
  });

  return NextResponse.json({
    success: true,
    action: 'meeting_preparation',
    result: {
      meetingContext: result.meetingContext,
      relevantFiles: result.relevantFiles,
      agenda: result.agenda,
      participants: result.participants,
      preparationSummary: result.preparationSummary
    }
  });
}

async function emailToTaskConversion(orchestrator: GoogleWorkspaceOrchestrator, params: any) {
  const {
    emailIds = [],
    conversionRules = {},
    projectMapping = {},
    autoAssign = false
  } = params;

  const result = await orchestrator.convertEmailsToTasks({
    emailIds,
    conversionRules,
    projectMapping,
    autoAssign
  });

  return NextResponse.json({
    success: true,
    action: 'email_to_task_conversion',
    result: {
      tasksCreated: result.tasksCreated,
      emailsProcessed: result.emailsProcessed,
      projectAssignments: result.projectAssignments,
      automationInsights: result.automationInsights
    }
  });
}

async function calendarDriveIntegration(orchestrator: GoogleWorkspaceOrchestrator, params: any) {
  const {
    integrationType = 'attach_relevant_files',
    timeRange = '7d',
    fileRelevanceThreshold = 0.7,
    autoAttach = false
  } = params;

  const result = await orchestrator.integrateCalendarWithDrive({
    integrationType,
    timeRange,
    fileRelevanceThreshold,
    autoAttach
  });

  return NextResponse.json({
    success: true,
    action: 'calendar_drive_integration',
    result: {
      eventsProcessed: result.eventsProcessed,
      filesAttached: result.filesAttached,
      integrations: result.integrations,
      relevanceScores: result.relevanceScores
    }
  });
}

async function contactRelationshipMapping(orchestrator: GoogleWorkspaceOrchestrator, params: any) {
  const {
    analysisDepth = 'standard',
    timeRange = '90d',
    includeEmailAnalysis = true,
    includeMeetingAnalysis = true
  } = params;

  const result = await orchestrator.mapContactRelationships({
    analysisDepth,
    timeRange,
    includeEmailAnalysis,
    includeMeetingAnalysis
  });

  return NextResponse.json({
    success: true,
    action: 'contact_relationship_mapping',
    result: {
      relationshipMap: result.relationshipMap,
      contactInsights: result.contactInsights,
      communicationPatterns: result.communicationPatterns,
      networkAnalysis: result.networkAnalysis
    }
  });
}

async function getOrchestratorStatus(orchestrator: GoogleWorkspaceOrchestrator) {
  const status = await orchestrator.getSystemStatus();

  return NextResponse.json({
    success: true,
    action: 'get_orchestrator_status',
    status: {
      serviceHealth: status.serviceHealth,
      activeWorkflows: status.activeWorkflows,
      automationRules: status.automationRules,
      lastExecution: status.lastExecution,
      performance: status.performance,
      usage: status.usage
    }
  });
}

async function configureAutomationRules(orchestrator: GoogleWorkspaceOrchestrator, params: any) {
  const {
    ruleType,
    ruleName,
    conditions = {},
    actions = {},
    enabled = true,
    priority = 'medium'
  } = params;

  const result = await orchestrator.configureAutomationRule({
    ruleType,
    ruleName,
    conditions,
    actions,
    enabled,
    priority
  });

  return NextResponse.json({
    success: true,
    action: 'configure_automation_rules',
    result: {
      ruleId: result.ruleId,
      ruleConfiguration: result.ruleConfiguration,
      validationResults: result.validationResults,
      estimatedImpact: result.estimatedImpact
    }
  });
}

async function analyzeWorkspacePatterns(orchestrator: GoogleWorkspaceOrchestrator, params: any) {
  const {
    analysisType = 'comprehensive',
    timeRange = '30d',
    includeProductivity = true,
    includeCollaboration = true,
    includeEfficiency = true
  } = params;

  const result = await orchestrator.analyzeWorkspacePatterns({
    analysisType,
    timeRange,
    includeProductivity,
    includeCollaboration,
    includeEfficiency
  });

  return NextResponse.json({
    success: true,
    action: 'analyze_workspace_patterns',
    result: {
      patterns: result.patterns,
      insights: result.insights,
      recommendations: result.recommendations,
      metrics: result.metrics,
      trends: result.trends
    }
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'zach';

  try {
    // Skip database operations during build time
    if (process.env.NODE_ENV === 'development' && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        service: 'Google Workspace Orchestrator Agent',
        status: 'build_mode',
        description: 'Unified Gmail + Drive + Calendar operations with intelligent automation'
      });
    }

    // Get basic system status
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .single();

    const isAuthenticated = !!tokenData?.access_token;

    return NextResponse.json({
      service: 'Google Workspace Orchestrator Agent',
      status: 'operational',
      authenticated: isAuthenticated,
      capabilities: {
        'Smart Email Management': {
          'auto_categorization': 'Automatically categorize and file emails',
          'priority_detection': 'Identify urgent and important emails',
          'intelligent_filtering': 'Smart filtering based on content and patterns',
          'bulk_operations': 'Efficiently manage large volumes of emails'
        },
        'Calendar Optimization': {
          'conflict_resolution': 'Automatically resolve scheduling conflicts',
          'travel_time_calculation': 'Add travel time between meetings',
          'meeting_optimization': 'Optimize meeting schedules for productivity',
          'availability_analysis': 'Intelligent availability tracking'
        },
        'Drive Organization': {
          'duplicate_detection': 'Find and manage duplicate files',
          'smart_folders': 'Automatically organize files into logical folders',
          'content_analysis': 'Analyze file content for better organization',
          'version_management': 'Track file versions and updates'
        },
        'Cross-Service Workflows': {
          'email_to_calendar': 'Convert emails to calendar events',
          'drive_file_sharing': 'Automatically share relevant files',
          'meeting_preparation': 'Gather context and files for meetings',
          'task_creation': 'Convert emails and events to actionable tasks'
        },
        'AI-Powered Features': {
          'content_analysis': 'Analyze content for insights and patterns',
          'relationship_mapping': 'Map contact relationships and communication',
          'pattern_recognition': 'Identify workspace usage patterns',
          'predictive_suggestions': 'Suggest actions based on behavior'
        },
        'Automation & Rules': {
          'rule_based_automation': 'Create custom automation rules',
          'learning_algorithms': 'Adapt to user behavior over time',
          'workflow_orchestration': 'Execute complex multi-step workflows',
          'intelligent_notifications': 'Send relevant notifications at optimal times'
        }
      },
      endpoints: {
        'POST /api/agents/workspace-orchestrator': {
          'execute_workflow': 'Execute a predefined workflow',
          'smart_email_filing': 'Automatically organize and file emails',
          'calendar_optimization': 'Optimize calendar and resolve conflicts',
          'drive_organization': 'Organize Drive files and remove duplicates',
          'cross_service_automation': 'Execute cross-service automations',
          'intelligent_notifications': 'Generate smart notifications',
          'meeting_preparation': 'Prepare context and files for meetings',
          'email_to_task_conversion': 'Convert emails to actionable tasks',
          'calendar_drive_integration': 'Integrate calendar events with Drive files',
          'contact_relationship_mapping': 'Analyze and map contact relationships',
          'configure_automation_rules': 'Set up custom automation rules',
          'analyze_workspace_patterns': 'Analyze usage patterns and productivity'
        }
      }
    });

  } catch (error: any) {
    console.error('Workspace Orchestrator GET error:', error);
    return NextResponse.json({
      error: 'Failed to get orchestrator status',
      details: error.message
    }, { status: 500 });
  }
}