/**
 * UNIVERSAL SEARCH API
 * POST /api/hub/search
 *
 * Search across all platforms using vector similarity
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      query,
      platforms,
      contentTypes,
      startDate,
      endDate,
      minSimilarity = 0.7,
      limit = 20,
    } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    const userEmail = session.user.email;

    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search unified index
    const { data, error } = await supabase.rpc('universal_search', {
      query_embedding: queryEmbedding,
      p_user_id: userEmail,
      platform_filter: platforms || null,
      content_type_filter: contentTypes || null,
      similarity_threshold: minSimilarity,
      match_count: limit,
      start_date: startDate || null,
      end_date: endDate || null,
    });

    if (error) {
      console.error('Search error:', error);
      throw error;
    }

    // Format results
    const results = (data || []).map((item: any) => ({
      id: item.id,
      platform: item.platform_type,
      contentType: item.content_type,
      contentId: item.content_id,
      title: item.title,
      content: item.content,
      summary: item.summary,
      createdDate: item.created_date,
      similarity: item.similarity,
      url: item.url,
      tags: item.tags,
      metadata: item.metadata,
    }));

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('Universal search error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
