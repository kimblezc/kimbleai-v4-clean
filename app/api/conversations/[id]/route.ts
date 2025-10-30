import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserByIdentifier } from '@/lib/user-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach';

    // Get user data
    const userData = await getUserByIdentifier(userId, supabase);

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch conversation with messages
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`
        *,
        messages (
          id,
          role,
          content,
          created_at,
          metadata
        )
      `)
      .eq('id', conversationId)
      .eq('user_id', userData.id)
      .single();

    if (error) {
      console.error('Error fetching conversation:', error);
      return NextResponse.json({
        error: 'Conversation not found',
        details: error.message
      }, { status: 404 });
    }

    // Sort messages by created_at
    if (conversation.messages) {
      conversation.messages.sort((a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    return NextResponse.json({
      success: true,
      conversation
    });

  } catch (error: any) {
    console.error('Get conversation error:', error);
    return NextResponse.json({
      error: 'Failed to fetch conversation',
      details: error.message
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const { userId = 'zach' } = await request.json();

    // Get user data using centralized helper
    const userData = await getUserByIdentifier(userId, supabase);

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // SECURITY FIX: Delete messages with user_id check to prevent unauthorized deletion
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userData.id);

    if (messagesError) {
      console.error('Error deleting messages:', messagesError);
    }

    // Delete conversation (with user_id verification)
    const { error: conversationError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userData.id);

    if (conversationError) {
      console.error('Error deleting conversation:', conversationError);
      return NextResponse.json({
        error: 'Failed to delete conversation',
        details: conversationError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete conversation error:', error);
    return NextResponse.json({
      error: 'Failed to delete conversation',
      details: error.message
    }, { status: 500 });
  }
}