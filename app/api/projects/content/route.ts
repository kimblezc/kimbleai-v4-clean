/**
 * Project Content API
 * Get all content (transcriptions, conversations, knowledge) for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const userId = searchParams.get('userId') || 'zach-admin-001';
    const contentType = searchParams.get('type'); // 'audio', 'conversations', 'knowledge', or 'all'

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId required' },
        { status: 400 }
      );
    }

    const content: any = {
      project_id: projectId,
      audio_transcriptions: [],
      conversations: [],
      knowledge_base: [],
      total_items: 0
    };

    // Get audio transcriptions for this project
    if (!contentType || contentType === 'all' || contentType === 'audio') {
      const { data: transcriptions, error: transError } = await supabase
        .from('audio_transcriptions')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!transError && transcriptions) {
        content.audio_transcriptions = transcriptions;
      }
    }

    // Get conversations for this project
    if (!contentType || contentType === 'all' || contentType === 'conversations') {
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!convError && conversations) {
        content.conversations = conversations;
      }
    }

    // Get knowledge base items for this project
    if (!contentType || contentType === 'all' || contentType === 'knowledge') {
      const { data: knowledge, error: knowError } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false});

      if (!knowError && knowledge) {
        content.knowledge_base = knowledge;
      }
    }

    // Calculate totals
    content.total_items =
      content.audio_transcriptions.length +
      content.conversations.length +
      content.knowledge_base.length;

    // Get project details
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    return NextResponse.json({
      success: true,
      project,
      content,
      stats: {
        audio_count: content.audio_transcriptions.length,
        conversation_count: content.conversations.length,
        knowledge_count: content.knowledge_base.length,
        total_count: content.total_items
      }
    });

  } catch (error: any) {
    console.error('[Project Content API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch project content',
        details: error.message
      },
      { status: 500 }
    );
  }
}
