/**
 * Project Context Integration with Semantic Search
 * Extends the existing semantic search system with project-aware capabilities
 */

import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export interface ProjectAwareSearchRequest {
  query: string;
  userId?: string;
  projectId?: string;
  limit?: number;
  threshold?: number;
  contentTypes?: string[];
  tags?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  searchMode?: 'semantic' | 'hybrid' | 'keyword' | 'project_prioritized';
  projectBoost?: number; // Multiplier for project-related content (default: 1.3)
  crossProjectReferences?: boolean; // Include references from related projects
}

export interface ProjectAwareSearchResult {
  id: string;
  title: string;
  content: string;
  contentType: string;
  projectId?: string;
  projectName?: string;
  similarity: number;
  projectRelevance: number; // 0-1 score for project relevance
  metadata: Record<string, any>;
  chunks?: ChunkResult[];
  preview: string;
  created: string;
  projectContext?: {
    isDirectMatch: boolean;
    isRelatedProject: boolean;
    relationshipType?: string;
    relationshipStrength?: number;
  };
}

export interface ChunkResult {
  id: string;
  content: string;
  similarity: number;
  position: number;
  metadata: Record<string, any>;
}

export interface ProjectSearchInsights {
  query: string;
  projectContext: string | null;
  totalResults: number;
  projectDistribution: Record<string, number>;
  relatedProjects: Array<{
    projectId: string;
    projectName: string;
    relevanceScore: number;
    matchingResults: number;
  }>;
  contentTypeDistribution: Record<string, number>;
  searchQuality: {
    averageSimilarity: number;
    projectCoverage: number; // How well the search covers project content
    temporalDistribution: Record<string, number>; // Results by time period
  };
  suggestions: {
    relatedQueries: string[];
    projectRecommendations: string[];
    contentGaps: string[]; // Areas with little content
  };
}

export class ProjectSemanticIntegration {
  private supabase: SupabaseClient;
  private openai: OpenAI;

  constructor(supabase: SupabaseClient, openai: OpenAI) {
    this.supabase = supabase;
    this.openai = openai;
  }

  /**
   * Project-aware semantic search with enhanced context
   */
  async searchWithProjectContext(request: ProjectAwareSearchRequest): Promise<{
    results: ProjectAwareSearchResult[];
    insights: ProjectSearchInsights;
    totalResults: number;
  }> {
    const {
      query,
      userId = 'default',
      projectId,
      limit = 20,
      threshold = 0.3,
      contentTypes = [],
      tags = [],
      dateRange,
      searchMode = 'project_prioritized',
      projectBoost = 1.3,
      crossProjectReferences = true
    } = request;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Get base search results
    let baseResults = await this.performBaseSemanticSearch({
      queryEmbedding,
      userId,
      limit: limit * 2, // Get more results for processing
      threshold,
      contentTypes,
      tags,
      dateRange
    });

    // Apply project context enhancements
    const enhancedResults = await this.enhanceWithProjectContext(
      baseResults,
      projectId,
      queryEmbedding,
      projectBoost,
      crossProjectReferences,
      userId
    );

    // Sort and limit results
    const finalResults = enhancedResults
      .sort((a, b) => {
        // Primary sort by project relevance, secondary by similarity
        const aScore = a.projectRelevance * 0.4 + a.similarity * 0.6;
        const bScore = b.projectRelevance * 0.4 + b.similarity * 0.6;
        return bScore - aScore;
      })
      .slice(0, limit);

    // Generate insights
    const insights = await this.generateSearchInsights(
      query,
      projectId,
      finalResults,
      enhancedResults
    );

    return {
      results: finalResults,
      insights,
      totalResults: enhancedResults.length
    };
  }

  /**
   * Auto-index content with project context
   */
  async indexContentWithProjectContext(content: {
    id?: string;
    userId: string;
    projectId?: string;
    contentType: string;
    title: string;
    content: string;
    metadata?: Record<string, any>;
    tags?: string[];
  }): Promise<{ success: boolean; contentId: string }> {
    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(
        `${content.title || ''} ${content.content}`.trim()
      );

      // Extract project-specific tags and metadata
      const projectEnhancements = await this.extractProjectEnhancements(
        content.content,
        content.projectId,
        content.userId
      );

      // Merge tags and metadata
      const enhancedTags = [
        ...(content.tags || []),
        ...projectEnhancements.suggestedTags
      ];

      const enhancedMetadata = {
        ...content.metadata,
        ...projectEnhancements.metadata,
        indexed_at: new Date().toISOString(),
        project_context: projectEnhancements.projectContext
      };

      // Insert into semantic_content table
      const { data, error } = await this.supabase
        .from('semantic_content')
        .insert({
          id: content.id,
          user_id: content.userId,
          project_id: content.projectId,
          content_type: content.contentType,
          title: content.title,
          content: content.content,
          embedding,
          metadata: enhancedMetadata,
          tags: enhancedTags
        })
        .select()
        .single();

      if (error) throw error;

      // Create timeline entry if project-related
      if (content.projectId) {
        await this.createTimelineEntry(content.projectId, content.userId, {
          activity_type: 'file_uploaded',
          title: `Content Indexed: ${content.title}`,
          description: `New ${content.contentType} content added to project`,
          significance: 0.6,
          related_entity_type: 'file',
          related_entity_id: data.id
        });
      }

      return { success: true, contentId: data.id };

    } catch (error) {
      console.error('Content indexing error:', error);
      return { success: false, contentId: '' };
    }
  }

  /**
   * Find project-related content for a given query
   */
  async findProjectRelatedContent(
    query: string,
    projectId: string,
    userId: string,
    options: {
      includeRelatedProjects?: boolean;
      temporalWeight?: boolean; // Weight recent content higher
      limit?: number;
    } = {}
  ): Promise<{
    directContent: ProjectAwareSearchResult[];
    relatedContent: ProjectAwareSearchResult[];
    crossReferences: Array<{
      sourceProject: string;
      targetProject: string;
      referenceType: string;
      content: ProjectAwareSearchResult[];
    }>;
  }> {
    const { includeRelatedProjects = true, temporalWeight = true, limit = 50 } = options;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Search direct project content
    const directContent = await this.searchProjectContent(
      queryEmbedding,
      projectId,
      userId,
      limit
    );

    let relatedContent: ProjectAwareSearchResult[] = [];
    let crossReferences: any[] = [];

    if (includeRelatedProjects) {
      // Get related projects
      const relatedProjects = await this.getRelatedProjects(projectId, userId);

      // Search related project content
      for (const relatedProject of relatedProjects) {
        const content = await this.searchProjectContent(
          queryEmbedding,
          relatedProject.projectId,
          userId,
          Math.ceil(limit / relatedProjects.length)
        );

        // Apply relationship weighting
        const weightedContent = content.map(item => ({
          ...item,
          projectRelevance: item.projectRelevance * relatedProject.relationshipStrength,
          projectContext: {
            isDirectMatch: false,
            isRelatedProject: true,
            relationshipType: relatedProject.relationshipType,
            relationshipStrength: relatedProject.relationshipStrength
          }
        }));

        relatedContent.push(...weightedContent);

        // Track cross-references
        if (content.length > 0) {
          crossReferences.push({
            sourceProject: projectId,
            targetProject: relatedProject.projectId,
            referenceType: relatedProject.relationshipType,
            content: weightedContent
          });
        }
      }
    }

    // Apply temporal weighting if requested
    if (temporalWeight) {
      directContent.forEach(item => {
        const age = (Date.now() - new Date(item.created).getTime()) / (1000 * 60 * 60 * 24);
        const temporalFactor = Math.exp(-age / 30); // Decay over 30 days
        item.projectRelevance *= (0.7 + 0.3 * temporalFactor);
      });

      relatedContent.forEach(item => {
        const age = (Date.now() - new Date(item.created).getTime()) / (1000 * 60 * 60 * 24);
        const temporalFactor = Math.exp(-age / 30);
        item.projectRelevance *= (0.7 + 0.3 * temporalFactor);
      });
    }

    return {
      directContent: directContent.sort((a, b) => b.projectRelevance - a.projectRelevance),
      relatedContent: relatedContent.sort((a, b) => b.projectRelevance - a.projectRelevance),
      crossReferences
    };
  }

  /**
   * Suggest project assignment based on content similarity
   */
  async suggestProjectForContent(
    content: string,
    userId: string,
    options: {
      excludeProjects?: string[];
      minConfidence?: number;
      maxSuggestions?: number;
    } = {}
  ): Promise<Array<{
    projectId: string;
    projectName: string;
    confidence: number;
    reasoning: string[];
    similarContent: Array<{ title: string; similarity: number }>;
  }>> {
    const { excludeProjects = [], minConfidence = 0.3, maxSuggestions = 5 } = options;

    // Generate content embedding
    const contentEmbedding = await this.generateEmbedding(content);

    // Get project classification context
    const { data: projectContext, error } = await this.supabase
      .rpc('get_project_classification_context', {
        content_embedding: contentEmbedding,
        p_user_id: userId,
        match_count: maxSuggestions * 2
      });

    if (error || !projectContext) {
      return [];
    }

    // Filter and enhance results
    const suggestions = projectContext
      .filter((ctx: any) => !excludeProjects.includes(ctx.project_id))
      .filter((ctx: any) => ctx.avg_confidence >= minConfidence)
      .slice(0, maxSuggestions)
      .map((ctx: any) => ({
        projectId: ctx.project_id,
        projectName: ctx.project_name,
        confidence: ctx.avg_confidence,
        reasoning: this.generateProjectSuggestionReasoning(ctx),
        similarContent: [] // Would be populated with actual similar content
      }));

    return suggestions;
  }

  /**
   * Update project content embeddings when project changes
   */
  async updateProjectContentEmbeddings(
    projectId: string,
    changes: {
      name?: string;
      description?: string;
      tags?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<{ updated: number; errors: number }> {
    try {
      // Get all content for the project
      const { data: projectContent, error } = await this.supabase
        .from('semantic_content')
        .select('id, title, content, metadata, tags')
        .eq('project_id', projectId);

      if (error || !projectContent) {
        return { updated: 0, errors: 1 };
      }

      let updated = 0;
      let errors = 0;

      // Update each content item with enhanced project context
      for (const content of projectContent) {
        try {
          // Create enhanced content for re-embedding
          const enhancedContent = this.createEnhancedContentForEmbedding(
            content,
            changes
          );

          // Generate new embedding
          const newEmbedding = await this.generateEmbedding(enhancedContent);

          // Update metadata with project context
          const updatedMetadata = {
            ...content.metadata,
            project_context: {
              name: changes.name,
              description: changes.description,
              tags: changes.tags,
              updated_at: new Date().toISOString()
            }
          };

          // Update the content
          await this.supabase
            .from('semantic_content')
            .update({
              embedding: newEmbedding,
              metadata: updatedMetadata
            })
            .eq('id', content.id);

          updated++;

        } catch (contentError) {
          console.error(`Error updating content ${content.id}:`, contentError);
          errors++;
        }
      }

      return { updated, errors };

    } catch (error) {
      console.error('Project content update error:', error);
      return { updated: 0, errors: 1 };
    }
  }

  /**
   * Generate semantic project summary based on content
   */
  async generateProjectSummary(
    projectId: string,
    userId: string,
    options: {
      maxLength?: number;
      includeKeyTopics?: boolean;
      includeRecentActivity?: boolean;
    } = {}
  ): Promise<{
    summary: string;
    keyTopics: string[];
    recentActivity: string[];
    contentStats: {
      totalItems: number;
      contentTypes: Record<string, number>;
      timespan: { earliest: string; latest: string };
    };
  }> {
    const { maxLength = 500, includeKeyTopics = true, includeRecentActivity = true } = options;

    try {
      // Get project content
      const { data: projectContent, error } = await this.supabase
        .from('semantic_content')
        .select('title, content, content_type, created_at, metadata')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !projectContent || projectContent.length === 0) {
        return {
          summary: 'No content available for summary generation.',
          keyTopics: [],
          recentActivity: [],
          contentStats: {
            totalItems: 0,
            contentTypes: {},
            timespan: { earliest: '', latest: '' }
          }
        };
      }

      // Prepare content for AI summarization
      const contentForSummary = projectContent
        .slice(0, 20) // Limit for token efficiency
        .map(item => `${item.title}: ${item.content.substring(0, 200)}`)
        .join('\n\n');

      // Generate AI summary
      const summaryPrompt = `Analyze this project content and provide a concise summary (max ${maxLength} chars):

${contentForSummary}

Focus on:
1. Main project themes and objectives
2. Key activities and progress
3. Current state and direction

Summary:`;

      const summaryResponse = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: summaryPrompt }],
        max_tokens: Math.ceil(maxLength / 3),
        temperature: 0.3
      });

      const summary = summaryResponse.choices[0].message.content || 'Summary generation failed.';

      // Extract key topics
      let keyTopics: string[] = [];
      if (includeKeyTopics) {
        keyTopics = await this.extractKeyTopics(projectContent);
      }

      // Get recent activity
      let recentActivity: string[] = [];
      if (includeRecentActivity) {
        recentActivity = projectContent
          .slice(0, 5)
          .map(item => `${item.content_type}: ${item.title}`)
          .filter(Boolean);
      }

      // Calculate content stats
      const contentStats = {
        totalItems: projectContent.length,
        contentTypes: projectContent.reduce((acc, item) => {
          acc[item.content_type] = (acc[item.content_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        timespan: {
          earliest: projectContent[projectContent.length - 1]?.created_at || '',
          latest: projectContent[0]?.created_at || ''
        }
      };

      return {
        summary: summary.substring(0, maxLength),
        keyTopics,
        recentActivity,
        contentStats
      };

    } catch (error) {
      console.error('Project summary generation error:', error);
      return {
        summary: 'Error generating project summary.',
        keyTopics: [],
        recentActivity: [],
        contentStats: {
          totalItems: 0,
          contentTypes: {},
          timespan: { earliest: '', latest: '' }
        }
      };
    }
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

  private async performBaseSemanticSearch(params: {
    queryEmbedding: number[];
    userId: string;
    limit: number;
    threshold: number;
    contentTypes: string[];
    tags: string[];
    dateRange?: { start?: string; end?: string };
  }): Promise<any[]> {
    const { data, error } = await this.supabase
      .rpc('search_all_content', {
        query_embedding: params.queryEmbedding,
        similarity_threshold: params.threshold,
        match_count: params.limit,
        user_id_filter: params.userId
      });

    if (error) throw error;
    return data || [];
  }

  private async enhanceWithProjectContext(
    baseResults: any[],
    projectId: string | undefined,
    queryEmbedding: number[],
    projectBoost: number,
    crossProjectReferences: boolean,
    userId: string
  ): Promise<ProjectAwareSearchResult[]> {
    const enhancedResults: ProjectAwareSearchResult[] = [];

    // Get project information if projectId is provided
    let projectInfo = null;
    if (projectId) {
      const { data } = await this.supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
      projectInfo = data;
    }

    // Process each result
    for (const result of baseResults) {
      const enhanced: ProjectAwareSearchResult = {
        id: result.id,
        title: result.title || 'Untitled',
        content: result.content || '',
        contentType: result.content_type || 'unknown',
        projectId: result.project_id,
        projectName: result.project_name,
        similarity: result.similarity || 0,
        projectRelevance: 0.5, // Default relevance
        metadata: result.metadata || {},
        preview: this.generatePreview(result.content || ''),
        created: result.created_at || '',
        projectContext: {
          isDirectMatch: false,
          isRelatedProject: false
        }
      };

      // Calculate project relevance
      if (projectId && result.project_id === projectId) {
        // Direct project match
        enhanced.projectRelevance = 1.0;
        enhanced.similarity *= projectBoost;
        enhanced.projectContext = {
          isDirectMatch: true,
          isRelatedProject: false
        };
      } else if (projectId && result.project_id) {
        // Check if it's a related project
        const relationship = await this.getProjectRelationship(projectId, result.project_id);
        if (relationship) {
          enhanced.projectRelevance = 0.3 + (relationship.confidence * 0.4);
          enhanced.projectContext = {
            isDirectMatch: false,
            isRelatedProject: true,
            relationshipType: relationship.type,
            relationshipStrength: relationship.confidence
          };
        }
      }

      // Get project name if not already set
      if (result.project_id && !enhanced.projectName) {
        const { data: project } = await this.supabase
          .from('projects')
          .select('name')
          .eq('id', result.project_id)
          .single();
        enhanced.projectName = project?.name;
      }

      enhancedResults.push(enhanced);
    }

    return enhancedResults;
  }

  private async generateSearchInsights(
    query: string,
    projectId: string | undefined,
    results: ProjectAwareSearchResult[],
    allResults: ProjectAwareSearchResult[]
  ): Promise<ProjectSearchInsights> {
    // Calculate project distribution
    const projectDistribution = allResults.reduce((acc, result) => {
      const pid = result.projectId || 'unassigned';
      acc[pid] = (acc[pid] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate content type distribution
    const contentTypeDistribution = allResults.reduce((acc, result) => {
      acc[result.contentType] = (acc[result.contentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find related projects
    const relatedProjects = Object.entries(projectDistribution)
      .filter(([pid]) => pid !== 'unassigned' && pid !== projectId)
      .map(([pid, count]) => {
        const projectResults = allResults.filter(r => r.projectId === pid);
        const avgRelevance = projectResults.reduce((sum, r) => sum + r.projectRelevance, 0) / projectResults.length;

        return {
          projectId: pid,
          projectName: projectResults[0]?.projectName || pid,
          relevanceScore: avgRelevance,
          matchingResults: count
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);

    // Calculate search quality metrics
    const averageSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
    const projectCoverage = projectId ?
      results.filter(r => r.projectId === projectId).length / results.length : 0;

    // Generate suggestions (simplified for now)
    const suggestions = {
      relatedQueries: await this.generateRelatedQueries(query),
      projectRecommendations: relatedProjects.slice(0, 3).map(p => p.projectName),
      contentGaps: [] // Would analyze content gaps in actual implementation
    };

    return {
      query,
      projectContext: projectId || null,
      totalResults: allResults.length,
      projectDistribution,
      relatedProjects,
      contentTypeDistribution,
      searchQuality: {
        averageSimilarity,
        projectCoverage,
        temporalDistribution: {} // Would calculate time-based distribution
      },
      suggestions
    };
  }

  private async extractProjectEnhancements(
    content: string,
    projectId: string | undefined,
    userId: string
  ): Promise<{
    suggestedTags: string[];
    metadata: Record<string, any>;
    projectContext: Record<string, any>;
  }> {
    // Extract project-specific context
    let projectContext = {};
    let suggestedTags: string[] = [];

    if (projectId) {
      // Get project information
      const { data: project } = await this.supabase
        .from('projects')
        .select('name, description, tags, metadata')
        .eq('id', projectId)
        .single();

      if (project) {
        projectContext = {
          project_id: projectId,
          project_name: project.name,
          project_tags: project.tags || []
        };

        // Suggest tags based on project context and content
        suggestedTags = await this.suggestContentTags(content, project.tags || []);
      }
    }

    const metadata = {
      indexed_with_project_context: true,
      extraction_timestamp: new Date().toISOString(),
      content_length: content.length,
      content_hash: this.simpleHash(content)
    };

    return {
      suggestedTags,
      metadata,
      projectContext
    };
  }

  private async createTimelineEntry(
    projectId: string,
    userId: string,
    entry: {
      activity_type: string;
      title: string;
      description: string;
      significance: number;
      related_entity_type?: string;
      related_entity_id?: string;
    }
  ): Promise<void> {
    try {
      await this.supabase
        .from('project_activity_timeline')
        .insert({
          project_id: projectId,
          user_id: userId,
          ...entry
        });
    } catch (error) {
      // Non-critical error, don't throw
      console.error('Timeline entry creation error:', error);
    }
  }

  private async searchProjectContent(
    queryEmbedding: number[],
    projectId: string,
    userId: string,
    limit: number
  ): Promise<ProjectAwareSearchResult[]> {
    const { data, error } = await this.supabase
      .rpc('search_all_content', {
        query_embedding: queryEmbedding,
        similarity_threshold: 0.3,
        match_count: limit,
        user_id_filter: userId,
        project_id_filter: projectId
      });

    if (error || !data) return [];

    return data.map((item: any) => ({
      id: item.id,
      title: item.title || 'Untitled',
      content: item.content || '',
      contentType: item.content_type || 'unknown',
      projectId: item.project_id,
      projectName: item.project_name,
      similarity: item.similarity || 0,
      projectRelevance: 1.0, // Direct project content
      metadata: item.metadata || {},
      preview: this.generatePreview(item.content || ''),
      created: item.created_at || '',
      projectContext: {
        isDirectMatch: true,
        isRelatedProject: false
      }
    }));
  }

  private async getRelatedProjects(projectId: string, userId: string): Promise<Array<{
    projectId: string;
    relationshipType: string;
    relationshipStrength: number;
  }>> {
    const { data, error } = await this.supabase
      .from('project_cross_references')
      .select('target_project_id, reference_type, confidence')
      .eq('source_project_id', projectId);

    if (error || !data) return [];

    return data.map(ref => ({
      projectId: ref.target_project_id,
      relationshipType: ref.reference_type,
      relationshipStrength: ref.confidence
    }));
  }

  private async getProjectRelationship(
    sourceProjectId: string,
    targetProjectId: string
  ): Promise<{ type: string; confidence: number } | null> {
    const { data, error } = await this.supabase
      .from('project_cross_references')
      .select('reference_type, confidence')
      .eq('source_project_id', sourceProjectId)
      .eq('target_project_id', targetProjectId)
      .single();

    if (error || !data) return null;

    return {
      type: data.reference_type,
      confidence: data.confidence
    };
  }

  private generatePreview(content: string, maxLength: number = 200): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength).trim() + '...';
  }

  private generateProjectSuggestionReasoning(context: any): string[] {
    const reasoning = [];

    if (context.content_count > 5) {
      reasoning.push(`High content similarity (${context.content_count} matching items)`);
    }

    if (context.avg_confidence > 0.8) {
      reasoning.push('Strong historical classification accuracy');
    }

    if (context.common_tags?.length > 0) {
      reasoning.push(`Shared tags: ${context.common_tags.slice(0, 3).join(', ')}`);
    }

    if (context.similarity > 0.7) {
      reasoning.push('High semantic similarity to project content');
    }

    return reasoning.length > 0 ? reasoning : ['General content similarity'];
  }

  private createEnhancedContentForEmbedding(
    content: any,
    projectChanges: any
  ): string {
    const parts = [
      content.title || '',
      content.content || '',
      projectChanges.name || '',
      projectChanges.description || '',
      (projectChanges.tags || []).join(' ')
    ];

    return parts.filter(Boolean).join(' ').trim();
  }

  private async extractKeyTopics(content: any[]): Promise<string[]> {
    // Simplified topic extraction - in real implementation would use more sophisticated NLP
    const allContent = content.map(item => item.content).join(' ');
    const words = allContent.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(wordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private async generateRelatedQueries(query: string): Promise<string[]> {
    // Simplified related query generation
    const variations = [
      query.replace(/\w+$/, '').trim() + ' analysis',
      query + ' implementation',
      query + ' best practices',
      'how to ' + query,
      query + ' examples'
    ];

    return variations.filter(v => v !== query && v.trim().length > 0).slice(0, 3);
  }

  private async suggestContentTags(content: string, projectTags: string[]): Promise<string[]> {
    // Simple tag suggestion based on content analysis and project context
    const contentLower = content.toLowerCase();
    const suggestedTags: string[] = [];

    // Check for project tag relevance
    for (const tag of projectTags) {
      if (contentLower.includes(tag.toLowerCase())) {
        suggestedTags.push(tag);
      }
    }

    // Add common technical tags
    const technicalPatterns = {
      'api': /\bapi\b|\bendpoint\b|\brest\b/i,
      'database': /\bdatabase\b|\bsql\b|\bquery\b/i,
      'frontend': /\bfrontend\b|\bui\b|\bcomponent\b/i,
      'backend': /\bbackend\b|\bserver\b|\bservice\b/i,
      'bug': /\bbug\b|\berror\b|\bissue\b|\bfix\b/i,
      'feature': /\bfeature\b|\bimplement\b|\bnew\b/i
    };

    for (const [tag, pattern] of Object.entries(technicalPatterns)) {
      if (pattern.test(content) && !suggestedTags.includes(tag)) {
        suggestedTags.push(tag);
      }
    }

    return suggestedTags.slice(0, 5); // Limit to 5 suggestions
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}