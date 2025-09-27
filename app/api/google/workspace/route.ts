import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { WorkspaceRAGSystem } from './rag-system';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Main Google Workspace Memory System API
export async function POST(request: NextRequest) {
  try {
    const { action, userId = 'zach', ...params } = await request.json();

    // Get user's Google token
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json({
        error: 'User not authenticated with Google'
      }, { status: 401 });
    }

    // Initialize Google Drive client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const ragSystem = new WorkspaceRAGSystem(drive);

    // Route actions
    switch (action) {
      case 'initialize':
        return await initializeWorkspaceMemory(ragSystem, userId);

      case 'store_conversation':
        return await storeConversation(ragSystem, userId, params);

      case 'store_document':
        return await storeDocument(ragSystem, userId, params);

      case 'search':
        return await searchMemories(ragSystem, userId, params);

      case 'rag_query':
        return await performRAGQuery(ragSystem, userId, params);

      case 'get_stats':
        return await getMemoryStats(ragSystem, userId);

      case 'test_system':
        return await testWorkspaceSystem(ragSystem, userId);

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: [
            'initialize', 'store_conversation', 'store_document',
            'search', 'rag_query', 'get_stats', 'test_system'
          ]
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Workspace API error:', error);
    return NextResponse.json({
      error: 'Workspace operation failed',
      details: error.message
    }, { status: 500 });
  }
}

// Initialize workspace memory system
async function initializeWorkspaceMemory(ragSystem: WorkspaceRAGSystem, userId: string) {
  console.log(`Initializing workspace memory for ${userId}`);

  try {
    const folderId = await ragSystem.initialize(userId);

    return NextResponse.json({
      success: true,
      message: 'Workspace memory system initialized',
      folderId: folderId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize workspace memory',
      details: error.message
    }, { status: 500 });
  }
}

// Store conversation in workspace memory
async function storeConversation(ragSystem: WorkspaceRAGSystem, userId: string, params: any) {
  const { conversation } = params;

  if (!conversation || !conversation.messages) {
    return NextResponse.json({
      error: 'Invalid conversation data'
    }, { status: 400 });
  }

  try {
    const result = await ragSystem.storeConversationWithRAG(userId, conversation);

    return NextResponse.json({
      success: true,
      message: 'Conversation stored successfully',
      conversationId: result.conversationId,
      chunks: result.chunks.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to store conversation',
      details: error.message
    }, { status: 500 });
  }
}

// Store document in workspace memory
async function storeDocument(ragSystem: WorkspaceRAGSystem, userId: string, params: any) {
  const { title, content, type, tags } = params;

  if (!title || !content) {
    return NextResponse.json({
      error: 'Title and content are required'
    }, { status: 400 });
  }

  try {
    const result = await ragSystem.storeDocumentWithRAG(userId, {
      title,
      content,
      type: type || 'knowledge',
      tags: tags || []
    });

    return NextResponse.json({
      success: true,
      message: 'Document stored successfully',
      documentId: result.documentId,
      chunks: result.chunks.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to store document',
      details: error.message
    }, { status: 500 });
  }
}

// Search memories using vector search
async function searchMemories(ragSystem: WorkspaceRAGSystem, userId: string, params: any) {
  const { query, limit = 10, threshold = 0.6, types, maxAge } = params;

  if (!query) {
    return NextResponse.json({
      error: 'Search query is required'
    }, { status: 400 });
  }

  try {
    const results = await ragSystem.vectorSearchEfficient(userId, query, {
      limit,
      threshold,
      types,
      maxAge
    });

    return NextResponse.json({
      success: true,
      results: results.map(r => ({
        id: r.id,
        title: r.metadata.title,
        content: r.content.substring(0, 300) + '...',
        similarity: r.similarity,
        type: r.metadata.type,
        created: r.metadata.created,
        tags: r.metadata.tags
      })),
      totalResults: results.length,
      query,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Search failed',
      details: error.message
    }, { status: 500 });
  }
}

// Perform RAG query (search + generate answer)
async function performRAGQuery(ragSystem: WorkspaceRAGSystem, userId: string, params: any) {
  const { question, maxTokens, threshold, includeTypes, maxAge } = params;

  if (!question) {
    return NextResponse.json({
      error: 'Question is required'
    }, { status: 400 });
  }

  try {
    const result = await ragSystem.ragQuery({
      question,
      userId,
      maxTokens,
      threshold,
      includeTypes,
      maxAge
    });

    return NextResponse.json({
      success: true,
      answer: result.answer,
      sources: result.sources.map(s => ({
        id: s.id,
        title: s.title,
        content: s.content.substring(0, 200) + '...',
        similarity: s.similarity,
        type: s.type
      })),
      searchStats: result.searchStats,
      compressionStats: result.compressionStats,
      question,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'RAG query failed',
      details: error.message
    }, { status: 500 });
  }
}

// Get memory system statistics
async function getMemoryStats(ragSystem: WorkspaceRAGSystem, userId: string) {
  try {
    const stats = await ragSystem.getAdvancedMemoryStats(userId);

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get memory stats',
      details: error.message
    }, { status: 500 });
  }
}

// Test workspace system
async function testWorkspaceSystem(ragSystem: WorkspaceRAGSystem, userId: string) {
  try {
    const testResult = await ragSystem.testWithCurrentAccess(userId);

    return NextResponse.json({
      success: testResult.success,
      message: testResult.success
        ? 'Workspace memory system test passed'
        : 'Workspace memory system test failed',
      testResult,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
}

// Status endpoint
export async function GET() {
  return NextResponse.json({
    service: 'Google Workspace Memory System',
    version: '1.0.0',
    status: 'operational',
    features: [
      'Ultra-efficient compressed storage in Google Workspace (2TB)',
      'RAG-enabled vector search with OpenAI embeddings',
      'Conversation and document storage with intelligent chunking',
      'Audio transcription with Whisper integration',
      'Smart data retention and archiving',
      'Minimal Supabase footprint (lightweight metadata only)'
    ],
    endpoints: {
      initialize: 'POST { action: "initialize", userId: "user_id" }',
      store_conversation: 'POST { action: "store_conversation", userId: "user_id", conversation: {...} }',
      store_document: 'POST { action: "store_document", userId: "user_id", title: "...", content: "..." }',
      search: 'POST { action: "search", userId: "user_id", query: "search terms" }',
      rag_query: 'POST { action: "rag_query", userId: "user_id", question: "your question?" }',
      get_stats: 'POST { action: "get_stats", userId: "user_id" }',
      test_system: 'POST { action: "test_system", userId: "user_id" }'
    },
    storage: {
      location: 'Google Workspace Drive',
      capacity: '2TB available',
      compression: 'gzip with smart retention',
      supabaseUsage: 'Metadata index only (~200 bytes per memory)'
    },
    integrations: {
      upload: '/api/google/workspace/upload',
      whisper: '/api/google/workspace/whisper',
      retention: '/api/google/workspace/retention',
      storageCheck: '/api/google/workspace/storage-check'
    }
  });
}