import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserManager } from '@/lib/user-manager';
import { embeddingCache } from '@/lib/embedding-cache';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PERFORMANCE OPTIMIZED: Use embedding cache for significant speedup
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    return await embeddingCache.getEmbedding(text);
  } catch (error) {
    console.error('Embedding error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      userId = 'zach-admin-001',
      searchType = 'hybrid',
      filters = {},
      limit = 10,
      projectId
    } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const userManager = UserManager.getInstance();
    const user = await userManager.getUser(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let results = [];

    switch (searchType) {
      case 'vector':
        results = await performVectorSearch(query, userId, filters, limit, projectId);
        break;
      case 'keyword':
        results = await performKeywordSearch(query, userId, filters, limit, projectId);
        break;
      case 'hybrid':
      default:
        const [vectorResults, keywordResults] = await Promise.all([
          performVectorSearch(query, userId, filters, Math.ceil(limit / 2), projectId),
          performKeywordSearch(query, userId, filters, Math.ceil(limit / 2), projectId)
        ]);

        results = mergeAndDeduplicateResults(vectorResults, keywordResults, limit);
        break;
    }

    await logSearchActivity(userId, query, searchType, results.length, projectId);

    return NextResponse.json({
      success: true,
      query,
      searchType,
      resultsCount: results.length,
      results: results.map(result => ({
        id: result.id,
        title: result.title,
        content: result.content?.substring(0, 200) + '...',
        source_type: result.source_type,
        category: result.category,
        importance: result.importance,
        tags: result.tags,
        created_at: result.created_at,
        metadata: result.metadata,
        similarity: result.similarity || null
      })),
      filters: filters,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Knowledge search error:', error);
    return NextResponse.json({
      error: 'Search failed',
      details: error.message
    }, { status: 500 });
  }
}

async function performVectorSearch(
  query: string,
  userId: string,
  filters: any,
  limit: number,
  projectId?: string
): Promise<any[]> {
  const embedding = await generateEmbedding(query);
  if (!embedding) {
    throw new Error('Failed to generate embedding for search query');
  }

  let baseQuery = supabase
    .from('knowledge_base')
    .select('*')
    .eq('user_id', userId);

  if (projectId) {
    baseQuery = baseQuery.contains('tags', [projectId]);
  }

  if (filters.source_type) {
    baseQuery = baseQuery.eq('source_type', filters.source_type);
  }

  if (filters.category) {
    baseQuery = baseQuery.eq('category', filters.category);
  }

  if (filters.tags && filters.tags.length > 0) {
    baseQuery = baseQuery.overlaps('tags', filters.tags);
  }

  if (filters.min_importance) {
    baseQuery = baseQuery.gte('importance', filters.min_importance);
  }

  if (filters.date_from) {
    baseQuery = baseQuery.gte('created_at', filters.date_from);
  }

  if (filters.date_to) {
    baseQuery = baseQuery.lte('created_at', filters.date_to);
  }

  const { data, error } = await baseQuery.limit(limit * 2);

  if (error) {
    console.error('Vector search error:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  const resultsWithSimilarity = data
    .map(item => ({
      ...item,
      similarity: item.embedding ? cosineSimilarity(embedding, item.embedding) : 0
    }))
    .filter(item => item.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return resultsWithSimilarity;
}

async function performKeywordSearch(
  query: string,
  userId: string,
  filters: any,
  limit: number,
  projectId?: string
): Promise<any[]> {
  const keywords = query.toLowerCase().split(' ').filter(word => word.length > 2);

  let baseQuery = supabase
    .from('knowledge_base')
    .select('*')
    .eq('user_id', userId);

  if (projectId) {
    baseQuery = baseQuery.contains('tags', [projectId]);
  }

  if (filters.source_type) {
    baseQuery = baseQuery.eq('source_type', filters.source_type);
  }

  if (filters.category) {
    baseQuery = baseQuery.eq('category', filters.category);
  }

  if (filters.tags && filters.tags.length > 0) {
    baseQuery = baseQuery.overlaps('tags', filters.tags);
  }

  if (filters.min_importance) {
    baseQuery = baseQuery.gte('importance', filters.min_importance);
  }

  if (filters.date_from) {
    baseQuery = baseQuery.gte('created_at', filters.date_from);
  }

  if (filters.date_to) {
    baseQuery = baseQuery.lte('created_at', filters.date_to);
  }

  const orConditions = keywords.map(keyword =>
    `title.ilike.%${keyword}%,content.ilike.%${keyword}%`
  ).join(',');

  baseQuery = baseQuery.or(orConditions);

  const { data, error } = await baseQuery
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Keyword search error:', error);
    return [];
  }

  return data || [];
}

function mergeAndDeduplicateResults(vectorResults: any[], keywordResults: any[], limit: number): any[] {
  const seen = new Set();
  const merged = [];

  for (const result of [...vectorResults, ...keywordResults]) {
    if (!seen.has(result.id) && merged.length < limit) {
      seen.add(result.id);
      merged.push(result);
    }
  }

  return merged.sort((a, b) => {
    const aScore = (a.similarity || 0) + (a.importance || 0);
    const bScore = (b.similarity || 0) + (b.importance || 0);
    return bScore - aScore;
  });
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}

async function logSearchActivity(
  userId: string,
  query: string,
  searchType: string,
  resultCount: number,
  projectId?: string
) {
  try {
    await supabase
      .from('search_logs')
      .insert({
        user_id: userId,
        query: query,
        search_type: searchType,
        result_count: resultCount,
        project_id: projectId,
        timestamp: new Date().toISOString(),
        metadata: {
          query_length: query.length,
          has_results: resultCount > 0,
          search_context: projectId ? 'project' : 'global'
        }
      });
  } catch (error) {
    console.error('Failed to log search activity:', error);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'info';
  const userId = searchParams.get('userId') || 'zach-admin-001';

  try {
    if (action === 'recent_searches') {
      const { data: recentSearches } = await supabase
        .from('search_logs')
        .select('query, search_type, result_count, timestamp')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(20);

      return NextResponse.json({
        success: true,
        recentSearches: recentSearches || []
      });
    }

    if (action === 'popular_queries') {
      // Note: PostgreSQL GROUP BY not supported in Supabase client, using RPC or custom query would be needed
      const { data: searchLogs } = await supabase
        .from('search_logs')
        .select('query')
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(100);

      // Group by query manually
      const queryFrequency = (searchLogs || []).reduce((acc: any, log) => {
        acc[log.query] = (acc[log.query] || 0) + 1;
        return acc;
      }, {});

      const popularQueries = Object.entries(queryFrequency)
        .map(([query, frequency]) => ({ query, frequency }))
        .sort((a: any, b: any) => b.frequency - a.frequency)
        .slice(0, 10);

      return NextResponse.json({
        success: true,
        popularQueries: popularQueries
      });
    }

    if (action === 'stats') {
      const [totalKnowledge, recentActivity] = await Promise.all([
        supabase
          .from('knowledge_base')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),

        supabase
          .from('search_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      return NextResponse.json({
        success: true,
        stats: {
          total_knowledge_items: totalKnowledge.count || 0,
          searches_last_7_days: recentActivity.count || 0
        }
      });
    }

    return NextResponse.json({
      service: 'KimbleAI Knowledge Search API',
      version: '2.0',
      endpoints: {
        'POST /api/knowledge/search': {
          description: 'Perform hybrid vector + keyword search on knowledge base',
          parameters: {
            query: 'Search query (required)',
            userId: 'User ID (optional, defaults to zach-admin-001)',
            searchType: 'vector|keyword|hybrid (optional, defaults to hybrid)',
            filters: 'Object with source_type, category, tags, min_importance, date_from, date_to',
            limit: 'Maximum results (optional, defaults to 10)',
            projectId: 'Limit search to specific project (optional)'
          }
        },
        'GET /api/knowledge/search?action=recent_searches': 'Get recent search history',
        'GET /api/knowledge/search?action=popular_queries': 'Get popular search queries',
        'GET /api/knowledge/search?action=stats': 'Get knowledge base statistics'
      },
      features: [
        'Vector similarity search using OpenAI embeddings',
        'Full-text keyword search',
        'Hybrid search combining vector + keyword results',
        'Advanced filtering by source, category, tags, importance, dates',
        'Project-scoped search',
        'Search activity logging and analytics',
        'Deduplication and intelligent result merging',
        'Cross-source search (Drive, Gmail, Calendar, Messages)'
      ]
    });

  } catch (error: any) {
    console.error('Knowledge search GET error:', error);
    return NextResponse.json({
      error: 'Failed to process search request',
      details: error.message
    }, { status: 500 });
  }
}