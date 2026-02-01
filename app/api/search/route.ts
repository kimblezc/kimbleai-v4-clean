/**
 * Semantic Search API Endpoint
 *
 * Search across all content using vector similarity
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getAIService } from '@/lib/ai/ai-service';
import { supabase } from '@/lib/db/client';
import {
  asyncHandler,
  AuthenticationError,
  ValidationError,
  validateRequired,
} from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

/**
 * GET: Semantic search across all content
 */
export const GET = asyncHandler(async (req: NextRequest) => {
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const userId = session.user.id;

  logger.apiRequest({
    method: 'GET',
    path: '/api/search',
    userId,
  });

  // 2. Parse query params
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const contentType = searchParams.get('type') as 'messages' | 'files' | 'all' | null;
  const limit = parseInt(searchParams.get('limit') || '20');
  const threshold = parseFloat(searchParams.get('threshold') || '0.7');

  if (!query) {
    throw new ValidationError('Query parameter "q" is required');
  }

  logger.info('Semantic search requested', {
    userId,
    query,
    contentType: contentType || 'all',
    limit,
    threshold,
  });

  // 3. Generate query embedding
  const aiService = getAIService(supabase);

  const embeddingResult = await logger.measure(
    'Generate search embedding',
    async () => await aiService.generateEmbedding({
      userId,
      text: query,
    }),
    { userId, queryLength: query.length }
  );

  const queryEmbedding = embeddingResult.embedding;

  logger.info('Search embedding generated', {
    userId,
    embeddingDimensions: queryEmbedding.length,
    costUsd: embeddingResult.costUsd,
  });

  // 4. Perform semantic search
  const { data: results, error } = await logger.measure(
    'Semantic search',
    async () => await supabase.rpc('search_all_content', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      user_id_filter: userId,
      similarity_threshold: threshold,
      result_limit: limit,
      content_type_filter: contentType || 'all',
    }),
    { userId, query, contentType, limit, threshold }
  );

  if (error) {
    logger.error('Semantic search failed', error as Error, {
      userId,
      query,
    });
    throw new Error(`Search failed: ${error.message}`);
  }

  logger.info('Semantic search completed', {
    userId,
    query,
    resultsCount: results?.length || 0,
    threshold,
  });

  // 5. Group results by type
  const groupedResults = {
    messages: results?.filter((r: any) => r.content_type === 'message') || [],
    files: results?.filter((r: any) => r.content_type === 'file') || [],
  };

  // 6. Log cost and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'GET',
    path: '/api/search',
    status: 200,
    durationMs,
    userId,
  });

  logger.costTracking({
    userId,
    provider: 'openai',
    model: 'text-embedding-3-small',
    costUsd: embeddingResult.costUsd,
    tokensUsed: Math.ceil(query.length / 4),
  });

  return NextResponse.json({
    query,
    results: results || [],
    grouped: groupedResults,
    count: results?.length || 0,
    threshold,
    costUsd: embeddingResult.costUsd,
  });
});

/**
 * POST: Semantic search with more complex options
 */
export const POST = asyncHandler(async (req: NextRequest) => {
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const userId = session.user.id;

  logger.apiRequest({
    method: 'POST',
    path: '/api/search',
    userId,
  });

  // 2. Parse and validate body
  const body = await req.json();

  validateRequired(body, ['query']);

  const {
    query,
    contentType = 'all',
    limit = 20,
    threshold = 0.7,
    filters = {},
  } = body;

  logger.info('Advanced semantic search requested', {
    userId,
    query,
    contentType,
    limit,
    threshold,
    filters,
  });

  // 3. Generate query embedding
  const aiService = getAIService(supabase);

  const embeddingResult = await logger.measure(
    'Generate search embedding',
    async () => await aiService.generateEmbedding({
      userId,
      text: query,
    }),
    { userId, queryLength: query.length }
  );

  const queryEmbedding = embeddingResult.embedding;

  // 4. Perform semantic search with filters
  const { data: results, error } = await logger.measure(
    'Advanced semantic search',
    async () => await supabase.rpc('search_all_content', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      user_id_filter: userId,
      similarity_threshold: threshold,
      result_limit: limit,
      content_type_filter: contentType,
      // Additional filters can be added here
    }),
    { userId, query, contentType, limit, threshold }
  );

  if (error) {
    logger.error('Advanced semantic search failed', error as Error, {
      userId,
      query,
    });
    throw new Error(`Search failed: ${error.message}`);
  }

  logger.info('Advanced semantic search completed', {
    userId,
    query,
    resultsCount: results?.length || 0,
    threshold,
  });

  // 5. Apply client-side filters if needed
  let filteredResults = results || [];

  if (filters.conversationId) {
    filteredResults = filteredResults.filter(
      (r: any) => r.conversation_id === filters.conversationId
    );
  }

  if (filters.projectId) {
    filteredResults = filteredResults.filter(
      (r: any) => r.project_id === filters.projectId
    );
  }

  if (filters.dateFrom) {
    const fromDate = new Date(filters.dateFrom);
    filteredResults = filteredResults.filter(
      (r: any) => new Date(r.created_at) >= fromDate
    );
  }

  if (filters.dateTo) {
    const toDate = new Date(filters.dateTo);
    filteredResults = filteredResults.filter(
      (r: any) => new Date(r.created_at) <= toDate
    );
  }

  // 6. Group results by type
  const groupedResults = {
    messages: filteredResults.filter((r: any) => r.content_type === 'message'),
    files: filteredResults.filter((r: any) => r.content_type === 'file'),
  };

  // 7. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'POST',
    path: '/api/search',
    status: 200,
    durationMs,
    userId,
  });

  logger.costTracking({
    userId,
    provider: 'openai',
    model: 'text-embedding-3-small',
    costUsd: embeddingResult.costUsd,
    tokensUsed: Math.ceil(query.length / 4),
  });

  return NextResponse.json({
    query,
    results: filteredResults,
    grouped: groupedResults,
    count: filteredResults.length,
    threshold,
    filters,
    costUsd: embeddingResult.costUsd,
  });
});
