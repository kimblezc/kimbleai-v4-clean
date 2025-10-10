/**
 * Web Search API
 * Provides web search capabilities for Deep Research Mode
 * Uses AI to generate synthetic search results (can be replaced with real search API)
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(request: NextRequest) {
  try {
    const { query, maxResults = 5 } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    console.log('[WebSearch] Searching for:', query);

    // Generate synthetic search results using AI
    // NOTE: In production, replace this with actual search API (Google Custom Search, Bing, SerpAPI)
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use cheaper model for search
      messages: [{
        role: 'system',
        content: `You are a web search simulator. Generate ${maxResults} realistic, diverse search results for the given query.

Return ONLY valid JSON in this exact format:
{
  "results": [
    {
      "title": "Result title",
      "link": "https://example.com/page",
      "snippet": "Brief description of the result content (2-3 sentences with relevant details)",
      "relevance": 0.95,
      "source": "example.com"
    }
  ]
}

Make the results:
- Realistic and believable
- Diverse (different sources and perspectives)
- Relevant to the query
- Include actual information (not generic)
- Vary relevance scores (0.7-1.0)
- Use realistic URLs and domains`
      }, {
        role: 'user',
        content: `Search query: ${query}`
      }],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0.8
    });

    const result = JSON.parse(response.choices[0].message.content || '{"results": []}');

    console.log('[WebSearch] Found', result.results?.length || 0, 'results');

    return NextResponse.json({
      success: true,
      query,
      results: result.results || [],
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[WebSearch] Error:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        details: error.message,
        success: false
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const maxResults = parseInt(searchParams.get('maxResults') || '5');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  // Forward to POST handler
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ query, maxResults }),
    headers: { 'Content-Type': 'application/json' }
  }));
}
