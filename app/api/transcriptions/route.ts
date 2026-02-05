/**
 * Transcriptions API Endpoint
 *
 * List, search, and manage transcriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { ensureUserExists } from '@/lib/auth/ensure-user';
import { supabase } from '@/lib/db/client';
import { asyncHandler, AuthenticationError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

/**
 * GET: List transcriptions with optional filters
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
    path: '/api/transcriptions',
    userId,
  });

  // 2. Parse query parameters
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const projectId = searchParams.get('projectId');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  // 3. Build query (using audio_transcriptions table in v5)
  let query = (supabase as any)
    .from('audio_transcriptions')
    .select('*, projects:project_id(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (category) {
    query = query.eq('metadata->>category', category);
  }

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  if (search) {
    query = query.or(`filename.ilike.%${search}%,text.ilike.%${search}%,metadata->summary.ilike.%${search}%`);
  }

  const { data: transcriptions, error } = await query;

  if (error) {
    logger.error('Failed to fetch transcriptions', { userId, error: error.message });
    throw error;
  }

  // 4. Format response (mapping from audio_transcriptions columns)
  const formattedTranscriptions = (transcriptions || []).map((t: any) => ({
    id: t.id,
    name: t.filename,
    createdAt: t.created_at,
    durationSeconds: t.duration || 0,
    category: t.metadata?.category || 'other',
    categoryConfidence: t.metadata?.categoryConfidence || 0,
    suggestedProjectName: t.metadata?.suggestedProjectName,
    projectId: t.project_id,
    projectName: t.projects?.name,
    summary: t.metadata?.summary || '',
    topics: t.metadata?.topics || [],
    tags: t.metadata?.tags || [],
    isPrivate: t.metadata?.isPrivate || false,
    confidence: t.metadata?.confidence || 0,
    status: t.status || 'completed',
    text: t.text,
  }));

  // 5. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'GET',
    path: '/api/transcriptions',
    status: 200,
    durationMs,
    userId,
  });

  return NextResponse.json({
    transcriptions: formattedTranscriptions,
    total: formattedTranscriptions.length,
    limit,
    offset,
  });
});
