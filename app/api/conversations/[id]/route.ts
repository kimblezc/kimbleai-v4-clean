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
    console.log('[Conversations API] getUserByIdentifier result for', userId, ':', userData);

    if (!userData) {
      console.error('[Conversations API] User not found:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[Conversations API] Fetching conversation:', conversationId, 'for user UUID:', userData.id);

    // FIXED: Try to fetch conversation by UUID first, then fallback to string userId
    // This handles both old conversations (user_id = "zach") and new ones (user_id = UUID)
    let conversation = null;
    let error = null;

    // Try with UUID first
    const uuidResult = await supabase
      .from('conversations')
      .select(`
        *,
        messages (
          id,
          role,
          content,
          created_at
        )
      `)
      .eq('id', conversationId)
      .eq('user_id', userData.id)
      .single();

    if (uuidResult.data) {
      conversation = uuidResult.data;
      console.log('[Conversations API] Found conversation with UUID user_id');
    } else {
      // Fallback: Try with string userId (for old conversations)
      const stringResult = await supabase
        .from('conversations')
        .select(`
          *,
          messages (
            id,
            role,
            content,
            created_at
          )
        `)
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();

      conversation = stringResult.data;
      error = stringResult.error;
      console.log('[Conversations API] Tried string user_id, result:', conversation ? 'found' : 'not found');
    }

    console.log('[Conversations API] Query result - error:', error, 'data:', conversation ? 'found' : 'not found');

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

// PATCH - Update conversation (rename title)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const body = await request.json();
    const { userId = 'zach', title } = body;

    console.log('[PATCH Conversations] Updating conversation:', conversationId, 'for user:', userId);

    // Get user data using centralized helper
    const userData = await getUserByIdentifier(userId, supabase);

    if (!userData) {
      console.error('[PATCH Conversations] User not found:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify conversation belongs to user
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .single();

    if (fetchError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Check ownership
    const isOwner = conversation.user_id === userData.id || conversation.user_id === userId;
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update the conversation
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) {
      updateData.title = title;
    }

    // Try UUID first, then string fallback
    let updateError = null;
    const { error: error1 } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', conversationId)
      .eq('user_id', userData.id);

    if (error1) {
      const { error: error2 } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId)
        .eq('user_id', userId);
      updateError = error2;
    }

    if (updateError) {
      console.error('[PATCH Conversations] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
    }

    console.log('[PATCH Conversations] Successfully updated conversation');

    return NextResponse.json({
      success: true,
      message: 'Conversation updated successfully'
    });

  } catch (error: any) {
    console.error('[PATCH Conversations] Error:', error);
    return NextResponse.json({
      error: 'Failed to update conversation',
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach';

    console.log('[DELETE Conversations] Deleting conversation:', conversationId, 'for user:', userId);

    // Get user data using centralized helper
    const userData = await getUserByIdentifier(userId, supabase);

    if (!userData) {
      console.error('[DELETE Conversations] User not found:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[DELETE Conversations] User UUID:', userData.id);

    // First, verify the conversation belongs to this user
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .single();

    if (fetchError || !conversation) {
      console.error('[DELETE Conversations] Conversation not found:', fetchError);
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Check if user owns this conversation (try both UUID and string user_id)
    const isOwner = conversation.user_id === userData.id || conversation.user_id === userId;

    if (!isOwner) {
      console.error('[DELETE Conversations] User does not own this conversation');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // SECURITY FIX: Delete messages with user_id check to prevent unauthorized deletion
    // Try both UUID and string user_id for backwards compatibility
    const { error: messagesError1 } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userData.id);

    if (messagesError1) {
      console.log('[DELETE Conversations] Trying alternative user_id format for messages');
      // Fallback: try with string userId
      const { error: messagesError2 } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (messagesError2) {
        console.error('[DELETE Conversations] Error deleting messages:', messagesError2);
      }
    }

    // Delete conversation (with user_id verification)
    // Try both UUID and string user_id
    let conversationError = null;

    const { error: deleteError1 } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userData.id);

    if (deleteError1) {
      console.log('[DELETE Conversations] Trying alternative user_id format for conversation');
      // Fallback: try with string userId
      const { error: deleteError2 } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', userId);

      conversationError = deleteError2;
    } else {
      conversationError = deleteError1;
    }

    if (conversationError) {
      console.error('[DELETE Conversations] Error deleting conversation:', conversationError);
      return NextResponse.json({
        error: 'Failed to delete conversation',
        details: conversationError.message
      }, { status: 500 });
    }

    console.log('[DELETE Conversations] Successfully deleted conversation');

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error: any) {
    console.error('[DELETE Conversations] Delete conversation error:', error);
    return NextResponse.json({
      error: 'Failed to delete conversation',
      details: error.message
    }, { status: 500 });
  }
}