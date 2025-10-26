import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Pre-built workflow templates
const WORKFLOW_TEMPLATES = [
  {
    id: 'morning-briefing',
    name: 'Morning Briefing',
    description: 'Daily summary of emails, calendar events, and tasks',
    category: 'productivity',
    trigger_type: 'scheduled',
    trigger_config: {
      cron: '0 7 * * *', // Every day at 7am
      timezone: 'America/Los_Angeles',
    },
    actions: [
      {
        id: 'check-gmail',
        type: 'gmail',
        name: 'Check Gmail',
        config: {
          operation: 'get_unread',
          filters: {
            labels: ['INBOX'],
          },
        },
      },
      {
        id: 'get-calendar',
        type: 'calendar',
        name: 'Get Today\'s Events',
        config: {
          operation: 'list_events',
          timeMin: 'today',
          timeMax: 'tomorrow',
        },
      },
      {
        id: 'analyze-briefing',
        type: 'ai_analysis',
        name: 'Generate Briefing',
        config: {
          analysisType: 'summarize',
          inputData: 'previous_results',
        },
      },
      {
        id: 'notify-user',
        type: 'notification',
        name: 'Send Morning Briefing',
        config: {
          message: 'Your morning briefing is ready',
          channels: ['in_app', 'email'],
        },
      },
    ],
  },
  {
    id: 'file-organizer',
    name: 'File Organizer',
    description: 'Automatically organize files in Google Drive',
    category: 'organization',
    trigger_type: 'event',
    trigger_config: {
      event: 'file_uploaded',
      source: 'drive',
    },
    actions: [
      {
        id: 'analyze-file',
        type: 'ai_analysis',
        name: 'Analyze File Content',
        config: {
          analysisType: 'categorize',
          inputData: 'file_content',
        },
      },
      {
        id: 'move-file',
        type: 'drive',
        name: 'Move to Category Folder',
        config: {
          operation: 'move_file',
          destination: 'auto',
        },
      },
      {
        id: 'add-metadata',
        type: 'drive',
        name: 'Add Metadata',
        config: {
          operation: 'update_metadata',
          tags: 'auto',
        },
      },
      {
        id: 'notify-organized',
        type: 'notification',
        name: 'Notify File Organized',
        config: {
          message: 'File has been automatically organized',
          channels: ['in_app'],
        },
      },
    ],
  },
  {
    id: 'task-suggester',
    name: 'Task Suggester',
    description: 'Analyze conversations and suggest tasks',
    category: 'productivity',
    trigger_type: 'scheduled',
    trigger_config: {
      cron: '0 * * * *', // Every hour
      timezone: 'America/Los_Angeles',
    },
    actions: [
      {
        id: 'analyze-conversations',
        type: 'ai_analysis',
        name: 'Analyze Recent Conversations',
        config: {
          analysisType: 'extract_action_items',
          inputData: 'recent_conversations',
        },
      },
      {
        id: 'create-task-suggestions',
        type: 'create_task',
        name: 'Create Task Suggestions',
        config: {
          title: 'Suggested Task',
          description: 'Generated from conversation analysis',
          priority: 'medium',
        },
      },
      {
        id: 'notify-suggestions',
        type: 'notification',
        name: 'Notify Task Suggestions',
        config: {
          message: 'New task suggestions available',
          channels: ['in_app'],
        },
      },
    ],
  },
  {
    id: 'email-digest',
    name: 'Weekly Email Digest',
    description: 'Weekly summary of important emails',
    category: 'email',
    trigger_type: 'scheduled',
    trigger_config: {
      cron: '0 9 * * 1', // Every Monday at 9am
      timezone: 'America/Los_Angeles',
    },
    actions: [
      {
        id: 'get-important-emails',
        type: 'gmail',
        name: 'Get Important Emails',
        config: {
          operation: 'search',
          query: 'is:important newer_than:7d',
        },
      },
      {
        id: 'summarize-emails',
        type: 'ai_analysis',
        name: 'Summarize Emails',
        config: {
          analysisType: 'summarize',
          inputData: 'emails',
        },
      },
      {
        id: 'send-digest',
        type: 'notification',
        name: 'Send Weekly Digest',
        config: {
          message: 'Your weekly email digest',
          channels: ['email'],
        },
      },
    ],
  },
  {
    id: 'meeting-prep',
    name: 'Meeting Preparation',
    description: 'Prepare materials for upcoming meetings',
    category: 'productivity',
    trigger_type: 'scheduled',
    trigger_config: {
      cron: '0 8 * * 1-5', // Weekdays at 8am
      timezone: 'America/Los_Angeles',
    },
    actions: [
      {
        id: 'get-todays-meetings',
        type: 'calendar',
        name: 'Get Today\'s Meetings',
        config: {
          operation: 'list_events',
          timeMin: 'today',
          timeMax: 'tomorrow',
        },
      },
      {
        id: 'find-related-files',
        type: 'drive',
        name: 'Find Related Files',
        config: {
          operation: 'search',
          query: 'meeting_related',
        },
      },
      {
        id: 'create-prep-summary',
        type: 'ai_analysis',
        name: 'Create Prep Summary',
        config: {
          analysisType: 'meeting_prep',
          inputData: 'meetings_and_files',
        },
      },
      {
        id: 'notify-prep-ready',
        type: 'notification',
        name: 'Notify Prep Ready',
        config: {
          message: 'Meeting preparation materials ready',
          channels: ['in_app'],
        },
      },
    ],
  },
];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    let templates = WORKFLOW_TEMPLATES;

    if (category) {
      templates = templates.filter((t) => t.category === category);
    }

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
