// Google Workspace Optimized Memory System
// Ultra-efficient storage with compression and smart retention

import { google } from 'googleapis';
import * as zlib from 'zlib';
import * as util from 'util';

const gzip = util.promisify(zlib.gzip);
const gunzip = util.promisify(zlib.gunzip);

interface CompressedMemory {
  id: string;
  title: string;
  content_compressed: string; // Base64 compressed content
  embedding_compressed: string; // Compressed embedding
  metadata: {
    type: 'conversation' | 'transcription' | 'knowledge' | 'analysis';
    userId: string;
    tags: string[];
    importance: number;
    created: string;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
}

interface WorkspaceMemoryConfig {
  folderId: string;
  maxFileSize: number; // KB
  retentionDays: number;
  compressionLevel: number;
}

export class WorkspaceMemorySystem {
  private drive: any;
  private config: WorkspaceMemoryConfig;
  private memoryCache = new Map<string, any>();

  constructor(drive: any) {
    this.drive = drive;
    this.config = {
      folderId: '', // Will be set after folder creation
      maxFileSize: 500, // 500KB max per file
      retentionDays: 90, // Keep for 90 days
      compressionLevel: 6 // Good compression vs speed
    };
  }

  // Initialize memory folder in Google Drive
  async initialize(userId: string): Promise<string> {
    console.log(`Initializing Workspace Memory for ${userId}`);

    try {
      // Create KimbleAI Memory folder
      const folderResponse = await this.drive.files.create({
        resource: {
          name: 'KimbleAI-Memory',
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      });

      this.config.folderId = folderResponse.data.id;

      // Create index file
      await this.createIndexFile(userId);

      console.log(`Memory system initialized. Folder ID: ${this.config.folderId}`);
      return this.config.folderId;

    } catch (error) {
      console.error('Failed to initialize memory system:', error);
      throw error;
    }
  }

  // Compress and store memory with ultra-efficient packing
  async storeCompressedMemory(
    userId: string,
    content: string,
    metadata: Partial<CompressedMemory['metadata']> & { title?: string }
  ): Promise<string> {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Generate embedding (only for important content)
    let embedding: number[] = [];
    if ((metadata.importance || 0) > 0.6 && content.length > 100) {
      const embeddingResult = await this.generateEmbedding(content);
      embedding = embeddingResult || [];
    }

    // Compress content and embedding
    const contentBuffer = await gzip(Buffer.from(content, 'utf8'));
    const embeddingBuffer = embedding.length > 0
      ? await gzip(Buffer.from(JSON.stringify(embedding)))
      : Buffer.alloc(0);

    const compressedMemory: CompressedMemory = {
      id,
      title: metadata.title || 'Memory',
      content_compressed: contentBuffer.toString('base64'),
      embedding_compressed: embeddingBuffer.toString('base64'),
      metadata: {
        type: metadata.type || 'knowledge',
        userId,
        tags: metadata.tags || [],
        importance: metadata.importance || 0.5,
        created: new Date().toISOString(),
        originalSize: content.length + (embedding.length * 4),
        compressedSize: contentBuffer.length + embeddingBuffer.length,
        compressionRatio: (contentBuffer.length + embeddingBuffer.length) / (content.length + (embedding.length * 4))
      }
    };

    // Store in Drive as compressed JSON
    await this.storeInDrive(id, compressedMemory);

    // Update lightweight index in Supabase
    await this.updateIndex(compressedMemory);

    console.log(`Stored compressed memory: ${id} (${compressedMemory.metadata.compressionRatio.toFixed(2)}x compression)`);
    return id;
  }

  // Store conversation with intelligent chunking and compression
  async storeConversationEfficient(userId: string, conversation: any): Promise<string[]> {
    const chunks: string[] = [];

    // Combine multiple messages into chunks for better compression
    const messageBatches = this.batchMessages(conversation.messages || []);

    for (let i = 0; i < messageBatches.length; i++) {
      const batch = messageBatches[i];
      const batchContent = batch.map(m => `${m.role}: ${m.content}`).join('\n\n');

      // Only store if batch has meaningful content
      if (batchContent.length > 50) {
        const chunkId = await this.storeCompressedMemory(userId, batchContent, {
          type: 'conversation',
          title: `${conversation.title || 'Chat'} - Part ${i + 1}`,
          tags: ['conversation', conversation.project || 'general'],
          importance: this.calculateImportance(batch)
        });
        chunks.push(chunkId);
      }
    }

    return chunks;
  }

  // Store large audio transcription with maximum efficiency
  async storeTranscriptionEfficient(
    userId: string,
    audioFileName: string,
    transcription: string,
    audioDurationMs?: number
  ): Promise<{
    transcriptionId: string;
    chunks: string[];
    storageStats: { originalSize: number; compressedSize: number; savings: string };
  }> {
    const originalSize = transcription.length;

    // Store full transcription (compressed)
    const transcriptionId = await this.storeCompressedMemory(userId, transcription, {
      type: 'transcription',
      title: `Transcription: ${audioFileName}`,
      tags: ['transcription', 'audio', audioFileName],
      importance: 0.9
    });

    // Smart chunking based on content
    const chunks: string[] = [];
    const textChunks = this.intelligentChunk(transcription, 600); // 600 char chunks

    for (let i = 0; i < textChunks.length; i++) {
      const chunkId = await this.storeCompressedMemory(userId, textChunks[i], {
        type: 'transcription',
        title: `${audioFileName} - Segment ${i + 1}`,
        tags: ['transcription', 'chunk', audioFileName],
        importance: 0.7 - (i * 0.1) // Declining importance
      });
      chunks.push(chunkId);
    }

    // Calculate storage stats
    const totalCompressed = await this.calculateTotalCompressedSize([transcriptionId, ...chunks]);
    const savings = ((originalSize - totalCompressed) / originalSize * 100).toFixed(1);

    return {
      transcriptionId,
      chunks,
      storageStats: {
        originalSize,
        compressedSize: totalCompressed,
        savings: `${savings}% space saved`
      }
    };
  }

  // Efficient vector search with compressed embeddings
  async vectorSearchEfficient(
    userId: string,
    query: string,
    options: {
      limit?: number;
      threshold?: number;
      types?: string[];
      maxAge?: number; // Days
    } = {}
  ): Promise<Array<{ id: string; content: string; similarity: number; metadata: any }>> {
    const { limit = 10, threshold = 0.7, types, maxAge } = options;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);
    if (!queryEmbedding) {
      // Return empty results if embedding generation fails
      return [];
    }

    // Get relevant memory IDs from index
    const relevantIds = await this.getRelevantMemoryIds(userId, { types, maxAge });

    // Load and decompress memories
    const results: Array<{
      id: string;
      content: string;
      similarity: number;
      metadata: any;
    }> = [];
    const loadPromises = relevantIds.slice(0, 50).map(async (id) => { // Limit to 50 for performance
      try {
        const memory = await this.loadCompressedMemory(id);

        if (memory.embedding_compressed) {
          const embeddingBuffer = Buffer.from(memory.embedding_compressed, 'base64');
          const decompressedEmbedding = await gunzip(embeddingBuffer);
          const embedding = JSON.parse(decompressedEmbedding.toString());

          const similarity = this.cosineSimilarity(queryEmbedding, embedding);

          if (similarity >= threshold) {
            const contentBuffer = Buffer.from(memory.content_compressed, 'base64');
            const content = (await gunzip(contentBuffer)).toString();

            results.push({
              id: memory.id,
              content,
              similarity,
              metadata: memory.metadata
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to process memory ${id}:`, error);
      }
    });

    await Promise.all(loadPromises);

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Test the system with current Google API access
  async testWithCurrentAccess(userId: string): Promise<{
    success: boolean;
    folderId?: string;
    testMemoryId?: string;
    compressionStats?: any;
    error?: string;
  }> {
    try {
      console.log('Testing Workspace Memory System...');

      // 1. Initialize folder structure
      const folderId = await this.initialize(userId);

      // 2. Store a test memory
      const testContent = `Test memory entry created on ${new Date().toISOString()}.
      This is a test of the Google Workspace optimized memory system with compression and efficient storage.
      The system should compress this content and store it in Google Drive with minimal storage footprint.`;

      const testMemoryId = await this.storeCompressedMemory(userId, testContent, {
        type: 'knowledge',
        title: 'System Test Memory',
        tags: ['test', 'system-check'],
        importance: 0.8
      });

      // 3. Verify storage and compression
      const storedMemory = await this.loadCompressedMemory(testMemoryId);

      const compressionStats = {
        originalSize: testContent.length,
        compressedSize: storedMemory.metadata.compressedSize,
        compressionRatio: storedMemory.metadata.compressionRatio,
        spaceSaved: `${((1 - storedMemory.metadata.compressionRatio) * 100).toFixed(1)}%`
      };

      // 4. Test vector search
      const searchResults = await this.vectorSearchEfficient(userId, 'system test', {
        limit: 5,
        threshold: 0.5
      });

      console.log('Workspace Memory System test completed successfully!');

      return {
        success: true,
        folderId,
        testMemoryId,
        compressionStats
      };

    } catch (error) {
      console.error('Workspace Memory System test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Helper methods
  private async storeInDrive(id: string, compressedMemory: CompressedMemory): Promise<void> {
    const content = JSON.stringify(compressedMemory, null, 0); // No pretty printing to save space

    await this.drive.files.create({
      resource: {
        name: `${id}.json`,
        parents: [this.config.folderId]
      },
      media: {
        mimeType: 'application/json',
        body: content
      }
    });
  }

  protected async loadCompressedMemory(id: string): Promise<CompressedMemory> {
    const response = await this.drive.files.list({
      q: `name='${id}.json' and parents in '${this.config.folderId}'`,
      fields: 'files(id)'
    });

    if (response.data.files.length === 0) {
      throw new Error(`Memory ${id} not found`);
    }

    const fileResponse = await this.drive.files.get({
      fileId: response.data.files[0].id,
      alt: 'media'
    });

    // Handle case where data is already parsed or is a string
    const data = typeof fileResponse.data === 'string'
      ? JSON.parse(fileResponse.data)
      : fileResponse.data;

    return data;
  }

  private async generateEmbedding(text: string): Promise<number[] | null> {
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

  private cosineSimilarity(a: number[], b: number[]): number {
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

  private batchMessages(messages: any[]): any[][] {
    const batches: any[][] = [];
    let currentBatch: any[] = [];
    let currentSize = 0;
    const maxBatchSize = 1000; // characters

    for (const message of messages) {
      const messageSize = JSON.stringify(message).length;

      if (currentSize + messageSize > maxBatchSize && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [message];
        currentSize = messageSize;
      } else {
        currentBatch.push(message);
        currentSize += messageSize;
      }
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  private calculateImportance(messages: any[]): number {
    // Calculate importance based on message length, type, etc.
    const avgLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
    return Math.min(0.9, 0.3 + (avgLength / 500));
  }

  private intelligentChunk(text: string, maxSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= maxSize) {
        currentChunk += sentence + '. ';
      } else {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = sentence + '. ';
      }
    }

    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks;
  }

  private async createIndexFile(userId: string): Promise<void> {
    const indexContent = JSON.stringify({
      userId,
      created: new Date().toISOString(),
      version: '1.0',
      description: 'KimbleAI Workspace Memory System Index',
      totalMemories: 0,
      totalSize: 0
    });

    await this.drive.files.create({
      resource: {
        name: 'memory-index.json',
        parents: [this.config.folderId]
      },
      media: {
        mimeType: 'application/json',
        body: indexContent
      }
    });
  }

  private async updateIndex(memory: CompressedMemory): Promise<void> {
    // Update lightweight Supabase index for fast searching
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.from('workspace_memory_index').upsert({
      id: memory.id,
      user_id: memory.metadata.userId,
      title: memory.title,
      type: memory.metadata.type,
      tags: memory.metadata.tags,
      importance: memory.metadata.importance,
      original_size: memory.metadata.originalSize,
      compressed_size: memory.metadata.compressedSize,
      created_at: memory.metadata.created
    });
  }

  protected async getRelevantMemoryIds(userId: string, filters: any): Promise<string[]> {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from('workspace_memory_index')
      .select('id')
      .eq('user_id', userId)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.types) {
      query = query.in('type', filters.types);
    }

    if (filters.maxAge) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.maxAge);
      query = query.gte('created_at', cutoffDate.toISOString());
    }

    const { data } = await query;
    return (data || []).map((item: any) => item.id);
  }

  private async calculateTotalCompressedSize(ids: string[]): Promise<number> {
    let totalSize = 0;

    for (const id of ids) {
      try {
        const memory = await this.loadCompressedMemory(id);
        totalSize += memory.metadata.compressedSize;
      } catch (error) {
        console.warn(`Could not calculate size for ${id}`);
      }
    }

    return totalSize;
  }
}