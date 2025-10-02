// Google Workspace RAG System with Ultra-Efficient Compression
// Combines workspace memory system with vector search and generation

import { WorkspaceMemorySystem } from './memory-system';

interface RAGQuery {
  question: string;
  userId: string;
  maxTokens?: number;
  threshold?: number;
  includeTypes?: string[];
  maxAge?: number; // days
}

interface RAGResult {
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    content: string;
    similarity: number;
    type: string;
    created: string;
  }>;
  context: string;
  compressionStats: {
    originalContextSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
  searchStats: {
    totalMemories: number;
    searchedMemories: number;
    relevantMemories: number;
  };
}

export class WorkspaceRAGSystem extends WorkspaceMemorySystem {
  private vectorCache = new Map<string, {
    id: string;
    embedding: number[];
    content: string;
    metadata: any;
  }>();
  private cacheExpiry = 30 * 60 * 1000; // 30 minutes
  private lastCacheUpdate = 0;

  constructor(drive: any) {
    super(drive);
  }

  // Load all embeddings for vector search
  async loadVectorCache(userId: string): Promise<void> {
    if (this.vectorCache.size > 0 && (Date.now() - this.lastCacheUpdate) < this.cacheExpiry) {
      return; // Cache is still fresh
    }

    console.log('Loading vector cache for efficient search...');
    this.vectorCache.clear();

    // Get relevant memory IDs from Supabase index
    const relevantIds = await this.getRelevantMemoryIds(userId, {});

    const loadPromises = relevantIds.slice(0, 100).map(async (id) => { // Limit for performance
      try {
        const memory = await this.loadCompressedMemory(id);

        if (memory.embedding_compressed) {
          // Decompress embedding
          const embeddingBuffer = Buffer.from(memory.embedding_compressed, 'base64');
          const decompressedEmbedding = await this.gunzip(embeddingBuffer);
          const embedding = JSON.parse(decompressedEmbedding.toString());

          // Decompress content
          const contentBuffer = Buffer.from(memory.content_compressed, 'base64');
          const content = (await this.gunzip(contentBuffer)).toString();

          this.vectorCache.set(id, {
            id: memory.id,
            embedding,
            content,
            metadata: memory.metadata
          });
        }
      } catch (error) {
        console.warn(`Failed to load vector for ${id}:`, error);
      }
    });

    await Promise.all(loadPromises);
    this.lastCacheUpdate = Date.now();
    console.log(`Loaded ${this.vectorCache.size} vectors into cache`);
  }

  // Enhanced vector search with caching
  async vectorSearchEfficient(
    userId: string,
    query: string,
    options: {
      limit?: number;
      threshold?: number;
      types?: string[];
      maxAge?: number;
    } = {}
  ): Promise<Array<{ id: string; content: string; similarity: number; metadata: any }>> {
    const { limit = 10, threshold = 0.6, types, maxAge } = options;

    // Ensure vector cache is loaded
    await this.loadVectorCache(userId);

    // Generate query embedding
    const queryEmbedding = await this.generateEmbeddingForRAG(query);
    if (!queryEmbedding) {
      console.error('Failed to generate query embedding');
      return [];
    }

    // Calculate similarities
    const results = [];

    for (const [id, vector] of this.vectorCache.entries()) {
      // Filter by user
      if (vector.metadata.userId !== userId) continue;

      // Filter by types if specified
      if (types && !types.includes(vector.metadata.type)) continue;

      // Filter by age if specified
      if (maxAge) {
        const createdDate = new Date(vector.metadata.created);
        const maxAgeDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
        if (createdDate < maxAgeDate) continue;
      }

      // Calculate similarity
      const similarity = this.cosineSimilarityRAG(queryEmbedding, vector.embedding);

      if (similarity >= threshold) {
        results.push({
          id: vector.id,
          content: vector.content,
          similarity,
          metadata: vector.metadata
        });
      }
    }

    // Sort by similarity and return top results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Cosine similarity calculation
  private cosineSimilarityRAG(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  // Generate embedding using OpenAI
  private async generateEmbeddingForRAG(text: string): Promise<number[] | null> {
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
      console.error('Embedding generation error:', error);
      return null;
    }
  }

  // Helper method for decompression
  private async gunzip(buffer: Buffer): Promise<Buffer> {
    const zlib = require('zlib');
    const util = require('util');
    const gunzip = util.promisify(zlib.gunzip);
    return await gunzip(buffer);
  }

  // Enhanced RAG query with compression and optimization
  async ragQuery(params: RAGQuery): Promise<RAGResult> {
    const {
      question,
      userId,
      maxTokens = 2000,
      threshold = 0.6,
      includeTypes,
      maxAge
    } = params;

    console.log(`RAG Query: "${question}" for user ${userId}`);

    // 1. Vector search for relevant memories
    const relevantMemories = await this.vectorSearchEfficient(userId, question, {
      limit: 10,
      threshold,
      types: includeTypes,
      maxAge
    });

    // 2. Build context with compression awareness
    let context = '';
    const contextSources = [];
    let originalContextSize = 0;
    const maxContextTokens = maxTokens * 0.6; // Reserve 40% for question/answer

    for (const memory of relevantMemories) {
      const memoryTokens = memory.content.length / 4; // Rough token estimation

      if ((context.length / 4) + memoryTokens <= maxContextTokens) {
        const sourceEntry = {
          id: memory.id,
          title: memory.metadata.title || 'Untitled',
          content: memory.content.substring(0, 800), // Limit for context
          similarity: memory.similarity,
          type: memory.metadata.type,
          created: memory.metadata.created
        };

        context += `\n\n--- ${sourceEntry.title} (${(sourceEntry.similarity * 100).toFixed(1)}% match) ---\n${sourceEntry.content}`;
        contextSources.push(sourceEntry);
        originalContextSize += memory.content.length;
      }
    }

    // 3. Generate answer with GPT
    const answer = await this.generateContextualAnswer(question, context);

    // 4. Calculate compression stats
    const compressedSize = Buffer.byteLength(context, 'utf8');
    const compressionRatio = compressedSize / Math.max(originalContextSize, 1);

    return {
      answer,
      sources: contextSources,
      context,
      compressionStats: {
        originalContextSize,
        compressedSize,
        compressionRatio
      },
      searchStats: {
        totalMemories: await this.getTotalMemoryCount(userId),
        searchedMemories: relevantMemories.length,
        relevantMemories: contextSources.length
      }
    };
  }

  // Enhanced answer generation with better prompting
  private async generateContextualAnswer(question: string, context: string): Promise<string> {
    const systemPrompt = `You are KimbleAI, a helpful assistant with access to the user's personal knowledge base and conversation history.

Instructions:
- Answer questions accurately based on the provided context
- If the context doesn't contain enough information, say so honestly
- Reference specific sources when possible (mention titles/dates)
- Be conversational and helpful
- If you recognize patterns from previous conversations, mention them
- For technical questions, provide detailed explanations
- For personal questions, be supportive and insightful`;

    const userPrompt = `Context from my knowledge base:
${context}

Question: ${question}

Please provide a helpful answer based on this context.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          max_tokens: 800,
          temperature: 0.7,
          presence_penalty: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'I apologize, but I cannot generate an answer at this time.';

    } catch (error) {
      console.error('Answer generation error:', error);
      return 'I encountered an error while processing your question. Please try again.';
    }
  }

  // Store conversation with automatic RAG integration
  async storeConversationWithRAG(
    userId: string,
    conversation: {
      id: string;
      title?: string;
      messages: Array<{ role: string; content: string; timestamp?: string }>;
      metadata?: any;
    }
  ): Promise<{ conversationId: string; chunks: string[] }> {

    // Store full conversation
    const conversationId = await this.storeCompressedMemory(userId, JSON.stringify(conversation, null, 2), {
      type: 'conversation',
      title: conversation.title || `Conversation ${new Date().toLocaleDateString()}`,
      tags: ['conversation', 'full'],
      importance: 0.8
    });

    // Extract and store meaningful chunks for RAG
    const chunks: string[] = [];

    for (let i = 0; i < conversation.messages.length; i++) {
      const message = conversation.messages[i];

      // Store substantial assistant responses and user questions
      if ((message.role === 'assistant' && message.content.length > 100) ||
          (message.role === 'user' && message.content.length > 50)) {

        const chunkId = await this.storeCompressedMemory(userId, message.content, {
          type: 'conversation',
          title: `${conversation.title || 'Chat'} - ${message.role} message`,
          tags: ['conversation', message.role, 'chunk'],
          importance: message.role === 'assistant' ? 0.7 : 0.6
        });

        chunks.push(chunkId);
      }
    }

    return { conversationId, chunks };
  }

  // Store large documents with intelligent chunking
  async storeDocumentWithRAG(
    userId: string,
    document: {
      title: string;
      content: string;
      type?: string;
      tags?: string[];
    }
  ): Promise<{ documentId: string; chunks: string[] }> {

    // Store full document
    const documentId = await this.storeCompressedMemory(userId, document.content, {
      type: 'knowledge',
      title: document.title,
      tags: ['document', ...(document.tags || [])],
      importance: 0.9
    });

    // Intelligent chunking for RAG
    const chunks = this.intelligentChunkDocument(document.content, 600);
    const chunkIds: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      if (chunk.trim().length > 50) { // Only store meaningful chunks
        const chunkId = await this.storeCompressedMemory(userId, chunk, {
          type: 'knowledge',
          title: `${document.title} - Part ${i + 1}`,
          tags: ['document', 'chunk', ...(document.tags || [])],
          importance: 0.8 - (i * 0.05) // Declining importance
        });

        chunkIds.push(chunkId);
      }
    }

    return { documentId, chunks: chunkIds };
  }

  // Enhanced document chunking with better boundary detection
  private intelligentChunkDocument(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];

    // Split by paragraphs first
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    let currentChunk = '';

    for (const paragraph of paragraphs) {
      // If paragraph alone is too big, split by sentences
      if (paragraph.length > maxChunkSize) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length <= maxChunkSize) {
            currentChunk += sentence + '. ';
          } else {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = sentence + '. ';
          }
        }
      } else {
        // Normal paragraph processing
        if (currentChunk.length + paragraph.length <= maxChunkSize) {
          currentChunk += paragraph + '\n\n';
        } else {
          if (currentChunk.trim()) chunks.push(currentChunk.trim());
          currentChunk = paragraph + '\n\n';
        }
      }
    }

    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks;
  }

  // Get total memory count for stats
  private async getTotalMemoryCount(userId: string): Promise<number> {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { count } = await supabase
        .from('workspace_memory_index')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      return count || 0;
    } catch (error) {
      console.warn('Could not get total memory count:', error);
      return 0;
    }
  }

  // Batch process multiple documents
  async batchStoreDocuments(
    userId: string,
    documents: Array<{
      title: string;
      content: string;
      type?: string;
      tags?: string[];
    }>
  ): Promise<Array<{ documentId: string; chunks: string[] }>> {

    const results = [];

    for (const document of documents) {
      try {
        const result = await this.storeDocumentWithRAG(userId, document);
        results.push(result);

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to store document ${document.title}:`, error);
        results.push({ documentId: '', chunks: [] });
      }
    }

    return results;
  }

  // Get comprehensive memory stats
  async getAdvancedMemoryStats(userId: string): Promise<{
    totalMemories: number;
    memoryTypes: Record<string, number>;
    storageUsed: string;
    compressionEfficiency: string;
    recentActivity: Array<{
      id: string;
      title: string;
      type: string;
      created: string;
      size: string;
    }>;
  }> {

    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Get memory type distribution
      const { data: typeStats } = await supabase
        .from('workspace_memory_index')
        .select('type')
        .eq('user_id', userId);

      const memoryTypes: Record<string, number> = {};
      for (const item of typeStats || []) {
        memoryTypes[item.type] = (memoryTypes[item.type] || 0) + 1;
      }

      // Get size and compression stats
      const { data: sizeStats } = await supabase
        .from('workspace_memory_index')
        .select('original_size, compressed_size')
        .eq('user_id', userId);

      let totalOriginal = 0;
      let totalCompressed = 0;

      for (const item of sizeStats || []) {
        totalOriginal += item.original_size || 0;
        totalCompressed += item.compressed_size || 0;
      }

      // Get recent activity
      const { data: recentData } = await supabase
        .from('workspace_memory_index')
        .select('id, title, type, created_at, original_size')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      const recentActivity = (recentData || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        created: item.created_at,
        size: this.formatBytes(item.original_size || 0)
      }));

      return {
        totalMemories: typeStats?.length || 0,
        memoryTypes,
        storageUsed: this.formatBytes(totalCompressed),
        compressionEfficiency: totalOriginal > 0
          ? `${((1 - totalCompressed/totalOriginal) * 100).toFixed(1)}% space saved`
          : '0% space saved',
        recentActivity
      };

    } catch (error) {
      console.error('Error getting memory stats:', error);
      return {
        totalMemories: 0,
        memoryTypes: {},
        storageUsed: '0 KB',
        compressionEfficiency: '0% space saved',
        recentActivity: []
      };
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}