// Google Drive-Based RAG & Vector Search System
// Stores embeddings in Drive, performs vector search locally

import { DriveMemorySystem } from './memory-system';

interface VectorChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    sourceId: string;
    type: 'conversation' | 'document' | 'transcription' | 'knowledge';
    title: string;
    tags: string[];
    importance: number;
    created: string;
    userId: string;
  };
}

interface EmbeddingFile {
  id: string;
  embedding: number[];
  content: string;
  metadata: any;
  created: string;
}

export class DriveRAGSystem extends DriveMemorySystem {
  private vectorCache: Map<string, VectorChunk> = new Map();
  private cacheExpiry = 30 * 60 * 1000; // 30 minutes
  private lastCacheUpdate = 0;

  constructor(drive: any) {
    super(drive);
  }

  // Store content with embedding in Drive
  async storeVectorChunk(userId: string, content: string, metadata: any): Promise<string> {
    // Generate embedding
    const embedding = await this.generateEmbedding(content);

    const chunk: VectorChunk = {
      id: `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: content.substring(0, 2000), // Limit content size
      embedding,
      metadata: {
        ...metadata,
        userId,
        created: new Date().toISOString()
      }
    };

    // Store chunk content
    const chunkFileId = await super.storeKnowledgeChunk(userId, {
      id: chunk.id,
      content: chunk.content,
      metadata: chunk.metadata
    });

    // Store embedding separately for efficient loading
    const embeddingFileId = await super.storeEmbedding(userId, chunk.id, chunk.embedding);

    // Update local cache
    this.vectorCache.set(chunk.id, chunk);

    // Store minimal reference in database (just metadata)
    await this.storeVectorReference(userId, chunk.id, chunkFileId, embeddingFileId, metadata);

    return chunk.id;
  }

  // Generate embedding using OpenAI
  private async generateEmbedding(text: string): Promise<number[]> {
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

    const data = await response.json();
    return data.data[0].embedding;
  }

  // Store minimal vector reference in database (not the actual vectors)
  private async storeVectorReference(userId: string, chunkId: string, chunkFileId: string, embeddingFileId: string, metadata: any): Promise<void> {
    // This goes to Supabase - but only metadata, no vectors!
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.from('drive_vector_index').insert({
      id: chunkId,
      user_id: userId,
      chunk_file_id: chunkFileId,
      embedding_file_id: embeddingFileId,
      title: metadata.title || 'Untitled',
      source_type: metadata.type || 'knowledge',
      tags: metadata.tags || [],
      importance: metadata.importance || 0.5,
      size_bytes: metadata.size || 0,
      created_at: new Date().toISOString()
    });
  }

  // Load all embeddings from Drive into memory cache
  async loadVectorCache(userId: string): Promise<void> {
    console.log('Loading vector cache from Google Drive...');

    const embeddingFiles = await this.searchMemoryFiles(userId, '', 'embeddings');
    console.log(`Found ${embeddingFiles.length} embedding files`);

    const loadPromises = embeddingFiles.map(async (file) => {
      try {
        const content = await this.loadFileContent(file.id);
        const embeddingData: EmbeddingFile = JSON.parse(content);

        // Load corresponding chunk data
        const chunkContent = await this.loadChunkForEmbedding(embeddingData.id);

        if (chunkContent) {
          const chunk: VectorChunk = {
            id: embeddingData.id,
            content: chunkContent.content,
            embedding: embeddingData.embedding,
            metadata: chunkContent.metadata
          };

          this.vectorCache.set(chunk.id, chunk);
        }
      } catch (error) {
        console.error(`Failed to load embedding file ${file.id}:`, error);
      }
    });

    await Promise.all(loadPromises);
    this.lastCacheUpdate = Date.now();
    console.log(`Loaded ${this.vectorCache.size} vectors into cache`);
  }

  // Load chunk content for a specific embedding
  private async loadChunkForEmbedding(embeddingId: string): Promise<any> {
    const chunkFiles = await this.searchMemoryFiles('', embeddingId.replace('embedding_', 'knowledge_'), 'knowledgeChunks');

    if (chunkFiles.length > 0) {
      const content = await this.loadFileContent(chunkFiles[0].id);
      return JSON.parse(content);
    }

    return null;
  }

  // Perform vector similarity search
  async vectorSearch(userId: string, query: string, limit: number = 10, threshold: number = 0.7): Promise<VectorChunk[]> {
    // Ensure cache is loaded and fresh
    if (this.vectorCache.size === 0 || (Date.now() - this.lastCacheUpdate) > this.cacheExpiry) {
      await this.loadVectorCache(userId);
    }

    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query);

    // Calculate similarities
    const results: Array<{ chunk: VectorChunk; similarity: number }> = [];

    for (const chunk of this.vectorCache.values()) {
      if (chunk.metadata.userId !== userId) continue;

      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);

      if (similarity >= threshold) {
        results.push({ chunk, similarity });
      }
    }

    // Sort by similarity and return top results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(r => r.chunk);
  }

  // Calculate cosine similarity between two vectors
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // RAG Query: Search + Generate
  async ragQuery(userId: string, question: string, maxTokens: number = 2000): Promise<{
    answer: string;
    sources: VectorChunk[];
    context: string;
  }> {
    console.log(`RAG Query: "${question}" for user ${userId}`);

    // 1. Vector search for relevant chunks
    const relevantChunks = await this.vectorSearch(userId, question, 5, 0.6);

    // 2. Build context from chunks
    let context = '';
    const contextChunks: VectorChunk[] = [];
    let tokenCount = 0;

    for (const chunk of relevantChunks) {
      const chunkTokens = chunk.content.length / 4; // Rough token estimation

      if (tokenCount + chunkTokens <= maxTokens * 0.7) { // Leave room for question
        context += `\n\n--- ${chunk.metadata.title} ---\n${chunk.content}`;
        contextChunks.push(chunk);
        tokenCount += chunkTokens;
      }
    }

    // 3. Generate answer using context
    const answer = await this.generateAnswer(question, context);

    return {
      answer,
      sources: contextChunks,
      context
    };
  }

  // Generate answer using GPT with context
  private async generateAnswer(question: string, context: string): Promise<string> {
    const prompt = `Based on the following context information, answer the question accurately and concisely.

Context:
${context}

Question: ${question}

Answer:`;

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
            content: 'You are a helpful assistant that answers questions based on provided context. If the context doesn\'t contain enough information to answer the question, say so honestly.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || 'I apologize, but I cannot generate an answer at this time.';
  }

  // Store conversation with automatic chunking and RAG integration
  async storeConversationWithRAG(userId: string, conversation: any): Promise<void> {
    // Store full conversation
    await super.storeConversation(userId, conversation);

    // Extract and store important chunks for RAG
    for (const message of conversation.messages || []) {
      if (message.role === 'assistant' && message.content.length > 100) {
        await this.storeVectorChunk(userId, message.content, {
          type: 'conversation',
          title: `Conversation: ${conversation.title || 'Untitled'}`,
          source: 'conversation',
          sourceId: conversation.id,
          tags: ['conversation', 'assistant-response'],
          importance: 0.7
        });
      }
    }
  }

  // Store transcription with RAG integration
  async storeTranscriptionWithRAG(userId: string, transcription: any): Promise<void> {
    // Store full transcription
    await super.storeTranscription(userId, transcription);

    // Chunk transcription for RAG (split by sentences or paragraphs)
    const chunks = this.chunkText(transcription.content, 500); // 500 char chunks

    for (let i = 0; i < chunks.length; i++) {
      await this.storeVectorChunk(userId, chunks[i], {
        type: 'transcription',
        title: `${transcription.fileName} (Part ${i + 1})`,
        source: 'audio',
        sourceId: transcription.id,
        tags: ['transcription', 'audio', transcription.fileName],
        importance: 0.8
      });
    }
  }

  // Simple text chunking
  private chunkText(text: string, maxChunkSize: number): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= maxChunkSize) {
        currentChunk += sentence + '. ';
      } else {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = sentence + '. ';
      }
    }

    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks;
  }

  // Get memory statistics
  async getMemoryStats(userId: string): Promise<{
    totalFiles: number;
    totalSize: string;
    vectorChunks: number;
    folderSizes: Record<string, number>;
  }> {
    const stats = {
      totalFiles: 0,
      totalSize: '0 MB',
      vectorChunks: this.vectorCache.size,
      folderSizes: {} as Record<string, number>
    };

    let totalBytes = 0;

    for (const [folderName, folderId] of Object.entries(this.config.folders)) {
      const files = await this.searchMemoryFiles(userId, '', folderName as any);
      const folderSize = files.reduce((sum, file) => sum + (parseInt(file.size) || 0), 0);

      stats.folderSizes[folderName] = folderSize;
      totalBytes += folderSize;
      stats.totalFiles += files.length;
    }

    stats.totalSize = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;

    return stats;
  }
}