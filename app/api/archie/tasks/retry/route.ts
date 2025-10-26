/**
 * Task Retry API Endpoint
 *
 * Allows retrying failed tasks by resetting their status to pending
 * and incrementing the attempt counter.
 *
 * Endpoint: POST /api/archie/tasks/retry
 *
 * Body: { taskId: string }
 *
 * Features:
 * - Validate task exists and can be retried
 * - Check max attempts not exceeded
 * - Reset task status to pending
 * - Broadcast activity event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { activityStream } from '@/lib/activity-stream';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Missing required field: taskId' },
        { status: 400 }
      );
    }

    // Fetch the task
    const { data: task, error: fetchError } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) {
      return NextResponse.json(
        { error: 'Task not found', details: fetchError?.message },
        { status: 404 }
      );
    }

    // Check if task can be retried
    if (task.status !== 'failed') {
      return NextResponse.json(
        { error: 'Only failed tasks can be retried', currentStatus: task.status },
        { status: 400 }
      );
    }

    if (task.attempts >= task.max_attempts) {
      return NextResponse.json(
        { error: 'Maximum retry attempts exceeded', attempts: task.attempts, maxAttempts: task.max_attempts },
        { status: 400 }
      );
    }

    // Reset task to pending and increment attempts
    const { data: updatedTask, error: updateError } = await supabase
      .from('agent_tasks')
      .update({
        status: 'pending',
        attempts: task.attempts + 1,
        error_message: null,
        scheduled_for: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task:', updateError);
      return NextResponse.json(
        { error: 'Failed to retry task', details: updateError.message },
        { status: 500 }
      );
    }

    // Broadcast activity event
    activityStream.broadcast({
      category: 'task_processing',
      level: 'info',
      agent: 'Task Manager',
      message: `Task "${task.title}" queued for retry (attempt ${task.attempts + 1}/${task.max_attempts})`,
      details: `Task type: ${task.task_type}`,
      metadata: {
        taskId: task.id,
        taskType: task.task_type,
        attempts: task.attempts + 1,
        maxAttempts: task.max_attempts
      },
      userId: 'zach'
    });

    return NextResponse.json({
      task: updatedTask,
      message: 'Task queued for retry',
      attempts: task.attempts + 1,
      maxAttempts: task.max_attempts
    });

  } catch (error: any) {
    console.error('Unexpected error retrying task:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Optional: GET endpoint to check if a task can be retried
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Missing query parameter: taskId' },
        { status: 400 }
      );
    }

    // Fetch the task
    const { data: task, error: fetchError } = await supabase
      .from('agent_tasks')
      .select('id, status, attempts, max_attempts, title, task_type')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const canRetry = task.status === 'failed' && task.attempts < task.max_attempts;

    return NextResponse.json({
      taskId: task.id,
      title: task.title,
      taskType: task.task_type,
      status: task.status,
      attempts: task.attempts,
      maxAttempts: task.max_attempts,
      canRetry,
      reason: !canRetry
        ? task.status !== 'failed'
          ? 'Task is not in failed status'
          : 'Maximum retry attempts exceeded'
        : null
    });

  } catch (error: any) {
    console.error('Unexpected error checking retry eligibility:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
