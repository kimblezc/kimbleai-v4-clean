// lib/rag-search.ts
// Production-ready RAG (Retrieval-Augmented Generation) semantic search system

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { extractFileContent, ExtractedContent } from './file-content-extractor';
import { UnifiedFileSystem, FileRegistryEntry } from './unified-file-system';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Knowledge base entry
export interface KnowledgeBaseEntry {
  id: string;
  user_id: string;
  source_type: string;
  source_id: string;
  file_id?: string;
  category: string;
  title: string;
  content: string;
  embedding?: number[];
  importance: number;
  tags: string[];
  metadata: any;
  created_at: string;
  updated_at?: string;
}

// Search result
export interface SearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  source_type: string;
  source_id: string;
  file_id?: string;
  similarity: number;
  metadata: any;
  tags: string[];
  created_at: string;
  fileInfo?: FileRegistryEntry;
}

// Search options
export interface SearchOptions {
  userId: string;
  query: string;
  projectId?: string;
  category?: string;
  fileSource?: string;
  similarityThreshold?: number;
  limit?: number;
  hybridSearch?: boolean; // Use both vector and keyword search
}

/**
 * RAG Search System
 * Handles semantic search across all indexed content
 */
export class RAGSearchSystem {
  /**
   * Generate embedding for text using OpenAI
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Truncate text to 8000 characters (safe limit for embeddings)
      const truncatedText = text.substring(0, 8000);

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: truncatedText,
        dimensions: 1536,
      });

      return response.data[0].embedding;
    } catch (error: any) {
      console.error('[RAG] Embedding generation failed:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Index a file - extract content and store in knowledge base
   */
  static async indexFile(
    fileId: string,
    userId: string,
    projectId?: string
  ): Promise<{ success: boolean; entriesCreated: number; error?: string }> {
    console.log(`[RAG] Indexing file ${fileId}`);

    try {
      // Get file from registry
      const file = await UnifiedFileSystem.getFile(fileId);
      if (!file) {
        return { success: false, entriesCreated: 0, error: 'File not found' };
      }

      // Extract content
      const extracted = await extractFileContent(file);
      if (!extracted.text || extracted.text.trim().length === 0) {
        console.log('[RAG] No text content extracted');

        // Mark as processed even though no content was extracted
        await UnifiedFileSystem.markAsProcessed(fileId, {
          extractedContent: extracted,
          note: 'No text content to index',
        });

        return {
          success: true,
          entriesCreated: 0,
          error: 'No text content extracted',
        };
      }

      // Chunk content for better search granularity
      const chunks = this.chunkText(extracted.text, 1000, 200);
      console.log(`[RAG] Created ${chunks.length} chunks from content`);

      const knowledgeBaseIds: string[] = [];

      // Store each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Generate embedding
        const embedding = await this.generateEmbedding(chunk);

        // Create knowledge base entry
        const { data, error } = await supabase
          .from('knowledge_base')
          .insert({
            user_id: userId,
            source_type: 'file',
            source_id: fileId,
            file_id: fileId,
            category: this.categorizeContent(file.mime_type),
            title: `${file.filename} (chunk ${i + 1}/${chunks.length})`,
            content: chunk,
            embedding: JSON.stringify(embedding), // Store as JSON string for compatibility
            importance: 0.7,
            tags: [
              ...file.tags,
              file.file_source,
              this.categorizeContent(file.mime_type),
            ],
            metadata: {
              filename: file.filename,
              mimeType: file.mime_type,
              fileSource: file.file_source,
              projectId: projectId,
              chunkIndex: i,
              totalChunks: chunks.length,
              extractedMetadata: extracted.metadata,
            },
          })
          .select()
          .single();

        if (error) {
          console.error(`[RAG] Failed to create knowledge entry for chunk ${i}:`, error);
        } else if (data) {
          knowledgeBaseIds.push(data.id);
        }
      }

      // Update file registry
      await UnifiedFileSystem.markAsProcessed(
        fileId,
        {
          extractedContent: extracted,
          chunksCreated: chunks.length,
          indexedAt: new Date().toISOString(),
        },
        knowledgeBaseIds
      );

      console.log(`[RAG] Successfully indexed file with ${knowledgeBaseIds.length} entries`);

      return {
        success: true,
        entriesCreated: knowledgeBaseIds.length,
      };
    } catch (error: any) {
      console.error('[RAG] Indexing failed:', error);
      return {
        success: false,
        entriesCreated: 0,
        error: error.message,
      };
    }
  }

  /**
   * Search knowledge base using hybrid approach (vector + keyword)
   */
  static async search(options: SearchOptions): Promise<SearchResult[]> {
    console.log(`[RAG] Searching for: "${options.query}"`);

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(options.query);

      if (options.hybridSearch !== false) {
        // Hybrid search (default) - uses database function
        return await this.hybridSearch(options, queryEmbedding);
      } else {
        // Vector-only search
        return await this.vectorSearch(options, queryEmbedding);
      }
    } catch (error: any) {
      console.error('[RAG] Search failed:', error);
      return [];
    }
  }

  /**
   * Hybrid search using database function (vector + keyword)
   */
  private static async hybridSearch(
    options: SearchOptions,
    queryEmbedding: number[]
  ): Promise<SearchResult[]> {
    const { data, error } = await supabase.rpc('search_knowledge_base', {
      query_embedding: JSON.stringify(queryEmbedding),
      query_text: options.query,
      user_id_param: options.userId,
      project_id_param: options.projectId || null,
      similarity_threshold: options.similarityThreshold || 0.7,
      match_count: options.limit || 20,
    });

    if (error) {
      console.error('[RAG] Hybrid search error:', error);
      // Fallback to vector search
      return await this.vectorSearch(options, queryEmbedding);
    }

    // Enrich results with file information
    return await this.enrichResults(data || []);
  }

  /**
   * Vector-only search using cosine similarity
   */
  private static async vectorSearch(
    options: SearchOptions,
    queryEmbedding: number[]
  ): Promise<SearchResult[]> {
    let query = supabase
      .from('knowledge_base')
      .select('*')
      .eq('user_id', options.userId);

    // Apply filters
    if (options.projectId) {
      query = query.eq("metadata->>'projectId'", options.projectId);
    }

    if (options.category) {
      query = query.eq('category', options.category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[RAG] Vector search error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Calculate similarities manually
    const results = data
      .filter((entry) => entry.embedding)
      .map((entry) => {
        const embedding =
          typeof entry.embedding === 'string'
            ? JSON.parse(entry.embedding)
            : entry.embedding;
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);

        return {
          ...entry,
          similarity,
        };
      })
      .filter(
        (result) => result.similarity >= (options.similarityThreshold || 0.7)
      )
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.limit || 20);

    return await this.enrichResults(results);
  }

  /**
   * Search files semantically
   */
  static async searchFiles(
    userId: string,
    query: string,
    options?: {
      projectId?: string;
      fileSource?: string;
      similarityThreshold?: number;
      limit?: number;
    }
  ): Promise<
    Array<
      FileRegistryEntry & {
        similarity: number;
        matchedContent: string;
      }
    >
  > {
    console.log(`[RAG] Searching files for: "${query}"`);

    try {
      // Search knowledge base
      const searchResults = await this.search({
        userId,
        query,
        projectId: options?.projectId,
        similarityThreshold: options?.similarityThreshold || 0.75,
        limit: 50,
      });

      // Group by file_id and get unique files
      const fileMap = new Map<
        string,
        { file: FileRegistryEntry; similarity: number; content: string }
      >();

      for (const result of searchResults) {
        if (!result.file_id) continue;

        if (!fileMap.has(result.file_id)) {
          const file = await UnifiedFileSystem.getFile(result.file_id);
          if (file) {
            // Apply file source filter
            if (options?.fileSource && file.file_source !== options.fileSource) {
              continue;
            }

            fileMap.set(result.file_id, {
              file,
              similarity: result.similarity,
              content: result.content,
            });
          }
        } else {
          // Update with higher similarity if found
          const existing = fileMap.get(result.file_id)!;
          if (result.similarity > existing.similarity) {
            existing.similarity = result.similarity;
            existing.content = result.content;
          }
        }
      }

      // Convert to array and sort by similarity
      return Array.from(fileMap.values())
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, options?.limit || 10)
        .map((item) => ({
          ...item.file,
          similarity: item.similarity,
          matchedContent: item.content.substring(0, 300),
        }));
    } catch (error: any) {
      console.error('[RAG] File search failed:', error);
      return [];
    }
  }

  /**
   * Get related files using semantic similarity
   */
  static async getRelatedFiles(
    fileId: string,
    userId: string,
    options?: {
      similarityThreshold?: number;
      limit?: number;
    }
  ): Promise<Array<FileRegistryEntry & { similarity: number }>> {
    console.log(`[RAG] Getting related files for ${fileId}`);

    try {
      // Use database function for semantic relation
      const { data, error } = await supabase.rpc('get_related_files_semantic', {
        file_id_param: fileId,
        user_id_param: userId,
        similarity_threshold: options?.similarityThreshold || 0.75,
        match_count: options?.limit || 10,
      });

      if (error) {
        console.error('[RAG] Related files query error:', error);
        return [];
      }

      // Enrich with full file information
      const results: Array<FileRegistryEntry & { similarity: number }> = [];

      for (const item of data || []) {
        const file = await UnifiedFileSystem.getFile(item.file_id);
        if (file) {
          results.push({
            ...file,
            similarity: item.similarity,
          });
        }
      }

      return results;
    } catch (error: any) {
      console.error('[RAG] Get related files failed:', error);
      return [];
    }
  }

  /**
   * Re-index a file (delete old entries and create new ones)
   */
  static async reindexFile(
    fileId: string,
    userId: string,
    projectId?: string
  ): Promise<{ success: boolean; entriesCreated: number; error?: string }> {
    console.log(`[RAG] Re-indexing file ${fileId}`);

    // Delete existing entries
    await supabase.from('knowledge_base').delete().eq('file_id', fileId);

    // Index again
    return await this.indexFile(fileId, userId, projectId);
  }

  /**
   * Delete all knowledge base entries for a file
   */
  static async deleteFileEntries(fileId: string): Promise<boolean> {
    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('file_id', fileId);

    if (error) {
      console.error('[RAG] Failed to delete file entries:', error);
      return false;
    }

    return true;
  }

  /**
   * Get indexing statistics
   */
  static async getIndexStats(
    userId: string
  ): Promise<{
    totalEntries: number;
    totalFiles: number;
    entriesByCategory: Record<string, number>;
    recentlyIndexed: Array<{ fileId: string; filename: string; indexedAt: string }>;
  }> {
    const { data: entries } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('user_id', userId);

    const { data: files } = await supabase
      .from('file_registry')
      .select('*')
      .eq('user_id', userId)
      .eq('processed', true)
      .order('indexed_at', { ascending: false })
      .limit(10);

    const entriesByCategory: Record<string, number> = {};
    (entries || []).forEach((entry) => {
      entriesByCategory[entry.category] =
        (entriesByCategory[entry.category] || 0) + 1;
    });

    return {
      totalEntries: entries?.length || 0,
      totalFiles: files?.length || 0,
      entriesByCategory,
      recentlyIndexed: (files || []).map((f) => ({
        fileId: f.id,
        filename: f.filename,
        indexedAt: f.indexed_at,
      })),
    };
  }

  /**
   * Helper: Chunk text into overlapping segments
   */
  private static chunkText(
    text: string,
    chunkSize: number = 1000,
    overlap: number = 200
  ): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.substring(start, end));
      start += chunkSize - overlap;
    }

    return chunks.filter((chunk) => chunk.trim().length > 0);
  }

  /**
   * Helper: Categorize content based on MIME type
   */
  private static categorizeContent(mimeType: string): string {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
      return 'presentation';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('text/')) return 'text';
    return 'other';
  }

  /**
   * Helper: Calculate cosine similarity between two vectors
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

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

  /**
   * Helper: Enrich search results with file information
   */
  private static async enrichResults(
    results: any[]
  ): Promise<SearchResult[]> {
    const enriched: SearchResult[] = [];

    for (const result of results) {
      const enrichedResult: SearchResult = {
        id: result.id,
        title: result.title,
        content: result.content,
        category: result.category,
        source_type: result.source_type,
        source_id: result.source_id,
        file_id: result.file_id,
        similarity: result.similarity || 0,
        metadata: result.metadata,
        tags: result.tags || [],
        created_at: result.created_at,
      };

      // Add file info if available
      if (result.file_id) {
        const file = await UnifiedFileSystem.getFile(result.file_id);
        if (file) {
          enrichedResult.fileInfo = file;
        }
      }

      enriched.push(enrichedResult);
    }

    return enriched;
  }
}
