import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/sessions - List all sessions for current user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const device = searchParams.get('device');
    const limit = searchParams.get('limit') || '50';

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('session_logs')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(parseInt(limit));

    // Filter by device if specified
    if (device && device !== 'all') {
      query = query.eq('device_name', device);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions: data || [] });
  } catch (error) {
    console.error('Error in GET /api/sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create new session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      sessionId,
      deviceName,
      projectPath,
      title,
      summary,
      filesModified,
      gitCommits,
      todos,
      keyDecisions,
      nextSteps,
      gitBranch,
      gitCommitHash,
      tags,
      workingDirectory
    } = body;

    // Validate required fields
    if (!userId || !sessionId || !deviceName || !projectPath || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, sessionId, deviceName, projectPath, title' },
        { status: 400 }
      );
    }

    // Validate device name
    if (!['laptop', 'pc', 'other'].includes(deviceName)) {
      return NextResponse.json(
        { error: 'Invalid device name. Must be: laptop, pc, or other' },
        { status: 400 }
      );
    }

    // Insert session
    const { data, error } = await supabase
      .from('session_logs')
      .insert([{
        user_id: userId,
        session_id: sessionId,
        device_name: deviceName,
        project_path: projectPath,
        title,
        summary: summary || null,
        files_modified: filesModified || [],
        git_commits: gitCommits || [],
        todos: todos || [],
        key_decisions: keyDecisions || [],
        next_steps: nextSteps || [],
        git_branch: gitBranch || null,
        git_commit_hash: gitCommitHash || null,
        tags: tags || [],
        working_directory: workingDirectory || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return NextResponse.json(
        { error: 'Failed to create session', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session: data
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
