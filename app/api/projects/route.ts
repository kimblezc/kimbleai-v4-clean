/**
 * Projects API Endpoint
 *
 * CRUD operations for projects with comprehensive logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { projectQueries, userQueries } from '@/lib/db/queries';
import {
  asyncHandler,
  AuthenticationError,
  validateRequired,
} from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

/**
 * Ensure user exists in database and return the correct user ID
 * Returns the database user ID (may differ from session userId)
 */
async function ensureUserExists(userId: string, email: string | null | undefined, name: string | null | undefined): Promise<string> {
  try {
    // First try to get by ID
    const existingUser = await userQueries.getById(userId).catch(() => null);
    if (existingUser) {
      logger.info('Found user by ID', { userId });
      return existingUser.id;
    }

    // If not found by ID and we have email, try by email
    // IMPORTANT: Return the DB user's ID, not the session userId
    if (email) {
      const userByEmail = await userQueries.getByEmail(email);
      if (userByEmail) {
        logger.info('Found user by email, using DB userId', {
          sessionUserId: userId,
          dbUserId: userByEmail.id,
          email
        });
        return userByEmail.id; // Use the DB user's ID!
      }
    }

    // Create new user with the session's userId
    logger.info('Creating missing user record', { userId, email });
    const newUser = await userQueries.createWithId(userId, {
      email: email || `user-${userId}@kimbleai.local`,
      name: name || undefined,
    });
    return newUser.id;
  } catch (error) {
    logger.error('Failed to ensure user exists', error as Error, { userId, email });
    throw error;
  }
}

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

  const sessionUserId = session.user.id;

  // 2. Ensure user exists in database and get the correct DB user ID
  // This may return a different ID if user exists by email with different ID
  const dbUserId = await ensureUserExists(sessionUserId, session.user.email, session.user.name);

  // 3. Parse and validate body
  const body = await req.json();

  validateRequired(body, ['name']);

  const { name, description, color, icon, status, priority } = body;

  logger.apiRequest({
    method: 'POST',
    path: '/api/projects',
    userId: dbUserId,
    body: { name },
  });

  // 4. Create project with the correct DB user ID
  const project = await logger.measure(
    'Create project',
    async () => await projectQueries.create(dbUserId, {
      name,
      description,
      color,
      icon,
      status,
      priority,
    }),
    { userId: dbUserId, projectName: name }
  );

  logger.dbQuery({
    table: 'projects',
    operation: 'INSERT',
    userId: dbUserId,
    durationMs: Date.now() - startTime,
  });

  logger.info('Project created successfully', {
    userId: dbUserId,
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
    userId: dbUserId,
  });

  return NextResponse.json(project, { status: 201 });
});
