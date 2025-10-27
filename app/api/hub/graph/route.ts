/**
 * KNOWLEDGE GRAPH API
 * GET /api/hub/graph - Get knowledge graph data
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

    // Get nodes from unified search index
    const { data: searchData, error: searchError } = await supabase
      .from('unified_search_index')
      .select('id, title, content_type, platform_type, tags, created_date')
      .eq('user_id', userEmail)
      .limit(100);

    if (searchError) {
      console.error('Error fetching search data:', searchError);
    }

    // Build nodes
    const nodes: any[] = [];
    const edges: any[] = [];
    const tagMap = new Map<string, Set<string>>();

    // Add content nodes
    if (searchData) {
      for (const item of searchData) {
        nodes.push({
          id: item.id,
          label: item.title || 'Untitled',
          type: item.content_type,
          size: 1,
          color: getTypeColor(item.content_type),
          metadata: {
            platform: item.platform_type,
            createdDate: item.created_date,
          },
        });

        // Track tags
        if (item.tags && Array.isArray(item.tags)) {
          for (const tag of item.tags) {
            if (!tagMap.has(tag)) {
              tagMap.set(tag, new Set());
            }
            tagMap.get(tag)!.add(item.id);
          }
        }
      }
    }

    // Add tag nodes and edges
    for (const [tag, nodeIds] of tagMap.entries()) {
      const tagId = `tag-${tag}`;
      nodes.push({
        id: tagId,
        label: tag,
        type: 'tag',
        size: nodeIds.size,
        color: '#10B981',
      });

      // Create edges between tag and content
      for (const nodeId of nodeIds) {
        edges.push({
          source: tagId,
          target: nodeId,
          weight: 1,
          type: 'tagged',
        });
      }
    }

    return NextResponse.json({
      success: true,
      graph: {
        nodes,
        edges,
      },
    });
  } catch (error) {
    console.error('Graph API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graph data' },
      { status: 500 }
    );
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'conversation':
      return '#8B5CF6'; // Purple
    case 'file':
      return '#3B82F6'; // Blue
    case 'email':
      return '#EF4444'; // Red
    case 'code':
      return '#F59E0B'; // Orange
    case 'note':
      return '#14B8A6'; // Teal
    default:
      return '#6B7280'; // Gray
  }
}
