/**
 * Message Search API - Find and reference specific messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { MessageReferenceSystem } from '@/lib/message-reference-system';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SearchRequest {
  query: string;
  filters?: {
    userId?: string;
    projectId?: string;
    conversationId?: string;
    role?: 'user' | 'assistant';
    startDate?: string;
    endDate?: string;
    hasCode?: boolean;
    hasDecisions?: boolean;
    limit?: number;
  };
  searchType?: 'messages' | 'files' | 'decisions' | 'actions';
}

export async function POST(req: NextRequest) {
  try {
    const { query, filters = {}, searchType = 'messages' } = await req.json() as SearchRequest;
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    
    const messageSystem = MessageReferenceSystem.getInstance();
    let results: any[] = [];
    
    switch (searchType) {
      case 'messages':
        results = await messageSystem.searchMessages(query, filters);
        break;
        
      case 'files':
        results = await messageSystem.findMessagesByFile(query);
        break;
        
      case 'decisions':
        if (filters.projectId) {
          results = await messageSystem.getProjectDecisions(filters.projectId);
        }
        break;
        
      case 'actions':
        results = await messageSystem.getActionItems({
          userId: filters.userId,
          projectId: filters.projectId,
          status: filters.hasDecisions ? 'pending' : undefined
        });
        break;
        
      default:
        results = await messageSystem.searchMessages(query, filters);
    }
    
    // Format results for frontend
    const formattedResults = results.map(result => ({
      id: result.id,
      content: result.content,
      role: result.role,
      timestamp: result.timestamp,
      conversationId: result.conversation_id,
      projectId: result.project_id,
      metadata: result.metadata,
      reference: messageSystem.createMessageReference(result.id),
      preview: result.content.substring(0, 200) + (result.content.length > 200 ? '...' : '')
    }));
    
    return NextResponse.json({
      results: formattedResults,
      count: formattedResults.length,
      query,
      searchType
    });
    
  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('messageId');
    const includeContext = searchParams.get('includeContext') !== 'false';
    
    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }
    
    const messageSystem = MessageReferenceSystem.getInstance();
    const message = await messageSystem.getMessage(messageId, includeContext);
    
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    
    // Get surrounding messages for context
    const context = includeContext 
      ? await messageSystem.getConversationThread(message.conversation_id, {
          startPosition: Math.max(0, message.context.thread_position - 2),
          endPosition: message.context.thread_position + 2,
          limit: 5
        })
      : [];
    
    return NextResponse.json({
      message,
      context,
      reference: messageSystem.createMessageReference(messageId)
    });
    
  } catch (error: any) {
    console.error('Get message API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve message', details: error.message },
      { status: 500 }
    );
  }
}