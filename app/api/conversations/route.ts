import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach';
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get user
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build query for conversations - simplified for existing schema
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        user_id,
        messages(id, content, role, created_at)
      `)
      .eq('user_id', userData.id)
      .order('id', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Conversations fetch error:', error);
      return NextResponse.json({
        error: 'Failed to fetch conversations',
        details: error.message
      }, { status: 500 });
    }

    // Get deleted projects for this user to avoid recreating them
    const { data: deletedProjectMarkers } = await supabase
      .from('conversations')
      .select('metadata')
      .eq('user_id', userData.id)
      .like('title', 'DELETED_PROJECT_MARKER_%');

    const deletedProjectIds = new Set(
      deletedProjectMarkers?.map(marker => marker.metadata?.deleted_project_id).filter(Boolean) || []
    );

    // Filter out deleted project marker conversations from display
    const realConversations = conversations?.filter(conv =>
      !conv.title?.startsWith('DELETED_PROJECT_MARKER_')
    ) || [];

    // Format conversations for frontend with auto-project assignment
    const formattedConversations = realConversations?.map(conv => {
      const messageCount = conv.messages?.length || 0;
      const lastMessage = conv.messages?.[0]; // Latest message (due to ordering)

      // First check if there's a stored project in metadata
      let detectedProject = conv.metadata?.project_id;

      // If no stored project, auto-detect from content (but not if project was deleted)
      if (!detectedProject) {
        const projectFromTitle = autoDetectProject(conv.title || '');
        const projectFromContent = lastMessage ? autoDetectProject(lastMessage.content) : '';
        const autoDetected = projectFromTitle || projectFromContent;

        // Only use auto-detected project if it hasn't been deleted
        detectedProject = (autoDetected && !deletedProjectIds.has(autoDetected)) ? autoDetected : 'general';
      } else if (deletedProjectIds.has(detectedProject)) {
        // If stored project was deleted, move to general
        detectedProject = 'general';
      }

      return {
        id: conv.id,
        title: conv.title || 'Untitled Conversation',
        project: detectedProject,
        messageCount,
        lastMessage: lastMessage ? formatTimeAgo(lastMessage.created_at) : 'No messages',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preview: lastMessage?.content?.substring(0, 100) + '...' || ''
      };
    }) || [];

    // Group by project if needed
    const groupedByProject = formattedConversations.reduce((acc, conv) => {
      const project = conv.project;
      if (!acc[project]) acc[project] = [];
      acc[project].push(conv);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      success: true,
      conversations: formattedConversations,
      groupedByProject,
      totalConversations: formattedConversations.length,
      projectFilter: projectId
    });

  } catch (error: any) {
    console.error('Conversations API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch conversations',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, conversationId, userId = 'zach', messages, projectId } = await request.json();

    // Get user
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Handle project assignment action
    if (action === 'assign_project') {
      if (!conversationId || !projectId) {
        return NextResponse.json({ error: 'Conversation ID and Project ID required' }, { status: 400 });
      }

      // Update conversation metadata with project assignment
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          metadata: { project_id: projectId },
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .eq('user_id', userData.id);

      if (updateError) {
        return NextResponse.json({
          error: 'Failed to assign project',
          details: updateError.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Project assigned successfully',
        conversationId,
        projectId
      });
    }

    // Fetch specific conversation with messages
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`
        *,
        messages(*)
      `)
      .eq('id', conversationId)
      .eq('user_id', userData.id)
      .single();

    if (error || !conversation) {
      return NextResponse.json({
        error: 'Conversation not found',
        details: error?.message
      }, { status: 404 });
    }

    // Format messages for frontend
    const formattedMessages = conversation.messages
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at
      }));

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        project: conversation.metadata?.project_id || 'general',
        messages: formattedMessages
      }
    });

  } catch (error: any) {
    console.error('Load conversation error:', error);
    return NextResponse.json({
      error: 'Failed to load conversation',
      details: error.message
    }, { status: 500 });
  }
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  if (diffInHours < 48) return '1 day ago';
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
  return `${Math.floor(diffInHours / 168)} weeks ago`;
}

function autoDetectProject(content: string): string {
  if (!content) return '';

  const lowerContent = content.toLowerCase();

  // Development & Technical Projects
  if (lowerContent.includes('kimbleai') || lowerContent.includes('development') ||
      lowerContent.includes('code') || lowerContent.includes('api') ||
      lowerContent.includes('react') || lowerContent.includes('nextjs') ||
      lowerContent.includes('typescript') || lowerContent.includes('build') ||
      lowerContent.includes('deploy') || lowerContent.includes('technical documents')) {
    return 'development';
  }

  // Personal & Family
  if (lowerContent.includes('rebecca') || lowerContent.includes('wife') ||
      lowerContent.includes('family') || lowerContent.includes('pet') ||
      lowerContent.includes('dog') || lowerContent.includes('home') ||
      lowerContent.includes('personal')) {
    return 'personal';
  }

  // Travel & Planning
  if (lowerContent.includes('travel') || lowerContent.includes('trip') ||
      lowerContent.includes('rome') || lowerContent.includes('vacation') ||
      lowerContent.includes('planning')) {
    return 'travel';
  }

  // Finance & Business
  if (lowerContent.includes('budget') || lowerContent.includes('financial') ||
      lowerContent.includes('allocation') || lowerContent.includes('project alpha') ||
      lowerContent.includes('project beta') || lowerContent.includes('deadline')) {
    return 'business';
  }

  // Automotive
  if (lowerContent.includes('tesla') || lowerContent.includes('car') ||
      lowerContent.includes('license plate') || lowerContent.includes('vehicle') ||
      lowerContent.includes('model 3') || lowerContent.includes('model y')) {
    return 'automotive';
  }

  // Gaming & DND
  if (lowerContent.includes('dnd') || lowerContent.includes('d&d') ||
      lowerContent.includes('campaign') || lowerContent.includes('dungeon') ||
      lowerContent.includes('dragon') || lowerContent.includes('character') ||
      lowerContent.includes('gaming') || lowerContent.includes('rpg') ||
      lowerContent.includes('dice') || lowerContent.includes('adventure')) {
    return 'gaming';
  }

  return '';
}