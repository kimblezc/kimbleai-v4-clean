/**
 * FLUX Image Generation API Endpoint
 * High-quality image generation using FLUX 1.1 Pro
 *
 * Features:
 * - Ultra-high quality images
 * - Multiple aspect ratios
 * - Cost tracking ($0.055 per image)
 * - Usage limits to prevent overspending
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFLUXClient, COST_PER_IMAGE, LIMITS } from '@/lib/flux-client';
import { costMonitor } from '@/lib/cost-monitor';
import { getUserByIdentifier } from '@/lib/user-utils';

export async function GET() {
  return NextResponse.json({
    status: 'OK',
    service: 'KimbleAI FLUX Image Generation API',
    version: '1.0',
    available: !!process.env.REPLICATE_API_TOKEN,
    pricing: {
      costPerImage: COST_PER_IMAGE,
      limits: LIMITS,
    },
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
  });
}

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const {
      prompt,
      userId = 'zach',
      aspectRatio = '1:1',
      outputFormat = 'webp',
    } = await request.json();

    // Validate prompt
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    if (prompt.length > 500) {
      return NextResponse.json(
        { error: 'Prompt too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // Validate aspect ratio
    const validRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
    if (!validRatios.includes(aspectRatio)) {
      return NextResponse.json(
        { error: `Invalid aspect ratio. Must be one of: ${validRatios.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate user
    let user;
    try {
      user = await getUserByIdentifier(userId);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    } catch (error) {
      console.error(`[FLUX] User validation failed:`, error);
      return NextResponse.json({ error: 'Failed to validate user' }, { status: 401 });
    }

    // Get FLUX client
    let client;
    try {
      client = getFLUXClient();
    } catch (error) {
      console.error(`[FLUX] Client not available:`, error);
      return NextResponse.json(
        { error: 'Image generation service not available' },
        { status: 503 }
      );
    }

    // Generate image
    const startTime = Date.now();
    const result = await client.generateImage({
      prompt,
      aspectRatio: aspectRatio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4',
      outputFormat: outputFormat as 'webp' | 'jpg' | 'png',
    });

    const processingTime = Date.now() - startTime;

    // Track cost
    await costMonitor.trackAPICall({
      user_id: user.id,
      model: 'flux-1.1-pro',
      endpoint: '/api/image/generate',
      input_tokens: prompt.length,
      output_tokens: 0,
      cost_usd: result.cost,
      timestamp: new Date().toISOString(),
      metadata: {
        aspectRatio: result.aspectRatio,
        processingTime: result.generationTime,
        predictionId: result.predictionId,
      },
    });

    console.log(
      `[FLUX] Success: "${prompt.substring(0, 50)}..." → ${result.imageUrl}, $${result.cost.toFixed(3)}, ${processingTime}ms`
    );

    // Get usage stats
    const usage = client.getUsageStats();

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      prompt: result.prompt,
      aspectRatio: result.aspectRatio,
      cost: result.cost,
      generationTime: result.generationTime,
      usage: {
        dailyUsage: usage.dailyUsage,
        monthlyUsage: usage.monthlyUsage,
        dailyLimit: usage.dailyLimit,
        monthlyLimit: usage.monthlyLimit,
        estimatedMonthlyCost: usage.estimatedMonthlyCost,
        remainingDailyImages: usage.remainingDailyImages,
        remainingMonthlyImages: usage.remainingMonthlyImages,
      },
    });
  } catch (error) {
    console.error('[FLUX] Error:', error);
    return NextResponse.json(
      {
        error: 'Image generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
