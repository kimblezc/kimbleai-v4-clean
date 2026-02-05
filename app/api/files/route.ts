/**
 * Files API Endpoint
 *
 * List all files with optional filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { ensureUserExists } from '@/lib/auth/ensure-user';
import { supabase } from '@/lib/db/client';
import {
  asyncHandler,
  AuthenticationError,
} from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

/**
 * GET: List all files
 */
export const GET = asyncHandler(async (req: NextRequest) => {
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
    path: '/api/files',
    userId,
  });

  // 2. Parse query params
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');
  const projectId = searchParams.get('projectId');
  const mimeType = searchParams.get('mimeType');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  // 3. Build query (using file_registry table in v5)
  let query = supabase
    .from('file_registry')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  if (conversationId) {
    // conversation_id is in source_metadata JSONB
    query = query.contains('source_metadata', { conversation_id: conversationId });
  }

  if (projectId) {
    // projects is an array column
    query = query.contains('projects', [projectId]);
  }

  if (mimeType) {
    query = query.like('mime_type', `${mimeType}%`);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // 4. Get files
  const { data: files, error, count } = await logger.measure(
    'Get all files',
    async () => await query,
    {
      userId,
      conversationId: conversationId || undefined,
      projectId: projectId || undefined,
      mimeType: mimeType || undefined,
      limit,
      offset
    }
  );

  if (error) {
    throw new Error(`Failed to fetch files: ${error.message}`);
  }

  logger.dbQuery({
    table: 'file_registry',
    operation: 'SELECT',
    userId,
    durationMs: Date.now() - startTime,
  });

  // 5. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'GET',
    path: '/api/files',
    status: 200,
    durationMs,
    userId,
  });

  return NextResponse.json({
    files: files || [],
    count: count || 0,
    limit,
    offset,
  });
});
