import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const { userId = 'zach' } = await request.json();

    // Get user
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

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