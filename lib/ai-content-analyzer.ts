/**
 * AI-Powered Content Analyzer for Google Workspace Orchestrator
 * Provides intelligent content analysis, pattern recognition, and insights
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ContentAnalysisRequest {
  content: string;
  contentType: 'email' | 'document' | 'calendar' | 'mixed';
  analysisTypes: AnalysisType[];
  context?: AnalysisContext;
}

export interface AnalysisContext {
  userId: string;
  projectId?: string;
  timeframe?: string;
  relatedContent?: string[];
  userPreferences?: Record<string, any>;
}

export type AnalysisType =
  | 'sentiment'
  | 'urgency'
  | 'topics'
  | 'tasks'
  | 'relationships'
  | 'insights'
  | 'categorization'
  | 'summarization'
  | 'patterns'
  | 'priorities';

export interface ContentAnalysisResult {
  contentId: string;
  analysisTimestamp: string;
  results: {
    sentiment?: SentimentAnalysis;
    urgency?: UrgencyAnalysis;
    topics?: TopicAnalysis;
    tasks?: TaskAnalysis;
    relationships?: RelationshipAnalysis;
    insights?: InsightAnalysis;
    categorization?: CategorizationResult;
    summarization?: SummarizationResult;
    patterns?: PatternAnalysis;
    priorities?: PriorityAnalysis;
  };
  confidence: number;
  suggestions: ActionSuggestion[];
  metadata: Record<string, any>;
}

export interface SentimentAnalysis {
  overall: 'positive' | 'negative' | 'neutral';
  score: number; // -1 to 1
  confidence: number;
  emotions: EmotionScore[];
  keyPhrases: string[];
}

export interface EmotionScore {
  emotion: 'joy' | 'anger' | 'fear' | 'sadness' | 'surprise' | 'disgust' | 'trust' | 'anticipation';
  score: number;
}

export interface UrgencyAnalysis {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0 to 1
  indicators: UrgencyIndicator[];
  timeline: TimelineIndicator[];
  confidence: number;
}

export interface UrgencyIndicator {
  type: 'word' | 'phrase' | 'deadline' | 'sender' | 'context';
  value: string;
  weight: number;
}

export interface TimelineIndicator {
  type: 'deadline' | 'meeting' | 'milestone';
  date: string;
  description: string;
  confidence: number;
}

export interface TopicAnalysis {
  primaryTopics: Topic[];
  secondaryTopics: Topic[];
  entities: Entity[];
  keywords: Keyword[];
  themes: Theme[];
}

export interface Topic {
  name: string;
  relevance: number;
  category: string;
  relatedTerms: string[];
}

export interface Entity {
  text: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'money' | 'project' | 'product';
  confidence: number;
  mentions: number;
}

export interface Keyword {
  term: string;
  frequency: number;
  importance: number;
  context: string[];
}

export interface Theme {
  name: string;
  description: string;
  supportingEvidence: string[];
  strength: number;
}

export interface TaskAnalysis {
  extractedTasks: ExtractedTask[];
  actionItems: ActionItem[];
  deadlines: Deadline[];
  assignments: Assignment[];
  dependencies: TaskDependency[];
}

export interface ExtractedTask {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  estimatedEffort: string;
  confidence: number;
  sourceContext: string;
}

export interface ActionItem {
  action: string;
  assignee?: string;
  dueDate?: string;
  context: string;
  urgency: number;
}

export interface Deadline {
  description: string;
  date: string;
  confidence: number;
  relatedTask?: string;
}

export interface Assignment {
  task: string;
  assignee: string;
  role: string;
  confidence: number;
}

export interface TaskDependency {
  taskA: string;
  taskB: string;
  relationship: 'blocks' | 'enables' | 'related';
  confidence: number;
}

export interface RelationshipAnalysis {
  people: PersonRelationship[];
  organizations: OrganizationRelationship[];
  communicationPatterns: CommunicationPattern[];
  networkInsights: NetworkInsight[];
}

export interface PersonRelationship {
  name: string;
  email?: string;
  role?: string;
  relationship: 'colleague' | 'manager' | 'client' | 'vendor' | 'other';
  interaction_frequency: number;
  last_interaction: string;
  importance: number;
  projects: string[];
}

export interface OrganizationRelationship {
  name: string;
  type: 'client' | 'vendor' | 'partner' | 'competitor' | 'internal';
  interaction_frequency: number;
  projects: string[];
  key_contacts: PersonRelationship[];
}

export interface CommunicationPattern {
  pattern_type: 'frequency' | 'timing' | 'sentiment' | 'topics';
  description: string;
  data: Record<string, any>;
  insights: string[];
}

export interface NetworkInsight {
  type: 'influencer' | 'connector' | 'isolate' | 'cluster';
  description: string;
  people: string[];
  actionable: boolean;
  suggestion?: string;
}

export interface InsightAnalysis {
  keyInsights: Insight[];
  trends: Trend[];
  anomalies: Anomaly[];
  opportunities: Opportunity[];
  risks: Risk[];
}

export interface Insight {
  type: 'productivity' | 'collaboration' | 'efficiency' | 'workload' | 'communication';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  supporting_data: string[];
  actionable: boolean;
}

export interface Trend {
  name: string;
  direction: 'increasing' | 'decreasing' | 'stable' | 'cyclical';
  timeframe: string;
  confidence: number;
  impact: string;
  data_points: TrendDataPoint[];
}

export interface TrendDataPoint {
  date: string;
  value: number;
  context?: string;
}

export interface Anomaly {
  type: 'volume' | 'timing' | 'content' | 'pattern';
  description: string;
  severity: 'low' | 'medium' | 'high';
  detected_at: string;
  possible_causes: string[];
  recommended_actions: string[];
}

export interface Opportunity {
  title: string;
  description: string;
  potential_impact: string;
  effort_required: 'low' | 'medium' | 'high';
  confidence: number;
  related_insights: string[];
  next_steps: string[];
}

export interface Risk {
  title: string;
  description: string;
  probability: number;
  impact: 'low' | 'medium' | 'high';
  category: 'operational' | 'communication' | 'deadline' | 'quality';
  mitigation_strategies: string[];
}

export interface CategorizationResult {
  primary_category: string;
  secondary_categories: string[];
  confidence_scores: Record<string, number>;
  reasoning: string;
  suggested_actions: string[];
}

export interface SummarizationResult {
  executive_summary: string;
  key_points: string[];
  action_items: string[];
  important_details: string[];
  length_reduction: number;
  readability_score: number;
}

export interface PatternAnalysis {
  detected_patterns: DetectedPattern[];
  behavioral_insights: BehavioralInsight[];
  recommendations: PatternRecommendation[];
  predictive_insights: PredictiveInsight[];
}

export interface DetectedPattern {
  name: string;
  type: 'temporal' | 'behavioral' | 'content' | 'interaction';
  description: string;
  frequency: number;
  confidence: number;
  examples: string[];
}

export interface BehavioralInsight {
  behavior: string;
  frequency: string;
  context: string;
  implications: string[];
  optimization_potential: number;
}

export interface PatternRecommendation {
  pattern_id: string;
  recommendation: string;
  expected_benefit: string;
  implementation_effort: 'low' | 'medium' | 'high';
  priority: number;
}

export interface PredictiveInsight {
  prediction: string;
  confidence: number;
  timeframe: string;
  factors: string[];
  recommended_preparations: string[];
}

export interface PriorityAnalysis {
  priority_score: number;
  priority_level: 'low' | 'medium' | 'high' | 'critical';
  ranking_factors: RankingFactor[];
  comparative_priority: ComparativePriority;
  recommendations: PriorityRecommendation[];
}

export interface RankingFactor {
  factor: string;
  weight: number;
  score: number;
  reasoning: string;
}

export interface ComparativePriority {
  rank: number;
  total_items: number;
  percentile: number;
  comparison_context: string;
}

export interface PriorityRecommendation {
  action: string;
  rationale: string;
  urgency: number;
  impact: number;
}

export interface ActionSuggestion {
  action_type: 'file' | 'schedule' | 'task' | 'respond' | 'escalate' | 'archive' | 'follow_up';
  description: string;
  confidence: number;
  parameters: Record<string, any>;
  expected_outcome: string;
  automation_possible: boolean;
}

/**
 * AI Content Analyzer - Main class for performing intelligent content analysis
 */
export class AIContentAnalyzer {
  private userId: string;
  private modelConfig: {
    openaiApiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };

  constructor(userId: string) {
    this.userId = userId;
    this.modelConfig = {
      openaiApiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 2000
    };
  }

  /**
   * Perform comprehensive content analysis
   */
  async analyzeContent(request: ContentAnalysisRequest): Promise<ContentAnalysisResult> {
    const contentId = this.generateContentId(request.content);
    const results: ContentAnalysisResult['results'] = {};
    const suggestions: ActionSuggestion[] = [];

    // Perform requested analyses
    for (const analysisType of request.analysisTypes) {
      try {
        switch (analysisType) {
          case 'sentiment':
            results.sentiment = await this.analyzeSentiment(request.content);
            break;
          case 'urgency':
            results.urgency = await this.analyzeUrgency(request.content, request.context);
            break;
          case 'topics':
            results.topics = await this.analyzeTopics(request.content);
            break;
          case 'tasks':
            results.tasks = await this.analyzeTasks(request.content);
            break;
          case 'relationships':
            results.relationships = await this.analyzeRelationships(request.content, request.context);
            break;
          case 'insights':
            results.insights = await this.generateInsights(request.content, request.context);
            break;
          case 'categorization':
            results.categorization = await this.categorizeContent(request.content, request.contentType);
            break;
          case 'summarization':
            results.summarization = await this.summarizeContent(request.content);
            break;
          case 'patterns':
            results.patterns = await this.analyzePatterns(request.content, request.context);
            break;
          case 'priorities':
            results.priorities = await this.analyzePriorities(request.content, request.context);
            break;
        }
      } catch (error) {
        console.error(`Error in ${analysisType} analysis:`, error);
      }
    }

    // Generate action suggestions based on analysis results
    const actionSuggestions = await this.generateActionSuggestions(results, request.context);
    suggestions.push(...actionSuggestions);

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(results);

    // Store analysis results for learning
    await this.storeAnalysisResults(contentId, results, request.context);

    return {
      contentId,
      analysisTimestamp: new Date().toISOString(),
      results,
      confidence,
      suggestions,
      metadata: {
        analysisTypes: request.analysisTypes,
        contentType: request.contentType,
        contentLength: request.content.length,
        processingTime: Date.now() // Would be calculated properly
      }
    };
  }

  /**
   * Analyze sentiment of content
   */
  private async analyzeSentiment(content: string): Promise<SentimentAnalysis> {
    const prompt = `
    Analyze the sentiment of the following content. Provide:
    1. Overall sentiment (positive/negative/neutral)
    2. Sentiment score (-1 to 1)
    3. Confidence level (0 to 1)
    4. Detected emotions and their scores
    5. Key phrases that indicate sentiment

    Content: ${content.substring(0, 2000)}

    Respond in JSON format.
    `;

    const response = await this.callOpenAI(prompt);

    try {
      const parsed = JSON.parse(response);
      return {
        overall: parsed.overall || 'neutral',
        score: parsed.score || 0,
        confidence: parsed.confidence || 0.5,
        emotions: parsed.emotions || [],
        keyPhrases: parsed.keyPhrases || []
      };
    } catch (error) {
      // Fallback analysis
      return this.fallbackSentimentAnalysis(content);
    }
  }

  /**
   * Analyze urgency indicators in content
   */
  private async analyzeUrgency(content: string, context?: AnalysisContext): Promise<UrgencyAnalysis> {
    const prompt = `
    Analyze the urgency level of the following content. Consider:
    1. Urgency keywords and phrases
    2. Deadlines mentioned
    3. Context clues
    4. Timeline indicators

    Content: ${content.substring(0, 2000)}
    ${context ? `Context: ${JSON.stringify(context)}` : ''}

    Provide urgency level (low/medium/high/critical), score (0-1), indicators, and timeline information.
    Respond in JSON format.
    `;

    const response = await this.callOpenAI(prompt);

    try {
      const parsed = JSON.parse(response);
      return {
        level: parsed.level || 'medium',
        score: parsed.score || 0.5,
        indicators: parsed.indicators || [],
        timeline: parsed.timeline || [],
        confidence: parsed.confidence || 0.5
      };
    } catch (error) {
      return this.fallbackUrgencyAnalysis(content);
    }
  }

  /**
   * Extract topics and entities from content
   */
  private async analyzeTopics(content: string): Promise<TopicAnalysis> {
    const prompt = `
    Extract topics, entities, keywords, and themes from the following content:

    Content: ${content.substring(0, 2000)}

    Provide:
    1. Primary and secondary topics with relevance scores
    2. Named entities (people, organizations, dates, etc.)
    3. Important keywords with frequency and importance
    4. Overarching themes

    Respond in JSON format.
    `;

    const response = await this.callOpenAI(prompt);

    try {
      const parsed = JSON.parse(response);
      return {
        primaryTopics: parsed.primaryTopics || [],
        secondaryTopics: parsed.secondaryTopics || [],
        entities: parsed.entities || [],
        keywords: parsed.keywords || [],
        themes: parsed.themes || []
      };
    } catch (error) {
      return this.fallbackTopicAnalysis(content);
    }
  }

  /**
   * Extract actionable tasks and assignments
   */
  private async analyzeTasks(content: string): Promise<TaskAnalysis> {
    const prompt = `
    Extract actionable tasks, deadlines, and assignments from the following content:

    Content: ${content.substring(0, 2000)}

    Identify:
    1. Specific tasks that need to be completed
    2. Action items with assignees
    3. Deadlines and timeline information
    4. Task dependencies
    5. Priority levels

    Respond in JSON format.
    `;

    const response = await this.callOpenAI(prompt);

    try {
      const parsed = JSON.parse(response);
      return {
        extractedTasks: parsed.extractedTasks || [],
        actionItems: parsed.actionItems || [],
        deadlines: parsed.deadlines || [],
        assignments: parsed.assignments || [],
        dependencies: parsed.dependencies || []
      };
    } catch (error) {
      return this.fallbackTaskAnalysis(content);
    }
  }

  /**
   * Analyze relationships and communication patterns
   */
  private async analyzeRelationships(content: string, context?: AnalysisContext): Promise<RelationshipAnalysis> {
    // Implementation for relationship analysis
    return {
      people: [],
      organizations: [],
      communicationPatterns: [],
      networkInsights: []
    };
  }

  /**
   * Generate insights from content
   */
  private async generateInsights(content: string, context?: AnalysisContext): Promise<InsightAnalysis> {
    const prompt = `
    Generate insights from the following content. Consider:
    1. Key insights about productivity, efficiency, collaboration
    2. Notable trends or patterns
    3. Anomalies or unusual elements
    4. Opportunities for improvement
    5. Potential risks or concerns

    Content: ${content.substring(0, 2000)}
    ${context ? `Context: ${JSON.stringify(context)}` : ''}

    Respond in JSON format.
    `;

    const response = await this.callOpenAI(prompt);

    try {
      const parsed = JSON.parse(response);
      return {
        keyInsights: parsed.keyInsights || [],
        trends: parsed.trends || [],
        anomalies: parsed.anomalies || [],
        opportunities: parsed.opportunities || [],
        risks: parsed.risks || []
      };
    } catch (error) {
      return {
        keyInsights: [],
        trends: [],
        anomalies: [],
        opportunities: [],
        risks: []
      };
    }
  }

  /**
   * Categorize content intelligently
   */
  private async categorizeContent(content: string, contentType: string): Promise<CategorizationResult> {
    const categories = {
      email: ['urgent', 'meeting', 'task', 'information', 'newsletter', 'personal'],
      document: ['project', 'report', 'proposal', 'documentation', 'template', 'reference'],
      calendar: ['meeting', 'deadline', 'milestone', 'personal', 'travel', 'focus'],
      mixed: ['urgent', 'project', 'meeting', 'task', 'information', 'personal']
    };

    const availableCategories = categories[contentType as keyof typeof categories] || categories.mixed;

    const prompt = `
    Categorize the following content into one of these categories: ${availableCategories.join(', ')}

    Content: ${content.substring(0, 2000)}

    Provide:
    1. Primary category
    2. Secondary categories (if applicable)
    3. Confidence scores for each category
    4. Reasoning for the categorization
    5. Suggested actions based on the category

    Respond in JSON format.
    `;

    const response = await this.callOpenAI(prompt);

    try {
      const parsed = JSON.parse(response);
      return {
        primary_category: parsed.primary_category || 'information',
        secondary_categories: parsed.secondary_categories || [],
        confidence_scores: parsed.confidence_scores || {},
        reasoning: parsed.reasoning || '',
        suggested_actions: parsed.suggested_actions || []
      };
    } catch (error) {
      return this.fallbackCategorization(content, availableCategories);
    }
  }

  /**
   * Summarize content intelligently
   */
  private async summarizeContent(content: string): Promise<SummarizationResult> {
    const prompt = `
    Summarize the following content. Provide:
    1. Executive summary (2-3 sentences)
    2. Key points (bullet format)
    3. Action items (if any)
    4. Important details that shouldn't be missed
    5. Readability assessment

    Content: ${content}

    Respond in JSON format.
    `;

    const response = await this.callOpenAI(prompt);

    try {
      const parsed = JSON.parse(response);
      const originalLength = content.length;
      const summaryLength = (parsed.executive_summary || '').length;

      return {
        executive_summary: parsed.executive_summary || '',
        key_points: parsed.key_points || [],
        action_items: parsed.action_items || [],
        important_details: parsed.important_details || [],
        length_reduction: originalLength > 0 ? (originalLength - summaryLength) / originalLength : 0,
        readability_score: parsed.readability_score || 0.5
      };
    } catch (error) {
      return this.fallbackSummarization(content);
    }
  }

  /**
   * Analyze patterns in content and behavior
   */
  private async analyzePatterns(content: string, context?: AnalysisContext): Promise<PatternAnalysis> {
    // This would analyze patterns across multiple pieces of content
    // For now, returning empty structure
    return {
      detected_patterns: [],
      behavioral_insights: [],
      recommendations: [],
      predictive_insights: []
    };
  }

  /**
   * Analyze priority level of content
   */
  private async analyzePriorities(content: string, context?: AnalysisContext): Promise<PriorityAnalysis> {
    const prompt = `
    Analyze the priority level of the following content. Consider:
    1. Urgency indicators
    2. Importance to business/work
    3. Deadlines and timeline
    4. Stakeholder involvement
    5. Impact potential

    Content: ${content.substring(0, 2000)}
    ${context ? `Context: ${JSON.stringify(context)}` : ''}

    Provide priority score (0-1), level (low/medium/high/critical), ranking factors, and recommendations.
    Respond in JSON format.
    `;

    const response = await this.callOpenAI(prompt);

    try {
      const parsed = JSON.parse(response);
      return {
        priority_score: parsed.priority_score || 0.5,
        priority_level: parsed.priority_level || 'medium',
        ranking_factors: parsed.ranking_factors || [],
        comparative_priority: parsed.comparative_priority || {
          rank: 0,
          total_items: 0,
          percentile: 50,
          comparison_context: ''
        },
        recommendations: parsed.recommendations || []
      };
    } catch (error) {
      return this.fallbackPriorityAnalysis(content);
    }
  }

  /**
   * Generate actionable suggestions based on analysis results
   */
  private async generateActionSuggestions(results: ContentAnalysisResult['results'], context?: AnalysisContext): Promise<ActionSuggestion[]> {
    const suggestions: ActionSuggestion[] = [];

    // Generate suggestions based on different analysis results
    if (results.urgency?.level === 'high' || results.urgency?.level === 'critical') {
      suggestions.push({
        action_type: 'escalate',
        description: 'This content appears urgent and may require immediate attention',
        confidence: results.urgency.confidence,
        parameters: { urgency_level: results.urgency.level },
        expected_outcome: 'Faster response to urgent matter',
        automation_possible: true
      });
    }

    if (results.tasks && results.tasks.extractedTasks.length > 0) {
      suggestions.push({
        action_type: 'task',
        description: `Create ${results.tasks.extractedTasks.length} task(s) from this content`,
        confidence: 0.8,
        parameters: { tasks: results.tasks.extractedTasks },
        expected_outcome: 'Better task management and tracking',
        automation_possible: true
      });
    }

    if (results.categorization?.primary_category) {
      suggestions.push({
        action_type: 'file',
        description: `File this content under '${results.categorization.primary_category}' category`,
        confidence: results.categorization.confidence_scores[results.categorization.primary_category] || 0.7,
        parameters: { category: results.categorization.primary_category },
        expected_outcome: 'Better organization and findability',
        automation_possible: true
      });
    }

    return suggestions;
  }

  /**
   * Calculate overall confidence across all analyses
   */
  private calculateOverallConfidence(results: ContentAnalysisResult['results']): number {
    const confidenceValues: number[] = [];

    if (results.sentiment?.confidence) confidenceValues.push(results.sentiment.confidence);
    if (results.urgency?.confidence) confidenceValues.push(results.urgency.confidence);
    if (results.priorities?.ranking_factors) {
      const avgConfidence = results.priorities.ranking_factors.reduce((sum, factor) => sum + factor.score, 0) / results.priorities.ranking_factors.length;
      confidenceValues.push(avgConfidence);
    }

    if (confidenceValues.length === 0) return 0.5;

    return confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length;
  }

  /**
   * Store analysis results for learning and improvement
   */
  private async storeAnalysisResults(contentId: string, results: ContentAnalysisResult['results'], context?: AnalysisContext): Promise<void> {
    try {
      await supabase.from('ai_analysis_results').insert({
        content_id: contentId,
        user_id: this.userId,
        results: results,
        context: context,
        analyzed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error storing analysis results:', error);
    }
  }

  /**
   * Call OpenAI API for analysis
   */
  private async callOpenAI(prompt: string): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.modelConfig.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.modelConfig.model,
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant specialized in content analysis. Provide accurate, structured analysis in the requested JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: this.modelConfig.maxTokens,
          temperature: this.modelConfig.temperature
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      throw error;
    }
  }

  /**
   * Generate unique content ID
   */
  private generateContentId(content: string): string {
    const hash = this.simpleHash(content);
    const timestamp = Date.now();
    return `content_${hash}_${timestamp}`;
  }

  /**
   * Simple hash function for content ID generation
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Fallback methods for when AI analysis fails
  private fallbackSentimentAnalysis(content: string): SentimentAnalysis {
    const positiveWords = ['good', 'great', 'excellent', 'positive', 'happy', 'success'];
    const negativeWords = ['bad', 'terrible', 'negative', 'angry', 'failure', 'problem'];

    const text = content.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      if (text.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
      if (text.includes(word)) negativeCount++;
    });

    const score = (positiveCount - negativeCount) / Math.max(positiveCount + negativeCount, 1);
    const overall = score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral';

    return {
      overall,
      score: Math.max(-1, Math.min(1, score)),
      confidence: 0.6,
      emotions: [],
      keyPhrases: []
    };
  }

  private fallbackUrgencyAnalysis(content: string): UrgencyAnalysis {
    const urgentWords = ['urgent', 'asap', 'critical', 'emergency', 'immediate', 'deadline'];
    const text = content.toLowerCase();

    const urgentMatches = urgentWords.filter(word => text.includes(word));
    const score = Math.min(urgentMatches.length / 3, 1);

    let level: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (score > 0.7) level = 'critical';
    else if (score > 0.4) level = 'high';
    else if (score > 0.1) level = 'medium';

    return {
      level,
      score,
      indicators: urgentMatches.map(word => ({
        type: 'word' as const,
        value: word,
        weight: 1
      })),
      timeline: [],
      confidence: 0.6
    };
  }

  private fallbackTopicAnalysis(content: string): TopicAnalysis {
    const words = content.toLowerCase().split(/\s+/);
    const wordCount = new Map<string, number>();

    words.forEach(word => {
      if (word.length > 3) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });

    const keywords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term, frequency]) => ({
        term,
        frequency,
        importance: frequency / words.length,
        context: []
      }));

    return {
      primaryTopics: [],
      secondaryTopics: [],
      entities: [],
      keywords,
      themes: []
    };
  }

  private fallbackTaskAnalysis(content: string): TaskAnalysis {
    const actionWords = ['need', 'should', 'must', 'please', 'action', 'todo', 'task'];
    const text = content.toLowerCase();

    const tasks = actionWords
      .filter(word => text.includes(word))
      .map((word, index) => ({
        id: `task_${index}`,
        description: `Action item containing '${word}'`,
        priority: 'medium' as const,
        category: 'general',
        estimatedEffort: 'unknown',
        confidence: 0.5,
        sourceContext: content.substring(0, 200)
      }));

    return {
      extractedTasks: tasks,
      actionItems: [],
      deadlines: [],
      assignments: [],
      dependencies: []
    };
  }

  private fallbackCategorization(content: string, categories: string[]): CategorizationResult {
    const text = content.toLowerCase();
    const scores: Record<string, number> = {};

    categories.forEach(category => {
      scores[category] = text.includes(category) ? 0.7 : 0.1;
    });

    const primaryCategory = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])[0][0];

    return {
      primary_category: primaryCategory,
      secondary_categories: [],
      confidence_scores: scores,
      reasoning: 'Fallback categorization based on keyword matching',
      suggested_actions: []
    };
  }

  private fallbackSummarization(content: string): SummarizationResult {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const firstSentences = sentences.slice(0, 3).join('. ');

    return {
      executive_summary: firstSentences,
      key_points: sentences.slice(0, 5),
      action_items: [],
      important_details: [],
      length_reduction: 0.7,
      readability_score: 0.5
    };
  }

  private fallbackPriorityAnalysis(content: string): PriorityAnalysis {
    const urgentWords = ['urgent', 'critical', 'asap', 'emergency'];
    const text = content.toLowerCase();

    const urgentMatches = urgentWords.filter(word => text.includes(word));
    const score = Math.min(urgentMatches.length / 2, 1);

    let level: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (score > 0.7) level = 'critical';
    else if (score > 0.4) level = 'high';
    else if (score < 0.1) level = 'low';

    return {
      priority_score: score,
      priority_level: level,
      ranking_factors: [],
      comparative_priority: {
        rank: 0,
        total_items: 0,
        percentile: 50,
        comparison_context: ''
      },
      recommendations: []
    };
  }
}

export default AIContentAnalyzer;