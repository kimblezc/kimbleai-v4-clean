/**
 * SEARCH TEST API
 *
 * Test endpoint for validating semantic search functionality
 * Runs predefined test queries and measures performance
 *
 * GET /api/search/test
 * GET /api/search/test?verbose=true
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/lib/embeddings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEFAULT_USER_ID = 'zach-admin-001';

// Test queries
const TEST_QUERIES = [
  'What did we discuss about the project?',
  'Find audio files from last week',
  'Show me all D&D transcripts',
  'military transition planning',
  'Meeting notes with Rebecca',
  'technical decisions',
  'code examples',
  'project updates'
];

interface TestResult {
  query: string;
  resultCount: number;
  topSimilarity: number;
  avgSimilarity: number;
  searchTime: number;
  embeddingTime: number;
  success: boolean;
  error?: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const verbose = searchParams.get('verbose') === 'true';
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;

    console.log('[Search Test] Starting test suite...');

    // Get search statistics first
    const { data: stats, error: statsError } = await supabase.rpc('get_search_stats', {
      p_user_id: userId
    });

    if (statsError) {
      console.error('[Search Test] Failed to get stats:', statsError);
    }

    // Run test queries
    const results: TestResult[] = [];

    for (const query of TEST_QUERIES) {
      console.log(`[Search Test] Testing: "${query}"`);

      const queryStartTime = Date.now();

      try {
        // Generate embedding
        const embeddingStartTime = Date.now();
        const queryEmbedding = await generateEmbedding(query);
        const embeddingTime = Date.now() - embeddingStartTime;

        // Search
        const searchStartTime = Date.now();
        const { data: searchResults, error: searchError } = await supabase.rpc('search_all_content', {
          query_embedding: queryEmbedding,
          p_user_id: userId,
          match_threshold: 0.5, // Lower threshold for testing
          match_count: 20,
          p_project_id: null,
          p_content_types: null
        });

        const searchTime = Date.now() - searchStartTime;
        const totalTime = Date.now() - queryStartTime;

        if (searchError) {
          results.push({
            query,
            resultCount: 0,
            topSimilarity: 0,
            avgSimilarity: 0,
            searchTime: totalTime,
            embeddingTime,
            success: false,
            error: searchError.message
          });
          continue;
        }

        // Calculate metrics
        const similarities = (searchResults || []).map((r: any) => r.similarity);
        const topSimilarity = similarities.length > 0 ? Math.max(...similarities) : 0;
        const avgSimilarity = similarities.length > 0
          ? similarities.reduce((a: number, b: number) => a + b, 0) / similarities.length
          : 0;

        results.push({
          query,
          resultCount: searchResults?.length || 0,
          topSimilarity: parseFloat(topSimilarity.toFixed(4)),
          avgSimilarity: parseFloat(avgSimilarity.toFixed(4)),
          searchTime: totalTime,
          embeddingTime,
          success: true
        });

        console.log(`  ✓ Found ${searchResults?.length || 0} results in ${totalTime}ms`);

      } catch (error: any) {
        results.push({
          query,
          resultCount: 0,
          topSimilarity: 0,
          avgSimilarity: 0,
          searchTime: Date.now() - queryStartTime,
          embeddingTime: 0,
          success: false,
          error: error.message
        });

        console.log(`  ✗ Error: ${error.message}`);
      }
    }

    const totalTime = Date.now() - startTime;

    // Calculate summary metrics
    const successfulTests = results.filter(r => r.success);
    const failedTests = results.filter(r => !r.success);
    const avgSearchTime = successfulTests.length > 0
      ? successfulTests.reduce((sum, r) => sum + r.searchTime, 0) / successfulTests.length
      : 0;
    const avgEmbeddingTime = successfulTests.length > 0
      ? successfulTests.reduce((sum, r) => sum + r.embeddingTime, 0) / successfulTests.length
      : 0;
    const avgResults = successfulTests.length > 0
      ? successfulTests.reduce((sum, r) => sum + r.resultCount, 0) / successfulTests.length
      : 0;
    const avgTopSimilarity = successfulTests.length > 0
      ? successfulTests.reduce((sum, r) => sum + r.topSimilarity, 0) / successfulTests.length
      : 0;

    const summary = {
      totalTests: results.length,
      successful: successfulTests.length,
      failed: failedTests.length,
      avgSearchTime: Math.round(avgSearchTime),
      avgEmbeddingTime: Math.round(avgEmbeddingTime),
      avgResults: Math.round(avgResults),
      avgTopSimilarity: parseFloat(avgTopSimilarity.toFixed(4)),
      totalTime,
      passRate: ((successfulTests.length / results.length) * 100).toFixed(1) + '%'
    };

    const response: any = {
      success: true,
      timestamp: new Date().toISOString(),
      userId,
      summary,
      searchCoverage: stats || []
    };

    if (verbose) {
      response.testResults = results;
    }

    // Performance assessment
    const performance = {
      speed: avgSearchTime < 500 ? 'EXCELLENT' : avgSearchTime < 1000 ? 'GOOD' : 'NEEDS_IMPROVEMENT',
      relevance: avgTopSimilarity > 0.8 ? 'EXCELLENT' : avgTopSimilarity > 0.6 ? 'GOOD' : 'NEEDS_IMPROVEMENT',
      coverage: avgResults > 5 ? 'EXCELLENT' : avgResults > 2 ? 'GOOD' : 'LIMITED'
    };

    response.performance = performance;

    console.log('[Search Test] Test suite completed');
    console.log(`  Total: ${results.length} tests`);
    console.log(`  Success: ${successfulTests.length}`);
    console.log(`  Failed: ${failedTests.length}`);
    console.log(`  Avg Time: ${avgSearchTime.toFixed(0)}ms`);
    console.log(`  Performance: ${performance.speed}`);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[Search Test] Test suite error:', error);
    return NextResponse.json({
      error: 'Test suite failed',
      details: error.message,
      totalTime: Date.now() - startTime
    }, { status: 500 });
  }
}
