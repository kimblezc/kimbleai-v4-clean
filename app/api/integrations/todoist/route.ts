import { NextRequest, NextResponse } from 'next/server';

/**
 * Todoist Integration API
 *
 * Provides access to:
 * - Tasks and projects
 * - Task creation and updates
 * - Labels and sections
 * - Productivity stats
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'status';

    const todoistToken = process.env.TODOIST_API_KEY;

    if (!todoistToken) {
      return NextResponse.json({
        connected: false,
        error: 'Todoist API key not configured'
      }, { status: 503 });
    }

    const headers = {
      'Authorization': `Bearer ${todoistToken}`
    };

    switch (action) {
      case 'status':
        // Check Todoist API connectivity
        const statusRes = await fetch('https://api.todoist.com/rest/v2/projects', {
          headers
        });

        if (!statusRes.ok) {
          return NextResponse.json({
            connected: false,
            error: 'Todoist API authentication failed'
          }, { status: 401 });
        }

        const projects = await statusRes.json();
        return NextResponse.json({
          connected: true,
          project_count: projects.length
        });

      case 'projects':
        // List all projects
        const projectsRes = await fetch('https://api.todoist.com/rest/v2/projects', {
          headers
        });

        if (!projectsRes.ok) {
          throw new Error('Failed to fetch projects');
        }

        const projectsData = await projectsRes.json();
        return NextResponse.json({
          success: true,
          projects: projectsData.map((project: any) => ({
            id: project.id,
            name: project.name,
            color: project.color,
            is_favorite: project.is_favorite,
            view_style: project.view_style,
            url: project.url
          }))
        });

      case 'tasks':
        const projectId = searchParams.get('project_id');

        let url = 'https://api.todoist.com/rest/v2/tasks';
        if (projectId) {
          url += `?project_id=${projectId}`;
        }

        const tasksRes = await fetch(url, { headers });

        if (!tasksRes.ok) {
          throw new Error('Failed to fetch tasks');
        }

        const tasks = await tasksRes.json();
        return NextResponse.json({
          success: true,
          tasks: tasks.map((task: any) => ({
            id: task.id,
            content: task.content,
            description: task.description,
            project_id: task.project_id,
            priority: task.priority,
            due: task.due,
            labels: task.labels,
            url: task.url,
            created_at: task.created_at
          }))
        });

      case 'labels':
        // Get all labels
        const labelsRes = await fetch('https://api.todoist.com/rest/v2/labels', {
          headers
        });

        if (!labelsRes.ok) {
          throw new Error('Failed to fetch labels');
        }

        const labels = await labelsRes.json();
        return NextResponse.json({
          success: true,
          labels: labels.map((label: any) => ({
            id: label.id,
            name: label.name,
            color: label.color,
            order: label.order
          }))
        });

      default:
        return NextResponse.json({
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[Todoist API] Error:', error);
    return NextResponse.json({
      error: 'Failed to process Todoist request',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const todoistToken = process.env.TODOIST_API_KEY;

    if (!todoistToken) {
      return NextResponse.json({
        error: 'Todoist API key not configured'
      }, { status: 503 });
    }

    const headers = {
      'Authorization': `Bearer ${todoistToken}`,
      'Content-Type': 'application/json'
    };

    switch (action) {
      case 'create_task':
        const { content, description, project_id, due_string, priority, labels } = body;

        if (!content) {
          return NextResponse.json({
            error: 'Task content is required'
          }, { status: 400 });
        }

        const taskPayload: any = { content };
        if (description) taskPayload.description = description;
        if (project_id) taskPayload.project_id = project_id;
        if (due_string) taskPayload.due_string = due_string;
        if (priority) taskPayload.priority = priority;
        if (labels) taskPayload.labels = labels;

        const createTaskRes = await fetch('https://api.todoist.com/rest/v2/tasks', {
          method: 'POST',
          headers,
          body: JSON.stringify(taskPayload)
        });

        if (!createTaskRes.ok) {
          throw new Error('Failed to create task');
        }

        const newTask = await createTaskRes.json();
        return NextResponse.json({
          success: true,
          task: {
            id: newTask.id,
            content: newTask.content,
            url: newTask.url
          }
        });

      case 'complete_task':
        const { task_id } = body;

        if (!task_id) {
          return NextResponse.json({
            error: 'Task ID is required'
          }, { status: 400 });
        }

        const completeRes = await fetch(`https://api.todoist.com/rest/v2/tasks/${task_id}/close`, {
          method: 'POST',
          headers
        });

        if (!completeRes.ok) {
          throw new Error('Failed to complete task');
        }

        return NextResponse.json({
          success: true,
          message: 'Task completed successfully'
        });

      case 'update_task':
        const { id, updates } = body;

        if (!id || !updates) {
          return NextResponse.json({
            error: 'Task ID and updates are required'
          }, { status: 400 });
        }

        const updateRes = await fetch(`https://api.todoist.com/rest/v2/tasks/${id}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(updates)
        });

        if (!updateRes.ok) {
          throw new Error('Failed to update task');
        }

        const updatedTask = await updateRes.json();
        return NextResponse.json({
          success: true,
          task: updatedTask
        });

      case 'create_project':
        const { name, color, is_favorite } = body;

        if (!name) {
          return NextResponse.json({
            error: 'Project name is required'
          }, { status: 400 });
        }

        const projectPayload: any = { name };
        if (color) projectPayload.color = color;
        if (is_favorite !== undefined) projectPayload.is_favorite = is_favorite;

        const createProjectRes = await fetch('https://api.todoist.com/rest/v2/projects', {
          method: 'POST',
          headers,
          body: JSON.stringify(projectPayload)
        });

        if (!createProjectRes.ok) {
          throw new Error('Failed to create project');
        }

        const newProject = await createProjectRes.json();
        return NextResponse.json({
          success: true,
          project: {
            id: newProject.id,
            name: newProject.name,
            url: newProject.url
          }
        });

      default:
        return NextResponse.json({
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[Todoist API] Error:', error);
    return NextResponse.json({
      error: 'Failed to process Todoist request',
      details: error.message
    }, { status: 500 });
  }
}
