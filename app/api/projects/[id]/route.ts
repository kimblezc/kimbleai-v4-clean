/**
 * Individual Project API Endpoint
 *
 * GET, PATCH, DELETE operations for specific project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { projectQueries } from '@/lib/db/queries';
import {
  asyncHandler,
  AuthenticationError,
  NotFoundError,
} from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

/**
 * GET: Get single project
 */
export const GET = asyncHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: projectId } = await params;
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const userId = session.user.id;

  logger.apiRequest({
    method: 'GET',
    path: `/api/projects/${projectId}`,
    userId,
  });

  // 2. Get project
  const project = await logger.measure(
    'Get project by ID',
    async () => await projectQueries.getById(projectId),
    { userId, projectId }
  );

  if (!project) {
    throw new NotFoundError('Project');
  }

  // 3. Verify ownership
  if (project.user_id !== userId) {
    throw new AuthenticationError('Unauthorized to access this project');
  }

  // 4. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'GET',
    path: `/api/projects/${projectId}`,
    status: 200,
    durationMs,
    userId,
  });

  return NextResponse.json(project);
});

/**
 * PATCH: Update project
 */
export const PATCH = asyncHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: projectId } = await params;
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const userId = session.user.id;

  // 2. Parse body
  const body = await req.json();

  logger.apiRequest({
    method: 'PATCH',
    path: `/api/projects/${projectId}`,
    userId,
    body,
  });

  // 3. Verify ownership
  const existingProject = await projectQueries.getById(projectId);

  if (!existingProject) {
    throw new NotFoundError('Project');
  }

  if (existingProject.user_id !== userId) {
    throw new AuthenticationError('Unauthorized to update this project');
  }

  // 4. Update project
  const updatedProject = await logger.measure(
    'Update project',
    async () => await projectQueries.update(projectId, body),
    { userId, projectId }
  );

  logger.info('Project updated successfully', {
    userId,
    projectId,
    updates: Object.keys(body),
  });

  // 5. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'PATCH',
    path: `/api/projects/${projectId}`,
    status: 200,
    durationMs,
    userId,
  });

  return NextResponse.json(updatedProject);
});

/**
 * DELETE: Delete project
 */
export const DELETE = asyncHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: projectId } = await params;
  const startTime = Date.now();

  // 1. Authenticate
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const userId = session.user.id;

  logger.apiRequest({
    method: 'DELETE',
    path: `/api/projects/${projectId}`,
    userId,
  });

  // 2. Verify ownership
  const project = await projectQueries.getById(projectId);

  if (!project) {
    throw new NotFoundError('Project');
  }

  if (project.user_id !== userId) {
    throw new AuthenticationError('Unauthorized to delete this project');
  }

  // 3. Delete project
  await logger.measure(
    'Delete project',
    async () => await projectQueries.delete(projectId),
    { userId, projectId }
  );

  logger.warn('Project deleted', {
    userId,
    projectId,
    projectName: project.name,
  });

  // 4. Log and return
  const durationMs = Date.now() - startTime;

  logger.apiResponse({
    method: 'DELETE',
    path: `/api/projects/${projectId}`,
    status: 200,
    durationMs,
    userId,
  });

  return NextResponse.json({ success: true, message: 'Project deleted successfully' });
});
