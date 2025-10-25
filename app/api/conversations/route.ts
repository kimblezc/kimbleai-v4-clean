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
        project_id,
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
      .select('title')
      .eq('user_id', userData.id)
      .like('title', 'DELETED_PROJECT_MARKER_%');

    const deletedProjectIds = new Set(
      deletedProjectMarkers?.map(marker =>
        marker.title?.replace('DELETED_PROJECT_MARKER_', '')
      ).filter(Boolean) || []
    );

    // Filter out deleted project marker conversations from display
    const realConversations = conversations?.filter(conv =>
      !conv.title?.startsWith('DELETED_PROJECT_MARKER_')
    ) || [];

    // Format conversations for frontend with auto-project assignment
    const formattedConversations = realConversations?.map(conv => {
      const messageCount = conv.messages?.length || 0;
      const lastMessage = conv.messages?.[0]; // Latest message (due to ordering)

      // DISABLED: Auto-detect project from content since we don't have metadata column
      // User wants manual project assignment only
      // const projectFromTitle = autoDetectProject(conv.title || '');
      // const projectFromContent = lastMessage ? autoDetectProject(lastMessage.content) : '';
      // const autoDetected = projectFromTitle || projectFromContent;

      // Only use auto-detected project if it hasn't been deleted
      // const detectedProject = (autoDetected && !deletedProjectIds.has(autoDetected)) ? autoDetected : '';

      // ✅ FIX: Return actual project_id from database (null = unassigned)
      const actualProject = conv.project_id || '';

      return {
        id: conv.id,
        title: conv.title || 'Untitled Conversation',
        project: actualProject,
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
      if (!conversationId || projectId === undefined) {
        return NextResponse.json({ error: 'Conversation ID and Project ID required' }, { status: 400 });
      }

      // ✅ FIX: Actually update project_id column (null = unassign)
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          project_id: projectId || null, // Allow null to unassign from project
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
        message: projectId ? 'Project assigned successfully' : 'Project unassigned successfully',
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
        project: conversation.project_id || '', // ✅ FIX: Return actual project_id from database
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
  const diffInMs = now.getTime() - date.getTime();

  const seconds = Math.floor(diffInMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (seconds < 60) return seconds === 1 ? '1 second ago' : `${seconds} seconds ago`;
  if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  if (days < 7) return days === 1 ? '1 day ago' : `${days} days ago`;
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
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