import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserByIdentifier } from '@/lib/user-utils';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Merge multiple conversations into one
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      conversationIds,
      userId = 'zach',
      newTitle,
      deleteOriginals = false
    } = body;

    console.log('[MERGE Conversations] Merging conversations:', conversationIds);

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length < 2) {
      return NextResponse.json({
        error: 'At least 2 conversation IDs are required'
      }, { status: 400 });
    }

    // Get user data
    const userData = await getUserByIdentifier(userId, supabase);
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch all conversations and their messages
    const conversations: any[] = [];
    const allMessages: any[] = [];

    for (const convId of conversationIds) {
      // Try UUID first, then string fallback
      let conversation = null;

      const { data: conv1 } = await supabase
        .from('conversations')
        .select('id, title, user_id, project_id, created_at')
        .eq('id', convId)
        .eq('user_id', userData.id)
        .single();

      if (conv1) {
        conversation = conv1;
      } else {
        const { data: conv2 } = await supabase
          .from('conversations')
          .select('id, title, user_id, project_id, created_at')
          .eq('id', convId)
          .eq('user_id', userId)
          .single();
        conversation = conv2;
      }

      if (!conversation) {
        return NextResponse.json({
          error: `Conversation not found or unauthorized: ${convId}`
        }, { status: 404 });
      }

      conversations.push(conversation);

      // Fetch messages for this conversation
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('id, conversation_id, role, content, created_at, metadata')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('[MERGE] Error fetching messages:', msgError);
        continue;
      }

      if (messages) {
        allMessages.push(...messages);
      }
    }

    // Sort all messages by created_at chronologically
    allMessages.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    console.log('[MERGE] Total messages to merge:', allMessages.length);

    // Determine project_id (use first non-null project)
    const projectId = conversations.find(c => c.project_id)?.project_id || null;

    // Generate title if not provided
    const mergedTitle = newTitle ||
      `Merged: ${conversations.map(c => c.title || 'Untitled').join(' + ')}`.substring(0, 100);

    // Create new merged conversation
    const newConversationId = randomUUID();
    const now = new Date().toISOString();

    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        id: newConversationId,
        user_id: userData.id,
        title: mergedTitle,
        project_id: projectId,
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (createError) {
      console.error('[MERGE] Error creating merged conversation:', createError);
      return NextResponse.json({
        error: 'Failed to create merged conversation',
        details: createError.message
      }, { status: 500 });
    }

    // Insert all messages into the new conversation
    const messagesToInsert = allMessages.map(msg => ({
      conversation_id: newConversationId,
      user_id: userData.id,
      role: msg.role,
      content: msg.content,
      created_at: msg.created_at,
      metadata: {
        ...msg.metadata,
        merged_from: msg.conversation_id,
        original_message_id: msg.id
      }
    }));

    const { error: insertError } = await supabase
      .from('messages')
      .insert(messagesToInsert);

    if (insertError) {
      console.error('[MERGE] Error inserting messages:', insertError);
      // Rollback: delete the new conversation
      await supabase.from('conversations').delete().eq('id', newConversationId);
      return NextResponse.json({
        error: 'Failed to merge messages',
        details: insertError.message
      }, { status: 500 });
    }

    // Optionally delete original conversations
    if (deleteOriginals) {
      for (const convId of conversationIds) {
        // Delete messages first
        await supabase
          .from('messages')
          .delete()
          .eq('conversation_id', convId);

        // Delete conversation (try both user_id formats)
        await supabase
          .from('conversations')
          .delete()
          .eq('id', convId)
          .eq('user_id', userData.id);

        await supabase
          .from('conversations')
          .delete()
          .eq('id', convId)
          .eq('user_id', userId);
      }
      console.log('[MERGE] Deleted original conversations');
    }

    console.log('[MERGE] Successfully created merged conversation:', newConversationId);

    return NextResponse.json({
      success: true,
      conversation: {
        id: newConversationId,
        title: mergedTitle,
        messageCount: allMessages.length,
        mergedFrom: conversationIds
      }
    });

  } catch (error: any) {
    console.error('[MERGE Conversations] Error:', error);
    return NextResponse.json({
      error: 'Failed to merge conversations',
      details: error.message
    }, { status: 500 });
  }
}
