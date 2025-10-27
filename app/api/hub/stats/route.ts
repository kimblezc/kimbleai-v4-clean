/**
 * HUB STATS API
 * GET /api/hub/stats
 *
 * Returns statistics and status for all connected platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;

    // Get platform connection stats
    const { data: connections, error: connError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', userEmail);

    if (connError) {
      console.error('Error fetching connections:', connError);
    }

    // Build platform cards with stats
    const platforms = [
      {
        id: 'kimbleai',
        name: 'KimbleAI',
        type: 'main',
        icon: '💜',
        color: 'purple',
        status: 'active',
        stats: [],
        quickActions: [
          { label: 'Dashboard', url: '/' },
          { label: 'Conversations', url: '/' },
        ],
      },
      {
        id: 'chatgpt',
        name: 'ChatGPT',
        type: 'import',
        icon: '💬',
        color: 'teal',
        status: 'active',
        stats: [],
        quickActions: [
          { label: 'Import', url: '/chatgpt-import' },
          { label: 'Search', url: '/chatgpt-import' },
        ],
      },
      {
        id: 'claude',
        name: 'Claude Projects',
        type: 'import',
        icon: '🤖',
        color: 'blue',
        status: 'inactive',
        stats: [],
        quickActions: [
          { label: 'Import', url: '/hub/import' },
        ],
      },
      {
        id: 'google',
        name: 'Google Workspace',
        type: 'integration',
        icon: 'G',
        color: 'yellow',
        status: session ? 'active' : 'inactive',
        stats: [
          { label: 'Services', value: '3' },
        ],
        quickActions: [
          { label: 'Manage', url: '/integrations' },
        ],
      },
      {
        id: 'mcp',
        name: 'MCP Servers',
        type: 'integration',
        icon: '🔌',
        color: 'orange',
        status: 'active',
        stats: [],
        quickActions: [
          { label: 'View Servers', url: '/code' },
        ],
      },
    ];

    return NextResponse.json({
      success: true,
      platforms,
      connections: connections || [],
    });
  } catch (error) {
    console.error('Hub stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hub stats' },
      { status: 500 }
    );
  }
}
