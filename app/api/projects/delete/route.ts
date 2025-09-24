import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { projectId, userId = 'zach' } = await request.json();

    if (!projectId) {
      return NextResponse.json({
        error: 'Project ID is required'
      }, { status: 400 });
    }

    if (projectId === 'general') {
      return NextResponse.json({
        error: 'Cannot delete the General project'
      }, { status: 400 });
    }

    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 });
    }

    // First, get all conversations that belong to this project
    const { data: conversations, error: fetchError } = await supabase
      .from('conversations')
      .select('id, metadata')
      .eq('user_id', userData.id);

    if (fetchError) {
      console.error('Error fetching conversations:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch conversations',
        details: fetchError.message
      }, { status: 500 });
    }

    // Find conversations that belong to this project (either in metadata or auto-detected)
    const conversationsToUpdate = conversations?.filter(conv => {
      const storedProject = conv.metadata?.project_id;
      return storedProject === projectId;
    }) || [];

    console.log(`Found ${conversationsToUpdate.length} conversations to update for project: ${projectId}`);

    // Update all conversations to move them to 'general' project
    const updatePromises = conversationsToUpdate.map(conv =>
      supabase
        .from('conversations')
        .update({
          metadata: {
            ...conv.metadata,
            project_id: 'general',
            moved_from_project: projectId,
            moved_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', conv.id)
        .eq('user_id', userData.id)
    );

    // Execute all updates
    const updateResults = await Promise.all(updatePromises);

    // Check for any update errors
    const updateErrors = updateResults.filter(result => result.error);
    if (updateErrors.length > 0) {
      console.error('Some conversation updates failed:', updateErrors);
    }

    // Store deletion info in a simple way using existing tables
    // We'll create a special "deleted project marker" conversation
    const { error: deleteMarkerError } = await supabase
      .from('conversations')
      .insert({
        user_id: userData.id,
        title: `DELETED_PROJECT_MARKER_${projectId}`,
        metadata: {
          is_deleted_project_marker: true,
          deleted_project_id: projectId,
          deleted_at: new Date().toISOString(),
          conversations_moved: conversationsToUpdate.length
        }
      });

    if (deleteMarkerError) {
      console.error('Error creating delete marker:', deleteMarkerError);
      // Continue anyway - the main operation succeeded
    }

    return NextResponse.json({
      success: true,
      projectId,
      conversationsMoved: conversationsToUpdate.length,
      message: `Project "${projectId}" deleted successfully. ${conversationsToUpdate.length} conversations moved to General.`
    });

  } catch (error: any) {
    console.error('Project deletion error:', error);
    return NextResponse.json({
      error: 'Failed to delete project',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach';

    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 });
    }

    // Get list of deleted projects from conversation markers
    const { data: deletedProjectMarkers, error } = await supabase
      .from('conversations')
      .select('metadata')
      .eq('user_id', userData.id)
      .like('title', 'DELETED_PROJECT_MARKER_%')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching deleted projects:', error);
      return NextResponse.json({
        error: 'Failed to fetch deleted projects',
        details: error.message
      }, { status: 500 });
    }

    // Convert conversation markers to deleted projects format
    const deletedProjects = deletedProjectMarkers?.map(marker => ({
      project_id: marker.metadata?.deleted_project_id,
      deleted_at: marker.metadata?.deleted_at,
      conversations_moved: marker.metadata?.conversations_moved || 0
    })).filter(dp => dp.project_id) || [];

    return NextResponse.json({
      success: true,
      deletedProjects,
      count: deletedProjects.length
    });

  } catch (error: any) {
    console.error('Get deleted projects error:', error);
    return NextResponse.json({
      error: 'Failed to get deleted projects',
      details: error.message
    }, { status: 500 });
  }
}