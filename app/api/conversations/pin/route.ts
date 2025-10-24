import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/conversations/pin
 * Pin or unpin a conversation
 *
 * Body: { conversationId: string, pinned: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, pinned } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    // Update the conversation
    const { data, error } = await supabase
      .from('conversations')
      .update({
        pinned: pinned === true,
        pinned_at: pinned === true ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .select()
      .single();

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
