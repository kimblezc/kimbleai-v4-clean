/**
 * RAG Service - Retrieval-Augmented Generation for Cross-Session Memory
 *
 * Features:
 * - Semantic search across past conversations, files, and memories
 * - Explicit memory storage ("remember this")
 * - Google services integration (Gmail, Drive, Calendar)
 * - Context injection for enhanced chat responses
 */

import { createClient } from '@supabase/supabase-js';
import { getAIService } from './ai-service';

export interface RetrievedContext {
  type: 'message' | 'file' | 'memory' | 'email' | 'calendar' | 'drive';
  id: string;
  content: string;
  summary?: string;
  similarity: number;
  metadata: {
    conversationId?: string;
    conversationTitle?: string;
    projectId?: string;
    projectName?: string;
    createdAt: string;
    source?: string;
  };
}

export interface RAGContext {
  query: string;
  retrievedContexts: RetrievedContext[];
  formattedContext: string;
  totalTokens: number;
  costUsd: number;
}

export interface UserMemory {
  id: string;
  userId: string;
  key: string;
  value: string;
  category: 'preference' | 'fact' | 'instruction' | 'context';
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
}

export class RAGService {
  private supabase: ReturnType<typeof createClient>;
  private maxContextTokens = 4000; // Leave room for response

  constructor(supabaseClient: ReturnType<typeof createClient>) {
    this.supabase = supabaseClient;
  }

  /**
   * Retrieve relevant context for a user query
   */
  async retrieveContext(params: {
    userId: string;
    query: string;
    projectId?: string;
    conversationId?: string;
    includeGoogle?: boolean;
    googleTokens?: {
      accessToken: string;
      refreshToken?: string;
    };
    maxResults?: number;
  }): Promise<RAGContext> {
    const {
      userId,
      query,
      projectId,
      conversationId,
      includeGoogle = true,
      googleTokens,
      maxResults = 10,
    } = params;

    const aiService = getAIService(this.supabase);
    const retrievedContexts: RetrievedContext[] = [];
    let totalCost = 0;

    // 1. Generate query embedding
    const embeddingResult = await aiService.generateEmbedding({
      userId,
      text: query,
    });
    totalCost += embeddingResult.costUsd;

    // 2. Search past messages and files
    const localResults = await this.searchLocalContent({
      userId,
      embedding: embeddingResult.embedding,
      projectId,
      excludeConversationId: conversationId, // Don't include current conversation
      limit: maxResults,
    });
    retrievedContexts.push(...localResults);

    // 3. Search user memories
    const memories = await this.searchMemories({
      userId,
      embedding: embeddingResult.embedding,
      limit: 5,
    });
    retrievedContexts.push(...memories);

    // 4. Include Google services if requested and tokens available
    if (includeGoogle && googleTokens?.accessToken) {
      try {
        const googleResults = await this.searchGoogleServices({
          userId,
          query,
          accessToken: googleTokens.accessToken,
          maxResults: 5,
        });
        retrievedContexts.push(...googleResults);
      } catch (error) {
        console.warn('[RAG] Google services search failed:', error);
        // Continue without Google results
      }
    }

    // 5. Sort by similarity and limit
    const sortedContexts = retrievedContexts
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);

    // 6. Format context for injection
    const formattedContext = this.formatContextForPrompt(sortedContexts);
    const totalTokens = Math.ceil(formattedContext.length / 4);

    return {
      query,
      retrievedContexts: sortedContexts,
      formattedContext,
      totalTokens,
      costUsd: totalCost,
    };
  }

  /**
   * Search local content (messages, files)
   */
  private async searchLocalContent(params: {
    userId: string;
    embedding: number[];
    projectId?: string;
    excludeConversationId?: string;
    limit: number;
  }): Promise<RetrievedContext[]> {
    const { userId, embedding, projectId, excludeConversationId, limit } = params;

    try {
      // Call Supabase RPC function for vector similarity search
      const { data, error } = await this.supabase.rpc('search_all_content', {
        query_embedding: `[${embedding.join(',')}]`,
        user_id_filter: userId,
        project_id_filter: projectId || null,
        similarity_threshold: 0.65,
        result_limit: limit,
        content_type_filter: 'all',
      });

      if (error) {
        console.error('[RAG] Local content search error:', error);
        return [];
      }

      // Filter out current conversation and format results
      return (data || [])
        .filter((item: any) => item.conversation_id !== excludeConversationId)
        .map((item: any) => ({
          type: item.content_type as 'message' | 'file',
          id: item.id,
          content: item.content,
          summary: item.summary,
          similarity: item.similarity,
          metadata: {
            conversationId: item.conversation_id,
            conversationTitle: item.conversation_title,
            projectId: item.project_id,
            projectName: item.project_name,
            createdAt: item.created_at,
            source: 'local',
          },
        }));
    } catch (error) {
      console.error('[RAG] Local content search failed:', error);
      return [];
    }
  }

  /**
   * Search user memories
   */
  private async searchMemories(params: {
    userId: string;
    embedding: number[];
    limit: number;
  }): Promise<RetrievedContext[]> {
    const { userId, embedding, limit } = params;

    try {
      // First check if user_memories table exists
      const { data, error } = await this.supabase.rpc('search_user_memories', {
        query_embedding: `[${embedding.join(',')}]`,
        user_id_filter: userId,
        similarity_threshold: 0.6,
        result_limit: limit,
      });

      if (error) {
        // Table might not exist yet - this is expected
        if (error.message.includes('does not exist')) {
          console.log('[RAG] user_memories table not yet created');
          return [];
        }
        console.error('[RAG] Memory search error:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        type: 'memory' as const,
        id: item.id,
        content: `${item.key}: ${item.value}`,
        similarity: item.similarity,
        metadata: {
          createdAt: item.created_at,
          source: 'memory',
        },
      }));
    } catch (error) {
      console.error('[RAG] Memory search failed:', error);
      return [];
    }
  }

  /**
   * Search Google services (Gmail, Calendar, Drive)
   */
  private async searchGoogleServices(params: {
    userId: string;
    query: string;
    accessToken: string;
    maxResults: number;
  }): Promise<RetrievedContext[]> {
    const { query, accessToken, maxResults } = params;
    const results: RetrievedContext[] = [];

    // Search Gmail
    try {
      const gmailResults = await this.searchGmail(query, accessToken, Math.ceil(maxResults / 3));
      results.push(...gmailResults);
    } catch (error) {
      console.warn('[RAG] Gmail search failed:', error);
    }

    // Search Calendar (upcoming events)
    try {
      const calendarResults = await this.searchCalendar(query, accessToken, Math.ceil(maxResults / 3));
      results.push(...calendarResults);
    } catch (error) {
      console.warn('[RAG] Calendar search failed:', error);
    }

    // Search Drive
    try {
      const driveResults = await this.searchDrive(query, accessToken, Math.ceil(maxResults / 3));
      results.push(...driveResults);
    } catch (error) {
      console.warn('[RAG] Drive search failed:', error);
    }

    return results;
  }

  /**
   * Search Gmail for relevant emails
   */
  private async searchGmail(
    query: string,
    accessToken: string,
    maxResults: number
  ): Promise<RetrievedContext[]> {
    const response = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }

    const data = await response.json();
    const results: RetrievedContext[] = [];

    // Fetch message details for each result
    for (const message of data.messages || []) {
      try {
        const detailResponse = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (detailResponse.ok) {
          const detail = await detailResponse.json();
          const headers = detail.payload?.headers || [];
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No subject';
          const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
          const date = headers.find((h: any) => h.name === 'Date')?.value || '';

          results.push({
            type: 'email',
            id: message.id,
            content: `Email from ${from}: "${subject}"`,
            summary: subject,
            similarity: 0.8, // Gmail API uses text matching, not semantic
            metadata: {
              createdAt: date,
              source: 'gmail',
            },
          });
        }
      } catch (error) {
        // Skip failed messages
        continue;
      }
    }

    return results;
  }

  /**
   * Search Google Calendar for relevant events
   */
  private async searchCalendar(
    query: string,
    accessToken: string,
    maxResults: number
  ): Promise<RetrievedContext[]> {
    // Get events from now to 30 days in the future
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime&q=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Calendar API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.items || []).map((event: any) => ({
      type: 'calendar' as const,
      id: event.id,
      content: `Calendar event: "${event.summary}" on ${event.start?.dateTime || event.start?.date}${event.location ? ` at ${event.location}` : ''}`,
      summary: event.summary,
      similarity: 0.85, // Calendar API uses text matching
      metadata: {
        createdAt: event.start?.dateTime || event.start?.date,
        source: 'calendar',
      },
    }));
  }

  /**
   * Search Google Drive for relevant files
   */
  private async searchDrive(
    query: string,
    accessToken: string,
    maxResults: number
  ): Promise<RetrievedContext[]> {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=fullText contains '${encodeURIComponent(query.replace(/'/g, "\\'"))}'&pageSize=${maxResults}&fields=files(id,name,mimeType,modifiedTime,webViewLink)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Drive API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.files || []).map((file: any) => ({
      type: 'drive' as const,
      id: file.id,
      content: `Google Drive file: "${file.name}" (${file.mimeType})`,
      summary: file.name,
      similarity: 0.75, // Drive API uses text matching
      metadata: {
        createdAt: file.modifiedTime,
        source: 'drive',
      },
    }));
  }

  /**
   * Format retrieved contexts for prompt injection
   */
  private formatContextForPrompt(contexts: RetrievedContext[]): string {
    if (contexts.length === 0) {
      return '';
    }

    const sections: string[] = [];

    // Group by type
    const messages = contexts.filter(c => c.type === 'message');
    const files = contexts.filter(c => c.type === 'file');
    const memories = contexts.filter(c => c.type === 'memory');
    const emails = contexts.filter(c => c.type === 'email');
    const calendar = contexts.filter(c => c.type === 'calendar');
    const drive = contexts.filter(c => c.type === 'drive');

    // Memories (highest priority - user explicitly asked to remember)
    if (memories.length > 0) {
      sections.push("## User's Saved Information\n" + memories.map(m => `- ${m.content}`).join('\n'));
    }

    // Recent relevant conversations
    if (messages.length > 0) {
      sections.push(
        '## Relevant Past Conversations\n' +
        messages.map(m => {
          const date = new Date(m.metadata.createdAt).toLocaleDateString();
          return `[${date}${m.metadata.conversationTitle ? ` - ${m.metadata.conversationTitle}` : ''}]: ${this.truncate(m.content, 300)}`;
        }).join('\n\n')
      );
    }

    // Relevant files
    if (files.length > 0) {
      sections.push(
        '## Relevant Files\n' +
        files.map(f => `- ${f.summary || f.content}`).join('\n')
      );
    }

    // Google services
    if (emails.length > 0) {
      sections.push('## Recent Relevant Emails\n' + emails.map(e => `- ${e.content}`).join('\n'));
    }

    if (calendar.length > 0) {
      sections.push('## Upcoming Calendar Events\n' + calendar.map(c => `- ${c.content}`).join('\n'));
    }

    if (drive.length > 0) {
      sections.push('## Relevant Google Drive Files\n' + drive.map(d => `- ${d.content}`).join('\n'));
    }

    if (sections.length === 0) {
      return '';
    }

    return `
---
# Context from Memory

The following information may be relevant to the user's request. Use it to provide more personalized and informed responses.

${sections.join('\n\n')}

---
Note: This context is provided to help you. Only reference it if directly relevant to the user's current question.
---
`.trim();
  }

  /**
   * Store a memory for the user
   */
  async storeMemory(params: {
    userId: string;
    key: string;
    value: string;
    category?: 'preference' | 'fact' | 'instruction' | 'context';
  }): Promise<UserMemory> {
    const { userId, key, value, category = 'fact' } = params;

    // Generate embedding for the memory
    const aiService = getAIService(this.supabase);
    const embeddingResult = await aiService.generateEmbedding({
      userId,
      text: `${key}: ${value}`,
    });

    // Store in database
    const { data, error } = await this.supabase
      .from('user_memories')
      .upsert({
        user_id: userId,
        key,
        value,
        category,
        embedding: embeddingResult.embedding,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,key',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to store memory: ${error.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      key: data.key,
      value: data.value,
      category: data.category,
      embedding: data.embedding,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Get all memories for a user
   */
  async getMemories(userId: string): Promise<UserMemory[]> {
    const { data, error } = await this.supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get memories: ${error.message}`);
    }

    return (data || []).map(m => ({
      id: m.id,
      userId: m.user_id,
      key: m.key,
      value: m.value,
      category: m.category,
      embedding: m.embedding,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }));
  }

  /**
   * Delete a memory
   */
  async deleteMemory(userId: string, memoryId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_memories')
      .delete()
      .eq('id', memoryId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete memory: ${error.message}`);
    }
  }

  /**
   * Parse "remember" commands from user messages
   */
  parseRememberCommand(message: string): { key: string; value: string } | null {
    // Patterns for remember commands
    const patterns = [
      /remember\s+(?:that\s+)?my\s+(.+?)\s+is\s+(.+)/i,
      /remember\s+(?:that\s+)?(.+?)\s+is\s+(.+)/i,
      /remember\s*:\s*(.+?)\s*[=-]\s*(.+)/i,
      /save\s+(?:that\s+)?my\s+(.+?)\s+is\s+(.+)/i,
      /my\s+(.+?)\s+is\s+(.+?)[\.\,]?\s*remember\s+(?:this|that)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          key: match[1].trim(),
          value: match[2].trim(),
        };
      }
    }

    return null;
  }

  /**
   * Helper to truncate text
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}

// Export singleton factory
let ragServiceInstance: RAGService | null = null;

export function getRAGService(supabaseClient: any): RAGService {
  if (!ragServiceInstance) {
    ragServiceInstance = new RAGService(supabaseClient);
  }
  return ragServiceInstance;
}
