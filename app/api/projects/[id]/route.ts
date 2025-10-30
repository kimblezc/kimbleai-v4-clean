import { NextRequest, NextResponse } from 'next/server';
import { ProjectManager } from '@/lib/project-manager';
import { createClient } from '@supabase/supabase-js';
import { getUserByIdentifier, isResourceOwner } from '@/lib/user-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const projectManager = ProjectManager.getInstance();

    const project = await projectManager.getProject(projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Project GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const updates = await request.json();
    const userId = updates.userId || 'zach';

    // Get user data using centralized helper
    const userData = await getUserByIdentifier(userId, supabase);

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify project ownership
    const { data: projectData, error: projectFetchError } = await supabase
      .from('projects')
      .select('id, owner_id, name')
      .eq('id', projectId)
      .single();

    if (projectFetchError || !projectData) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check ownership using comprehensive user identifier comparison
    const isOwner = isResourceOwner(userId, projectData.owner_id, userData);

    if (!isOwner) {
      console.error('[PROJECT-UPDATE] User does not own this project');
      console.error('[PROJECT-UPDATE] Project owner:', projectData.owner_id);
      console.error('[PROJECT-UPDATE] User ID:', userData.id, 'Name:', userData.name);
      return NextResponse.json(
        {
          error: 'Unauthorized',
          details: 'You do not have permission to update this project'
        },
        { status: 403 }
      );
    }

    const projectManager = ProjectManager.getInstance();
    const updatedProject = await projectManager.updateProject(projectId, updates);

    if (!updatedProject) {
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      project: updatedProject,
    });
  } catch (error) {
    console.error('Project PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach';

    // Get user data using centralized helper
    const userData = await getUserByIdentifier(userId, supabase);

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify project ownership
    const { data: projectData, error: projectFetchError } = await supabase
      .from('projects')
      .select('id, owner_id, name')
      .eq('id', projectId)
      .single();

    if (projectFetchError || !projectData) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check ownership using comprehensive user identifier comparison
    const isOwner = isResourceOwner(userId, projectData.owner_id, userData);

    if (!isOwner) {
      console.error('[PROJECT-DELETE] User does not own this project');
      console.error('[PROJECT-DELETE] Project owner:', projectData.owner_id);
      console.error('[PROJECT-DELETE] User ID:', userData.id, 'Name:', userData.name);
      return NextResponse.json(
        {
          error: 'Unauthorized',
          details: 'You do not have permission to delete this project'
        },
        { status: 403 }
      );
    }

    const projectManager = ProjectManager.getInstance();
    const success = await projectManager.deleteProject(projectId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Project DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
