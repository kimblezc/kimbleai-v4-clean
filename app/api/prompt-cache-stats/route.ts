import { NextResponse } from 'next/server';
import { PromptCache } from '@/lib/prompt-cache';

/**
 * GET /api/prompt-cache-stats
 *
 * Returns current prompt cache statistics including:
 * - Cache size and capacity
 * - Hit rate
 * - Estimated cost savings
 * - Projected monthly savings
 */
export async function GET() {
  try {
    const stats = PromptCache.getCacheStats();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cacheStats: stats,
      interpretation: {
        performance: stats.hitRate,
        costSavings: `$${stats.totalCostSaved} saved so far`,
        monthlyProjection: `~$${stats.estimatedMonthlySavings}/month estimated`,
        efficiency: stats.hits > 0 ? 'Caching is working effectively' : 'No cache hits yet'
      }
    });

  } catch (error: any) {
    console.error('[PromptCacheStats] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * DELETE /api/prompt-cache-stats
 *
 * Clears the entire prompt cache (useful for testing)
 */
export async function DELETE() {
  try {
    PromptCache.clearPromptCache();

    return NextResponse.json({
      success: true,
      message: 'Prompt cache cleared successfully'
    });

  } catch (error: any) {
    console.error('[PromptCacheStats] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
