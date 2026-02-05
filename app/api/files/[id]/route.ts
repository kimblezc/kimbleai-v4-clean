/**
 * Individual File API Endpoint
 *
 * GET, PATCH, DELETE operations for specific file
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
  NotFoundError,
} from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

/**
 * GET: Get single file
 */
export const GET = asyncHandler(async (
  _req: NextRequest,
  { params }: { params: { id: string } }
) => {
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  // Validate user exists in DB and get correct userId
  const userId = await ensureUserExists(session.user.id, session.user.email, session.user.name);
  const fileId = params.id;

  logger.apiRequest({
    method: 'GET',
    path: `/api/files/${fileId}`,
    userId,
  });

  // 2. Get file (from file_registry in v5)
  const { data: file, error } = await logger.measure(
    'Get file by ID',
    async () => await supabase
      .from('file_registry')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single(),
    { userId, fileId }
  );

  if (error || !file) {
    throw new NotFoundError('File');
  }

  // 3. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'GET',
    path: `/api/files/${fileId}`,
    status: 200,
    durationMs,
    userId,
  });

  return NextResponse.json(file);
});

/**
 * PATCH: Update file metadata
 */
export const PATCH = asyncHandler(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  // Validate user exists in DB and get correct userId
  const userId = await ensureUserExists(session.user.id, session.user.email, session.user.name);
  const fileId = params.id;

  // 2. Parse body
  const body = await req.json();

  logger.apiRequest({
    method: 'PATCH',
    path: `/api/files/${fileId}`,
    userId,
    body,
  });

  // 3. Verify ownership (from file_registry in v5)
  const { data: existingFile, error: fetchError } = await supabase
    .from('file_registry')
    .select('*')
    .eq('id', fileId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existingFile) {
    throw new NotFoundError('File');
  }

  // 4. Update file metadata (file_registry uses different column names)
  const allowedUpdates: Record<string, any> = {};

  // Handle project_id - it's an array in file_registry
  if (body.projectId) {
    allowedUpdates.projects = body.projectId ? [body.projectId] : [];
  }

  // Handle metadata in source_metadata
  if (body.metadata || body.conversationId) {
    allowedUpdates.source_metadata = {
      ...existingFile.source_metadata,
      ...(body.metadata || {}),
      ...(body.conversationId ? { conversation_id: body.conversationId } : {}),
    };
  }

  const { data: updatedFile, error: updateError } = await logger.measure(
    'Update file metadata',
    async () => await supabase
      .from('file_registry')
      .update(allowedUpdates)
      .eq('id', fileId)
      .eq('user_id', userId)
      .select()
      .single(),
    { userId, fileId }
  );

  if (updateError) {
    throw new Error(`Failed to update file: ${updateError.message}`);
  }

  logger.info('File updated successfully', {
    userId,
    fileId,
    updates: Object.keys(allowedUpdates),
  });

  // 5. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'PATCH',
    path: `/api/files/${fileId}`,
    status: 200,
    durationMs,
    userId,
  });

  return NextResponse.json(updatedFile);
});

/**
 * DELETE: Delete file
 */
export const DELETE = asyncHandler(async (
  _req: NextRequest,
  { params }: { params: { id: string } }
) => {
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  // Validate user exists in DB and get correct userId
  const userId = await ensureUserExists(session.user.id, session.user.email, session.user.name);
  const fileId = params.id;

  logger.apiRequest({
    method: 'DELETE',
    path: `/api/files/${fileId}`,
    userId,
  });

  // 2. Delete file
  const fileService = new FileService(supabase);

  await logger.measure(
    'Delete file',
    async () => await fileService.deleteFile(userId, fileId),
    { userId, fileId }
  );

  logger.warn('File deleted', {
    userId,
    fileId,
  });

  // 3. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'DELETE',
    path: `/api/files/${fileId}`,
    status: 200,
    durationMs,
    userId,
  });

  return NextResponse.json({ success: true, message: 'File deleted successfully' });
});
