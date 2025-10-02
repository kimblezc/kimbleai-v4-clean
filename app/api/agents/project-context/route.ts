/**
 * Project Context Agent API
 * Intelligent project-based organization and categorization system
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { ProjectClassifier } from '@/lib/project-classification';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface ProjectContextRequest {
  action: string;
  userId?: string;
  content?: string;
  conversationId?: string;
  fileIds?: string[];
  projectId?: string;
  query?: string;
  filters?: {
    startDate?: string;
    endDate?: string;
    minConfidence?: number;
    projectTypes?: string[];
    includeArchived?: boolean;
  };
}

interface ProjectSuggestion {
  projectId: string;
  projectName: string;
  confidence: number;
  reasons: string[];
  relevantContent: string[];
  autoCreate?: boolean;
  suggestedTags: string[];
}

interface ProjectContextResponse {
  success: boolean;
  data?: any;
  suggestions?: ProjectSuggestion[];
  insights?: any;
  timeline?: any[];
  health?: any;
  error?: string;
  timestamp: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ProjectContextResponse>> {
  try {
    const body = await request.json() as ProjectContextRequest;
    const { action, userId = 'zach-admin-001', content, conversationId, fileIds, projectId, query, filters } = body;

    const classifier = new ProjectClassifier(supabase, openai);

    switch (action) {
      case 'classify_content':
        return await classifyContent(classifier, content!, userId);

      case 'suggest_projects':
        return await suggestProjects(classifier, { content, conversationId, fileIds }, userId);

      case 'auto_categorize':
        return await autoCategorizeContent(classifier, conversationId!, userId);

      case 'learn_from_correction':
        return await learnFromCorrection(classifier, body, userId);

      case 'get_project_insights':
        return await getProjectInsights(classifier, projectId!, userId);

      case 'search_by_context':
        return await searchByProjectContext(classifier, query!, projectId, userId, filters);

      case 'get_project_timeline':
        return await getProjectTimeline(classifier, projectId!, userId, filters);

      case 'get_cross_project_references':
        return await getCrossProjectReferences(classifier, projectId!, userId);

      case 'get_project_health':
        return await getProjectHealth(classifier, projectId!, userId);

      case 'archive_inactive_projects':
        return await archiveInactiveProjects(classifier, userId, filters);

      case 'get_activity_summary':
        return await getActivitySummary(classifier, userId, filters);

      case 'get_dashboard_data':
        return await getDashboardData(classifier, userId);

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action specified',
          timestamp: new Date().toISOString()
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Project Context Agent error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process request',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'info';
    const userId = searchParams.get('userId') || 'zach-admin-001';
    const projectId = searchParams.get('projectId');

    const classifier = new ProjectClassifier(supabase, openai);

    switch (action) {
      case 'stats':
        const stats = await getSystemStats(classifier, userId);
        return NextResponse.json({
          success: true,
          stats,
          timestamp: new Date().toISOString()
        });

      case 'project_suggestions':
        const suggestions = await getActiveProjectSuggestions(classifier, userId);
        return NextResponse.json({
          success: true,
          suggestions,
          timestamp: new Date().toISOString()
        });

      case 'health_overview':
        const healthOverview = await getHealthOverview(classifier, userId);
        return NextResponse.json({
          success: true,
          health: healthOverview,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          service: 'Project Context Agent',
          version: '1.0.0',
          status: 'operational',
          capabilities: {
            'content_classification': 'AI-powered project categorization',
            'smart_suggestions': 'Intelligent project recommendations',
            'pattern_learning': 'Learn from user corrections and patterns',
            'cross_project_analysis': 'Detect relationships between projects',
            'activity_tracking': 'Monitor project health and activity',
            'auto_archiving': 'Automatic project lifecycle management'
          },
          endpoints: {
            'classify': 'POST /api/agents/project-context (action: classify_content)',
            'suggest': 'POST /api/agents/project-context (action: suggest_projects)',
            'insights': 'POST /api/agents/project-context (action: get_project_insights)',
            'health': 'GET /api/agents/project-context?action=health_overview'
          },
          timestamp: new Date().toISOString()
        });
    }

  } catch (error: any) {
    console.error('Project Context Agent GET error:', error);
    return NextResponse.json({
      error: 'Failed to process request',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Action handlers

async function classifyContent(
  classifier: ProjectClassifier,
  content: string,
  userId: string
): Promise<NextResponse<ProjectContextResponse>> {
  const classification = await classifier.classifyContent(content, userId);

  return NextResponse.json({
    success: true,
    data: {
      classification,
      confidence: classification.confidence,
      suggestedProjects: classification.suggestedProjects,
      extractedTags: classification.extractedTags
    },
    timestamp: new Date().toISOString()
  });
}

async function suggestProjects(
  classifier: ProjectClassifier,
  context: { content?: string; conversationId?: string; fileIds?: string[] },
  userId: string
): Promise<NextResponse<ProjectContextResponse>> {
  const suggestions = await classifier.suggestProjects(context, userId);

  // Ensure all suggestions have required fields
  const formattedSuggestions: ProjectSuggestion[] = suggestions.map((s: any) => ({
    projectId: s.projectId,
    projectName: s.projectName,
    confidence: s.confidence,
    reasons: s.reasons,
    relevantContent: [],
    suggestedTags: []
  }));

  return NextResponse.json({
    success: true,
    suggestions: formattedSuggestions,
    timestamp: new Date().toISOString()
  });
}

async function autoCategorizeContent(
  classifier: ProjectClassifier,
  conversationId: string,
  userId: string
): Promise<NextResponse<ProjectContextResponse>> {
  const result = await classifier.autoCategorizeConversation(conversationId, userId);

  return NextResponse.json({
    success: true,
    data: {
      conversationId,
      assignedProject: result.projectId,
      confidence: result.confidence,
      reasoning: result.reasoning,
      newProject: result.newProject
    },
    timestamp: new Date().toISOString()
  });
}

async function learnFromCorrection(
  classifier: ProjectClassifier,
  correction: any,
  userId: string
): Promise<NextResponse<ProjectContextResponse>> {
  await classifier.learnFromUserCorrection(correction, userId);

  return NextResponse.json({
    success: true,
    data: {
      message: 'Learning pattern recorded and model updated',
      correctionType: correction.type
    },
    timestamp: new Date().toISOString()
  });
}

async function getProjectInsights(
  classifier: ProjectClassifier,
  projectId: string,
  userId: string
): Promise<NextResponse<ProjectContextResponse>> {
  const insights = await classifier.getProjectInsights(projectId, userId);

  return NextResponse.json({
    success: true,
    insights,
    timestamp: new Date().toISOString()
  });
}

async function searchByProjectContext(
  classifier: ProjectClassifier,
  query: string,
  projectId: string | undefined,
  userId: string,
  filters: any
): Promise<NextResponse<ProjectContextResponse>> {
  const results = await classifier.searchByProjectContext(query, projectId, userId, filters);

  return NextResponse.json({
    success: true,
    data: {
      query,
      projectContext: projectId,
      results: results.items,
      totalResults: results.total,
      projectRelevance: results.projectRelevance
    },
    timestamp: new Date().toISOString()
  });
}

async function getProjectTimeline(
  classifier: ProjectClassifier,
  projectId: string,
  userId: string,
  filters: any
): Promise<NextResponse<ProjectContextResponse>> {
  const timeline = await classifier.generateProjectTimeline(projectId, userId, filters);

  return NextResponse.json({
    success: true,
    timeline,
    timestamp: new Date().toISOString()
  });
}

async function getCrossProjectReferences(
  classifier: ProjectClassifier,
  projectId: string,
  userId: string
): Promise<NextResponse<ProjectContextResponse>> {
  const references = await classifier.findCrossProjectReferences(projectId, userId);

  return NextResponse.json({
    success: true,
    data: {
      projectId,
      references,
      relatedProjects: references.relatedProjects,
      sharedContent: references.sharedContent
    },
    timestamp: new Date().toISOString()
  });
}

async function getProjectHealth(
  classifier: ProjectClassifier,
  projectId: string,
  userId: string
): Promise<NextResponse<ProjectContextResponse>> {
  const health = await classifier.analyzeProjectHealth(projectId, userId);

  return NextResponse.json({
    success: true,
    health,
    timestamp: new Date().toISOString()
  });
}

async function archiveInactiveProjects(
  classifier: ProjectClassifier,
  userId: string,
  filters: any
): Promise<NextResponse<ProjectContextResponse>> {
  const result = await classifier.archiveInactiveProjects(userId, filters);

  return NextResponse.json({
    success: true,
    data: {
      archivedProjects: result.archived,
      totalArchived: result.count,
      criteria: result.criteria
    },
    timestamp: new Date().toISOString()
  });
}

async function getActivitySummary(
  classifier: ProjectClassifier,
  userId: string,
  filters: any
): Promise<NextResponse<ProjectContextResponse>> {
  const summary = await classifier.generateActivitySummary(userId, filters);

  return NextResponse.json({
    success: true,
    data: summary,
    timestamp: new Date().toISOString()
  });
}

async function getDashboardData(
  classifier: ProjectClassifier,
  userId: string
): Promise<NextResponse<ProjectContextResponse>> {
  const dashboardData = await classifier.getDashboardData(userId);

  return NextResponse.json({
    success: true,
    data: dashboardData,
    timestamp: new Date().toISOString()
  });
}

// Utility functions for GET endpoints

async function getSystemStats(classifier: ProjectClassifier, userId: string) {
  const stats = await classifier.getSystemStats(userId);
  return stats;
}

async function getActiveProjectSuggestions(classifier: ProjectClassifier, userId: string) {
  const suggestions = await classifier.getActiveProjectSuggestions(userId);
  return suggestions;
}

async function getHealthOverview(classifier: ProjectClassifier, userId: string) {
  const health = await classifier.getHealthOverview(userId);
  return health;
}