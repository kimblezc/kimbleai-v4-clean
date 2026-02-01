/**
 * Vision API Endpoint
 *
 * Handles image analysis with:
 * - Camera capture support
 * - Base64 and URL image inputs
 * - Smart model routing (Gemini 2.5 Flash by default)
 * - Cost tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getAIService } from '@/lib/ai/ai-service';
import { supabase } from '@/lib/db/client';
import { messageQueries } from '@/lib/db/queries';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Parse request
    const body = await req.json();
    const {
      imageUrl, // URL or base64 data
      imageBase64,
      prompt = 'Analyze this image in detail',
      conversationId,
      projectId,
      model, // Manual model override (optional)
    } = body;

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        { error: 'Either imageUrl or imageBase64 is required' },
        { status: 400 }
      );
    }

    // 3. Prepare image URL
    let finalImageUrl = imageUrl;

    if (imageBase64) {
      // Handle base64 image (from camera capture)
      // For production, upload to Supabase Storage first
      // For now, use data URL directly
      finalImageUrl = imageBase64.startsWith('data:')
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;
    }

    // 4. Initialize AI service
    const aiService = getAIService(supabase);

    if (model) {
      aiService.setManualModel(model);
    } else {
      aiService.setAutoModel();
    }

    // 5. Analyze image
    const result = await aiService.analyzeImage({
      userId,
      imageUrl: finalImageUrl,
      prompt,
      options: {
        model,
        conversationId,
        projectId,
      },
    });

    // 6. Save to conversation if provided
    if (conversationId) {
      // Save user message with image
      await messageQueries.create({
        conversationId,
        role: 'user',
        content: prompt,
        attachments: [
          {
            type: 'image',
            url: finalImageUrl,
          },
        ],
      });

      // Save assistant response
      await messageQueries.create({
        conversationId,
        role: 'assistant',
        content: result.content,
        model: result.model,
        tokensUsed: result.tokensUsed,
        costUsd: result.costUsd,
        attachments: [
          {
            type: 'image',
            url: finalImageUrl,
            analysis: result.content,
          },
        ],
      });
    }

    // 7. Return analysis
    return NextResponse.json({
      analysis: result.content,
      model: result.model,
      reasoning: result.reasoning,
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
    });
  } catch (error: any) {
    console.error('[Vision API] Error:', error);

    // Handle budget exceeded
    if (error.message?.includes('Budget exceeded')) {
      return NextResponse.json(
        {
          error: 'Budget exceeded',
          message: 'Your monthly budget has been exceeded.',
        },
        { status: 402 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Failed to analyze image',
      },
      { status: 500 }
    );
  }
}
