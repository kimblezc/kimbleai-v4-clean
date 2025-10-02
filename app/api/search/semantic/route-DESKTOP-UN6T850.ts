/**
 * Semantic Search API
 * Provides semantic search across content using OpenAI embeddings and vector similarity
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { UniversalFileProcessor } from '@/lib/file-processors';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface SemanticSearchRequest {
  query: string;
  userId?: string;
  limit?: number;
  threshold?: number;
  contentTypes?: string[];
  tags?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  searchMode?: 'semantic' | 'hybrid' | 'keyword';
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  contentType: string;
  similarity: number;
  metadata: Record<string, any>;
  chunks?: ChunkResult[];
  preview: string;
  created: string;
}

interface ChunkResult {
  id: string;
  content: string;
  similarity: number;
  position: number;
  metadata: Record<string, any>;
}

interface SearchStats {
  totalResults: number;
  searchTime: number;
  queryEmbeddingTime: number;
  searchMethod: string;
  threshold: number;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const {
      query,
      userId = 'default',
      limit = 10,
      threshold = 0.7,
      contentTypes = [],
      tags = [],
      dateRange,
      searchMode = 'semantic'
    } = await req.json() as SemanticSearchRequest;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Generate embedding for the search query
    const embeddingStartTime = Date.now();
    const queryEmbedding = await generateQueryEmbedding(query);
    const queryEmbeddingTime = Date.now() - embeddingStartTime;

    // Perform search based on mode
    let results: SearchResult[] = [];
    let searchMethod = '';

    switch (searchMode) {
      case 'semantic':
        results = await performSemanticSearch(queryEmbedding, {
          userId,
          limit,
          threshold,
          contentTypes,
          tags,
          dateRange
        });
        searchMethod = 'Vector similarity search';
        break;

      case 'hybrid':
        results = await performHybridSearch(query, queryEmbedding, {
          userId,
          limit,
          threshold,
          contentTypes,
          tags,
          dateRange
        });
        searchMethod = 'Hybrid semantic + keyword search';
        break;

      case 'keyword':
        results = await performKeywordSearch(query, {
          userId,
          limit,
          contentTypes,
          tags,
          dateRange
        });
        searchMethod = 'Full-text keyword search';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid search mode. Use semantic, hybrid, or keyword' },
          { status: 400 }
        );
    }

    const searchTime = Date.now() - startTime;

    const stats: SearchStats = {
      totalResults: results.length,
      searchTime,
      queryEmbeddingTime,
      searchMethod,
      threshold
    };

    return NextResponse.json({
      success: true,
      results,
      stats,
      query,
      searchMode,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Semantic search error:', error);
    return NextResponse.json(
      {
        error: 'Semantic search failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Generate embedding for search query
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query.replace(/\n/g, ' ').trim(),
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw new Error('Failed to generate query embedding');
  }
}

/**
 * Perform semantic search using vector similarity
 */
async function performSemanticSearch(
  queryEmbedding: number[],
  options: {
    userId: string;
    limit: number;
    threshold: number;
    contentTypes: string[];
    tags: string[];
    dateRange?: { start?: string; end?: string };
  }
): Promise<SearchResult[]> {
  try {
    // Use PostgreSQL's vector similarity search with pgvector
    let query = supabase
      .rpc('search_all_content', {
        query_embedding: queryEmbedding,
        similarity_threshold: options.threshold,
        match_count: options.limit,
        user_id_filter: options.userId
      });

    // Add filters
    if (options.contentTypes.length > 0) {
      query = query.in('content_type', options.contentTypes);
    }

    if (options.dateRange?.start) {
      query = query.gte('created_at', options.dateRange.start);
    }

    if (options.dateRange?.end) {
      query = query.lte('created_at', options.dateRange.end);
    }

    const { data: searchResults, error } = await query;

    if (error) {
      throw new Error(`Database search error: ${error.message}`);
    }

    // Transform results
    const results: SearchResult[] = (searchResults || []).map((item: any) => ({
      id: item.id,
      title: item.title || 'Untitled',
      content: item.content || '',
      contentType: item.content_type || 'unknown',
      similarity: item.similarity || 0,
      metadata: item.metadata || {},
      preview: generatePreview(item.content || ''),
      created: item.created_at || '',
      chunks: [] // Can be populated with chunk-level results if needed
    }));

    // Filter by tags if specified
    if (options.tags.length > 0) {
      return results.filter(result =>
        options.tags.some(tag =>
          result.metadata.tags?.includes(tag)
        )
      );
    }

    return results;

  } catch (error) {
    console.error('Semantic search database error:', error);
    throw error;
  }
}

/**
 * Perform hybrid search (semantic + keyword)
 */
async function performHybridSearch(
  query: string,
  queryEmbedding: number[],
  options: {
    userId: string;
    limit: number;
    threshold: number;
    contentTypes: string[];
    tags: string[];
    dateRange?: { start?: string; end?: string };
  }
): Promise<SearchResult[]> {
  // Get semantic results
  const semanticResults = await performSemanticSearch(queryEmbedding, options);

  // Get keyword results
  const keywordResults = await performKeywordSearch(query, {
    userId: options.userId,
    limit: options.limit,
    contentTypes: options.contentTypes,
    tags: options.tags,
    dateRange: options.dateRange
  });

  // Merge and rank results
  const combinedResults = new Map<string, SearchResult>();

  // Add semantic results with higher weight
  semanticResults.forEach(result => {
    combinedResults.set(result.id, {
      ...result,
      similarity: result.similarity * 0.7 // Weight semantic results
    });
  });

  // Add keyword results with lower weight, boost if already in semantic results
  keywordResults.forEach(result => {
    if (combinedResults.has(result.id)) {
      // Boost items that appear in both searches
      const existing = combinedResults.get(result.id)!;
      existing.similarity = Math.min(existing.similarity + 0.2, 1.0);
    } else {
      combinedResults.set(result.id, {
        ...result,
        similarity: 0.5 // Lower base score for keyword-only results
      });
    }
  });

  // Sort by similarity and return top results
  return Array.from(combinedResults.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, options.limit);
}

/**
 * Perform keyword search using PostgreSQL full-text search
 */
async function performKeywordSearch(
  query: string,
  options: {
    userId: string;
    limit: number;
    contentTypes: string[];
    tags: string[];
    dateRange?: { start?: string; end?: string };
  }
): Promise<SearchResult[]> {
  try {
    let dbQuery = supabase
      .from('semantic_content')
      .select('*')
      .textSearch('content', query, { type: 'websearch' })
      .eq('user_id', options.userId)
      .limit(options.limit);

    // Add filters
    if (options.contentTypes.length > 0) {
      dbQuery = dbQuery.in('content_type', options.contentTypes);
    }

    if (options.dateRange?.start) {
      dbQuery = dbQuery.gte('created_at', options.dateRange.start);
    }

    if (options.dateRange?.end) {
      dbQuery = dbQuery.lte('created_at', options.dateRange.end);
    }

    const { data: searchResults, error } = await dbQuery;

    if (error) {
      throw new Error(`Keyword search error: ${error.message}`);
    }

    // Transform results
    const results: SearchResult[] = (searchResults || []).map((item: any) => ({
      id: item.id,
      title: item.title || 'Untitled',
      content: item.content || '',
      contentType: item.content_type || 'unknown',
      similarity: 0.8, // Default similarity for keyword matches
      metadata: item.metadata || {},
      preview: generatePreview(item.content || ''),
      created: item.created_at || '',
      chunks: []
    }));

    // Filter by tags if specified
    if (options.tags.length > 0) {
      return results.filter(result =>
        options.tags.some(tag =>
          result.metadata.tags?.includes(tag)
        )
      );
    }

    return results;

  } catch (error) {
    console.error('Keyword search error:', error);
    throw error;
  }
}

/**
 * Generate content preview
 */
function generatePreview(content: string, maxLength: number = 200): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength).trim() + '...';
}

/**
 * GET endpoint for search stats and capabilities
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      // Get search statistics
      const stats = await getSearchStats();
      return NextResponse.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });
    }

    // Default: return API info
    return NextResponse.json({
      service: 'Semantic Search API',
      version: '1.0.0',
      status: 'operational',
      capabilities: {
        embeddingModel: 'text-embedding-3-small',
        searchModes: ['semantic', 'hybrid', 'keyword'],
        supportedContentTypes: UniversalFileProcessor.getSupportedMimeTypes(),
        vectorDimensions: 1536,
        maxQueryLength: 8000
      },
      endpoints: {
        search: 'POST /api/search/semantic',
        stats: 'GET /api/search/semantic?action=stats'
      },
      searchOptions: {
        limit: 'Number of results to return (default: 10, max: 100)',
        threshold: 'Similarity threshold for semantic search (default: 0.7)',
        contentTypes: 'Array of content types to filter by',
        tags: 'Array of tags to filter by',
        dateRange: 'Object with start/end dates for filtering',
        searchMode: 'semantic (default), hybrid, or keyword'
      }
    });

  } catch (error: any) {
    console.error('Search API GET error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get search system statistics
 */
async function getSearchStats(): Promise<Record<string, any>> {
  try {
    const { data: contentStats, error: contentError } = await supabase
      .rpc('get_search_stats');

    if (contentError) {
      throw new Error(`Failed to get search stats: ${contentError.message}`);
    }

    return {
      totalDocuments: contentStats?.total_documents || 0,
      totalChunks: contentStats?.total_chunks || 0,
      contentTypes: contentStats?.content_types || {},
      indexHealth: contentStats?.index_health || 'unknown',
      lastIndexed: contentStats?.last_indexed || null
    };

  } catch (error) {
    console.error('Error getting search stats:', error);
    return {
      totalDocuments: 0,
      totalChunks: 0,
      contentTypes: {},
      indexHealth: 'error',
      error: (error as Error).message
    };
  }
}