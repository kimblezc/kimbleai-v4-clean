/**
 * SEARCH SUGGESTIONS API
 *
 * Provides search suggestions as user types
 * Returns recent searches and common queries
 *
 * GET /api/search/suggestions?q=trans&userId=zach-admin-001
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEFAULT_USER_ID = 'zach-admin-001';

// Common search queries for suggestions
const COMMON_QUERIES = [
  'What did we discuss about the project?',
  'Find audio files from last week',
  'Show me all transcripts',
  'Meeting notes',
  'Technical decisions',
  'Action items',
  'Project updates',
  'Code examples',
  'Design documents',
  'Recent conversations'
];

interface Suggestion {
  text: string;
  type: 'recent' | 'common' | 'content';
  count?: number;
  timestamp?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;
    const limit = parseInt(searchParams.get('limit') || '10');

    const suggestions: Suggestion[] = [];

    // 1. Get common queries that match
    if (query.length > 0) {
      const lowerQuery = query.toLowerCase();
      const matchingCommon = COMMON_QUERIES
        .filter(q => q.toLowerCase().includes(lowerQuery))
        .slice(0, 5)
        .map(text => ({
          text,
          type: 'common' as const
        }));

      suggestions.push(...matchingCommon);
    }

    // 2. Get recent content that matches
    if (query.length >= 3) {
      // Search recent conversation titles
      const { data: conversations } = await supabase
        .from('conversations')
        .select('title, created_at')
        .eq('user_id', userId)
        .ilike('title', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(3);

      if (conversations) {
        suggestions.push(...conversations.map(c => ({
          text: c.title,
          type: 'content' as const,
          timestamp: c.created_at
        })));
      }

      // Search file names
      const { data: files } = await supabase
        .from('indexed_files')
        .select('filename, created_at')
        .eq('user_id', userId)
        .ilike('filename', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(3);

      if (files) {
        suggestions.push(...files.map(f => ({
          text: `File: ${f.filename}`,
          type: 'content' as const,
          timestamp: f.created_at
        })));
      }

      // Search transcription filenames
      const { data: transcriptions } = await supabase
        .from('audio_transcriptions')
        .select('filename, created_at')
        .eq('user_id', userId)
        .ilike('filename', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(3);

      if (transcriptions) {
        suggestions.push(...transcriptions.map(t => ({
          text: `Transcript: ${t.filename}`,
          type: 'content' as const,
          timestamp: t.created_at
        })));
      }
    }

    // 3. If no query, show common queries
    if (query.length === 0) {
      suggestions.push(...COMMON_QUERIES.slice(0, limit).map(text => ({
        text,
        type: 'common' as const
      })));
    }

    // Remove duplicates and limit
    const uniqueSuggestions = suggestions
      .filter((s, index, self) =>
        index === self.findIndex(t => t.text === s.text)
      )
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      query,
      suggestions: uniqueSuggestions,
      count: uniqueSuggestions.length
    });

  } catch (error: any) {
    console.error('[Search Suggestions] Error:', error);
    return NextResponse.json({
      error: 'Failed to get suggestions',
      details: error.message
    }, { status: 500 });
  }
}
