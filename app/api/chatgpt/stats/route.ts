/**
 * API ENDPOINT: ChatGPT Import Statistics
 *
 * GET /api/chatgpt/stats
 *
 * Returns statistics about imported ChatGPT conversations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getChatGPTStats } from '@/lib/chatgpt-import-system';

export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.email;

    // Get statistics
    const stats = await getChatGPTStats(userId);

    // Format date range
    if (stats.date_range) {
      stats.date_range_formatted = {
        earliest: stats.date_range.earliest
          ? new Date(stats.date_range.earliest * 1000).toISOString()
          : null,
        latest: stats.date_range.latest
          ? new Date(stats.date_range.latest * 1000).toISOString()
          : null
      };
    }

    return NextResponse.json({
      stats,
      message: stats.total_conversations > 0
        ? `You have ${stats.total_conversations} ChatGPT conversations imported with ${stats.embedded_conversations} fully embedded (${stats.embedding_coverage_percent}% coverage)`
        : 'No ChatGPT conversations imported yet'
    });

  } catch (error: any) {
    console.error('[ChatGPT Stats API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get statistics' },
      { status: 500 }
    );
  }
}
