/**
 * Message Reference System - Granular tracking and instant recall
 * Enables referencing specific messages, conversations, and cross-project context
 */

import { createClient } from '@supabase/supabase-js';
import { ConversationLogger } from './conversation-logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface MessageReference {
  id: string;
  conversation_id: string;
  project_id?: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata: {
    tokens?: number;
    model?: string;
    references?: string[]; // IDs of referenced messages
    tags?: string[];
    intent?: string;
    complexity?: number;
    code_blocks?: CodeBlock[];
    files_mentioned?: string[];
    decisions?: Decision[];
    action_items?: ActionItem[];
    search_vector?: number[];
  };
  context: {
    previous_message_id?: string;
    next_message_id?: string;
    thread_position: number;
    session_id: string;
    platform: string;
  };
}

export interface CodeBlock {
  language: string;
  content: string;
  filename?: string;
  line_start?: number;
  line_end?: number;
  purpose?: string;
}

export interface Decision {
  id: string;
  description: string;
  options_considered: string[];
  choice_made: string;
  reasoning: string;
  timestamp: string;
}

export interface ActionItem {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: string;
  due_date?: string;
  completed_at?: string;
  related_messages: string[];
}

export class MessageReferenceSystem {
  private static instance: MessageReferenceSystem;
  private messageCache: Map<string, MessageReference> = new Map();
  private referenceIndex: Map<string, Set<string>> = new Map(); // keyword -> message IDs
  
  private constructor() {}
  
  public static getInstance(): MessageReferenceSystem {
    if (!MessageReferenceSystem.instance) {
      MessageReferenceSystem.instance = new MessageReferenceSystem();
    }
    return MessageReferenceSystem.instance;
  }
  
  /**
   * Store a message with full reference tracking
   */
  async storeMessage(
    conversationId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Partial<MessageReference['metadata']>,
    projectId?: string
  ): Promise<MessageReference> {
    try {
      // Extract structured data from content
      const extractedData = await this.extractStructuredData(content);
      
      // Get thread position
      const threadPosition = await this.getThreadPosition(conversationId);
      
      // Generate unique message ID
      const messageId = this.generateMessageId(conversationId, threadPosition);
      
      // Get previous message ID for context chain
      const previousMessageId = await this.getPreviousMessageId(conversationId);
      
      // Create message reference
      const messageRef: MessageReference = {
        id: messageId,
        conversation_id: conversationId,
        project_id: projectId,
        user_id: userId,
        role,
        content,
        timestamp: new Date().toISOString(),
        metadata: {
          ...metadata,
          ...extractedData,
          tags: await this.generateTags(content),
          intent: this.analyzeIntent(content),
          complexity: this.calculateComplexity(content),
          search_vector: await this.generateSearchVector(content)
        },
        context: {
          previous_message_id: previousMessageId,
          thread_position: threadPosition,
          session_id: this.getSessionId(),
          platform: 'web'
        }
      };
      
      // Store in database
      const { data, error } = await supabase
        .from('message_references')
        .insert(messageRef)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update cache and indices
      this.messageCache.set(messageId, data);
      await this.updateReferenceIndex(messageId, content);
      
      // Update previous message's next_message_id
      if (previousMessageId) {
        await this.updateNextMessageId(previousMessageId, messageId);
      }
      
      // Log the message storage
      await ConversationLogger.logSystemEvent('MESSAGE_STORED', {
        message_id: messageId,
        conversation_id: conversationId,
        role,
        content_length: content.length,
        has_code: (extractedData.code_blocks?.length ?? 0) > 0,
        has_decisions: (extractedData.decisions?.length ?? 0) > 0,
        has_action_items: (extractedData.action_items?.length ?? 0) > 0
      });
      
      return data;
      
    } catch (error) {
      console.error('Failed to store message reference:', error);
      throw error;
    }
  }
  
  /**
   * Search messages across all conversations
   */
  async searchMessages(
    query: string,
    filters?: {
      userId?: string;
      projectId?: string;
      conversationId?: string;
      role?: 'user' | 'assistant';
      startDate?: string;
      endDate?: string;
      hasCode?: boolean;
      hasDecisions?: boolean;
      limit?: number;
    }
  ): Promise<MessageReference[]> {
    try {
      let queryBuilder = supabase
        .from('message_references')
        .select('*');
      
      // Apply filters
      if (filters?.userId) {
        queryBuilder = queryBuilder.eq('user_id', filters.userId);
      }
      if (filters?.projectId) {
        queryBuilder = queryBuilder.eq('project_id', filters.projectId);
      }
      if (filters?.conversationId) {
        queryBuilder = queryBuilder.eq('conversation_id', filters.conversationId);
      }
      if (filters?.role) {
        queryBuilder = queryBuilder.eq('role', filters.role);
      }
      if (filters?.startDate) {
        queryBuilder = queryBuilder.gte('timestamp', filters.startDate);
      }
      if (filters?.endDate) {
        queryBuilder = queryBuilder.lte('timestamp', filters.endDate);
      }
      
      // Text search
      if (query) {
        queryBuilder = queryBuilder.textSearch('content', query);
      }
      
      // Limit results
      queryBuilder = queryBuilder.limit(filters?.limit || 50);
      
      const { data, error } = await queryBuilder;
      
      if (error) throw error;
      
      // Sort by relevance if we have a query
      if (query && data) {
        return this.sortByRelevance(data, query);
      }
      
      return data || [];
      
    } catch (error) {
      console.error('Message search failed:', error);
      return [];
    }
  }
  
  /**
   * Get a specific message by ID with full context
   */
  async getMessage(messageId: string, includeContext: boolean = true): Promise<MessageReference | null> {
    try {
      // Check cache first
      if (this.messageCache.has(messageId)) {
        return this.messageCache.get(messageId)!;
      }
      
      const { data, error } = await supabase
        .from('message_references')
        .select('*')
        .eq('id', messageId)
        .single();
      
      if (error) throw error;
      
      if (data && includeContext) {
        // Load surrounding messages for context
        const context = await this.getMessageContext(messageId);
        data.context = { ...data.context, ...context };
      }
      
      // Update cache
      if (data) {
        this.messageCache.set(messageId, data);
      }
      
      return data;
      
    } catch (error) {
      console.error('Failed to get message:', error);
      return null;
    }
  }
  
  /**
   * Get messages in a conversation thread
   */
  async getConversationThread(
    conversationId: string,
    options?: {
      startPosition?: number;
      endPosition?: number;
      limit?: number;
    }
  ): Promise<MessageReference[]> {
    try {
      let queryBuilder = supabase
        .from('message_references')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('context->thread_position', { ascending: true });
      
      if (options?.startPosition !== undefined) {
        queryBuilder = queryBuilder.gte('context->thread_position', options.startPosition);
      }
      if (options?.endPosition !== undefined) {
        queryBuilder = queryBuilder.lte('context->thread_position', options.endPosition);
      }
      if (options?.limit) {
        queryBuilder = queryBuilder.limit(options.limit);
      }
      
      const { data, error } = await queryBuilder;
      
      if (error) throw error;
      
      return data || [];
      
    } catch (error) {
      console.error('Failed to get conversation thread:', error);
      return [];
    }
  }
  
  /**
   * Find messages that reference specific code files
   */
  async findMessagesByFile(filename: string): Promise<MessageReference[]> {
    try {
      const { data, error } = await supabase
        .from('message_references')
        .select('*')
        .contains('metadata->files_mentioned', [filename]);
      
      if (error) throw error;
      
      return data || [];
      
    } catch (error) {
      console.error('Failed to find messages by file:', error);
      return [];
    }
  }
  
  /**
   * Get all decisions made in a project
   */
  async getProjectDecisions(projectId: string): Promise<Decision[]> {
    try {
      const { data, error } = await supabase
        .from('message_references')
        .select('metadata->decisions')
        .eq('project_id', projectId)
        .not('metadata->decisions', 'is', null);
      
      if (error) throw error;
      
      const decisions: Decision[] = [];
      data?.forEach(row => {
        if (row.decisions && Array.isArray(row.decisions)) {
          const validDecisions = row.decisions.filter((d: any) => d !== null && typeof d === 'object') as Decision[];
          decisions.push(...validDecisions);
        }
      });
      
      return decisions;
      
    } catch (error) {
      console.error('Failed to get project decisions:', error);
      return [];
    }
  }
  
  /**
   * Get action items across messages
   */
  async getActionItems(
    filters?: {
      status?: ActionItem['status'];
      userId?: string;
      projectId?: string;
    }
  ): Promise<ActionItem[]> {
    try {
      let queryBuilder = supabase
        .from('message_references')
        .select('metadata->action_items, user_id, project_id');
      
      if (filters?.userId) {
        queryBuilder = queryBuilder.eq('user_id', filters.userId);
      }
      if (filters?.projectId) {
        queryBuilder = queryBuilder.eq('project_id', filters.projectId);
      }
      
      const { data, error } = await queryBuilder;
      
      if (error) throw error;
      
      const actionItems: ActionItem[] = [];
      data?.forEach(row => {
        if (row.action_items && Array.isArray(row.action_items)) {
          let items = row.action_items.filter((item: any) => item !== null && typeof item === 'object') as ActionItem[];
          if (filters?.status) {
            items = items.filter(item => item.status === filters.status);
          }
          actionItems.push(...items);
        }
      });
      
      return actionItems;
      
    } catch (error) {
      console.error('Failed to get action items:', error);
      return [];
    }
  }
  
  /**
   * Create a reference link to a specific message
   */
  createMessageReference(messageId: string): string {
    return `@msg:${messageId}`;
  }
  
  /**
   * Parse message references from content
   */
  parseMessageReferences(content: string): string[] {
    const pattern = /@msg:([a-zA-Z0-9_-]+)/g;
    const matches = content.matchAll(pattern);
    return Array.from(matches, m => m[1]);
  }
  
  // Private helper methods
  
  private async extractStructuredData(content: string): Promise<Partial<MessageReference['metadata']>> {
    const metadata: Partial<MessageReference['metadata']> = {};
    
    // Extract code blocks
    const codeBlocks = this.extractCodeBlocks(content);
    if (codeBlocks.length > 0) {
      metadata.code_blocks = codeBlocks;
    }
    
    // Extract file mentions
    const files = this.extractFileMentions(content);
    if (files.length > 0) {
      metadata.files_mentioned = files;
    }
    
    // Extract decisions
    const decisions = this.extractDecisions(content);
    if (decisions.length > 0) {
      metadata.decisions = decisions;
    }
    
    // Extract action items
    const actionItems = this.extractActionItems(content);
    if (actionItems.length > 0) {
      metadata.action_items = actionItems;
    }
    
    // Extract message references
    const references = this.parseMessageReferences(content);
    if (references.length > 0) {
      metadata.references = references;
    }
    
    return metadata;
  }
  
  private extractCodeBlocks(content: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const pattern = /```(\w+)?\n([\s\S]*?)```/g;
    const matches = content.matchAll(pattern);
    
    for (const match of matches) {
      const language = match[1] || 'plaintext';
      const code = match[2];
      
      // Try to extract filename from comments
      const filenameMatch = code.match(/(?:\/\/|#|--)\s*(?:file|filename):\s*(.+)/i);
      
      blocks.push({
        language,
        content: code,
        filename: filenameMatch?.[1]?.trim(),
        purpose: this.inferCodePurpose(code, language)
      });
    }
    
    return blocks;
  }
  
  private extractFileMentions(content: string): string[] {
    const patterns = [
      /(?:file|create|update|modify|edit)\s+[`"']([^`"']+)[`"']/gi,
      /([a-zA-Z0-9_-]+\.\w{1,4})/g, // Common file extensions
      /(?:in|from|to)\s+([\/\w.-]+\/[\/\w.-]+)/g // Path-like patterns
    ];
    
    const files = new Set<string>();
    patterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && !match[1].startsWith('http')) {
          files.add(match[1]);
        }
      }
    });
    
    return Array.from(files);
  }
  
  private extractDecisions(content: string): Decision[] {
    const decisions: Decision[] = [];
    
    // Look for decision patterns
    const patterns = [
      /(?:decided?|decision|chose|selected|going with|will use)\s+(.+?)(?:\.|;|\n|$)/gi,
      /(?:option|choice|alternative)\s+\d+[:]\s*(.+?)(?:\.|;|\n|$)/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        decisions.push({
          id: this.generateId('decision'),
          description: match[1].trim(),
          options_considered: [],
          choice_made: match[1].trim(),
          reasoning: '',
          timestamp: new Date().toISOString()
        });
      }
    });
    
    return decisions;
  }
  
  private extractActionItems(content: string): ActionItem[] {
    const items: ActionItem[] = [];
    
    // Look for action item patterns
    const patterns = [
      /(?:TODO|FIXME|ACTION|TASK):\s*(.+?)(?:\n|$)/gi,
      /(?:need to|should|must|will)\s+(.+?)(?:\.|;|\n|$)/gi,
      /\[\s*\]\s*(.+?)(?:\n|$)/g // Checkbox pattern
    ];
    
    patterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        items.push({
          id: this.generateId('action'),
          description: match[1].trim(),
          status: 'pending',
          related_messages: []
        });
      }
    });
    
    return items;
  }
  
  private inferCodePurpose(code: string, language: string): string {
    const lowerCode = code.toLowerCase();
    
    if (lowerCode.includes('test') || lowerCode.includes('spec')) return 'test';
    if (lowerCode.includes('config') || lowerCode.includes('setup')) return 'configuration';
    if (lowerCode.includes('interface') || lowerCode.includes('type')) return 'type_definition';
    if (lowerCode.includes('class')) return 'class_definition';
    if (lowerCode.includes('function') || lowerCode.includes('const')) return 'function_definition';
    if (lowerCode.includes('import') || lowerCode.includes('require')) return 'module_import';
    if (language === 'sql') return 'database_query';
    if (language === 'bash' || language === 'powershell') return 'script';
    
    return 'implementation';
  }
  
  private async generateTags(content: string): Promise<string[]> {
    const tags = new Set<string>();
    
    // Technical tags
    if (/\b(react|vue|angular|svelte)\b/i.test(content)) tags.add('frontend');
    if (/\b(node|express|fastify|nest)\b/i.test(content)) tags.add('backend');
    if (/\b(database|sql|postgres|mongo)\b/i.test(content)) tags.add('database');
    if (/\b(deploy|vercel|netlify|aws)\b/i.test(content)) tags.add('deployment');
    if (/\b(test|jest|mocha|cypress)\b/i.test(content)) tags.add('testing');
    if (/\b(typescript|javascript|python|java)\b/i.test(content)) tags.add('programming');
    
    // Project tags
    if (/\b(bug|error|fix|issue)\b/i.test(content)) tags.add('bugfix');
    if (/\b(feature|implement|create|build)\b/i.test(content)) tags.add('feature');
    if (/\b(refactor|optimize|improve)\b/i.test(content)) tags.add('refactoring');
    if (/\b(document|readme|comment)\b/i.test(content)) tags.add('documentation');
    
    return Array.from(tags);
  }
  
  private analyzeIntent(content: string): string {
    const lower = content.toLowerCase();
    
    if (/\b(create|build|make|generate|implement)\b/.test(lower)) return 'creation';
    if (/\b(fix|debug|error|issue|problem|bug)\b/.test(lower)) return 'troubleshooting';
    if (/\b(deploy|launch|publish|release|ship)\b/.test(lower)) return 'deployment';
    if (/\b(explain|how|what|why|understand|learn)\b/.test(lower)) return 'information';
    if (/\b(test|check|verify|validate|confirm)\b/.test(lower)) return 'validation';
    if (/\b(update|change|modify|edit|refactor)\b/.test(lower)) return 'modification';
    if (/\b(delete|remove|clean|clear)\b/.test(lower)) return 'deletion';
    if (/\b(find|search|look|get|retrieve)\b/.test(lower)) return 'search';
    
    return 'general';
  }
  
  private calculateComplexity(content: string): number {
    let complexity = 0;
    
    // Length factor
    complexity += Math.min(content.length / 5000, 0.3);
    
    // Code blocks
    const codeBlocks = (content.match(/```/g) || []).length / 2;
    complexity += Math.min(codeBlocks * 0.1, 0.2);
    
    // Technical terms
    const technicalTerms = /\b(api|database|algorithm|architecture|framework|deployment|optimization|async|promise|callback)\b/gi;
    const techMatches = (content.match(technicalTerms) || []).length;
    complexity += Math.min(techMatches * 0.02, 0.2);
    
    // Questions
    const questions = (content.match(/\?/g) || []).length;
    complexity += Math.min(questions * 0.05, 0.15);
    
    // Lists and structure
    const lists = (content.match(/^\s*[-*]\s/gm) || []).length;
    complexity += Math.min(lists * 0.02, 0.15);
    
    return Math.min(complexity, 1.0);
  }
  
  private async generateSearchVector(content: string): Promise<number[]> {
    // This would normally use an embedding model
    // For now, return a simplified vector based on content features
    const vector: number[] = [];
    
    // Simple feature extraction (replace with real embeddings in production)
    vector.push(content.length / 1000); // Length feature
    vector.push((content.match(/```/g) || []).length / 2); // Code blocks
    vector.push((content.match(/\?/g) || []).length); // Questions
    vector.push((content.match(/\n/g) || []).length); // Lines
    
    return vector;
  }
  
  private sortByRelevance(messages: MessageReference[], query: string): MessageReference[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    return messages.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      
      // Exact match in content
      if (a.content.toLowerCase().includes(queryLower)) scoreA += 10;
      if (b.content.toLowerCase().includes(queryLower)) scoreB += 10;
      
      // Word matches
      queryWords.forEach(word => {
        if (a.content.toLowerCase().includes(word)) scoreA += 1;
        if (b.content.toLowerCase().includes(word)) scoreB += 1;
      });
      
      // Tag matches
      queryWords.forEach(word => {
        if (a.metadata.tags?.some(tag => tag.includes(word))) scoreA += 2;
        if (b.metadata.tags?.some(tag => tag.includes(word))) scoreB += 2;
      });
      
      // Recent messages score higher
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      if (dateA > dateB) scoreA += 0.5;
      if (dateB > dateA) scoreB += 0.5;
      
      return scoreB - scoreA;
    });
  }
  
  private async getThreadPosition(conversationId: string): Promise<number> {
    const { count, error } = await supabase
      .from('message_references')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);
    
    return (count || 0) + 1;
  }
  
  private async getPreviousMessageId(conversationId: string): Promise<string | undefined> {
    const { data, error } = await supabase
      .from('message_references')
      .select('id')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    
    return data?.id;
  }
  
  private async updateNextMessageId(messageId: string, nextMessageId: string): Promise<void> {
    await supabase
      .from('message_references')
      .update({ 'context.next_message_id': nextMessageId })
      .eq('id', messageId);
  }
  
  private async getMessageContext(messageId: string): Promise<any> {
    const { data } = await supabase
      .from('message_references')
      .select('context')
      .eq('id', messageId)
      .single();
    
    return data?.context || {};
  }
  
  private async updateReferenceIndex(messageId: string, content: string): Promise<void> {
    // Extract keywords for indexing
    const keywords = this.extractKeywords(content);
    
    keywords.forEach(keyword => {
      if (!this.referenceIndex.has(keyword)) {
        this.referenceIndex.set(keyword, new Set());
      }
      this.referenceIndex.get(keyword)!.add(messageId);
    });
  }
  
  private extractKeywords(content: string): string[] {
    // Simple keyword extraction (improve with NLP in production)
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Remove common words
    const stopWords = new Set(['this', 'that', 'with', 'from', 'have', 'will', 'your', 'what', 'when', 'where']);
    
    return [...new Set(words.filter(word => !stopWords.has(word)))];
  }
  
  private generateMessageId(conversationId: string, position: number): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7);
    return `msg_${conversationId.substring(0, 8)}_${position}_${timestamp}_${random}`;
  }
  
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }
  
  private getSessionId(): string {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('sessionId') || 'session_' + Date.now();
    }
    return 'server_session_' + Date.now();
  }
}

export default MessageReferenceSystem;