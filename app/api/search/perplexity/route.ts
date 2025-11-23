/**
 * Perplexity AI Search API Endpoint
 * AI-powered web search with citations
 *
 * Features:
 * - Real-time web search
 * - Automatic citations
 * - Cost tracking ($0.005 per search)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPerplexityClient } from '@/lib/perplexity-client';
import { costMonitor } from '@/lib/cost-monitor';
import { getUserByIdentifier } from '@/lib/user-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  return NextResponse.json({
    status: 'OK',
    service: 'KimbleAI Perplexity Search API',
    version: '1.0',
    available: !!process.env.PERPLEXITY_API_KEY,
    pricing: {
      sonar: '$0.001 per search (fast)',
      sonarPro: '$0.005 per search (recommended)',
      sonarReasoning: '$0.010 per search (deep analysis)',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const {
      query,
      userId = 'zach',
      model = 'sonar-pro',
      searchDomainFilter,
      searchRecencyFilter,
    } = await request.json();

    // Validate query
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    if (query.length > 1000) {
      return NextResponse.json(
        { error: 'Query too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    // Validate user
    let user;
    try {
      user = await getUserByIdentifier(userId, supabase);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    } catch (error) {
      console.error(`[Perplexity] User validation failed:`, error);
      return NextResponse.json({ error: 'Failed to validate user' }, { status: 401 });
    }

    // Get Perplexity client
    let client;
    try {
      client = getPerplexityClient();
    } catch (error) {
      console.error(`[Perplexity] Client not available:`, error);
      return NextResponse.json(
        { error: 'Perplexity search service not available' },
        { status: 503 }
      );
    }

    // Perform search
    const startTime = Date.now();
    const result = await client.search({
      query,
      model: model as 'sonar-pro' | 'sonar' | 'sonar-reasoning',
      searchDomainFilter,
      searchRecencyFilter: searchRecencyFilter as 'day' | 'week' | 'month' | 'year' | undefined,
      returnImages: false,
      returnRelatedQuestions: true,
    });

    const processingTime = Date.now() - startTime;

    // Track cost
    await costMonitor.trackAPICall({
      user_id: user.id,
      model: result.model,
      endpoint: '/api/search/perplexity',
      input_tokens: query.length,
      output_tokens: result.answer.length,
      cost_usd: result.cost,
      timestamp: new Date().toISOString(),
      metadata: {
        citationCount: result.citations.length,
        processingTime,
        searchesPerformed: result.searchesPerformed,
      },
    });

    console.log(
      `[Perplexity] Success: "${query.substring(0, 50)}..." → ${result.citations.length} citations, $${result.cost.toFixed(4)}, ${processingTime}ms`
    );

    return NextResponse.json({
      success: true,
      answer: result.answer,
      citations: result.citations,
      relatedQuestions: result.relatedQuestions,
      metadata: {
        model: result.model,
        processingTime,
        cost: result.cost,
        searchesPerformed: result.searchesPerformed,
        citationCount: result.citations.length,
      },
    });
  } catch (error) {
    console.error('[Perplexity] Error:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
