/**
 * Voice Transcription API Endpoint
 *
 * Transcribe audio using Deepgram Nova-3 with intelligent categorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getAIService } from '@/lib/ai/ai-service';
import { TranscriptionAnalyzer } from '@/lib/ai/transcription-analyzer';
import { supabase } from '@/lib/db/client';
import { messageQueries } from '@/lib/db/queries';
import {
  asyncHandler,
  AuthenticationError,
  ValidationError,
} from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max execution time

/**
 * Transcription Service Limits:
 * - Deepgram Nova-3: No file size limit, up to 5 hours duration
 * - AssemblyAI: 5GB file size limit
 * - OpenAI Whisper: 25MB limit (not suitable for large files)
 *
 * For files > 25MB, use Deepgram or AssemblyAI exclusively.
 */

/**
 * POST: Transcribe audio
 */
export const POST = asyncHandler(async (req: NextRequest) => {
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const userId = session.user.id;

  logger.apiRequest({
    method: 'POST',
    path: '/api/voice/transcribe',
    userId,
  });

  // 2. Parse body
  const formData = await req.formData();
  const audioFile = formData.get('audio') as File | null;
  const conversationId = formData.get('conversationId') as string | null;
  const language = formData.get('language') as string | null;
  const diarize = formData.get('diarize') === 'true';

  if (!audioFile) {
    throw new ValidationError('Audio file is required');
  }

  logger.info('Audio transcription requested', {
    userId,
    conversationId: conversationId || undefined,
    fileName: audioFile.name,
    fileSize: audioFile.size,
    fileType: audioFile.type,
    language: language || undefined,
    diarize,
  });

  // 3. Convert file to buffer
  const arrayBuffer = await audioFile.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  // Estimate duration (rough calculation: 1 MB ≈ 1 minute for compressed audio)
  const estimatedDurationSeconds = Math.ceil(audioFile.size / (1024 * 1024) * 60);

  logger.info('Audio file processed', {
    userId,
    bufferSize: audioBuffer.length,
    estimatedDurationSeconds,
  });

  // 4. Transcribe audio
  const aiService = getAIService(supabase);

  const result = await logger.measure(
    'Transcribe audio',
    async () => await aiService.transcribeAudio({
      userId,
      audioBuffer,
      durationSeconds: estimatedDurationSeconds,
      options: {
        language: language || undefined,
        diarize,
      },
    }),
    { userId, conversationId: conversationId || undefined, durationSeconds: estimatedDurationSeconds }
  );

  logger.info('Audio transcription completed', {
    userId,
    conversationId: conversationId || undefined,
    transcriptLength: result.transcript.length,
    durationSeconds: result.durationSeconds,
    costUsd: result.costUsd,
  });

  // 5. Analyze transcription content and suggest categorization
  const analyzer = new TranscriptionAnalyzer();

  // Get user's existing projects
  const { data: userProjects } = await (supabase as any)
    .from('projects')
    .select('id, name, metadata')
    .eq('user_id', userId);

  const existingProjects = (userProjects || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    category: p.metadata?.category,
  }));

  const analysis = await logger.measure(
    'Analyze transcription content',
    async () => await analyzer.analyzeTranscription({
      transcript: result.transcript,
      fileName: audioFile.name,
      durationSeconds: result.durationSeconds,
      existingProjects,
    }),
    { userId }
  );

  logger.info('Transcription analyzed', {
    userId,
    category: analysis.category,
    confidence: analysis.confidence,
    suggestedProject: analysis.suggestedProjectName,
  });

  // 6. Save transcription to audio_transcriptions table (v5 schema)
  const transcriptionId = crypto.randomUUID();

  await (supabase as any)
    .from('audio_transcriptions')
    .insert({
      id: transcriptionId,
      user_id: userId,
      project_id: analysis.suggestedProjectId || 'general',
      filename: audioFile.name,
      file_size: audioFile.size,
      duration: result.durationSeconds,
      text: result.transcript,
      segments: result.words ? { words: result.words } : null,
      language: language || 'en',
      status: 'completed',
      service: 'deepgram',
      metadata: {
        originalFileName: audioFile.name,
        confidence: result.confidence,
        costUsd: result.costUsd,
        category: analysis.category,
        categoryConfidence: analysis.confidence,
        suggestedProjectName: analysis.suggestedProjectName,
        suggestedProjectId: analysis.suggestedProjectId,
        topics: analysis.topics,
        entities: analysis.entities,
        summary: analysis.summary,
        keyPoints: analysis.keyPoints,
        isPrivate: analysis.isPrivate,
        tags: analysis.suggestedTags,
        transcriptionDate: new Date().toISOString(),
      },
    });

  // Use transcriptionId as fileId for backward compatibility in response
  const fileId = transcriptionId;

  logger.info('Transcription saved to audio_transcriptions', {
    userId,
    transcriptionId,
    projectId: analysis.suggestedProjectId,
  });

  // 7. Save to conversation if provided
  if (conversationId) {
    await logger.measure(
      'Save transcription to conversation',
      async () => await messageQueries.create({
        conversationId,
        role: 'user',
        content: result.transcript,
        attachments: [{
          type: 'transcription',
          audioFileName: audioFile.name,
          audioFileSize: audioFile.size,
          durationSeconds: result.durationSeconds,
          language: language || 'auto',
          diarize,
          confidence: result.confidence,
        }],
      }),
      { userId, conversationId: conversationId || undefined }
    );

    logger.info('Transcription saved to conversation', {
      userId,
      conversationId: conversationId || undefined,
    });
  }

  // 8. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'POST',
    path: '/api/voice/transcribe',
    status: 200,
    durationMs,
    userId,
  });

  logger.costTracking({
    userId,
    provider: 'deepgram',
    model: 'nova-3',
    costUsd: result.costUsd,
    tokensUsed: result.durationSeconds * 60, // Convert to "tokens" for consistency
  });

  return NextResponse.json({
    transcript: result.transcript,
    durationSeconds: result.durationSeconds,
    confidence: result.confidence,
    words: result.words,
    costUsd: result.costUsd,
    fileId,
    analysis: {
      category: analysis.category,
      confidence: analysis.confidence,
      suggestedProjectName: analysis.suggestedProjectName,
      suggestedProjectId: analysis.suggestedProjectId,
      topics: analysis.topics,
      entities: analysis.entities,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      isPrivate: analysis.isPrivate,
      tags: analysis.suggestedTags,
    },
  });
});
