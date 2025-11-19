import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserByIdentifier } from '@/lib/user-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/conversations/pin
 * Pin or unpin a conversation
 *
 * Body: { conversationId: string, pinned: boolean, userId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, pinned, userId = 'zach' } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    // Get user data for authorization
    const userData = await getUserByIdentifier(userId, supabase);
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify conversation ownership before allowing pin
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .single();

    if (fetchError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Check ownership (support both UUID and string user_id)
    const isOwner = conversation.user_id === userData.id || conversation.user_id === userId;
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update the conversation with user_id verification
    let data = null;
    let error = null;

    // Try UUID first
    const result1 = await supabase
      .from('conversations')
      .update({
        is_pinned: pinned === true,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .eq('user_id', userData.id)
      .select()
      .single();

    if (result1.data) {
      data = result1.data;
    } else {
      // Fallback to string userId
      const result2 = await supabase
        .from('conversations')
        .update({
          is_pinned: pinned === true,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .eq('user_id', userId)
        .select()
        .single();

      data = result2.data;
      error = result2.error;
    }

    if (error) {
      console.error('[Pin API] Error updating conversation:', error);
      return NextResponse.json(
        { error: 'Failed to update conversation', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: data,
      pinned: pinned === true
    });

  } catch (error: any) {
    console.error('[Pin API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
