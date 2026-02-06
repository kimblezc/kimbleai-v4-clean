/**
 * Chat API Endpoint
 *
 * Handles chat completions with:
 * - Smart model routing
 * - Cost tracking
 * - Streaming responses
 * - Message persistence
 * - RAG (Retrieval-Augmented Generation) for cross-session memory
 * - Google services integration (Gmail, Drive, Calendar)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { ensureUserExists } from '@/lib/auth/ensure-user';
import { getAIService } from '@/lib/ai/ai-service';
import { getRAGService } from '@/lib/ai/rag-service';
import { supabase } from '@/lib/db/client';
import { conversationQueries, messageQueries } from '@/lib/db/queries';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  let currentStep = 'init';
  try {
    // 1. Authenticate user
    currentStep = 'auth';
    console.log('[Chat API] Step: auth');
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

    // Get validated database userId (may differ from session)
    currentStep = 'ensureUser';
    console.log('[Chat API] Step: ensureUser');
    const userId = await ensureUserExists(
      session.user.id,
      session.user.email,
      session.user.name
    );
    console.log('[Chat API] User validated:', userId);

    // 2. Parse request body
    currentStep = 'parseBody';
    console.log('[Chat API] Step: parseBody');
    const body = await req.json();
    const {
      messages,
      conversationId,
      projectId,
      model, // Manual model override (optional)
      stream = true,
      enableRAG = true, // Enable RAG by default
      includeGoogle = true, // Include Google services in RAG
    } = body;
    console.log('[Chat API] Body parsed, messages:', messages?.length);

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // 3. Get or create conversation
    currentStep = 'conversation';
    console.log('[Chat API] Step: conversation');
    let conversation;
    if (conversationId) {
      conversation = await conversationQueries.getById(conversationId);
    } else {
      // Create new conversation
      conversation = await conversationQueries.create(userId, {
        model: model || 'gpt-5.2',
        projectId,
        title: messages[0]?.content?.slice(0, 100) || 'New conversation',
      });
    }
    console.log('[Chat API] Conversation ready:', conversation?.id);

    // 4. Initialize AI service and RAG service
    currentStep = 'initServices';
    console.log('[Chat API] Step: initServices');
    const aiService = getAIService(supabase);
    const ragService = getRAGService(supabase);
    console.log('[Chat API] Services initialized');

    // 5. Set manual model if specified
    currentStep = 'setModel';
    console.log('[Chat API] Step: setModel');
    if (model) {
      console.log('[Chat API] Manual model selected:', model);
      aiService.setManualModel(model);
    } else {
      console.log('[Chat API] Using smart routing (auto mode) - default: gpt-5.2');
      aiService.setAutoModel();
    }
    console.log('[Chat API] Model mode set');

    // 6. Check for "remember" commands in user message
    // NOTE: Memory storage disabled until database is verified
    const userMessage = messages[messages.length - 1];
    /* Temporarily disabled - re-enable after DB verification
    if (userMessage.role === 'user') {
      const rememberCommand = ragService.parseRememberCommand(userMessage.content);
      if (rememberCommand) {
        try {
          await ragService.storeMemory({
            userId,
            key: rememberCommand.key,
            value: rememberCommand.value,
            category: 'fact',
          });
          console.log('[Chat API] Stored memory:', rememberCommand.key);
        } catch (error) {
          console.warn('[Chat API] Failed to store memory:', error);
          // Continue without blocking the chat
        }
      }
    }
    */

    // 7. Retrieve relevant context using RAG (if enabled)
    // NOTE: RAG is disabled until database functions are verified working
    // To re-enable: set enableRAG to true and ensure search_all_content RPC exists
    let ragContext = '';
    let ragCost = 0;
    const ragEnabled = false; // Temporarily disabled - database functions need verification
    if (ragEnabled && enableRAG && userMessage.role === 'user') {
      try {
        const context = await ragService.retrieveContext({
          userId,
          query: userMessage.content,
          projectId,
          conversationId,
          includeGoogle: includeGoogle && !!session.accessToken,
          googleTokens: session.accessToken ? {
            accessToken: session.accessToken as string,
            refreshToken: session.refreshToken as string,
          } : undefined,
          maxResults: 8,
        });

        if (context.formattedContext) {
          ragContext = context.formattedContext;
          ragCost = context.costUsd;
          console.log('[Chat API] RAG context retrieved:', {
            totalResults: context.retrievedContexts.length,
            tokens: context.totalTokens,
            costUsd: context.costUsd,
          });
        }
      } catch (error) {
        console.warn('[Chat API] RAG retrieval failed, continuing without context:', error);
        // Continue without RAG context
      }
    }

    // 8. Inject RAG context into messages
    let messagesWithContext = [...messages];
    if (ragContext) {
      // Insert RAG context as a system message before user messages
      const systemMessageIndex = messagesWithContext.findIndex(m => m.role === 'system');
      if (systemMessageIndex >= 0) {
        // Append to existing system message
        messagesWithContext[systemMessageIndex] = {
          ...messagesWithContext[systemMessageIndex],
          content: messagesWithContext[systemMessageIndex].content + '\n\n' + ragContext,
        };
      } else {
        // Add new system message with context
        messagesWithContext = [
          { role: 'system', content: ragContext },
          ...messagesWithContext,
        ];
      }
    }

    // 9. Save user message
    currentStep = 'saveUserMessage';
    console.log('[Chat API] Step: saveUserMessage');
    if (userMessage.role === 'user') {
      await messageQueries.create({
        conversationId: conversation.id,
        userId, // CRITICAL: Required for FK constraint
        role: 'user',
        content: userMessage.content,
        attachments: userMessage.attachments,
      });
    }
    console.log('[Chat API] User message saved');

    // 10. Call AI service with RAG-enhanced messages
    currentStep = 'callAI';
    console.log('[Chat API] Step: callAI - about to call AI service...');
    const result = await aiService.chat({
      userId,
      messages: messagesWithContext,
      options: {
        model,
        stream,
        conversationId: conversation.id,
        projectId,
      },
    });
    console.log('[Chat API] AI call complete, hasTextStream:', 'textStream' in result);

    // 11. Handle streaming response
    if (stream && 'textStream' in result) {
      // Extract model info from result (added by AI service for Task 6)
      const modelUsed = (result as any).modelUsed || model || 'gpt-5.2';
      const providerUsed = (result as any).providerUsed || 'openai';
      const selectionReason = (result as any).selectionReason || 'default';

      // Return streaming response
      const encoder = new TextEncoder();
      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            // Send model info at start of stream (Task 6: show model used)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'model_info',
              model: modelUsed,
              provider: providerUsed,
              reason: selectionReason,
              conversationId: conversation.id
            })}\n\n`));

            for await (const chunk of result.textStream) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            }

            // Stream complete - save assistant message with model used
            const fullText = await result.text;
            await messageQueries.create({
              conversationId: conversation.id,
              userId, // CRITICAL: Required for FK constraint
              role: 'assistant',
              content: fullText,
              model: modelUsed,
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

    // 12. Handle non-streaming response
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
        userId, // CRITICAL: Required for FK constraint
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
    console.error('[Chat API] Error at step:', currentStep);
    console.error('[Chat API] Error:', error);
    console.error('[Chat API] Error stack:', error.stack);
    console.error('[Chat API] Error name:', error.name);
    console.error('[Chat API] Error cause:', error.cause);

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
        debug: {
          step: currentStep,
          name: error.name,
          stack: error.stack?.split('\n').slice(0, 5),
        }
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
