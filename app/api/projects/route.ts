/**
 * Projects API Endpoint
 *
 * CRUD operations for projects with comprehensive logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { projectQueries } from '@/lib/db/queries';
import {
  asyncHandler,
  AuthenticationError,
  validateRequired,
} from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

/**
 * GET: List all projects
 */
export const GET = asyncHandler(async (req: NextRequest) => {
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const userId = session.user.id;

  logger.apiRequest({
    method: 'GET',
    path: '/api/projects',
    userId,
  });

  // 2. Parse query params
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as 'active' | 'archived' | 'completed' | null;
  const sortBy = searchParams.get('sortBy') as 'recent' | 'alpha' | 'priority' | 'deadline' | null;

  // 3. Get projects
  const projects = await logger.measure(
    'Get all projects',
    async () => await projectQueries.getAll(userId, {
      status: status || undefined,
      sortBy: sortBy || 'recent',
    }),
    { userId, status, sortBy }
  );

  logger.dbQuery({
    table: 'projects',
    operation: 'SELECT',
    userId,
    durationMs: Date.now() - startTime,
  });

  // 4. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'GET',
    path: '/api/projects',
    status: 200,
    durationMs,
    userId,
  });

  return NextResponse.json({ projects, count: projects.length });
});

/**
 * POST: Create new project
 */
export const POST = asyncHandler(async (req: NextRequest) => {
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const userId = session.user.id;

  // 2. Parse and validate body
  const body = await req.json();

  validateRequired(body, ['name']);

  const { name, description, color, icon, priority } = body;

  logger.apiRequest({
    method: 'POST',
    path: '/api/projects',
    userId,
    body: { name },
  });

  // 3. Create project
  const project = await logger.measure(
    'Create project',
    async () => await projectQueries.create(userId, {
      name,
      description,
      color,
      icon,
      priority,
    }),
    { userId, projectName: name }
  );

  logger.dbQuery({
    table: 'projects',
    operation: 'INSERT',
    userId,
    durationMs: Date.now() - startTime,
  });

  logger.info('Project created successfully', {
    userId,
    projectId: project.id,
    projectName: project.name,
  });

  // 4. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'POST',
    path: '/api/projects',
    status: 201,
    durationMs,
    userId,
  });

  return NextResponse.json(project, { status: 201 });
});
