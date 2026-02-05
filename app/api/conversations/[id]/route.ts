/**
 * Single Conversation API Endpoint
 *
 * Get, update, or delete a conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { ensureUserExists } from '@/lib/auth/ensure-user';
import { conversationQueries } from '@/lib/db/queries';
import {
  asyncHandler,
  AuthenticationError,
  NotFoundError,
} from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

/**
 * GET: Get single conversation with messages
 */
export const GET = asyncHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  // Validate user exists in DB and get correct userId
  const userId = await ensureUserExists(session.user.id, session.user.email, session.user.name);

  logger.apiRequest({
    method: 'GET',
    path: `/api/conversations/${id}`,
    userId,
  });

  // 2. Get conversation
  const conversation = await conversationQueries.getById(id);

  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  // 3. Verify ownership
  if (conversation.user_id !== userId) {
    throw new AuthenticationError('Not authorized to access this conversation');
  }

  // 4. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'GET',
    path: `/api/conversations/${id}`,
    status: 200,
    durationMs,
    userId,
  });

  return NextResponse.json(conversation);
});

/**
 * PUT: Update conversation (title, project, pin status)
 */
export const PUT = asyncHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  // Validate user exists in DB and get correct userId
  const userId = await ensureUserExists(session.user.id, session.user.email, session.user.name);

  // 2. Parse body
  const body = await req.json();
  const { title, projectId, isPinned } = body;

  logger.apiRequest({
    method: 'PUT',
    path: `/api/conversations/${id}`,
    userId,
    body: { title, projectId, isPinned },
  });

  // 3. Verify ownership
  const existing = await conversationQueries.getById(id);

  if (!existing) {
    throw new NotFoundError('Conversation not found');
  }

  if (existing.user_id !== userId) {
    throw new AuthenticationError('Not authorized to update this conversation');
  }

  // 4. Update conversation
  const conversation = await conversationQueries.update(id, {
    title,
    projectId,
    isPinned,
  });

  logger.info('Conversation updated', {
    userId,
    conversationId: id,
    updates: { title, projectId, isPinned },
  });

  // 5. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'PUT',
    path: `/api/conversations/${id}`,
    status: 200,
    durationMs,
    userId,
  });

  return NextResponse.json(conversation);
});

/**
 * DELETE: Delete conversation
 */
export const DELETE = asyncHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  // Validate user exists in DB and get correct userId
  const userId = await ensureUserExists(session.user.id, session.user.email, session.user.name);

  logger.apiRequest({
    method: 'DELETE',
    path: `/api/conversations/${id}`,
    userId,
  });

  // 2. Verify ownership
  const existing = await conversationQueries.getById(id);

  if (!existing) {
    throw new NotFoundError('Conversation not found');
  }

  if (existing.user_id !== userId) {
    throw new AuthenticationError('Not authorized to delete this conversation');
  }

  // 3. Delete conversation
  await conversationQueries.delete(id);

  logger.info('Conversation deleted', {
    userId,
    conversationId: id,
  });

  // 4. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'DELETE',
    path: `/api/conversations/${id}`,
    status: 200,
    durationMs,
    userId,
  });

  return NextResponse.json({ success: true, message: 'Conversation deleted' });
});
