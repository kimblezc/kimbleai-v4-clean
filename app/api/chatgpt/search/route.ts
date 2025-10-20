/**
 * API ENDPOINT: Search ChatGPT Conversations
 *
 * POST /api/chatgpt/search
 *
 * Performs semantic search across imported ChatGPT conversations
 * using vector similarity.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  searchChatGPTConversations,
  searchChatGPTChunks
} from '@/lib/chatgpt-import-system';

export async function POST(request: NextRequest) {
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

    // Get search parameters
    const body = await request.json();
    const {
      query,
      searchType = 'conversations', // 'conversations' or 'chunks'
      similarityThreshold = 0.7,
      limit = 10,
      startDate,
      endDate
    } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Perform search
    let results;

    if (searchType === 'chunks') {
      // Granular search across chunks
      results = await searchChatGPTChunks(query, userId, {
        similarityThreshold,
        limit
      });
    } else {
      // Search full conversations
      results = await searchChatGPTConversations(query, userId, {
        similarityThreshold,
        limit,
        startDate,
        endDate
      });
    }

    // Format results
    const formattedResults = results.map((result: any) => ({
      ...result,
      createDate: result.create_time ? new Date(result.create_time * 1000).toISOString() : null,
      updateDate: result.update_time ? new Date(result.update_time * 1000).toISOString() : null,
      similarity: Math.round(result.similarity * 100) / 100
    }));

    return NextResponse.json({
      query,
      searchType,
      results: formattedResults,
      totalResults: formattedResults.length
    });

  } catch (error: any) {
    console.error('[ChatGPT Search API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}

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

    // Get query from URL parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" or "query" is required' },
        { status: 400 }
      );
    }

    const searchType = searchParams.get('type') || 'conversations';
    const limit = parseInt(searchParams.get('limit') || '10');
    const similarityThreshold = parseFloat(searchParams.get('threshold') || '0.7');

    // Perform search
    let results;

    if (searchType === 'chunks') {
      results = await searchChatGPTChunks(query, userId, {
        similarityThreshold,
        limit
      });
    } else {
      results = await searchChatGPTConversations(query, userId, {
        similarityThreshold,
        limit
      });
    }

    // Format results
    const formattedResults = results.map((result: any) => ({
      ...result,
      createDate: result.create_time ? new Date(result.create_time * 1000).toISOString() : null,
      updateDate: result.update_time ? new Date(result.update_time * 1000).toISOString() : null,
      similarity: Math.round(result.similarity * 100) / 100
    }));

    return NextResponse.json({
      query,
      searchType,
      results: formattedResults,
      totalResults: formattedResults.length
    });

  } catch (error: any) {
    console.error('[ChatGPT Search API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}
