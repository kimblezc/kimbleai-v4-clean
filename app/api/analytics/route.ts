/**
 * Analytics API Endpoint
 *
 * Provides cost analytics, budget status, and usage statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getAIService } from '@/lib/ai/ai-service';
import { supabase } from '@/lib/db/client';
import { asyncHandler, AuthenticationError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

export const GET = asyncHandler(async (_req: NextRequest) => {
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const userId = session.user.id;

  logger.apiRequest({
    method: 'GET',
    path: '/api/analytics',
    userId,
  });

  // 2. Get analytics
  const aiService = getAIService(supabase);

  const analytics = await logger.measure(
    'Get cost analytics',
    async () => await aiService.getCostAnalytics(userId),
    { userId }
  );

  // 3. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'GET',
    path: '/api/analytics',
    status: 200,
    durationMs,
    userId,
  });

  return NextResponse.json(analytics);
});
