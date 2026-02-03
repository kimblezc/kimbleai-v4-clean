/**
 * Chat API Endpoint
 *
 * Handles chat completions with:
 * - Smart model routing
 * - Cost tracking
 * - Streaming responses
 * - Message persistence
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getAIService } from '@/lib/ai/ai-service';
import { supabase } from '@/lib/db/client';
import { conversationQueries, messageQueries } from '@/lib/db/queries';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);

    console.log('[Chat API] Auth check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    });

    if (!session?.user?.id) {
      console.error('[Chat API] Unauthorized - no session or user ID');
      return NextResponse.json(
        { error: 'Unauthorized', debug: { hasSession: !!session, hasUser: !!session?.user } },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Parse request body
    const body = await req.json();
    const {
      messages,
      conversationId,
      projectId,
      model, // Manual model override (optional)
      stream = true,
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // 3. Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await conversationQueries.getById(conversationId);
    } else {
      // Create new conversation
      conversation = await conversationQueries.create(userId, {
        model: model || 'gpt-4.5',
        projectId,
        title: messages[0]?.content?.slice(0, 100) || 'New conversation',
      });
    }

    // 4. Initialize AI service
    const aiService = getAIService(supabase);

    // 5. Set manual model if specified
    if (model) {
      aiService.setManualModel(model);
    } else {
      aiService.setAutoModel();
    }

    // 6. Save user message first
    const userMessage = messages[messages.length - 1];
    if (userMessage.role === 'user') {
      await messageQueries.create({
        conversationId: conversation.id,
        role: 'user',
        content: userMessage.content,
        attachments: userMessage.attachments,
      });
    }

    // 7. Call AI service
    const result = await aiService.chat({
      userId,
      messages,
      options: {
        model,
        stream,
        conversationId: conversation.id,
        projectId,
      },
    });

    // 8. Handle streaming response
    if (stream && 'textStream' in result) {
      // Return streaming response
      const encoder = new TextEncoder();
      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.textStream) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
            }

            // Stream complete - save assistant message
            const fullText = await result.text;
            await messageQueries.create({
              conversationId: conversation.id,
              role: 'assistant',
              content: fullText,
              model: model || 'gpt-4.5',
            });

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('[Chat API] Streaming error:', error);
            controller.error(error);
          }
        },
      });

      return new Response(streamResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 9. Handle non-streaming response
    if ('content' in result) {
      // Type assertion for non-streaming response
      const nonStreamResult = result as {
        content: string;
        model: string;
        tokensUsed?: number;
        costUsd: number;
        reasoning: string;
      };

      // Save assistant message
      await messageQueries.create({
        conversationId: conversation.id,
        role: 'assistant',
        content: nonStreamResult.content,
        model: nonStreamResult.model,
        tokensUsed: nonStreamResult.tokensUsed,
        costUsd: nonStreamResult.costUsd,
      });

      return NextResponse.json({
        conversationId: conversation.id,
        message: {
          role: 'assistant',
          content: nonStreamResult.content,
        },
        model: nonStreamResult.model,
        reasoning: nonStreamResult.reasoning,
        tokensUsed: nonStreamResult.tokensUsed,
        costUsd: nonStreamResult.costUsd,
      });
    }

    // Fallback error (should never reach here)
    return NextResponse.json(
      { error: 'Invalid response from AI service' },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('[Chat API] Error:', error);

    // Handle budget exceeded
    if (error.message?.includes('Budget exceeded')) {
      return NextResponse.json(
        {
          error: 'Budget exceeded',
          message: 'Your monthly budget has been exceeded. Please increase your budget in settings or wait until next month.',
        },
        { status: 402 } // Payment Required
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Failed to process chat request',
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Retrieve conversation history
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    const conversation = await conversationQueries.getById(conversationId);

    return NextResponse.json(conversation);
  } catch (error: any) {
    console.error('[Chat API GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
