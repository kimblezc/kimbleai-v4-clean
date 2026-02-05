/**
 * Conversations API Endpoint
 *
 * List and create conversations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { ensureUserExists } from '@/lib/auth/ensure-user';
import { conversationQueries } from '@/lib/db/queries';
import {
  asyncHandler,
  AuthenticationError,
  validateRequired,
} from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

/**
 * GET: List all conversations
 */
export const GET = asyncHandler(async (req: NextRequest) => {
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  // Get validated database userId (may differ from session)
  const userId = await ensureUserExists(
    session.user.id,
    session.user.email,
    session.user.name
  );

  logger.apiRequest({
    method: 'GET',
    path: '/api/conversations',
    userId,
  });

  // 2. Parse query params
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  // 3. Get conversations
  const conversations = await logger.measure(
    'Get all conversations',
    async () => await conversationQueries.getAll(userId, {
      projectId: projectId || undefined,
      limit,
      offset,
    }),
    { userId, projectId: projectId || undefined, limit, offset }
  );

  logger.dbQuery({
    table: 'conversations',
    operation: 'SELECT',
    userId,
    durationMs: Date.now() - startTime,
  });

  // 4. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'GET',
    path: '/api/conversations',
    status: 200,
    durationMs,
    userId,
  });

  return NextResponse.json({
    conversations: conversations || [],
    count: conversations?.length || 0,
    limit,
    offset,
  });
});

/**
 * POST: Create new conversation
 */
export const POST = asyncHandler(async (req: NextRequest) => {
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  // Get validated database userId (may differ from session)
  const userId = await ensureUserExists(
    session.user.id,
    session.user.email,
    session.user.name
  );

  // 2. Parse and validate body
  const body = await req.json();

  validateRequired(body, ['title']);

  const { title, projectId, model } = body;

  logger.apiRequest({
    method: 'POST',
    path: '/api/conversations',
    userId,
    body: { title, projectId },
  });

  // 3. Create conversation
  const conversation = await logger.measure(
    'Create conversation',
    async () => await conversationQueries.create(userId, {
      title,
      projectId,
      model,
    }),
    { userId, title, projectId }
  );

  logger.dbQuery({
    table: 'conversations',
    operation: 'INSERT',
    userId,
    durationMs: Date.now() - startTime,
  });

  logger.info('Conversation created successfully', {
    userId,
    conversationId: conversation.id,
    title: conversation.title,
  });

  // 4. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'POST',
    path: '/api/conversations',
    status: 201,
    durationMs,
    userId,
  });

  return NextResponse.json(conversation, { status: 201 });
});
