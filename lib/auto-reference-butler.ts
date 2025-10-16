/**
 * Auto-Reference Butler - Automatic context retrieval system
 * This system automatically references relevant data from all sources without user prompts
 */

import { createClient } from '@supabase/supabase-js';
import { BackgroundIndexer } from './background-indexer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AutoReferenceContext {
  relevantKnowledge: any[];
  relevantMemories: any[];
  relevantFiles: any[];
  relevantEmails: any[];
  relevantCalendarEvents: any[];
  recentActivity: any[];
  projectContext?: any;
  confidence: number;
  sources: string[];
}

export class AutoReferenceButler {
  private static instance: AutoReferenceButler;

  static getInstance(): AutoReferenceButler {
    if (!AutoReferenceButler.instance) {
      AutoReferenceButler.instance = new AutoReferenceButler();
    }
    return AutoReferenceButler.instance;
  }

  /**
   * Automatically gather relevant context for any user message
   * This is the core digital butler function that pulls all relevant data
   */
  async gatherRelevantContext(
    userMessage: string,
    userId: string,
    conversationId?: string,
    projectId?: string
  ): Promise<AutoReferenceContext> {
    try {
      // Analyze message for key entities and intent
      const entities = this.extractEntities(userMessage);
      const intent = this.classifyIntent(userMessage);
      const keywords = this.extractKeywords(userMessage);

      // PERFORMANCE OPTIMIZATION: Skip expensive context gathering for simple general queries
      // Fast-path for questions that don't need user-specific context
      const needsContext = this.shouldGatherContext(userMessage, intent, entities, projectId);

      if (!needsContext) {
        console.log('[AutoReferenceButler] Fast-path: Skipping context gathering for simple query');
        return {
          relevantKnowledge: [],
          relevantMemories: [],
          relevantFiles: [],
          relevantEmails: [],
          relevantCalendarEvents: [],
          recentActivity: [],
          projectContext: null,
          confidence: 0,
          sources: []
        };
      }

      // Generate search embeddings (only if context is needed)
      // TIMEOUT: Add timeout to embedding generation
      const embeddingPromise = this.generateEmbedding(userMessage);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
      const embedding = await Promise.race([embeddingPromise, timeoutPromise]);

      // Gather context from all sources in parallel with timeout
      const contextPromises = [
        this.getRelevantKnowledge(userId, keywords, embedding, entities),
        this.getRelevantMemories(userId, keywords, embedding, conversationId),
        this.getRelevantFiles(userId, keywords, entities, projectId),
        this.getRelevantEmails(userId, keywords, entities, projectId),
        this.getRelevantCalendarEvents(userId, keywords, entities),
        this.getRecentActivity(userId, projectId),
        projectId ? this.getProjectContext(projectId) : Promise.resolve(null)
      ];

      // Add overall timeout for all context gathering (10 seconds max)
      const contextTimeout = new Promise<any[]>((resolve) => {
        setTimeout(() => {
          console.warn('[AutoReferenceButler] Context gathering timed out, using partial results');
          resolve([[], [], [], [], [], [], null]);
        }, 10000);
      });

      const [
        knowledgeContext,
        memoryContext,
        fileContext,
        emailContext,
        calendarContext,
        activityContext,
        projectContext
      ] = await Promise.race([
        Promise.all(contextPromises),
        contextTimeout
      ]);

      // Calculate confidence based on relevance and recency
      const confidence = this.calculateConfidence(
        knowledgeContext.length,
        memoryContext.length,
        fileContext.length,
        emailContext.length,
        calendarContext.length
      );

      return {
        relevantKnowledge: knowledgeContext,
        relevantMemories: memoryContext,
        relevantFiles: fileContext,
        relevantEmails: emailContext,
        relevantCalendarEvents: calendarContext,
        recentActivity: activityContext,
        projectContext,
        confidence,
        sources: this.identifySources(knowledgeContext, memoryContext, fileContext, emailContext, calendarContext)
      };

    } catch (error) {
      console.error('Auto-reference butler error:', error);
      return {
        relevantKnowledge: [],
        relevantMemories: [],
        relevantFiles: [],
        relevantEmails: [],
        relevantCalendarEvents: [],
        recentActivity: [],
        confidence: 0,
        sources: []
      };
    }
  }

  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.substring(0, 8000),
          dimensions: 1536
        })
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Embedding error:', error);
      return null;
    }
  }

  private extractEntities(message: string): string[] {
    const entities = [];

    // Extract dates
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      /\b\d{4}-\d{2}-\d{2}\b/g,
      /\b(today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi
    ];
    datePatterns.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches) entities.push(...matches);
    });

    // Extract emails
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = message.match(emailPattern);
    if (emails) entities.push(...emails);

    // Extract file extensions/types
    const filePattern = /\b\w+\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|png|gif|mp4|avi|zip|csv)\b/gi;
    const files = message.match(filePattern);
    if (files) entities.push(...files);

    // Extract project-like terms
    const projectPattern = /\b(project|task|meeting|deadline|client|budget|proposal|contract|invoice)\b/gi;
    const projects = message.match(projectPattern);
    if (projects) entities.push(...projects);

    return entities.filter(Boolean);
  }

  private classifyIntent(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('remind') || lowerMessage.includes('remember') || lowerMessage.includes('recall')) {
      return 'recall';
    }
    if (lowerMessage.includes('schedule') || lowerMessage.includes('meeting') || lowerMessage.includes('calendar')) {
      return 'scheduling';
    }
    if (lowerMessage.includes('email') || lowerMessage.includes('send') || lowerMessage.includes('contact')) {
      return 'communication';
    }
    if (lowerMessage.includes('file') || lowerMessage.includes('document') || lowerMessage.includes('drive')) {
      return 'files';
    }
    if (lowerMessage.includes('project') || lowerMessage.includes('task') || lowerMessage.includes('work')) {
      return 'project_management';
    }
    if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('look')) {
      return 'search';
    }

    return 'general';
  }

  /**
   * Determine if context gathering is needed for this query
   * Returns false for simple general knowledge questions to enable fast-path
   */
  private shouldGatherContext(
    message: string,
    intent: string,
    entities: string[],
    projectId?: string
  ): boolean {
    // Always gather context if user explicitly specifies a project
    if (projectId) {
      return true;
    }

    // Always gather context for specific intents that need user data
    const contextRequiredIntents = ['recall', 'scheduling', 'communication', 'files', 'project_management', 'search'];
    if (contextRequiredIntents.includes(intent)) {
      return true;
    }

    // Always gather context if entities detected (dates, emails, files, projects)
    if (entities.length > 0) {
      return true;
    }

    const lowerMessage = message.toLowerCase();

    // Keywords that indicate user wants personal/contextual data
    const contextKeywords = [
      'my ', 'our ', 'we ', 'i ', 'me ',
      'last ', 'recent', 'yesterday', 'today', 'tomorrow',
      'previous', 'earlier', 'ago',
      'show me', 'find my', 'where is', 'when did',
      'did i', 'have i', 'what was'
    ];

    if (contextKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return true;
    }

    // Skip context for general knowledge questions
    const generalQuestions = [
      'what is', 'what are', 'who is', 'who are', 'where is',
      'how does', 'how do', 'how can', 'how to',
      'why does', 'why do', 'why is',
      'tell me about', 'explain', 'describe',
      'define', 'meaning of'
    ];

    if (generalQuestions.some(pattern => lowerMessage.includes(pattern))) {
      console.log('[AutoReferenceButler] Detected general knowledge question, using fast-path');
      return false;
    }

    // Default to gathering context if uncertain
    return true;
  }

  private extractKeywords(message: string): string[] {
    // Remove common stop words and extract meaningful keywords
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'cant', 'cannot', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);

    return message
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit to top 10 keywords
  }

  private async getRelevantKnowledge(
    userId: string,
    keywords: string[],
    embedding: number[] | null,
    entities: string[]
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('knowledge_base')
        .select('*')
        .eq('user_id', userId);

      // Add keyword search
      if (keywords.length > 0) {
        const keywordConditions = keywords.map(keyword =>
          `title.ilike.%${keyword}%,content.ilike.%${keyword}%`
        ).join(',');
        query = query.or(keywordConditions);
      }

      const { data } = await query
        .order('importance', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3); // Reduced from 5 to 3 for faster queries

      return data || [];
    } catch (error) {
      console.error('Error getting relevant knowledge:', error);
      return [];
    }
  }

  private async getRelevantMemories(
    userId: string,
    keywords: string[],
    embedding: number[] | null,
    conversationId?: string
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('memory_chunks')
        .select('*')
        .eq('user_id', userId);

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }

      // Add keyword search
      if (keywords.length > 0) {
        const keywordConditions = keywords.map(keyword =>
          `content.ilike.%${keyword}%`
        ).join(',');
        query = query.or(keywordConditions);
      }

      const { data } = await query
        .order('importance', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(2); // Reduced from 3 to 2 for faster queries

      return data || [];
    } catch (error) {
      console.error('Error getting relevant memories:', error);
      return [];
    }
  }

  private async getRelevantFiles(
    userId: string,
    keywords: string[],
    entities: string[],
    projectId?: string
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('knowledge_base')
        .select('*')
        .eq('user_id', userId)
        .eq('source_type', 'drive');

      if (projectId) {
        query = query.contains('tags', [projectId]);
      }

      // Add keyword search
      if (keywords.length > 0) {
        const keywordConditions = keywords.map(keyword =>
          `title.ilike.%${keyword}%,content.ilike.%${keyword}%`
        ).join(',');
        query = query.or(keywordConditions);
      }

      const { data } = await query
        .order('created_at', { ascending: false })
        .limit(2); // Reduced from 3 to 2 for faster queries

      return data || [];
    } catch (error) {
      console.error('Error getting relevant files:', error);
      return [];
    }
  }

  private async getRelevantEmails(
    userId: string,
    keywords: string[],
    entities: string[],
    projectId?: string
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('knowledge_base')
        .select('*')
        .eq('user_id', userId)
        .eq('source_type', 'email');

      if (projectId) {
        query = query.contains('tags', [projectId]);
      }

      // Add keyword search
      if (keywords.length > 0) {
        const keywordConditions = keywords.map(keyword =>
          `title.ilike.%${keyword}%,content.ilike.%${keyword}%`
        ).join(',');
        query = query.or(keywordConditions);
      }

      const { data } = await query
        .order('created_at', { ascending: false })
        .limit(2); // Reduced from 3 to 2 for faster queries

      return data || [];
    } catch (error) {
      console.error('Error getting relevant emails:', error);
      return [];
    }
  }

  private async getRelevantCalendarEvents(
    userId: string,
    keywords: string[],
    entities: string[]
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('knowledge_base')
        .select('*')
        .eq('user_id', userId)
        .eq('source_type', 'calendar')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Add keyword search
      if (keywords.length > 0) {
        const keywordConditions = keywords.map(keyword =>
          `title.ilike.%${keyword}%,content.ilike.%${keyword}%`
        ).join(',');
        query = query.or(keywordConditions);
      }

      const { data } = await query
        .order('created_at', { ascending: false })
        .limit(2);

      return data || [];
    } catch (error) {
      console.error('Error getting relevant calendar events:', error);
      return [];
    }
  }

  private async getRecentActivity(userId: string, projectId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data } = await query
        .order('created_at', { ascending: false })
        .limit(3); // Reduced from 5 to 3 for faster queries

      return data || [];
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  private async getProjectContext(projectId: string): Promise<any> {
    try {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      return data;
    } catch (error) {
      console.error('Error getting project context:', error);
      return null;
    }
  }

  private calculateConfidence(
    knowledgeCount: number,
    memoryCount: number,
    fileCount: number,
    emailCount: number,
    calendarCount: number
  ): number {
    const totalSources = knowledgeCount + memoryCount + fileCount + emailCount + calendarCount;
    const maxSources = 16; // Max expected sources

    return Math.min(totalSources / maxSources, 1.0) * 100;
  }

  private identifySources(
    knowledge: any[],
    memories: any[],
    files: any[],
    emails: any[],
    calendar: any[]
  ): string[] {
    const sources = [];

    if (knowledge.length > 0) sources.push('knowledge_base');
    if (memories.length > 0) sources.push('memory_chunks');
    if (files.length > 0) sources.push('google_drive');
    if (emails.length > 0) sources.push('gmail');
    if (calendar.length > 0) sources.push('calendar');

    return sources;
  }

  /**
   * Format context for AI consumption
   */
  formatContextForAI(context: AutoReferenceContext): string {
    let formatted = '';

    if (context.projectContext) {
      formatted += `📁 **Current Project**: ${context.projectContext.name}\n`;
      formatted += `${context.projectContext.description || ''}\n\n`;
    }

    if (context.relevantKnowledge.length > 0) {
      formatted += `🧠 **Relevant Knowledge**:\n`;
      context.relevantKnowledge.forEach(item => {
        formatted += `- ${item.title}: ${item.content.substring(0, 100)}...\n`;
      });
      formatted += '\n';
    }

    if (context.relevantFiles.length > 0) {
      formatted += `📄 **Relevant Files**:\n`;
      context.relevantFiles.forEach(file => {
        formatted += `- ${file.title} (${file.metadata?.mimeType || 'unknown'})\n`;
      });
      formatted += '\n';
    }

    if (context.relevantEmails.length > 0) {
      formatted += `📧 **Relevant Emails**:\n`;
      context.relevantEmails.forEach(email => {
        formatted += `- ${email.title}: ${email.content.substring(0, 100)}...\n`;
      });
      formatted += '\n';
    }

    if (context.relevantCalendarEvents.length > 0) {
      formatted += `📅 **Upcoming/Recent Events**:\n`;
      context.relevantCalendarEvents.forEach(event => {
        formatted += `- ${event.title} (${event.metadata?.start_time || 'unknown time'})\n`;
      });
      formatted += '\n';
    }

    if (context.recentActivity.length > 0) {
      formatted += `⚡ **Recent Activity**:\n`;
      context.recentActivity.slice(0, 3).forEach(activity => {
        formatted += `- ${activity.role}: ${activity.content.substring(0, 80)}...\n`;
      });
      formatted += '\n';
    }

    formatted += `🎯 **Context Confidence**: ${Math.round(context.confidence)}%\n`;
    formatted += `📊 **Sources**: ${context.sources.join(', ')}\n`;

    return formatted;
  }
}