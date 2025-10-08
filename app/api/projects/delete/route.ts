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

    // First, get all conversations with messages for better project detection
    const { data: conversations, error: fetchError } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        messages(id, content, role, created_at)
      `)
      .eq('user_id', userData.id);

    if (fetchError) {
      console.error('Error fetching conversations:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch conversations',
        details: fetchError.message
      }, { status: 500 });
    }

    // Use the same project detection logic as the conversations API
    const conversationsToUpdate = conversations?.filter(conv => {
      const lastMessage = conv.messages?.[0]; // Latest message
      const projectFromTitle = autoDetectProject(conv.title || '');
      const projectFromContent = lastMessage ? autoDetectProject(lastMessage.content) : '';
      const detectedProject = projectFromTitle || projectFromContent || '';
      return detectedProject === projectId;
    }) || [];

    console.log(`Found ${conversationsToUpdate.length} conversations to update for project: ${projectId}`);

    // Since we don't have metadata column, we'll rename conversation titles to make them unassigned
    // Remove project-specific keywords from titles so they won't be auto-classified
    const updatePromises = conversationsToUpdate.map(conv => {
      // Remove project-specific keywords from title
      let newTitle = conv.title || '';

      // Remove automotive keywords
      newTitle = newTitle.replace(/tesla|car|vehicle|model \d|license plate/gi, '');
      // Remove business keywords
      newTitle = newTitle.replace(/project alpha|project beta|budget|financial|allocation|deadline/gi, '');
      // Remove development keywords
      newTitle = newTitle.replace(/kimbleai|development|code|api|react|nextjs|typescript|build|deploy/gi, '');
      // Remove personal keywords (but keep some context)
      newTitle = newTitle.replace(/rebecca|wife|family|dog|pet/gi, '');
      // Remove travel keywords
      newTitle = newTitle.replace(/travel|trip|rome|vacation|planning/gi, '');
      // Remove gaming keywords
      newTitle = newTitle.replace(/dnd|d&d|campaign|dungeon|dragon|character|gaming|rpg|dice|adventure/gi, '');

      // Clean up extra spaces and add unassigned indicator
      newTitle = newTitle.replace(/\s+/g, ' ').trim();
      if (!newTitle) newTitle = 'Conversation';
      newTitle = `[Unassigned] ${newTitle}`;

      return supabase
        .from('conversations')
        .update({
          title: newTitle,
          updated_at: new Date().toISOString()
        })
        .eq('id', conv.id)
        .eq('user_id', userData.id);
    });

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
        id: `deleted_${projectId}_${Date.now()}`,
        user_id: userData.id,
        title: `DELETED_PROJECT_MARKER_${projectId}_${conversationsToUpdate.length}_conversations_moved`,
        updated_at: new Date().toISOString()
      });

    if (deleteMarkerError) {
      console.error('Error creating delete marker:', deleteMarkerError);
      // Continue anyway - the main operation succeeded
    }

    return NextResponse.json({
      success: true,
      projectId,
      conversationsMoved: conversationsToUpdate.length,
      message: `Project "${projectId}" deleted successfully. ${conversationsToUpdate.length} conversations now unassigned.`
    });

  } catch (error: any) {
    console.error('Project deletion error:', error);
    return NextResponse.json({
      error: 'Failed to delete project',
      details: error.message
    }, { status: 500 });
  }
}

function autoDetectProject(content: string): string {
  if (!content) return '';

  const lowerContent = content.toLowerCase();

  // Development & Technical Projects
  if (lowerContent.includes('kimbleai') || lowerContent.includes('development') ||
      lowerContent.includes('code') || lowerContent.includes('api') ||
      lowerContent.includes('react') || lowerContent.includes('nextjs') ||
      lowerContent.includes('typescript') || lowerContent.includes('build') ||
      lowerContent.includes('deploy') || lowerContent.includes('technical documents')) {
    return 'development';
  }

  // Personal & Family
  if (lowerContent.includes('rebecca') || lowerContent.includes('wife') ||
      lowerContent.includes('family') || lowerContent.includes('pet') ||
      lowerContent.includes('dog') || lowerContent.includes('home') ||
      lowerContent.includes('personal')) {
    return 'personal';
  }

  // Travel & Planning
  if (lowerContent.includes('travel') || lowerContent.includes('trip') ||
      lowerContent.includes('rome') || lowerContent.includes('vacation') ||
      lowerContent.includes('planning')) {
    return 'travel';
  }

  // Finance & Business
  if (lowerContent.includes('budget') || lowerContent.includes('financial') ||
      lowerContent.includes('allocation') || lowerContent.includes('project alpha') ||
      lowerContent.includes('project beta') || lowerContent.includes('deadline')) {
    return 'business';
  }

  // Automotive
  if (lowerContent.includes('tesla') || lowerContent.includes('car') ||
      lowerContent.includes('license plate') || lowerContent.includes('vehicle') ||
      lowerContent.includes('model 3') || lowerContent.includes('model y')) {
    return 'automotive';
  }

  // Gaming & DND
  if (lowerContent.includes('dnd') || lowerContent.includes('d&d') ||
      lowerContent.includes('campaign') || lowerContent.includes('dungeon') ||
      lowerContent.includes('dragon') || lowerContent.includes('character') ||
      lowerContent.includes('gaming') || lowerContent.includes('rpg') ||
      lowerContent.includes('dice') || lowerContent.includes('adventure')) {
    return 'gaming';
  }

  return '';
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

    // Get list of deleted projects from conversation markers (no metadata column)
    const { data: deletedProjectMarkers, error } = await supabase
      .from('conversations')
      .select('title, updated_at')
      .eq('user_id', userData.id)
      .like('title', 'DELETED_PROJECT_MARKER_%')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching deleted projects:', error);
      return NextResponse.json({
        error: 'Failed to fetch deleted projects',
        details: error.message
      }, { status: 500 });
    }

    // Convert conversation markers to deleted projects format
    const deletedProjects = deletedProjectMarkers?.map(marker => {
      const titleParts = marker.title?.split('_') || [];
      const projectId = titleParts[2];
      const conversationsMoved = parseInt(titleParts[3]) || 0;
      return {
        project_id: projectId,
        deleted_at: marker.updated_at,
        conversations_moved: conversationsMoved
      };
    }).filter(dp => dp.project_id) || [];

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