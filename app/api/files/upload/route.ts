/**
 * File Upload API Endpoint
 *
 * Upload and process files with text extraction, summarization, and embedding
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { ensureUserExists } from '@/lib/auth/ensure-user';
import { supabase } from '@/lib/db/client';
import { FileService } from '@/lib/services/file-service';
import {
  asyncHandler,
  AuthenticationError,
  ValidationError,
} from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max execution time

/**
 * POST: Upload and process file
 */
export const POST = asyncHandler(async (req: NextRequest) => {
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  // Validate user exists in DB and get correct userId
  const userId = await ensureUserExists(session.user.id, session.user.email, session.user.name);

  logger.apiRequest({
    method: 'POST',
    path: '/api/files/upload',
    userId,
  });

  // 2. Parse form data
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const conversationId = formData.get('conversationId') as string | null;
  const projectId = formData.get('projectId') as string | null;
  const extractText = formData.get('extractText') !== 'false';
  const summarize = formData.get('summarize') !== 'false';
  const generateEmbedding = formData.get('generateEmbedding') !== 'false';

  if (!file) {
    throw new ValidationError('File is required');
  }

  // 3. Validate file size (50 MB limit)
  const maxSize = 50 * 1024 * 1024; // 50 MB
  if (file.size > maxSize) {
    throw new ValidationError(`File size exceeds limit of 50 MB`);
  }

  logger.info('File upload requested', {
    userId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    conversationId: conversationId || undefined,
    projectId: projectId || undefined,
    extractText,
    summarize,
    generateEmbedding,
  });

  // 4. Process file
  const fileService = new FileService(supabase);

  const result = await logger.measure(
    'Process uploaded file',
    async () => await fileService.processFile(userId, file, {
      extractText,
      summarize,
      generateEmbedding,
      conversationId: conversationId || undefined,
      projectId: projectId || undefined,
    }),
    { userId, fileName: file.name, fileSize: file.size }
  );

  logger.info('File upload and processing completed', {
    userId,
    fileId: result.fileId,
    fileName: result.fileName,
    hasExtractedText: !!result.extractedText,
    hasSummary: !!result.summary,
    hasEmbedding: !!result.embedding,
    processingDurationMs: result.processingDurationMs,
    costUsd: result.costUsd,
  });

  // 5. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'POST',
    path: '/api/files/upload',
    status: 201,
    durationMs,
    userId,
  });

  return NextResponse.json(
    {
      fileId: result.fileId,
      fileName: result.fileName,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
      extractedText: result.extractedText,
      summary: result.summary,
      hasEmbedding: !!result.embedding,
      processingDurationMs: result.processingDurationMs,
      costUsd: result.costUsd,
    },
    { status: 201 }
  );
});
