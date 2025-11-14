import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { getValidAccessToken } from '@/lib/google-token-refresh';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SearchResult {
  id: string;
  source: 'gmail' | 'drive' | 'local' | 'knowledge_base';
  type: 'email' | 'file' | 'document' | 'attachment' | 'knowledge';
  title: string;
  content: string;
  snippet: string;
  url?: string;
  metadata: any;
  relevanceScore: number;
  timestamp?: string;
}

/**
 * Unified Search API - Searches across Gmail, Drive, local files, and knowledge base
 *
 * GET /api/search/unified?q=search+query&userId=zach&sources=gmail,drive,local,kb
 *
 * Query Parameters:
 * - q: Search query (required)
 * - userId: User ID (default: 'zach')
 * - sources: Comma-separated list of sources to search (default: all)
 *            Options: gmail, drive, local, kb (knowledge_base)
 * - limit: Max results per source (default: 10)
 * - semanticSearch: Use vector/semantic search (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const userId = searchParams.get('userId') || 'zach';
    const sourcesParam = searchParams.get('sources') || 'gmail,drive,local,kb';
    const limit = parseInt(searchParams.get('limit') || '10');
    const useSemanticSearch = searchParams.get('semanticSearch') !== 'false';

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        error: 'Query parameter "q" is required'
      }, { status: 400 });
    }

    console.log(`[Unified Search] Query: "${query}" | User: ${userId} | Sources: ${sourcesParam}`);

    const sources = sourcesParam.split(',').map(s => s.trim());
    const results: SearchResult[] = [];

    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id, email')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 });
    }

    // Generate embedding for semantic search
    let queryEmbedding: number[] | null = null;
    if (useSemanticSearch) {
      queryEmbedding = await generateEmbedding(query);
    }

    // Execute searches in parallel
    const searchPromises: Promise<SearchResult[]>[] = [];

    if (sources.includes('gmail')) {
      searchPromises.push(searchGmail(userId, query, limit));
    }

    if (sources.includes('drive')) {
      searchPromises.push(searchDrive(userId, query, limit));
    }

    if (sources.includes('local')) {
      searchPromises.push(searchLocal(userData.id, query, queryEmbedding, limit));
    }

    if (sources.includes('kb')) {
      searchPromises.push(searchKnowledgeBase(userData.id, query, queryEmbedding, limit));
    }

    // Wait for all searches to complete
    const searchResults = await Promise.all(searchPromises);

    // Flatten and merge results
    searchResults.forEach(sourceResults => {
      results.push(...sourceResults);
    });

    // Sort by relevance score (descending)
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Limit total results
    const maxTotalResults = limit * sources.length;
    const finalResults = results.slice(0, maxTotalResults);

    console.log(`[Unified Search] Found ${finalResults.length} total results across ${sources.length} sources`);

    return NextResponse.json({
      success: true,
      query,
      sources: sources,
      totalResults: finalResults.length,
      results: finalResults,
      breakdown: {
        gmail: finalResults.filter(r => r.source === 'gmail').length,
        drive: finalResults.filter(r => r.source === 'drive').length,
        local: finalResults.filter(r => r.source === 'local').length,
        knowledge_base: finalResults.filter(r => r.source === 'knowledge_base').length
      }
    });

  } catch (error: any) {
    console.error('[Unified Search] Error:', error);
    return NextResponse.json({
      error: 'Search failed',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Generate embedding for semantic search
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000),
        dimensions: 1536
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('[Unified Search] Embedding error:', error);
    return null;
  }
}

/**
 * Search Gmail
 */
async function searchGmail(userId: string, query: string, limit: number): Promise<SearchResult[]> {
  try {
    console.log(`[Unified Search] Searching Gmail for: "${query}"`);

    // Get valid access token (auto-refreshes if expired)
    const accessToken = await getValidAccessToken(userId);

    if (!accessToken) {
      console.log('[Unified Search] Gmail: User not authenticated or token refresh failed');
      return [];
    }

    // Initialize Gmail client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    oauth2Client.setCredentials({
      access_token: accessToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Search Gmail
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: limit
    });

    const messages = response.data.messages || [];
    const results: SearchResult[] = [];

    // Get details for each message
    for (const message of messages.slice(0, limit)) {
      try {
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date']
        });

        const headers = details.data.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        const snippet = details.data.snippet || '';

        results.push({
          id: message.id!,
          source: 'gmail',
          type: 'email',
          title: subject,
          content: snippet,
          snippet: snippet.substring(0, 200) + '...',
          url: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
          metadata: {
            from,
            date,
            labels: details.data.labelIds || []
          },
          relevanceScore: 0.8, // Base score for Gmail results
          timestamp: date
        });
      } catch (msgError) {
        console.error(`[Unified Search] Error fetching Gmail message ${message.id}:`, msgError);
      }
    }

    console.log(`[Unified Search] Gmail: Found ${results.length} results`);
    return results;

  } catch (error: any) {
    console.error('[Unified Search] Gmail search error:', error);
    return [];
  }
}

/**
 * Search Google Drive
 */
async function searchDrive(userId: string, query: string, limit: number): Promise<SearchResult[]> {
  try {
    console.log(`[Unified Search] Searching Drive for: "${query}"`);

    // Get valid access token (auto-refreshes if expired)
    const accessToken = await getValidAccessToken(userId);

    if (!accessToken) {
      console.log('[Unified Search] Drive: User not authenticated or token refresh failed');
      return [];
    }

    // Initialize Drive client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    oauth2Client.setCredentials({
      access_token: accessToken
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Search Drive
    const response = await drive.files.list({
      q: `fullText contains '${query}' or name contains '${query}'`,
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink, size, description)',
      pageSize: limit,
      orderBy: 'modifiedTime desc'
    });

    const files = response.data.files || [];
    const results: SearchResult[] = [];

    for (const file of files) {
      results.push({
        id: file.id!,
        source: 'drive',
        type: 'file',
        title: file.name || 'Untitled',
        content: file.description || file.name || '',
        snippet: (file.description || file.name || '').substring(0, 200) + '...',
        url: file.webViewLink,
        metadata: {
          mimeType: file.mimeType,
          size: file.size,
          modifiedTime: file.modifiedTime
        },
        relevanceScore: 0.75, // Base score for Drive results
        timestamp: file.modifiedTime || undefined
      });
    }

    console.log(`[Unified Search] Drive: Found ${results.length} results`);
    return results;

  } catch (error: any) {
    console.error('[Unified Search] Drive search error:', error);
    return [];
  }
}

/**
 * Search local/uploaded files
 */
async function searchLocal(userDbId: string, query: string, embedding: number[] | null, limit: number): Promise<SearchResult[]> {
  try {
    console.log(`[Unified Search] Searching local files for: "${query}"`);

    let results: SearchResult[] = [];

    if (embedding) {
      // Semantic search using embeddings
      const { data: files } = await supabase.rpc('search_files', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: limit,
        filter_user_id: userDbId
      });

      if (files) {
        results = files.map((file: any) => ({
          id: file.id,
          source: 'local' as const,
          type: 'document' as const,
          title: file.filename,
          content: file.processed_content || file.full_text || '',
          snippet: (file.processed_content || file.full_text || '').substring(0, 200) + '...',
          metadata: {
            fileType: file.file_type,
            size: file.file_size,
            uploadedAt: file.indexed_at
          },
          relevanceScore: file.similarity || 0.7,
          timestamp: file.indexed_at
        }));
      }
    } else {
      // Full-text search
      const { data: files } = await supabase
        .from('indexed_files')
        .select('id, filename, file_type, file_size, full_text, processed_content, indexed_at')
        .eq('user_id', userDbId)
        .or(`filename.ilike.%${query}%,full_text.ilike.%${query}%`)
        .limit(limit);

      if (files) {
        results = files.map(file => ({
          id: file.id,
          source: 'local' as const,
          type: 'document' as const,
          title: file.filename,
          content: file.processed_content || file.full_text || '',
          snippet: (file.processed_content || file.full_text || '').substring(0, 200) + '...',
          metadata: {
            fileType: file.file_type,
            size: file.file_size,
            uploadedAt: file.indexed_at
          },
          relevanceScore: 0.6,
          timestamp: file.indexed_at
        }));
      }
    }

    console.log(`[Unified Search] Local files: Found ${results.length} results`);
    return results;

  } catch (error: any) {
    console.error('[Unified Search] Local search error:', error);
    return [];
  }
}

/**
 * Search knowledge base
 */
async function searchKnowledgeBase(userDbId: string, query: string, embedding: number[] | null, limit: number): Promise<SearchResult[]> {
  try {
    console.log(`[Unified Search] Searching knowledge base for: "${query}"`);

    let results: SearchResult[] = [];

    if (embedding) {
      // Semantic search using embeddings
      const { data: knowledge } = await supabase.rpc('search_knowledge', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: limit,
        filter_user_id: userDbId
      });

      if (knowledge) {
        results = knowledge.map((item: any) => ({
          id: item.id,
          source: 'knowledge_base' as const,
          type: 'knowledge' as const,
          title: item.title || item.source_type,
          content: item.content,
          snippet: item.content.substring(0, 200) + '...',
          metadata: {
            sourceType: item.source_type,
            category: item.category,
            importance: item.importance,
            tags: item.tags
          },
          relevanceScore: item.similarity || 0.7,
          timestamp: item.created_at
        }));
      }
    } else {
      // Full-text search
      const { data: knowledge } = await supabase
        .from('knowledge_base')
        .select('id, title, content, source_type, category, importance, tags, created_at')
        .eq('user_id', userDbId)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(limit)
        .order('importance', { ascending: false });

      if (knowledge) {
        results = knowledge.map(item => ({
          id: item.id,
          source: 'knowledge_base' as const,
          type: 'knowledge' as const,
          title: item.title || item.source_type,
          content: item.content,
          snippet: item.content.substring(0, 200) + '...',
          metadata: {
            sourceType: item.source_type,
            category: item.category,
            importance: item.importance,
            tags: item.tags
          },
          relevanceScore: 0.6,
          timestamp: item.created_at
        }));
      }
    }

    console.log(`[Unified Search] Knowledge base: Found ${results.length} results`);
    return results;

  } catch (error: any) {
    console.error('[Unified Search] Knowledge base search error:', error);
    return [];
  }
}
