import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/tags/stats
 * Get tag usage statistics and analytics
 *
 * Query params:
 * - userId: User name (default: 'zach')
 * - refresh: Whether to recalculate usage counts (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach';
    const refresh = searchParams.get('refresh') === 'true';

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

    // Refresh usage counts if requested
    if (refresh) {
      const { error: refreshError } = await supabase.rpc('update_tag_usage_counts', {
        p_user_id: userData.id
      });

      if (refreshError) {
        console.warn('[TAGS-STATS] Error refreshing usage counts:', refreshError);
      }
    }

    // Get all tags with usage counts
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userData.id)
      .order('usage_count', { ascending: false });

    if (tagsError) {
      console.error('[TAGS-STATS] Error fetching tags:', tagsError);
      return NextResponse.json({
        error: 'Failed to fetch tags',
        details: tagsError.message
      }, { status: 500 });
    }

    // Calculate statistics
    const totalTags = tags?.length || 0;
    const totalUsage = tags?.reduce((sum, tag) => sum + (tag.usage_count || 0), 0) || 0;
    const avgUsagePerTag = totalTags > 0 ? totalUsage / totalTags : 0;

    // Category breakdown
    const categoryBreakdown = tags?.reduce((acc: any, tag) => {
      const cat = tag.category || 'custom';
      if (!acc[cat]) {
        acc[cat] = { count: 0, usage: 0 };
      }
      acc[cat].count++;
      acc[cat].usage += tag.usage_count || 0;
      return acc;
    }, {}) || {};

    // Top tags by usage
    const topTags = tags?.slice(0, 10) || [];

    // Unused tags (usage_count = 0)
    const unusedTags = tags?.filter(tag => (tag.usage_count || 0) === 0) || [];

    // Most recent tags
    const recentTags = [...(tags || [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    // Tag distribution by usage ranges
    const usageDistribution = {
      unused: tags?.filter(t => t.usage_count === 0).length || 0,
      low: tags?.filter(t => t.usage_count >= 1 && t.usage_count <= 5).length || 0,
      medium: tags?.filter(t => t.usage_count >= 6 && t.usage_count <= 20).length || 0,
      high: tags?.filter(t => t.usage_count >= 21 && t.usage_count <= 50).length || 0,
      veryHigh: tags?.filter(t => t.usage_count > 50).length || 0
    };

    return NextResponse.json({
      success: true,
      stats: {
        totalTags,
        totalUsage,
        avgUsagePerTag: Math.round(avgUsagePerTag * 100) / 100,
        categoryBreakdown,
        usageDistribution
      },
      topTags,
      unusedTags: unusedTags.map(t => ({ id: t.id, name: t.name, created_at: t.created_at })),
      recentTags,
      lastRefreshed: refresh ? new Date().toISOString() : null
    });

  } catch (error: any) {
    console.error('[TAGS-STATS] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/tags/stats
 * Sync tags from content and update usage counts
 *
 * Body:
 * - userId: User name (optional, default: 'zach')
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId || 'zach';

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

    // Sync tags from content
    const { error: syncError } = await supabase.rpc('sync_tags_from_content', {
      p_user_id: userData.id
    });

    if (syncError) {
      console.error('[TAGS-STATS] Error syncing tags:', syncError);
      return NextResponse.json({
        error: 'Failed to sync tags from content',
        details: syncError.message
      }, { status: 500 });
    }

    // Get updated tag count
    const { count, error: countError } = await supabase
      .from('tags')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userData.id);

    if (countError) {
      console.warn('[TAGS-STATS] Error counting tags:', countError);
    }

    return NextResponse.json({
      success: true,
      message: 'Tags synced from content successfully',
      tagsCount: count || 0
    });

  } catch (error: any) {
    console.error('[TAGS-STATS] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
