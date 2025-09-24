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

    // Format conversations for frontend
    const formattedConversations = conversations?.map(conv => {
      const messageCount = conv.messages?.length || 0;
      const lastMessage = conv.messages?.[0]; // Latest message (due to ordering)

      return {
        id: conv.id,
        title: conv.title || 'Untitled Conversation',
        project: 'general', // Default project for now
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
    const { conversationId, userId = 'zach', messages } = await request.json();

    // Get user
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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