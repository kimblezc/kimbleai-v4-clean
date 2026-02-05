/**
 * Transcription Assignment API Endpoint
 *
 * Assign transcriptions to projects
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { ensureUserExists } from '@/lib/auth/ensure-user';
import { supabase } from '@/lib/db/client';
import {
  asyncHandler,
  AuthenticationError,
  ValidationError,
} from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

/**
 * POST: Assign transcription to a project
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
    path: '/api/transcriptions/assign',
    userId,
  });

  // 2. Parse body
  const body = await req.json();
  const { fileId, projectId, createNewProject, newProjectName } = body;

  if (!fileId) {
    throw new ValidationError('File ID is required');
  }

  if (!projectId && !createNewProject) {
    throw new ValidationError('Either projectId or createNewProject must be provided');
  }

  // 3. Verify transcription ownership (audio_transcriptions table in v5)
  const { data: file } = await (supabase as any)
    .from('audio_transcriptions')
    .select('*')
    .eq('id', fileId)
    .eq('user_id', userId)
    .single();

  if (!file) {
    throw new ValidationError('Transcription not found or access denied');
  }

  let targetProjectId = projectId;

  // 4. Create new project if requested
  if (createNewProject && newProjectName) {
    const { data: newProject, error: createError } = await (supabase as any)
      .from('projects')
      .insert({
        user_id: userId,
        name: newProjectName,
        description: `Auto-created for ${file.metadata?.category || 'general'} transcriptions`,
        metadata: {
          category: file.metadata?.category,
          autoCreated: true,
          createdFrom: 'transcription',
        },
      })
      .select()
      .single();

    if (createError) {
      logger.error('Failed to create project', { userId, error: createError.message });
      throw createError;
    }

    targetProjectId = newProject.id;

    logger.info('Created new project for transcription', {
      userId,
      projectId: targetProjectId,
      projectName: newProjectName,
    });
  }

  // 5. Assign transcription to project (audio_transcriptions table in v5)
  const { error: assignError } = await (supabase as any)
    .from('audio_transcriptions')
    .update({
      project_id: targetProjectId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fileId)
    .eq('user_id', userId);

  if (assignError) {
    logger.error('Failed to assign transcription to project', { userId, error: assignError.message });
    throw assignError;
  }

  logger.info('Transcription assigned to project', {
    userId,
    transcriptionId: fileId,
    projectId: targetProjectId,
  });

  // 6. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'POST',
    path: '/api/transcriptions/assign',
    status: 200,
    durationMs,
    userId,
  });

  return NextResponse.json({
    success: true,
    fileId,
    projectId: targetProjectId,
    message: createNewProject
      ? `Transcription assigned to new project "${newProjectName}"`
      : 'Transcription assigned to project',
  });
});
