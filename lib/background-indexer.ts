/**
 * Background Indexer - Automatically processes conversations for RAG
 * Runs after each message to ensure immediate cross-conversation memory
 */

import { createClient } from '@supabase/supabase-js';
import { MemoryExtractor } from '@/services/memory-service';
import { MessageReferenceSystem } from '@/lib/message-reference-system';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface IndexingResult {
  messageId: string;
  memoryChunksExtracted: number;
  knowledgeItemsCreated: number;
  referencesCreated: number;
  processingTimeMs: number;
  errors: string[];
}

export class BackgroundIndexer {
  private static instance: BackgroundIndexer;
  private processingQueue: Map<string, Promise<IndexingResult>> = new Map();

  private constructor() {}

  public static getInstance(): BackgroundIndexer {
    if (!BackgroundIndexer.instance) {
      BackgroundIndexer.instance = new BackgroundIndexer();
    }
    return BackgroundIndexer.instance;
  }

  /**
   * Automatically index a message immediately after it's saved
   * This runs in the background without blocking the chat response
   */
  async indexMessage(
    messageId: string,
    conversationId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    projectId?: string
  ): Promise<IndexingResult> {
    const startTime = Date.now();
    const result: IndexingResult = {
      messageId,
      memoryChunksExtracted: 0,
      knowledgeItemsCreated: 0,
      referencesCreated: 0,
      processingTimeMs: 0,
      errors: []
    };

    try {
      // Prevent duplicate processing
      if (this.processingQueue.has(messageId)) {
        return await this.processingQueue.get(messageId)!;
      }

      const processingPromise = this.processMessage(
        messageId, conversationId, userId, role, content, projectId, result
      );

      this.processingQueue.set(messageId, processingPromise);

      const finalResult = await processingPromise;
      finalResult.processingTimeMs = Date.now() - startTime;

      // Clean up queue
      this.processingQueue.delete(messageId);

      console.log(`[BackgroundIndexer] Processed message ${messageId}:`, {
        memoryChunks: finalResult.memoryChunksExtracted,
        knowledgeItems: finalResult.knowledgeItemsCreated,
        references: finalResult.referencesCreated,
        time: finalResult.processingTimeMs + 'ms'
      });

      return finalResult;

    } catch (error: any) {
      result.errors.push(`Processing failed: ${error.message}`);
      result.processingTimeMs = Date.now() - startTime;
      this.processingQueue.delete(messageId);

      console.error(`[BackgroundIndexer] Failed to process message ${messageId}:`, error);
      return result;
    }
  }

  private async processMessage(
    messageId: string,
    conversationId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    projectId: string | undefined,
    result: IndexingResult
  ): Promise<IndexingResult> {

    // 1. Extract memory chunks using advanced pattern matching
    try {
      const memoryChunks = await MemoryExtractor.extractFromMessage(content, role);

      for (const chunk of memoryChunks) {
        const embedding = await this.generateEmbedding(chunk.content);

        if (embedding) {
          await supabase.from('memory_chunks').insert({
            user_id: userId,
            conversation_id: conversationId,
            message_id: messageId,
            content: chunk.content,
            chunk_type: chunk.type,
            embedding: embedding,
            importance: chunk.importance,
            metadata: {
              ...chunk.metadata,
              extracted_at: new Date().toISOString(),
              source_role: role,
              project_id: projectId
            }
          });

          result.memoryChunksExtracted++;
        }
      }
    } catch (error: any) {
      result.errors.push(`Memory extraction failed: ${error.message}`);
    }

    // 2. Create structured knowledge base entries
    try {
      const knowledgeItems = this.extractKnowledgeItems(content, role, userId, conversationId, projectId);

      for (const item of knowledgeItems) {
        const embedding = await this.generateEmbedding(item.content);

        if (embedding) {
          await supabase.from('knowledge_base').insert({
            user_id: userId,
            source_type: 'conversation',
            source_id: messageId,
            category: item.category,
            title: item.title,
            content: item.content,
            embedding: embedding,
            importance: item.importance,
            tags: item.tags,
            metadata: {
              conversation_id: conversationId,
              project_id: projectId,
              message_role: role,
              auto_extracted: true,
              created_at: new Date().toISOString()
            }
          });

          result.knowledgeItemsCreated++;
        }
      }
    } catch (error: any) {
      result.errors.push(`Knowledge extraction failed: ${error.message}`);
    }

    // 3. Store in message reference system for instant retrieval
    try {
      const messageSystem = MessageReferenceSystem.getInstance();
      await messageSystem.storeMessage(
        conversationId,
        userId,
        role,
        content,
        {},
        projectId
      );

      result.referencesCreated = 1;
    } catch (error: any) {
      result.errors.push(`Reference storage failed: ${error.message}`);
    }

    // 4. Update conversation summary for quick context
    try {
      await this.updateConversationSummary(conversationId, content, role);
    } catch (error: any) {
      result.errors.push(`Summary update failed: ${error.message}`);
    }

    return result;
  }

  private extractKnowledgeItems(
    content: string,
    role: string,
    userId: string,
    conversationId: string,
    projectId?: string
  ): Array<{
    category: string;
    title: string;
    content: string;
    importance: number;
    tags: string[];
  }> {
    const items = [];

    // Extract project information
    const projectPattern = /(?:project|working on|building)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi;
    const projectMatches = content.matchAll(projectPattern);
    for (const match of projectMatches) {
      items.push({
        category: 'project',
        title: `Project: ${match[1]}`,
        content: `User is working on project: ${match[1]}`,
        importance: 0.8,
        tags: ['project', match[1].toLowerCase(), 'work']
      });
    }

    // Extract technical decisions
    const decisionPattern = /(?:decided|chose|going with|will use)\s+([^.!?]+)/gi;
    const decisionMatches = content.matchAll(decisionPattern);
    for (const match of decisionMatches) {
      items.push({
        category: 'decision',
        title: 'Technical Decision',
        content: `Decision made: ${match[0]}`,
        importance: 0.9,
        tags: ['decision', 'technical', 'important']
      });
    }

    // Extract preferences and dislikes
    const preferencePattern = /i (?:like|love|prefer|hate|dislike)\s+([^.!?]+)/gi;
    const preferenceMatches = content.matchAll(preferencePattern);
    for (const match of preferenceMatches) {
      items.push({
        category: 'preference',
        title: 'User Preference',
        content: match[0],
        importance: 0.7,
        tags: ['preference', 'personal']
      });
    }

    // Extract code/technical context
    if (content.includes('```') || /\b(function|class|import|const|let|var)\b/.test(content)) {
      items.push({
        category: 'technical',
        title: 'Code Discussion',
        content: content.substring(0, 500),
        importance: 0.8,
        tags: ['code', 'technical', 'programming']
      });
    }

    // Extract error/problem descriptions
    const errorPattern = /(?:error|issue|problem|bug|broken|failing)\s+([^.!?]+)/gi;
    const errorMatches = content.matchAll(errorPattern);
    for (const match of errorMatches) {
      items.push({
        category: 'issue',
        title: 'Problem/Error',
        content: match[0],
        importance: 0.85,
        tags: ['error', 'problem', 'debug', 'important']
      });
    }

    return items;
  }

  private async updateConversationSummary(
    conversationId: string,
    newContent: string,
    role: string
  ): Promise<void> {
    // Get current conversation summary
    const { data: existing } = await supabase
      .from('conversation_summaries')
      .select('summary, message_count')
      .eq('conversation_id', conversationId)
      .single();

    const messageCount = (existing?.message_count || 0) + 1;
    let summary = existing?.summary || '';

    // Update summary with key points from new message
    if (role === 'user') {
      const keyPoints = this.extractKeyPoints(newContent);
      if (keyPoints.length > 0) {
        summary += `\n- User: ${keyPoints.join(', ')}`;
      }
    }

    // Keep summary concise (max 1000 chars)
    if (summary.length > 1000) {
      summary = summary.substring(summary.length - 800);
    }

    await supabase.from('conversation_summaries').upsert({
      conversation_id: conversationId,
      summary: summary.trim(),
      message_count: messageCount,
      last_updated: new Date().toISOString()
    });
  }

  private extractKeyPoints(content: string): string[] {
    const points = [];

    // Look for explicit statements
    const statements = content.match(/i (?:am|have|need|want|like|work|live)[^.!?]+/gi);
    if (statements) {
      points.push(...statements.map(s => s.substring(0, 50)));
    }

    // Look for questions
    const questions = content.match(/[^.!?]*\?/g);
    if (questions) {
      points.push(...questions.map(q => q.trim().substring(0, 50)));
    }

    return points.slice(0, 3); // Max 3 key points
  }

  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
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
      console.error('Embedding generation failed:', error);
      return null;
    }
  }

  /**
   * Process multiple messages in batch (for historical data)
   */
  async batchIndexMessages(
    messages: Array<{
      id: string;
      conversation_id: string;
      user_id: string;
      role: 'user' | 'assistant';
      content: string;
      project_id?: string;
    }>
  ): Promise<IndexingResult[]> {
    const results = [];

    for (const msg of messages) {
      try {
        const result = await this.indexMessage(
          msg.id,
          msg.conversation_id,
          msg.user_id,
          msg.role,
          msg.content,
          msg.project_id
        );
        results.push(result);
      } catch (error: any) {
        results.push({
          messageId: msg.id,
          memoryChunksExtracted: 0,
          knowledgeItemsCreated: 0,
          referencesCreated: 0,
          processingTimeMs: 0,
          errors: [`Batch processing failed: ${error.message}`]
        });
      }
    }

    return results;
  }
}

export default BackgroundIndexer;