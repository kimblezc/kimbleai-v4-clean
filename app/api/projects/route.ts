import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ProjectManager } from '@/lib/project-manager';
import { UserManager } from '@/lib/user-manager';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// IMPROVED: Simple in-memory cache for project lists
const projectCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach-admin-001';
    const action = searchParams.get('action') || 'list';
    const projectId = searchParams.get('projectId');

    const projectManager = ProjectManager.getInstance();
    const userManager = UserManager.getInstance();

    const user = await userManager.getUser(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    switch (action) {
      case 'list':
        // IMPROVED: Check cache first for project lists
        const cacheKey = `projects_list_${userId}`;
        const cached = projectCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          // Return cached data with cache indicator
          return NextResponse.json({
            ...cached.data,
            cached: true,
            cacheAge: Math.round((Date.now() - cached.timestamp) / 1000)
          });
        }

        // Cache miss - fetch fresh data
        let projects = [];
        try {
          projects = await projectManager.getUserProjects(userId);
        } catch (error: any) {
          // If projects table doesn't exist, return empty array
          console.warn('Projects table query failed (table may not exist):', error.message);
          projects = [];
        }

        const responseData = {
          success: true,
          projects: projects,
          total: projects.length
        };

        // Store in cache
        projectCache.set(cacheKey, {
          data: responseData,
          timestamp: Date.now()
        });

        // Clean up old cache entries (simple cleanup)
        if (projectCache.size > 100) {
          const now = Date.now();
          for (const [key, value] of projectCache.entries()) {
            if (now - value.timestamp > CACHE_TTL * 2) {
              projectCache.delete(key);
            }
          }
        }

        return NextResponse.json(responseData);

      case 'get':
        if (!projectId) {
          return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }
        const project = await projectManager.getProject(projectId);
        if (!project) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, project });

      case 'analytics':
        if (!projectId) {
          return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }
        const analytics = await projectManager.getProjectAnalytics(projectId);
        return NextResponse.json({ success: true, analytics });

      case 'tasks':
        if (!projectId) {
          return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }
        const tasks = await projectManager.getProjectTasks(projectId);
        return NextResponse.json({ success: true, tasks });

      case 'collaborators':
        if (!projectId) {
          return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }
        const collaborators = await projectManager.getProjectCollaborators(projectId);
        return NextResponse.json({ success: true, collaborators });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Projects GET error:', error);
    return NextResponse.json({
      error: 'Failed to fetch projects',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId = 'zach-admin-001', projectData, taskData, collaboratorData } = body;

    const projectManager = ProjectManager.getInstance();
    const userManager = UserManager.getInstance();

    const user = await userManager.getUser(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Helper function to invalidate cache for a user
    const invalidateCache = (uid: string) => {
      projectCache.delete(`projects_list_${uid}`);
    };

    switch (action) {
      case 'create':
        if (!await userManager.hasPermission(userId, 'can_create_projects')) {
          return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }

        try {
          const newProject = await projectManager.createProject({
            name: projectData.name,
            description: projectData.description,
            owner_id: user.id, // FIXED: Use actual UUID from user object
            priority: projectData.priority || 'medium',
            status: 'active',
            tags: projectData.tags || [],
            metadata: {
              created_at: new Date().toISOString(),
              created_by: user.id, // FIXED: Use actual UUID
              ...projectData.metadata
            }
          });

          // Invalidate cache after creating project
          invalidateCache(userId);

          return NextResponse.json({
            success: true,
            project: newProject,
            message: 'Project created successfully'
          });
        } catch (error: any) {
          console.error('Project creation failed:', error);
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            stack: error.stack
          });
          return NextResponse.json({
            success: false,
            error: `Database error: ${error.message || 'Unknown error'}`,
            details: error.details || error.hint || 'No additional details',
            code: error.code
          }, { status: 503 });
        }

      case 'update':
        if (!projectData.id) {
          return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }

        const updatedProject = await projectManager.updateProject(projectData.id, {
          name: projectData.name,
          description: projectData.description,
          priority: projectData.priority,
          status: projectData.status,
          tags: projectData.tags,
          metadata: {
            ...projectData.metadata,
            updated_at: new Date().toISOString(),
            updated_by: userId
          }
        });

        // Invalidate cache after updating project
        invalidateCache(userId);

        return NextResponse.json({
          success: true,
          project: updatedProject,
          message: 'Project updated successfully'
        });

      case 'archive':
        if (!projectData.id) {
          return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }

        await projectManager.updateProject(projectData.id, {
          status: 'archived'
        });

        // Invalidate cache after archiving project
        invalidateCache(userId);

        return NextResponse.json({
          success: true,
          message: 'Project archived successfully'
        });

      case 'delete':
        if (!await userManager.hasPermission(userId, 'can_delete_projects')) {
          return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }

        if (!projectData.id) {
          return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }

        await projectManager.deleteProject(projectData.id);

        // Invalidate cache after deleting project
        invalidateCache(userId);

        return NextResponse.json({
          success: true,
          message: 'Project deleted successfully'
        });

      case 'add_task':
        if (!projectData.id) {
          return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }

        const task = await supabase
          .from('project_tasks')
          .insert({
            project_id: projectData.id,
            title: taskData.title,
            description: taskData.description,
            assigned_to: taskData.assigned_to || user.id, // FIXED: Use actual UUID
            priority: taskData.priority || 'medium',
            status: 'pending',
            due_date: taskData.due_date,
            created_by: user.id, // FIXED: Use actual UUID
            metadata: taskData.metadata || {}
          })
          .select()
          .single();

        return NextResponse.json({
          success: true,
          task: task.data,
          message: 'Task added successfully'
        });

      case 'update_task':
        if (!taskData.id) {
          return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }

        const updatedTask = await supabase
          .from('project_tasks')
          .update({
            title: taskData.title,
            description: taskData.description,
            status: taskData.status,
            priority: taskData.priority,
            due_date: taskData.due_date,
            completed_at: taskData.status === 'completed' ? new Date().toISOString() : null,
            metadata: {
              ...taskData.metadata,
              updated_at: new Date().toISOString(),
              updated_by: userId
            }
          })
          .eq('id', taskData.id)
          .select()
          .single();

        return NextResponse.json({
          success: true,
          task: updatedTask.data,
          message: 'Task updated successfully'
        });

      case 'add_collaborator':
        if (!projectData.id) {
          return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }

        const collaboration = await supabase
          .from('project_collaborators')
          .insert({
            project_id: projectData.id,
            user_id: collaboratorData.user_id,
            role: collaboratorData.role || 'member',
            permissions: collaboratorData.permissions || {},
            added_by: userId
          })
          .select()
          .single();

        return NextResponse.json({
          success: true,
          collaboration: collaboration.data,
          message: 'Collaborator added successfully'
        });

      case 'sync_google_data':
        if (!projectData.id) {
          return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }

        let syncResults = {
          drive_files: 0,
          gmail_messages: 0,
          calendar_events: 0
        };

        try {
          const [driveSync, gmailSync, calendarSync] = await Promise.all([
            fetch(`${process.env.NEXTAUTH_URL}/api/google/drive`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'sync_project_files',
                userId: userId,
                projectId: projectData.id
              })
            }),

            fetch(`${process.env.NEXTAUTH_URL}/api/google/gmail`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'sync_project_emails',
                userId: userId,
                projectId: projectData.id
              })
            }),

            fetch(`${process.env.NEXTAUTH_URL}/api/google/calendar`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'sync_to_knowledge',
                userId: userId,
                timeRange: {
                  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                  end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }
              })
            })
          ]);

          if (driveSync.ok) {
            const driveData = await driveSync.json();
            syncResults.drive_files = driveData.filesSynced || 0;
          }

          if (gmailSync.ok) {
            const gmailData = await gmailSync.json();
            syncResults.gmail_messages = gmailData.messagesFound || 0;
          }

          if (calendarSync.ok) {
            const calendarData = await calendarSync.json();
            syncResults.calendar_events = calendarData.syncedEvents || 0;
          }

        } catch (syncError) {
          console.error('Google sync error:', syncError);
        }

        return NextResponse.json({
          success: true,
          syncResults,
          message: 'Google data sync completed'
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Projects POST error:', error);
    return NextResponse.json({
      error: 'Failed to process project request',
      details: error.message
    }, { status: 500 });
  }
}