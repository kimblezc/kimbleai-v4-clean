import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const userId = 'zach'; // Hardcoded for now

    // Get recent conversations
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, title, project_id, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit / 2);

    // Get recent files
    const { data: files } = await supabase
      .from('uploaded_files')
      .select('id, filename, project_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit / 2);

    // Combine and format activities
    const activities = [];

    if (conversations) {
      activities.push(
        ...conversations.map((conv) => ({
          id: conv.id,
          type: 'conversation' as const,
          title: conv.title || 'Untitled Conversation',
          description: 'New conversation created',
          timestamp: formatTimestamp(conv.updated_at),
          project: conv.project_id || 'General',
        }))
      );
    }

    if (files) {
      activities.push(
        ...files.map((file) => ({
          id: file.id,
          type: 'file' as const,
          title: file.filename,
          description: 'File uploaded',
          timestamp: formatTimestamp(file.created_at),
          project: file.project_id || 'General',
        }))
      );
    }

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => {
      const aTime = parseTimestamp(a.timestamp);
      const bTime = parseTimestamp(b.timestamp);
      return bTime - aTime;
    });

    return NextResponse.json({
      activities: activities.slice(0, limit),
    });
  } catch (error) {
    console.error('Dashboard activity error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent activity' },
      { status: 500 }
    );
  }
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function parseTimestamp(timestamp: string): number {
  if (timestamp === 'Just now') return Date.now();

  const match = timestamp.match(/(\d+)\s+(minute|hour|day)s?\s+ago/);
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2];
    const now = Date.now();

    if (unit === 'minute') return now - (value * 60 * 1000);
    if (unit === 'hour') return now - (value * 60 * 60 * 1000);
    if (unit === 'day') return now - (value * 24 * 60 * 60 * 1000);
  }

  return new Date(timestamp).getTime();
}
