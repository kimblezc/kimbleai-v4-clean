// app/api/files/search/route.ts
// API endpoint for searching uploaded files

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

// Generate embedding for semantic search
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000),
      dimensions: 1536
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach';
    const query = searchParams.get('query') || '';
    const fileType = searchParams.get('fileType') || 'all';
    const projectId = searchParams.get('projectId') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const searchMode = searchParams.get('mode') || 'hybrid'; // 'text', 'semantic', 'hybrid'

    if (!query) {
      return NextResponse.json(
        { error: 'Search query required' },
        { status: 400 }
      );
    }

    // Get user
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log(`[FILE_SEARCH] Query: "${query}", Type: ${fileType}, Mode: ${searchMode}`);

    // Text-based search in uploaded_files table
    let textResults: any[] = [];
    if (searchMode === 'text' || searchMode === 'hybrid') {
      let textQuery = supabase
        .from('uploaded_files')
        .select('*')
        .eq('user_id', userData.id)
        .ilike('filename', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fileType && fileType !== 'all') {
        textQuery = textQuery.eq('category', fileType);
      }

      if (projectId) {
        textQuery = textQuery.eq('project_id', projectId);
      }

      const { data: textFiles } = await textQuery;
      textResults = textFiles || [];
    }

    // Semantic search in knowledge base
    let semanticResults: any[] = [];
    if (searchMode === 'semantic' || searchMode === 'hybrid') {
      const embedding = await generateEmbedding(query);

      if (embedding) {
        // Search in knowledge_base with vector similarity
        let semanticQuery = supabase
          .from('knowledge_base')
          .select(`
            *,
            uploaded_files!inner(*)
          `)
          .eq('user_id', userData.id)
          .limit(limit);

        if (fileType && fileType !== 'all') {
          semanticQuery = semanticQuery.eq('uploaded_files.category', fileType);
        }

        if (projectId) {
          semanticQuery = semanticQuery.eq('uploaded_files.project_id', projectId);
        }

        // Also do text search in knowledge base content
        semanticQuery = semanticQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%`);

        const { data: knowledgeResults } = await semanticQuery;

        if (knowledgeResults) {
          semanticResults = knowledgeResults.map((kb: any) => ({
            ...kb.uploaded_files,
            knowledgeContent: kb.content,
            knowledgeTitle: kb.title,
            relevanceScore: 0.8 // Placeholder, would use actual vector similarity
          }));
        }
      }
    }

    // Search in processed tables for content
    let contentResults: any[] = [];

    // Search audio transcriptions
    if (fileType === 'all' || fileType === 'audio') {
      const { data: audioFiles } = await supabase
        .from('audio_transcriptions')
        .select(`
          *,
          uploaded_files!inner(*)
        `)
        .eq('user_id', userData.id)
        .ilike('text', `%${query}%`)
        .limit(Math.ceil(limit / 3));

      if (audioFiles) {
        contentResults.push(
          ...audioFiles.map((audio: any) => ({
            ...audio.uploaded_files,
            matchedContent: audio.text.substring(0, 200),
            contentType: 'audio_transcription',
            duration: audio.duration
          }))
        );
      }
    }

    // Search processed documents (PDFs, docs, spreadsheets, emails)
    if (fileType === 'all' || ['pdf', 'document', 'spreadsheet', 'email'].includes(fileType)) {
      const { data: docFiles } = await supabase
        .from('processed_documents')
        .select(`
          *,
          uploaded_files!inner(*)
        `)
        .eq('user_id', userData.id)
        .ilike('content', `%${query}%`)
        .limit(Math.ceil(limit / 3));

      if (docFiles) {
        contentResults.push(
          ...docFiles.map((doc: any) => ({
            ...doc.uploaded_files,
            matchedContent: doc.content.substring(0, 200),
            contentType: doc.document_type,
            pageCount: doc.page_count
          }))
        );
      }
    }

    // Search image analysis
    if (fileType === 'all' || fileType === 'image') {
      const { data: imageFiles } = await supabase
        .from('processed_images')
        .select(`
          *,
          uploaded_files!inner(*)
        `)
        .eq('user_id', userData.id)
        .ilike('analysis', `%${query}%`)
        .limit(Math.ceil(limit / 3));

      if (imageFiles) {
        contentResults.push(
          ...imageFiles.map((img: any) => ({
            ...img.uploaded_files,
            matchedContent: img.analysis.substring(0, 200),
            contentType: 'image_analysis',
            thumbnailUrl: img.thumbnail_url
          }))
        );
      }
    }

    // Combine and deduplicate results
    const allResults = [...textResults, ...semanticResults, ...contentResults];
    const uniqueResults = Array.from(
      new Map(allResults.map((item: any) => [item.id, item])).values()
    ).slice(0, limit);

    // Format results
    const formattedResults = uniqueResults.map((file: any) => ({
      id: file.id,
      filename: file.filename,
      category: file.category,
      fileType: file.file_type,
      fileSize: file.file_size,
      uploadedAt: file.created_at,
      processedAt: file.processed_at,
      status: file.status,
      projectId: file.project_id,
      matchedContent: file.matchedContent || file.knowledgeContent || '',
      contentType: file.contentType || file.category,
      metadata: file.metadata,
      processingResult: file.processing_result,
      // Additional context
      duration: file.duration,
      pageCount: file.pageCount,
      thumbnailUrl: file.thumbnailUrl,
      relevanceScore: file.relevanceScore || 0.5
    }));

    // Sort by relevance and date
    formattedResults.sort((a: any, b: any) => {
      if (a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });

    return NextResponse.json({
      success: true,
      query,
      fileType,
      searchMode,
      resultsCount: formattedResults.length,
      results: formattedResults,
      searchedIn: {
        files: textResults.length > 0,
        knowledgeBase: semanticResults.length > 0,
        content: contentResults.length > 0
      }
    });

  } catch (error: any) {
    console.error('[FILE_SEARCH] Error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
      { status: 500 }
    );
  }
}

// POST endpoint for advanced search with complex filters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId = 'zach',
      query,
      filters = {},
      limit = 20,
      sortBy = 'relevance'
    } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Search query required' },
        { status: 400 }
      );
    }

    // Get user
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log(`[FILE_SEARCH_POST] Advanced search:`, { query, filters });

    // Build complex query based on filters
    let searchQuery = supabase
      .from('uploaded_files')
      .select('*')
      .eq('user_id', userData.id);

    // Apply filters
    if (filters.categories && filters.categories.length > 0) {
      searchQuery = searchQuery.in('category', filters.categories);
    }

    if (filters.projectIds && filters.projectIds.length > 0) {
      searchQuery = searchQuery.in('project_id', filters.projectIds);
    }

    if (filters.status) {
      searchQuery = searchQuery.eq('status', filters.status);
    }

    if (filters.dateFrom) {
      searchQuery = searchQuery.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      searchQuery = searchQuery.lte('created_at', filters.dateTo);
    }

    if (filters.minSize) {
      searchQuery = searchQuery.gte('file_size', filters.minSize);
    }

    if (filters.maxSize) {
      searchQuery = searchQuery.lte('file_size', filters.maxSize);
    }

    // Apply text search
    searchQuery = searchQuery.ilike('filename', `%${query}%`);

    // Apply sorting
    switch (sortBy) {
      case 'date':
        searchQuery = searchQuery.order('created_at', { ascending: false });
        break;
      case 'size':
        searchQuery = searchQuery.order('file_size', { ascending: false });
        break;
      case 'name':
        searchQuery = searchQuery.order('filename', { ascending: true });
        break;
      default:
        searchQuery = searchQuery.order('created_at', { ascending: false });
    }

    searchQuery = searchQuery.limit(limit);

    const { data: files, error } = await searchQuery;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      query,
      filters,
      sortBy,
      resultsCount: files?.length || 0,
      results: files || []
    });

  } catch (error: any) {
    console.error('[FILE_SEARCH_POST] Error:', error);
    return NextResponse.json(
      { error: 'Advanced search failed', details: error.message },
      { status: 500 }
    );
  }
}
