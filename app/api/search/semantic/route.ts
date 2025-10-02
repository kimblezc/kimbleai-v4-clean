/**
 * SEMANTIC SEARCH API - AI-powered search across all content
 *
 * Searches messages, files, transcriptions, and knowledge base using vector embeddings
 * Fast, relevant results with < 500ms response time
 *
 * Endpoints:
 * - GET /api/search/semantic?q=query&type=all&projectId=xxx
 * - POST /api/search/semantic (with filters in body)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/lib/embeddings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Default user for now (only 2 users)
const DEFAULT_USER_ID = 'zach-admin-001';

interface SearchFilters {
  userId?: string;
  projectId?: string;
  contentTypes?: ('message' | 'file' | 'transcript' | 'knowledge')[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  threshold?: number;
}

interface SearchResult {
  id: string;
  type: string;
  title: string;
  content: string;
  preview: string;
  similarity: number;
  projectId?: string;
  createdAt: string;
  metadata?: any;
  highlight?: string;
}

/**
 * GET /api/search/semantic
 * Simple query parameter search
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;
    const projectId = searchParams.get('projectId') || undefined;
    const contentType = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');
    const threshold = parseFloat(searchParams.get('threshold') || '0.7');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        error: 'Query parameter "q" is required'
      }, { status: 400 });
    }

    // Build content types filter
    const contentTypes = contentType === 'all'
      ? undefined
      : [contentType as 'message' | 'file' | 'transcript' | 'knowledge'];

    const results = await performSemanticSearch(query, {
      userId,
      projectId,
      contentTypes,
      limit,
      threshold
    });

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      query,
      results,
      count: results.length,
      filters: {
        userId,
        projectId,
        contentTypes: contentTypes || ['message', 'file', 'transcript', 'knowledge'],
        limit,
        threshold
      },
      performance: {
        totalTime: processingTime,
        embeddingTime: results[0]?.metadata?.embeddingTime || 0,
        searchTime: processingTime - (results[0]?.metadata?.embeddingTime || 0)
      }
    });

  } catch (error: any) {
    console.error('[Semantic Search] GET error:', error);
    return NextResponse.json({
      error: 'Search failed',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/search/semantic
 * Advanced search with detailed filters
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { query, filters = {} } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        error: 'Query is required'
      }, { status: 400 });
    }

    const searchFilters: SearchFilters = {
      userId: filters.userId || DEFAULT_USER_ID,
      projectId: filters.projectId,
      contentTypes: filters.contentTypes,
      startDate: filters.startDate,
      endDate: filters.endDate,
      limit: filters.limit || 20,
      threshold: filters.threshold || 0.7
    };

    const results = await performSemanticSearch(query, searchFilters);

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      query,
      results,
      count: results.length,
      filters: searchFilters,
      performance: {
        totalTime: processingTime,
        embeddingTime: results[0]?.metadata?.embeddingTime || 0,
        searchTime: processingTime - (results[0]?.metadata?.embeddingTime || 0)
      }
    });

  } catch (error: any) {
    console.error('[Semantic Search] POST error:', error);
    return NextResponse.json({
      error: 'Search failed',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Core semantic search logic
 */
async function performSemanticSearch(
  query: string,
  filters: SearchFilters
): Promise<SearchResult[]> {
  const embeddingStartTime = Date.now();

  // 1. Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);
  const embeddingTime = Date.now() - embeddingStartTime;

  console.log(`[Semantic Search] Generated query embedding in ${embeddingTime}ms`);

  // 2. Search using unified search function
  const { data: rawResults, error } = await supabase.rpc('search_all_content', {
    query_embedding: queryEmbedding,
    p_user_id: filters.userId,
    match_threshold: filters.threshold || 0.7,
    match_count: filters.limit || 20,
    p_project_id: filters.projectId || null,
    p_content_types: filters.contentTypes || null
  });

  if (error) {
    console.error('[Semantic Search] Database error:', error);
    throw new Error(`Search query failed: ${error.message}`);
  }

  if (!rawResults || rawResults.length === 0) {
    console.log('[Semantic Search] No results found');
    return [];
  }

  console.log(`[Semantic Search] Found ${rawResults.length} results`);

  // 3. Format results
  const formattedResults: SearchResult[] = rawResults.map((result: any) => {
    const preview = generatePreview(result.content, query);
    const highlight = generateHighlight(result.content, query);

    return {
      id: result.id,
      type: result.content_type,
      title: result.title || 'Untitled',
      content: result.content,
      preview,
      similarity: parseFloat(result.similarity.toFixed(4)),
      projectId: result.project_id,
      createdAt: result.created_at,
      metadata: {
        ...result.metadata,
        embeddingTime,
        sourceId: result.source_id
      },
      highlight
    };
  });

  // 4. Apply date filters if provided (client-side filtering)
  let filteredResults = formattedResults;

  if (filters.startDate) {
    const startDate = new Date(filters.startDate);
    filteredResults = filteredResults.filter(r =>
      new Date(r.createdAt) >= startDate
    );
  }

  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    filteredResults = filteredResults.filter(r =>
      new Date(r.createdAt) <= endDate
    );
  }

  return filteredResults;
}

/**
 * Generate content preview (first 200 chars)
 */
function generatePreview(content: string, query: string): string {
  if (!content) return '';

  // Try to find query in content for context
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const queryIndex = lowerContent.indexOf(lowerQuery);

  if (queryIndex !== -1) {
    // Show context around the query
    const start = Math.max(0, queryIndex - 50);
    const end = Math.min(content.length, queryIndex + query.length + 150);
    const preview = content.substring(start, end);
    return (start > 0 ? '...' : '') + preview + (end < content.length ? '...' : '');
  }

  // Just show beginning
  return content.substring(0, 200) + (content.length > 200 ? '...' : '');
}

/**
 * Generate highlighted snippet
 */
function generateHighlight(content: string, query: string): string {
  if (!content) return '';

  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const queryIndex = lowerContent.indexOf(lowerQuery);

  if (queryIndex === -1) {
    return content.substring(0, 100);
  }

  const start = Math.max(0, queryIndex - 30);
  const end = Math.min(content.length, queryIndex + query.length + 70);

  return content.substring(start, end);
}

/**
 * Get search statistics (helper function, not exported for route)
 */
async function getSearchStats(userId: string = DEFAULT_USER_ID) {
  const { data, error } = await supabase.rpc('get_search_stats', {
    p_user_id: userId
  });

  if (error) {
    console.error('[Semantic Search] Stats error:', error);
    return null;
  }

  return data;
}
