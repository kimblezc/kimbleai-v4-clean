/**
 * Project Classification System
 * AI-powered project categorization and intelligent organization
 */

import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export interface ProjectClassification {
  projectId?: string;
  projectName?: string;
  confidence: number;
  reasoning: string[];
  suggestedProjects: string[];
  extractedTags: string[];
  contentType: 'conversation' | 'file' | 'email' | 'calendar' | 'text';
  topics: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
}

export interface LearningPattern {
  id: string;
  userId: string;
  correctionType: 'project_assignment' | 'tag_correction' | 'priority_adjustment';
  originalPrediction: any;
  userCorrection: any;
  contentContext: string;
  patternStrength: number;
  createdAt: string;
}

export interface ProjectInsights {
  projectId: string;
  activityTrend: 'increasing' | 'stable' | 'decreasing' | 'dormant';
  healthScore: number;
  predictedCompletion?: string;
  riskFactors: string[];
  recommendations: string[];
  keyMetrics: {
    messageVelocity: number;
    taskCompletionRate: number;
    collaborationIndex: number;
    contentDiversity: number;
  };
  relatedProjects: string[];
  contentThemes: Array<{ theme: string; strength: number }>;
}

export interface CrossProjectReference {
  sourceProject: string;
  targetProject: string;
  referenceType: 'mention' | 'dependency' | 'resource_sharing' | 'similar_topic';
  confidence: number;
  context: string;
  frequency: number;
}

export class ProjectClassifier {
  private supabase: SupabaseClient;
  private openai: OpenAI;
  private cache: Map<string, any> = new Map();

  // Classification models and patterns
  private techStackPatterns = {
    frontend: {
      patterns: [/react|vue|angular|svelte|next\.?js|nuxt/i, /html|css|javascript|typescript|jsx|tsx/i, /tailwind|bootstrap|sass|scss/i],
      keywords: ['component', 'ui', 'interface', 'design', 'responsive', 'styling']
    },
    backend: {
      patterns: [/node\.?js|express|fastify|nest\.?js/i, /python|django|flask|fastapi/i, /java|spring|kotlin/i, /ruby|rails/i],
      keywords: ['api', 'server', 'database', 'endpoint', 'authentication', 'middleware']
    },
    database: {
      patterns: [/postgres|mysql|mongodb|redis|supabase/i, /sql|nosql|database|db/i],
      keywords: ['query', 'schema', 'migration', 'index', 'relationship', 'transaction']
    },
    ai: {
      patterns: [/openai|gpt|claude|llm|ai|ml|machine.learning/i, /embedding|vector|semantic|nlp/i],
      keywords: ['model', 'training', 'prediction', 'classification', 'neural', 'algorithm']
    },
    devops: {
      patterns: [/docker|kubernetes|k8s|aws|gcp|azure/i, /ci\/cd|github.actions|jenkins/i],
      keywords: ['deployment', 'container', 'infrastructure', 'pipeline', 'monitoring', 'scaling']
    },
    mobile: {
      patterns: [/react.native|flutter|ios|android|swift|kotlin/i, /mobile|app.store|play.store/i],
      keywords: ['mobile', 'native', 'cross-platform', 'responsive', 'tablet', 'phone']
    }
  };

  private contentTypePatterns = {
    bug_report: {
      patterns: [/bug|error|issue|problem|broken|failing|crash/i],
      keywords: ['fix', 'debug', 'reproduce', 'stack trace', 'exception']
    },
    feature_request: {
      patterns: [/feature|implement|create|build|add|new/i],
      keywords: ['requirement', 'specification', 'functionality', 'enhancement']
    },
    documentation: {
      patterns: [/document|readme|docs|guide|tutorial|help/i],
      keywords: ['explain', 'instruction', 'manual', 'reference', 'wiki']
    },
    meeting: {
      patterns: [/meeting|call|discussion|sync|standup|retrospective/i],
      keywords: ['agenda', 'action items', 'decision', 'follow-up', 'notes']
    },
    planning: {
      patterns: [/plan|roadmap|timeline|milestone|sprint|deadline/i],
      keywords: ['strategy', 'schedule', 'priority', 'resource', 'estimation']
    },
    review: {
      patterns: [/review|feedback|code.review|pull.request|pr/i],
      keywords: ['approve', 'comment', 'suggestion', 'quality', 'standards']
    }
  };

  constructor(supabase: SupabaseClient, openai: OpenAI) {
    this.supabase = supabase;
    this.openai = openai;
  }

  /**
   * Classify content and suggest project assignment
   */
  async classifyContent(content: string, userId: string): Promise<ProjectClassification> {
    try {
      // Generate embedding for content
      const embedding = await this.generateEmbedding(content);

      // Get user's projects and patterns
      const [projects, patterns] = await Promise.all([
        this.getUserProjects(userId),
        this.getUserLearningPatterns(userId)
      ]);

      // Analyze content characteristics
      const analysis = await this.analyzeContentCharacteristics(content);

      // Find similar existing content
      const similarContent = await this.findSimilarContent(embedding, userId);

      // Apply learning patterns
      const patternMatches = this.applyLearningPatterns(content, patterns);

      // Generate AI-powered classification
      const aiClassification = await this.getAIClassification(content, projects);

      // Combine all signals for final classification
      const classification = this.combineClassificationSignals({
        content,
        analysis,
        similarContent,
        patternMatches,
        aiClassification,
        projects
      });

      // Store classification for learning
      await this.storeClassificationResult(classification, content, userId);

      return classification;

    } catch (error) {
      console.error('Content classification error:', error);
      return this.getFallbackClassification(content);
    }
  }

  /**
   * Suggest projects based on various context inputs
   */
  async suggestProjects(
    context: { content?: string; conversationId?: string; fileIds?: string[] },
    userId: string
  ): Promise<Array<{ projectId: string; projectName: string; confidence: number; reasons: string[] }>> {
    try {
      let contentToAnalyze = '';

      // Gather content from different sources
      if (context.content) {
        contentToAnalyze += context.content;
      }

      if (context.conversationId) {
        const conversationContent = await this.getConversationContent(context.conversationId);
        contentToAnalyze += '\n' + conversationContent;
      }

      if (context.fileIds?.length) {
        const fileContent = await this.getFileContent(context.fileIds);
        contentToAnalyze += '\n' + fileContent;
      }

      if (!contentToAnalyze.trim()) {
        return [];
      }

      // Classify the combined content
      const classification = await this.classifyContent(contentToAnalyze, userId);

      // Get user's active projects
      const projects = await this.getUserProjects(userId);

      // Score each project based on relevance
      const scoredProjects = await this.scoreProjectRelevance(
        contentToAnalyze,
        classification,
        projects,
        userId
      );

      // Return top suggestions
      return scoredProjects
        .filter(p => p.confidence > 0.3)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

    } catch (error) {
      console.error('Project suggestion error:', error);
      return [];
    }
  }

  /**
   * Auto-categorize a conversation
   */
  async autoCategorizeConversation(conversationId: string, userId: string): Promise<{
    projectId?: string;
    confidence: number;
    reasoning: string[];
    newProject?: boolean;
  }> {
    try {
      // Get conversation content
      const content = await this.getConversationContent(conversationId);

      // Classify content
      const classification = await this.classifyContent(content, userId);

      // Check if we should assign to existing project or create new one
      if (classification.confidence > 0.7 && classification.projectId) {
        // Assign to existing project
        await this.assignConversationToProject(conversationId, classification.projectId);

        return {
          projectId: classification.projectId,
          confidence: classification.confidence,
          reasoning: classification.reasoning
        };
      } else if (classification.confidence > 0.5) {
        // Suggest creating new project
        const newProjectName = await this.suggestProjectName(content, classification);

        return {
          confidence: classification.confidence,
          reasoning: [...classification.reasoning, 'Suggested new project creation'],
          newProject: true
        };
      }

      return {
        confidence: classification.confidence,
        reasoning: ['Insufficient confidence for automatic categorization']
      };

    } catch (error) {
      console.error('Auto-categorization error:', error);
      return {
        confidence: 0,
        reasoning: ['Error occurred during categorization']
      };
    }
  }

  /**
   * Learn from user corrections to improve classification
   */
  async learnFromUserCorrection(correction: any, userId: string): Promise<void> {
    try {
      const pattern: Omit<LearningPattern, 'id'> = {
        userId,
        correctionType: correction.type,
        originalPrediction: correction.originalPrediction,
        userCorrection: correction.userCorrection,
        contentContext: correction.content || '',
        patternStrength: 1.0,
        createdAt: new Date().toISOString()
      };

      // Store the learning pattern
      const { data, error } = await this.supabase
        .from('project_learning_patterns')
        .insert(pattern)
        .select()
        .single();

      if (error) throw error;

      // Update existing similar patterns
      await this.reinforceSimilarPatterns(pattern, userId);

      // Clear relevant caches
      this.clearUserCache(userId);

    } catch (error) {
      console.error('Learning from correction error:', error);
    }
  }

  /**
   * Get comprehensive project insights
   */
  async getProjectInsights(projectId: string, userId: string): Promise<ProjectInsights> {
    try {
      const cacheKey = `insights_${projectId}_${userId}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      // Get project data
      const [project, conversations, tasks, files] = await Promise.all([
        this.getProjectData(projectId),
        this.getProjectConversations(projectId),
        this.getProjectTasks(projectId),
        this.getProjectFiles(projectId)
      ]);

      // Analyze activity trends
      const activityTrend = this.analyzeActivityTrend(conversations, tasks);

      // Calculate health score
      const healthScore = this.calculateHealthScore(project, conversations, tasks, files);

      // Predict completion date
      const predictedCompletion = this.predictCompletionDate(tasks, activityTrend);

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(project, conversations, tasks);

      // Generate recommendations
      const recommendations = this.generateRecommendations(project, riskFactors, healthScore);

      // Calculate key metrics
      const keyMetrics = this.calculateKeyMetrics(conversations, tasks, files);

      // Find related projects
      const relatedProjects = await this.findRelatedProjects(projectId, userId);

      // Extract content themes
      const contentThemes = await this.extractContentThemes(conversations, files);

      const insights: ProjectInsights = {
        projectId,
        activityTrend,
        healthScore,
        predictedCompletion,
        riskFactors,
        recommendations,
        keyMetrics,
        relatedProjects,
        contentThemes
      };

      // Cache for 1 hour
      this.cache.set(cacheKey, insights);
      setTimeout(() => this.cache.delete(cacheKey), 3600000);

      return insights;

    } catch (error) {
      console.error('Project insights error:', error);
      throw error;
    }
  }

  /**
   * Search content with project context prioritization
   */
  async searchByProjectContext(
    query: string,
    projectId: string | undefined,
    userId: string,
    filters: any = {}
  ): Promise<{ items: any[]; total: number; projectRelevance: any }> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Search with semantic similarity
      const { data: searchResults, error } = await this.supabase
        .rpc('search_all_content', {
          query_embedding: queryEmbedding,
          similarity_threshold: filters.threshold || 0.3,
          match_count: filters.limit || 50,
          user_id_filter: userId
        });

      if (error) throw error;

      let results = searchResults || [];

      // If project context is specified, boost project-related content
      if (projectId) {
        results = this.boostProjectContent(results, projectId);
      }

      // Apply additional filters
      if (filters.contentTypes?.length) {
        results = results.filter((r: any) => filters.contentTypes.includes(r.content_type));
      }

      if (filters.startDate) {
        results = results.filter((r: any) => new Date(r.created_at) >= new Date(filters.startDate));
      }

      if (filters.endDate) {
        results = results.filter((r: any) => new Date(r.created_at) <= new Date(filters.endDate));
      }

      // Calculate project relevance distribution
      const projectRelevance = this.calculateProjectRelevance(results);

      return {
        items: results.slice(0, filters.limit || 20),
        total: results.length,
        projectRelevance
      };

    } catch (error) {
      console.error('Project context search error:', error);
      return { items: [], total: 0, projectRelevance: {} };
    }
  }

  /**
   * Generate project timeline with key events
   */
  async generateProjectTimeline(
    projectId: string,
    userId: string,
    filters: any = {}
  ): Promise<Array<{ date: string; type: string; title: string; description: string; significance: number }>> {
    try {
      // Get project events from various sources
      const [conversations, tasks, files, milestones] = await Promise.all([
        this.getProjectConversations(projectId),
        this.getProjectTasks(projectId),
        this.getProjectFiles(projectId),
        this.getProjectMilestones(projectId)
      ]);

      // Create timeline events
      const events: any[] = [];

      // Add conversation events
      conversations.forEach((conv: any) => {
        if (conv.message_count > 5) { // Only significant conversations
          events.push({
            date: conv.created_at,
            type: 'conversation',
            title: `Discussion: ${conv.title}`,
            description: conv.summary || 'Project discussion',
            significance: Math.min(conv.message_count / 10, 1)
          });
        }
      });

      // Add task events
      tasks.forEach((task: any) => {
        events.push({
          date: task.created_at,
          type: 'task_created',
          title: `Task Created: ${task.title}`,
          description: task.description || '',
          significance: task.priority === 'high' ? 0.8 : task.priority === 'medium' ? 0.6 : 0.4
        });

        if (task.completed_at) {
          events.push({
            date: task.completed_at,
            type: 'task_completed',
            title: `Task Completed: ${task.title}`,
            description: `Task completed successfully`,
            significance: 0.7
          });
        }
      });

      // Add file events
      files.forEach((file: any) => {
        events.push({
          date: file.created_at,
          type: 'file_added',
          title: `File Added: ${file.filename}`,
          description: file.content_preview || 'New file added to project',
          significance: 0.5
        });
      });

      // Sort by date and filter by significance
      const timeline = events
        .filter(event => {
          if (filters.startDate && new Date(event.date) < new Date(filters.startDate)) return false;
          if (filters.endDate && new Date(event.date) > new Date(filters.endDate)) return false;
          if (filters.minSignificance && event.significance < filters.minSignificance) return false;
          return true;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return timeline;

    } catch (error) {
      console.error('Timeline generation error:', error);
      return [];
    }
  }

  /**
   * Find cross-project references and relationships
   */
  async findCrossProjectReferences(projectId: string, userId: string): Promise<{
    relatedProjects: Array<{ projectId: string; relationshipType: string; strength: number }>;
    sharedContent: Array<{ contentId: string; contentType: string; projects: string[] }>;
  }> {
    try {
      // Get project content
      const projectContent = await this.getAllProjectContent(projectId);

      // Find mentions of other projects
      const projectMentions = await this.findProjectMentions(projectContent, userId);

      // Find shared resources/files
      const sharedResources = await this.findSharedResources(projectId, userId);

      // Find topically similar projects
      const similarProjects = await this.findTopicallySimilarProjects(projectId, userId);

      // Combine and score relationships
      const relatedProjects = this.combineProjectRelationships([
        ...projectMentions,
        ...similarProjects
      ]);

      return {
        relatedProjects,
        sharedContent: sharedResources
      };

    } catch (error) {
      console.error('Cross-project reference error:', error);
      return { relatedProjects: [], sharedContent: [] };
    }
  }

  /**
   * Analyze project health and provide insights
   */
  async analyzeProjectHealth(projectId: string, userId: string): Promise<{
    score: number;
    status: 'healthy' | 'at_risk' | 'critical' | 'dormant';
    factors: Array<{ factor: string; impact: 'positive' | 'negative'; severity: number; description: string }>;
    recommendations: string[];
  }> {
    try {
      const insights = await this.getProjectInsights(projectId, userId);

      const factors = [];
      let score = 0.5; // Start with neutral score

      // Analyze activity trend
      if (insights.activityTrend === 'increasing') {
        factors.push({
          factor: 'Activity Trend',
          impact: 'positive' as const,
          severity: 0.8,
          description: 'Project activity is increasing consistently'
        });
        score += 0.2;
      } else if (insights.activityTrend === 'dormant') {
        factors.push({
          factor: 'Activity Trend',
          impact: 'negative' as const,
          severity: 0.9,
          description: 'Project has been dormant with no recent activity'
        });
        score -= 0.3;
      }

      // Analyze task completion rate
      if (insights.keyMetrics.taskCompletionRate > 0.8) {
        factors.push({
          factor: 'Task Completion',
          impact: 'positive' as const,
          severity: 0.7,
          description: 'High task completion rate indicates good progress'
        });
        score += 0.15;
      } else if (insights.keyMetrics.taskCompletionRate < 0.3) {
        factors.push({
          factor: 'Task Completion',
          impact: 'negative' as const,
          severity: 0.8,
          description: 'Low task completion rate suggests blockers or issues'
        });
        score -= 0.2;
      }

      // Analyze collaboration
      if (insights.keyMetrics.collaborationIndex > 0.7) {
        factors.push({
          factor: 'Collaboration',
          impact: 'positive' as const,
          severity: 0.6,
          description: 'Good team collaboration and communication'
        });
        score += 0.1;
      }

      // Analyze risk factors
      insights.riskFactors.forEach(risk => {
        factors.push({
          factor: 'Risk Factor',
          impact: 'negative' as const,
          severity: 0.7,
          description: risk
        });
        score -= 0.1;
      });

      // Determine status
      let status: 'healthy' | 'at_risk' | 'critical' | 'dormant';
      if (score >= 0.8) status = 'healthy';
      else if (score >= 0.6) status = 'at_risk';
      else if (insights.activityTrend === 'dormant') status = 'dormant';
      else status = 'critical';

      return {
        score: Math.max(0, Math.min(1, score)),
        status,
        factors,
        recommendations: insights.recommendations
      };

    } catch (error) {
      console.error('Project health analysis error:', error);
      return {
        score: 0.5,
        status: 'at_risk',
        factors: [],
        recommendations: ['Unable to analyze project health']
      };
    }
  }

  /**
   * Archive inactive projects based on criteria
   */
  async archiveInactiveProjects(userId: string, criteria: any = {}): Promise<{
    archived: string[];
    count: number;
    criteria: any;
  }> {
    try {
      const {
        inactiveDays = 90,
        minCompletionRate = 0.9,
        requiresConfirmation = true
      } = criteria;

      // Get user's projects
      const projects = await this.getUserProjects(userId);

      const candidatesForArchiving = [];

      for (const project of projects) {
        if (project.status === 'archived') continue;

        // Check last activity
        const lastActivity = new Date(project.stats?.last_activity || project.updated_at);
        const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceActivity >= inactiveDays) {
          // Check if project is substantially complete
          const insights = await this.getProjectInsights(project.id, userId);

          if (insights.keyMetrics.taskCompletionRate >= minCompletionRate) {
            candidatesForArchiving.push(project.id);
          }
        }
      }

      if (!requiresConfirmation) {
        // Auto-archive
        for (const projectId of candidatesForArchiving) {
          await this.supabase
            .from('projects')
            .update({ status: 'archived' })
            .eq('id', projectId);
        }
      }

      return {
        archived: requiresConfirmation ? [] : candidatesForArchiving,
        count: candidatesForArchiving.length,
        criteria: { inactiveDays, minCompletionRate, requiresConfirmation }
      };

    } catch (error) {
      console.error('Archive inactive projects error:', error);
      return { archived: [], count: 0, criteria };
    }
  }

  /**
   * Generate activity summary for user
   */
  async generateActivitySummary(userId: string, filters: any = {}): Promise<{
    period: string;
    overview: any;
    projectActivity: any[];
    trends: any;
    insights: string[];
  }> {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate = new Date().toISOString()
      } = filters;

      // Get activity data
      const [conversations, tasks, projects] = await Promise.all([
        this.getUserActivityData('conversations', userId, startDate, endDate),
        this.getUserActivityData('tasks', userId, startDate, endDate),
        this.getUserProjects(userId)
      ]);

      // Calculate overview metrics
      const overview = {
        totalConversations: conversations.length,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t: any) => t.status === 'completed').length,
        activeProjects: projects.filter(p => p.status === 'active').length
      };

      // Analyze project activity
      const projectActivity = projects.map(project => {
        const projectConversations = conversations.filter((c: any) => c.project_id === project.id);
        const projectTasks = tasks.filter((t: any) => t.project_id === project.id);

        return {
          projectId: project.id,
          projectName: project.name,
          conversations: projectConversations.length,
          tasks: projectTasks.length,
          completedTasks: projectTasks.filter((t: any) => t.status === 'completed').length,
          activity: this.calculateActivityScore(projectConversations, projectTasks)
        };
      });

      // Identify trends
      const trends = this.identifyActivityTrends(conversations, tasks, projects);

      // Generate insights
      const insights = this.generateActivityInsights(overview, projectActivity, trends);

      return {
        period: `${startDate.split('T')[0]} to ${endDate.split('T')[0]}`,
        overview,
        projectActivity,
        trends,
        insights
      };

    } catch (error) {
      console.error('Activity summary generation error:', error);
      throw error;
    }
  }

  /**
   * Get dashboard data for Project Context Agent
   */
  async getDashboardData(userId: string): Promise<{
    summary: any;
    recentActivity: any[];
    projectHealth: any[];
    suggestions: any[];
    insights: any[];
  }> {
    try {
      // Get summary data
      const summary = await this.getSystemStats(userId);

      // Get recent activity
      const recentActivity = await this.getRecentActivity(userId, 10);

      // Get project health overview
      const projects = await this.getUserProjects(userId);
      const projectHealth = await Promise.all(
        projects.slice(0, 5).map(async (project) => {
          const health = await this.analyzeProjectHealth(project.id, userId);
          return {
            projectId: project.id,
            projectName: project.name,
            ...health
          };
        })
      );

      // Get suggestions
      const suggestions = await this.getActiveProjectSuggestions(userId);

      // Get insights
      const insights = await this.generateDashboardInsights(userId);

      return {
        summary,
        recentActivity,
        projectHealth,
        suggestions,
        insights
      };

    } catch (error) {
      console.error('Dashboard data error:', error);
      throw error;
    }
  }

  // Utility methods for system stats and suggestions

  async getSystemStats(userId: string): Promise<any> {
    const [projects, conversations, tasks] = await Promise.all([
      this.getUserProjects(userId),
      this.getUserConversations(userId),
      this.getUserTasks(userId)
    ]);

    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'active').length,
      totalConversations: conversations.length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t: any) => t.status === 'completed').length,
      lastActivity: Math.max(
        ...conversations.map((c: any) => new Date(c.updated_at).getTime()),
        ...tasks.map((t: any) => new Date(t.updated_at).getTime())
      )
    };
  }

  async getActiveProjectSuggestions(userId: string): Promise<any[]> {
    // Get recent unassigned conversations
    const { data: unassigned, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .is('project_id', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !unassigned) return [];

    const suggestions = [];
    for (const conversation of unassigned) {
      const content = await this.getConversationContent(conversation.id);
      const classification = await this.classifyContent(content, userId);

      if (classification.confidence > 0.5) {
        suggestions.push({
          conversationId: conversation.id,
          conversationTitle: conversation.title,
          suggestedProject: classification.projectName,
          confidence: classification.confidence,
          reasoning: classification.reasoning
        });
      }
    }

    return suggestions;
  }

  async getHealthOverview(userId: string): Promise<any> {
    const projects = await this.getUserProjects(userId);
    const healthData = await Promise.all(
      projects.map(async (project) => {
        const health = await this.analyzeProjectHealth(project.id, userId);
        return { ...project, health };
      })
    );

    const statusCounts = healthData.reduce((acc, project) => {
      acc[project.health.status] = (acc[project.health.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalProjects: projects.length,
      statusDistribution: statusCounts,
      averageHealth: healthData.reduce((sum, p) => sum + p.health.score, 0) / projects.length,
      criticalProjects: healthData.filter(p => p.health.status === 'critical').length
    };
  }

  // Private helper methods

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.replace(/\n/g, ' ').trim(),
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw error;
    }
  }

  private async getUserProjects(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .or(`owner_id.eq.${userId},collaborators.cs.{${userId}}`)
      .neq('status', 'archived');

    if (error) throw error;
    return data || [];
  }

  private async getUserLearningPatterns(userId: string): Promise<LearningPattern[]> {
    const { data, error } = await this.supabase
      .from('project_learning_patterns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  private async analyzeContentCharacteristics(content: string): Promise<any> {
    const analysis = {
      techStack: [] as string[],
      contentType: 'general',
      urgency: 'medium' as 'low' | 'medium' | 'high' | 'critical',
      complexity: 'moderate' as 'simple' | 'moderate' | 'complex' | 'enterprise',
      topics: [] as string[]
    };

    // Detect tech stack
    for (const [stack, config] of Object.entries(this.techStackPatterns)) {
      const patternMatch = config.patterns.some(pattern => pattern.test(content));
      const keywordMatch = config.keywords.some(keyword =>
        content.toLowerCase().includes(keyword.toLowerCase())
      );

      if (patternMatch || keywordMatch) {
        analysis.techStack.push(stack);
      }
    }

    // Detect content type
    for (const [type, config] of Object.entries(this.contentTypePatterns)) {
      const patternMatch = config.patterns.some(pattern => pattern.test(content));
      const keywordMatch = config.keywords.some(keyword =>
        content.toLowerCase().includes(keyword.toLowerCase())
      );

      if (patternMatch || keywordMatch) {
        analysis.contentType = type;
        break;
      }
    }

    // Detect urgency
    if (/urgent|asap|critical|emergency|deadline/i.test(content)) {
      analysis.urgency = 'critical';
    } else if (/soon|important|priority|quick/i.test(content)) {
      analysis.urgency = 'high';
    } else if (/eventually|someday|nice.to.have/i.test(content)) {
      analysis.urgency = 'low';
    }

    // Detect complexity
    const complexityIndicators = content.match(/\b(complex|enterprise|architecture|scalable|distributed|microservices|integration)\b/gi);
    if (complexityIndicators && complexityIndicators.length > 3) {
      analysis.complexity = 'enterprise';
    } else if (complexityIndicators && complexityIndicators.length > 1) {
      analysis.complexity = 'complex';
    } else if (/simple|basic|straightforward|easy/i.test(content)) {
      analysis.complexity = 'simple';
    }

    return analysis;
  }

  private async findSimilarContent(embedding: number[], userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .rpc('search_all_content', {
        query_embedding: embedding,
        similarity_threshold: 0.7,
        match_count: 10,
        user_id_filter: userId
      });

    if (error) return [];
    return data || [];
  }

  private applyLearningPatterns(content: string, patterns: LearningPattern[]): any {
    const matches = patterns.filter(pattern => {
      // Simple pattern matching - in a real implementation, this would be more sophisticated
      return content.toLowerCase().includes(pattern.contentContext.toLowerCase().substring(0, 50));
    });

    return {
      matchedPatterns: matches.length,
      strongestPattern: matches.sort((a, b) => b.patternStrength - a.patternStrength)[0],
      suggestedCorrections: matches.map(p => p.userCorrection)
    };
  }

  private async getAIClassification(content: string, projects: any[]): Promise<any> {
    try {
      const projectList = projects.map(p => `${p.name}: ${p.description || ''}`).join('\n');

      const prompt = `Analyze this content and classify it for project assignment:

Content: "${content}"

Available projects:
${projectList}

Please provide:
1. Most relevant project (or "NEW_PROJECT" if none fit well)
2. Confidence score (0-1)
3. Key reasoning points
4. Suggested tags
5. Urgency level (low/medium/high/critical)

Respond in JSON format:
{
  "project": "project_name or NEW_PROJECT",
  "confidence": 0.85,
  "reasoning": ["reason1", "reason2"],
  "tags": ["tag1", "tag2"],
  "urgency": "medium"
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500
      });

      return JSON.parse(response.choices[0].message.content || '{}');

    } catch (error) {
      console.error('AI classification error:', error);
      return {
        project: null,
        confidence: 0.3,
        reasoning: ['AI classification unavailable'],
        tags: [],
        urgency: 'medium'
      };
    }
  }

  private combineClassificationSignals(signals: any): ProjectClassification {
    const { content, analysis, similarContent, patternMatches, aiClassification, projects } = signals;

    let confidence = 0.3; // Base confidence
    const reasoning = [];
    const suggestedProjects = [];
    const extractedTags = [...analysis.techStack];

    // Boost confidence based on AI classification
    if (aiClassification.confidence > 0.5) {
      confidence += aiClassification.confidence * 0.4;
      reasoning.push(`AI analysis suggests ${aiClassification.project || 'new project'}`);
    }

    // Boost confidence based on similar content
    if (similarContent.length > 0) {
      confidence += 0.2;
      reasoning.push(`Found ${similarContent.length} similar content items`);

      // Extract project suggestions from similar content
      const projectCounts = similarContent.reduce((acc: any, item: any) => {
        if (item.project_id) {
          acc[item.project_id] = (acc[item.project_id] || 0) + 1;
        }
        return acc;
      }, {});

      suggestedProjects.push(...Object.keys(projectCounts));
    }

    // Apply learning patterns
    if (patternMatches.matchedPatterns > 0) {
      confidence += Math.min(patternMatches.matchedPatterns * 0.1, 0.3);
      reasoning.push(`Matches ${patternMatches.matchedPatterns} learned patterns`);
    }

    // Add AI suggested tags
    if (aiClassification.tags) {
      extractedTags.push(...aiClassification.tags);
    }

    // Find matching project
    let projectId, projectName;
    if (aiClassification.project && aiClassification.project !== 'NEW_PROJECT') {
      const matchingProject = projects.find((p: any) =>
        p.name.toLowerCase().includes(aiClassification.project.toLowerCase())
      );
      if (matchingProject) {
        projectId = matchingProject.id;
        projectName = matchingProject.name;
      }
    }

    return {
      projectId,
      projectName,
      confidence: Math.min(confidence, 1.0),
      reasoning,
      suggestedProjects,
      extractedTags: [...new Set(extractedTags)],
      contentType: 'text',
      topics: analysis.topics,
      urgency: aiClassification.urgency || analysis.urgency,
      complexity: analysis.complexity
    };
  }

  private getFallbackClassification(content: string): ProjectClassification {
    return {
      confidence: 0.1,
      reasoning: ['Fallback classification due to processing error'],
      suggestedProjects: [],
      extractedTags: [],
      contentType: 'text',
      topics: [],
      urgency: 'medium',
      complexity: 'moderate'
    };
  }

  private async storeClassificationResult(classification: ProjectClassification, content: string, userId: string): Promise<void> {
    try {
      await this.supabase
        .from('project_classifications')
        .insert({
          user_id: userId,
          content_preview: content.substring(0, 200),
          classification_result: classification,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      // Non-critical error, don't throw
      console.error('Error storing classification result:', error);
    }
  }

  private clearUserCache(userId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(userId));
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Additional helper methods would be implemented here...
  // Due to length constraints, I'm showing the core structure and key methods

  private async getConversationContent(conversationId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('content, role')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) return '';

    return (data || [])
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  private async getFileContent(fileIds: string[]): Promise<string> {
    // Implementation would fetch and combine file content
    return '';
  }

  private async scoreProjectRelevance(
    content: string,
    classification: ProjectClassification,
    projects: any[],
    userId: string
  ): Promise<Array<{ projectId: string; projectName: string; confidence: number; reasons: string[] }>> {
    // Implementation would score each project's relevance to the content
    return [];
  }

  private async assignConversationToProject(conversationId: string, projectId: string): Promise<void> {
    await this.supabase
      .from('conversations')
      .update({ project_id: projectId })
      .eq('id', conversationId);
  }

  private async suggestProjectName(content: string, classification: ProjectClassification): Promise<string> {
    // Use AI to suggest a good project name based on content
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: `Based on this content, suggest a concise project name (2-4 words):\n\n${content.substring(0, 500)}`
        }],
        max_tokens: 20,
        temperature: 0.1
      });

      return response.choices[0].message.content?.trim() || 'New Project';
    } catch {
      return 'New Project';
    }
  }

  private async reinforceSimilarPatterns(pattern: Omit<LearningPattern, 'id'>, userId: string): Promise<void> {
    // Implementation would find and strengthen similar existing patterns
  }

  private async getProjectData(projectId: string): Promise<any> {
    const { data } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    return data;
  }

  private async getProjectConversations(projectId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('project_id', projectId);
    return data || [];
  }

  private async getProjectTasks(projectId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('project_tasks')
      .select('*')
      .eq('project_id', projectId);
    return data || [];
  }

  private async getProjectFiles(projectId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('indexed_files')
      .select('*')
      .eq('project_id', projectId);
    return data || [];
  }

  private analyzeActivityTrend(conversations: any[], tasks: any[]): 'increasing' | 'stable' | 'decreasing' | 'dormant' {
    // Implementation would analyze temporal patterns
    return 'stable';
  }

  private calculateHealthScore(project: any, conversations: any[], tasks: any[], files: any[]): number {
    // Implementation would calculate composite health score
    return 0.75;
  }

  private predictCompletionDate(tasks: any[], trend: string): string | undefined {
    // Implementation would predict based on velocity and remaining work
    return undefined;
  }

  private identifyRiskFactors(project: any, conversations: any[], tasks: any[]): string[] {
    const risks = [];

    // Check for overdue tasks
    const overdueTasks = tasks.filter((t: any) =>
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
    );
    if (overdueTasks.length > 0) {
      risks.push(`${overdueTasks.length} overdue tasks`);
    }

    // Check for blocked tasks
    const blockedTasks = tasks.filter((t: any) => t.status === 'blocked');
    if (blockedTasks.length > 0) {
      risks.push(`${blockedTasks.length} blocked tasks`);
    }

    // Check for low activity
    const recentActivity = conversations.filter((c: any) =>
      new Date(c.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    if (recentActivity.length === 0) {
      risks.push('No recent activity in the past week');
    }

    return risks;
  }

  private generateRecommendations(project: any, risks: string[], healthScore: number): string[] {
    const recommendations = [];

    if (healthScore < 0.5) {
      recommendations.push('Schedule a project review meeting');
    }

    if (risks.some(r => r.includes('overdue'))) {
      recommendations.push('Review and update task deadlines');
    }

    if (risks.some(r => r.includes('blocked'))) {
      recommendations.push('Address blocked tasks to maintain momentum');
    }

    if (risks.some(r => r.includes('activity'))) {
      recommendations.push('Increase team communication and engagement');
    }

    return recommendations;
  }

  private calculateKeyMetrics(conversations: any[], tasks: any[], files: any[]): {
    messageVelocity: number;
    taskCompletionRate: number;
    collaborationIndex: number;
    contentDiversity: number;
  } {
    // Calculate messages per week
    const recentMessages = conversations.filter((c: any) =>
      new Date(c.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const messageVelocity = recentMessages.reduce((sum, c) => sum + c.message_count, 0);

    // Calculate task completion rate
    const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
    const taskCompletionRate = tasks.length > 0 ? completedTasks / tasks.length : 0;

    // Calculate collaboration index (unique participants)
    const participants = new Set(conversations.map((c: any) => c.user_id));
    const collaborationIndex = Math.min(participants.size / 5, 1); // Normalize to max of 5 people

    // Calculate content diversity (different types of content)
    const contentTypes = new Set([
      ...conversations.map(() => 'conversation'),
      ...tasks.map(() => 'task'),
      ...files.map(() => 'file')
    ]);
    const contentDiversity = contentTypes.size / 3; // Max 3 types

    return {
      messageVelocity,
      taskCompletionRate,
      collaborationIndex,
      contentDiversity
    };
  }

  private async findRelatedProjects(projectId: string, userId: string): Promise<string[]> {
    // Implementation would find projects with shared themes, tags, or collaborators
    return [];
  }

  private async extractContentThemes(conversations: any[], files: any[]): Promise<Array<{ theme: string; strength: number }>> {
    // Implementation would use NLP to extract major themes
    return [];
  }

  private boostProjectContent(results: any[], projectId: string): any[] {
    return results.map(result => {
      if (result.project_id === projectId) {
        result.similarity = Math.min(result.similarity * 1.3, 1.0); // Boost project content
      }
      return result;
    });
  }

  private calculateProjectRelevance(results: any[]): any {
    const projectCounts = results.reduce((acc: any, result: any) => {
      if (result.project_id) {
        acc[result.project_id] = (acc[result.project_id] || 0) + 1;
      }
      return acc;
    }, {});

    return projectCounts;
  }

  private async getProjectMilestones(projectId: string): Promise<any[]> {
    // Implementation would get project milestones
    return [];
  }

  private async getAllProjectContent(projectId: string): Promise<string> {
    // Implementation would aggregate all project content
    return '';
  }

  private async findProjectMentions(content: string, userId: string): Promise<any[]> {
    // Implementation would find mentions of other projects
    return [];
  }

  private async findSharedResources(projectId: string, userId: string): Promise<any[]> {
    // Implementation would find resources shared between projects
    return [];
  }

  private async findTopicallySimilarProjects(projectId: string, userId: string): Promise<any[]> {
    // Implementation would find topically similar projects
    return [];
  }

  private combineProjectRelationships(relationships: any[]): any[] {
    // Implementation would combine and deduplicate relationships
    return relationships;
  }

  private async getUserConversations(userId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId);
    return data || [];
  }

  private async getUserTasks(userId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('project_tasks')
      .select('*')
      .in('project_id',
        await this.supabase
          .from('projects')
          .select('id')
          .or(`owner_id.eq.${userId},collaborators.cs.{${userId}}`)
          .then(res => res.data?.map(p => p.id) || [])
      );
    return data || [];
  }

  private async getUserActivityData(type: string, userId: string, startDate: string, endDate: string): Promise<any[]> {
    // Implementation would get activity data for date range
    return [];
  }

  private calculateActivityScore(conversations: any[], tasks: any[]): number {
    // Implementation would calculate activity score
    return 0.5;
  }

  private identifyActivityTrends(conversations: any[], tasks: any[], projects: any[]): any {
    // Implementation would identify trends
    return {};
  }

  private generateActivityInsights(overview: any, projectActivity: any[], trends: any): string[] {
    // Implementation would generate insights
    return [];
  }

  private async getRecentActivity(userId: string, limit: number): Promise<any[]> {
    // Implementation would get recent activity
    return [];
  }

  private async generateDashboardInsights(userId: string): Promise<any[]> {
    // Implementation would generate dashboard insights
    return [];
  }
}