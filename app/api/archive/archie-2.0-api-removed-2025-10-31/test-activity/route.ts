/**
 * Test Activity Broadcasting Endpoint
 *
 * Broadcasts sample activities to the activity stream to demonstrate
 * the live feed working. This is for testing and demonstration purposes.
 *
 * Usage: POST /api/archie/test-activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { logAgentActivity, logTaskStart, logTaskProgress, logTaskComplete } from '@/lib/activity-stream';

export async function POST(request: NextRequest) {
  try {
    const { count = 10, delay = 1000 } = await request.json().catch(() => ({}));

    // Broadcast test activities
    const sampleActivities = [
      {
        agent: 'Drive Intelligence Agent',
        message: 'Scanning Google Drive for new files...',
        level: 'info' as const,
        category: 'drive_sync' as const,
        details: 'Checking /Projects folder for changes'
      },
      {
        agent: 'Device Monitor',
        message: 'All devices synced successfully ✅',
        level: 'success' as const,
        category: 'device_monitoring' as const,
        details: 'iPhone 15 Pro - Last sync: 30s ago\nMacBook Pro - Active'
      },
      {
        agent: 'Transcription Engine',
        message: 'Processing new audio file: meeting-2025.m4a',
        level: 'info' as const,
        category: 'transcription' as const,
        details: 'Duration: 45:30, Size: 12.3 MB'
      },
      {
        agent: 'Task Processor',
        message: 'Analyzing conversation for action items...',
        level: 'info' as const,
        category: 'task_processing' as const,
        details: 'Found 3 potential tasks in recent chat'
      },
      {
        agent: 'Insight Generator',
        message: '💡 New insight discovered: Project timeline optimization',
        level: 'success' as const,
        category: 'insight_generation' as const,
        details: 'Detected pattern in project scheduling - suggesting automation'
      },
      {
        agent: 'File Analyzer',
        message: 'Categorizing newly uploaded documents...',
        level: 'info' as const,
        category: 'file_analysis' as const,
        details: 'Processing 5 PDFs in /Documents/Q1-2025'
      },
      {
        agent: 'Workflow Engine',
        message: 'Morning briefing workflow completed',
        level: 'success' as const,
        category: 'workflow' as const,
        details: 'Sent summary to email, updated dashboard'
      },
      {
        agent: 'System Monitor',
        message: 'Health check completed - all systems operational',
        level: 'success' as const,
        category: 'system' as const,
        details: 'Uptime: 99.97%, Memory: 45% used'
      },
      {
        agent: 'Security Scanner',
        message: '⚠️ Potential duplicate file detected',
        level: 'warn' as const,
        category: 'file_analysis' as const,
        details: 'File: invoice-jan.pdf appears similar to existing file'
      },
      {
        agent: 'Drive Intelligence Agent',
        message: 'Discovered 12 new files in past hour',
        level: 'info' as const,
        category: 'drive_sync' as const,
        details: '8 documents, 3 spreadsheets, 1 presentation'
      }
    ];

    // Broadcast a subset of sample activities
    const activitiesToBroadcast = sampleActivities.slice(0, Math.min(count, sampleActivities.length));

    // If delay is specified, broadcast sequentially with delay
    if (delay > 0) {
      // Start async broadcasting (don't await)
      (async () => {
        for (const activity of activitiesToBroadcast) {
          logAgentActivity(
            activity.agent,
            activity.message,
            activity.level,
            activity.category,
            activity.details,
            { test: true, timestamp: new Date().toISOString() }
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      })();

      return NextResponse.json({
        success: true,
        message: `Broadcasting ${activitiesToBroadcast.length} test activities with ${delay}ms delay`,
        count: activitiesToBroadcast.length
      });
    } else {
      // Broadcast all at once
      activitiesToBroadcast.forEach(activity => {
        logAgentActivity(
          activity.agent,
          activity.message,
          activity.level,
          activity.category,
          activity.details,
          { test: true, timestamp: new Date().toISOString() }
        );
      });

      return NextResponse.json({
        success: true,
        message: `Broadcast ${activitiesToBroadcast.length} test activities`,
        count: activitiesToBroadcast.length
      });
    }
  } catch (error: any) {
    console.error('[TestActivity] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to broadcast a single random activity
export async function GET(request: NextRequest) {
  const activities = [
    'Checking for new emails in Gmail...',
    'Analyzing calendar for upcoming events...',
    'Processing transcription queue...',
    'Syncing device states...',
    'Running scheduled workflow: Daily Summary',
    'Scanning Google Drive for changes...',
    'Extracting insights from recent conversations...',
    'Monitoring system health...'
  ];

  const categories = ['drive_sync', 'device_monitoring', 'transcription', 'task_processing', 'system', 'workflow'];
  const agents = ['Drive Intelligence', 'Device Monitor', 'Transcription Engine', 'Task Processor', 'System Monitor'];

  const randomActivity = activities[Math.floor(Math.random() * activities.length)];
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const randomAgent = agents[Math.floor(Math.random() * agents.length)];

  logAgentActivity(
    randomAgent,
    randomActivity,
    'info',
    randomCategory as any,
    'Test activity from GET endpoint',
    { test: true, random: true }
  );

  return NextResponse.json({
    success: true,
    message: 'Test activity broadcast',
    activity: randomActivity
  });
}
