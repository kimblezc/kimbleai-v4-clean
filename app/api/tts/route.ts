/**
 * Text-to-Speech API Endpoint
 * Converts text to speech using ElevenLabs
 *
 * Features:
 * - Multiple voice options
 * - Cost tracking
 * - Usage monitoring
 * - Streaming support
 */

import { NextRequest, NextResponse } from 'next/server';
import { getElevenLabsClient, DEFAULT_VOICES } from '@/lib/elevenlabs-client';
import { costMonitor } from '@/lib/cost-monitor';
import { getUserByIdentifier } from '@/lib/user-utils';

export async function GET() {
  return NextResponse.json({
    status: 'OK',
    service: 'KimbleAI Text-to-Speech API',
    version: '1.0',
    available: !!process.env.ELEVENLABS_API_KEY,
    voices: DEFAULT_VOICES,
    pricing: {
      freeTier: '10,000 characters/month',
      paid: '$5 for 30,000 characters',
      costPerChar: '$0.00017',
    },
    models: [
      'eleven_turbo_v2_5 (fastest, recommended)',
      'eleven_multilingual_v2',
      'eleven_monolingual_v1',
    ],
  });
}

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const { text, userId = 'zach', voiceId, stream = false } = await request.json();

    // Validate text
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text too long (max 5000 characters)' },
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
      console.error(`[TTS] User validation failed:`, error);
      return NextResponse.json({ error: 'Failed to validate user' }, { status: 401 });
    }

    // Get ElevenLabs client
    let client;
    try {
      client = getElevenLabsClient();
    } catch (error) {
      console.error(`[TTS] ElevenLabs not available:`, error);
      return NextResponse.json(
        { error: 'Text-to-speech service not available' },
        { status: 503 }
      );
    }

    // Calculate cost estimate
    const costEstimate = client.calculateCost(text);
    console.log(
      `[TTS] Request: ${text.length} chars, estimated cost: $${costEstimate.cost.toFixed(4)}, free tier: ${costEstimate.withinFreeTier}`
    );

    // Convert text to speech
    const startTime = Date.now();
    const result = await client.textToSpeech({
      text,
      voiceId: voiceId || undefined,
    });

    const processingTime = Date.now() - startTime;

    // Track cost
    const actualCost = costEstimate.cost;
    await costMonitor.trackAPICall({
      user_id: user.id,
      model: 'elevenlabs-turbo-v2.5',
      endpoint: '/api/tts',
      input_tokens: text.length,
      output_tokens: 0,
      cost_usd: actualCost,
      timestamp: new Date().toISOString(),
      metadata: {
        charactersProcessed: result.charactersUsed,
        audioSize: result.audio.byteLength,
        processingTime,
        voiceId: voiceId || 'default',
        withinFreeTier: costEstimate.withinFreeTier,
      },
    });

    console.log(
      `[TTS] Success: ${result.charactersUsed} chars → ${result.audio.byteLength} bytes audio in ${processingTime}ms`
    );

    // Return audio as base64 (easier for frontend)
    const audioBase64 = Buffer.from(result.audio).toString('base64');

    return NextResponse.json({
      success: true,
      audio: audioBase64,
      audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
      metadata: {
        charactersUsed: result.charactersUsed,
        audioSize: result.audio.byteLength,
        processingTime,
        cost: actualCost,
        withinFreeTier: costEstimate.withinFreeTier,
        requestId: result.requestId,
      },
      usage: client.getUsageStats(),
    });
  } catch (error) {
    console.error('[TTS] Error:', error);
    return NextResponse.json(
      {
        error: 'Text-to-speech conversion failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
