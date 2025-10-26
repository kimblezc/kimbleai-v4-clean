/**
 * Task Queue API Endpoint
 *
 * Provides access to the Archie autonomous agent task queue.
 * Returns tasks grouped by status with statistics.
 *
 * Endpoint: GET /api/archie/tasks/queue
 *
 * Features:
 * - Fetch all tasks or filter by status
 * - Calculate task statistics
 * - Real-time task data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  failed: number;
  skipped: number;
  successRate: number;
  avgDuration: number;
  tasksByType: Record<string, number>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('agent_tasks')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Fetch tasks
    const { data: tasks, error: tasksError } = await query;

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json(
        { error: 'Failed to fetch tasks', details: tasksError.message },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = await calculateTaskStats(tasks || []);

    return NextResponse.json({
      tasks: tasks || [],
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Unexpected error in task queue API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Calculate comprehensive task statistics
 */
async function calculateTaskStats(tasks: any[]): Promise<TaskStats> {
  // Count by status
  const statusCounts = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
    skipped: 0
  };

  // Count by type
  const tasksByType: Record<string, number> = {};

  // Track durations for completed tasks
  const durations: number[] = [];

  tasks.forEach(task => {
    // Status counts
    if (statusCounts.hasOwnProperty(task.status)) {
      statusCounts[task.status as keyof typeof statusCounts]++;
    }

    // Type counts
    tasksByType[task.task_type] = (tasksByType[task.task_type] || 0) + 1;

    // Duration tracking
    if (task.status === 'completed' && task.duration_ms) {
      durations.push(task.duration_ms);
    }
  });

  // Calculate success rate
  const totalCompleted = statusCounts.completed + statusCounts.failed;
  const successRate = totalCompleted > 0
    ? (statusCounts.completed / totalCompleted) * 100
    : 0;

  // Calculate average duration
  const avgDuration = durations.length > 0
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length
    : 0;

  return {
    total: tasks.length,
    pending: statusCounts.pending,
    in_progress: statusCounts.in_progress,
    completed: statusCounts.completed,
    failed: statusCounts.failed,
    skipped: statusCounts.skipped,
    successRate: Math.round(successRate * 10) / 10,
    avgDuration: Math.round(avgDuration),
    tasksByType
  };
}

/**
 * Optional: POST endpoint for creating new tasks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      task_type,
      title,
      description,
      priority = 5,
      file_paths = [],
      metadata = {},
      scheduled_for
    } = body;

    // Validate required fields
    if (!task_type || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: task_type, title' },
        { status: 400 }
      );
    }

    // Insert new task
    const { data: newTask, error: insertError } = await supabase
      .from('agent_tasks')
      .insert({
        task_type,
        title,
        description,
        priority,
        file_paths,
        metadata,
        scheduled_for: scheduled_for || new Date().toISOString(),
        status: 'pending',
        created_by: 'api'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating task:', insertError);
      return NextResponse.json(
        { error: 'Failed to create task', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      task: newTask,
      message: 'Task created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Unexpected error creating task:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
