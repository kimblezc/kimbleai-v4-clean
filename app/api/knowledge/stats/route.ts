/**
 * Knowledge Base Statistics API
 * Provides comprehensive metrics about the knowledge base health and performance
 *
 * GET /api/knowledge/stats?userId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface KnowledgeStats {
  overview: {
    totalEntries: number;
    withEmbeddings: number;
    coveragePercent: number;
    activeEntries: number;
    inactiveEntries: number;
    uniqueUsers: number;
  };
  bySource: Array<{
    sourceType: string;
    count: number;
    withEmbeddings: number;
    coveragePercent: number;
    avgImportance: number;
  }>;
  byCategory: Array<{
    category: string;
    count: number;
  }>;
  memoryChunks: {
    total: number;
    withEmbeddings: number;
    coveragePercent: number;
    byType: Array<{
      chunkType: string;
      count: number;
    }>;
  };
  performance: {
    avgQueryTime: number;
    topSearches: Array<{
      query: string;
      count: number;
      avgSimilarity: number;
    }>;
  };
  quality: {
    orphanedEntries: number;
    duplicates: number;
    emptyContent: number;
    missingEmbeddings: number;
  };
  storage: {
    knowledgeBaseSize: string;
    memoryChunksSize: string;
    totalSize: string;
  };
  recentActivity: Array<{
    id: string;
    title: string;
    sourceType: string;
    category: string;
    createdAt: string;
    hasEmbedding: boolean;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    const stats = await generateStats(userId);

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });

  } catch (error: any) {
    console.error('Stats generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate stats', details: error.message },
      { status: 500 }
    );
  }
}

async function generateStats(userId: string): Promise<KnowledgeStats> {
  const stats: KnowledgeStats = {
    overview: {
      totalEntries: 0,
      withEmbeddings: 0,
      coveragePercent: 0,
      activeEntries: 0,
      inactiveEntries: 0,
      uniqueUsers: 0
    },
    bySource: [],
    byCategory: [],
    memoryChunks: {
      total: 0,
      withEmbeddings: 0,
      coveragePercent: 0,
      byType: []
    },
    performance: {
      avgQueryTime: 0,
      topSearches: []
    },
    quality: {
      orphanedEntries: 0,
      duplicates: 0,
      emptyContent: 0,
      missingEmbeddings: 0
    },
    storage: {
      knowledgeBaseSize: '0 KB',
      memoryChunksSize: '0 KB',
      totalSize: '0 KB'
    },
    recentActivity: []
  };

  // Get overview stats
  const { data: overview } = await supabase
    .from('knowledge_base')
    .select('id, embedding, is_active')
    .eq('user_id', userId);

  if (overview) {
    stats.overview.totalEntries = overview.length;
    stats.overview.withEmbeddings = overview.filter(e => e.embedding).length;
    stats.overview.coveragePercent = stats.overview.totalEntries > 0
      ? Math.round((stats.overview.withEmbeddings / stats.overview.totalEntries) * 100)
      : 0;
    stats.overview.activeEntries = overview.filter(e => e.is_active).length;
    stats.overview.inactiveEntries = overview.filter(e => !e.is_active).length;
  }

  // Get unique users count (if admin)
  const { count: uniqueUsers } = await supabase
    .from('knowledge_base')
    .select('user_id', { count: 'exact', head: true });

  stats.overview.uniqueUsers = uniqueUsers || 0;

  // Get stats by source type
  const { data: bySource } = await supabase
    .from('knowledge_base')
    .select('source_type, embedding, importance')
    .eq('user_id', userId);

  if (bySource) {
    const sourceMap = new Map<string, any>();

    bySource.forEach(entry => {
      const type = entry.source_type || 'unknown';
      if (!sourceMap.has(type)) {
        sourceMap.set(type, {
          count: 0,
          withEmbeddings: 0,
          totalImportance: 0
        });
      }

      const source = sourceMap.get(type);
      source.count++;
      if (entry.embedding) source.withEmbeddings++;
      source.totalImportance += entry.importance || 0.5;
    });

    stats.bySource = Array.from(sourceMap.entries()).map(([sourceType, data]) => ({
      sourceType,
      count: data.count,
      withEmbeddings: data.withEmbeddings,
      coveragePercent: Math.round((data.withEmbeddings / data.count) * 100),
      avgImportance: parseFloat((data.totalImportance / data.count).toFixed(2))
    })).sort((a, b) => b.count - a.count);
  }

  // Get stats by category
  const { data: byCategory } = await supabase
    .from('knowledge_base')
    .select('category')
    .eq('user_id', userId)
    .not('category', 'is', null);

  if (byCategory) {
    const categoryMap = new Map<string, number>();

    byCategory.forEach(entry => {
      const cat = entry.category || 'uncategorized';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });

    stats.byCategory = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  // Get memory chunks stats
  const { data: memoryChunks } = await supabase
    .from('memory_chunks')
    .select('embedding, chunk_type')
    .eq('user_id', userId);

  if (memoryChunks) {
    stats.memoryChunks.total = memoryChunks.length;
    stats.memoryChunks.withEmbeddings = memoryChunks.filter(c => c.embedding).length;
    stats.memoryChunks.coveragePercent = stats.memoryChunks.total > 0
      ? Math.round((stats.memoryChunks.withEmbeddings / stats.memoryChunks.total) * 100)
      : 0;

    const typeMap = new Map<string, number>();
    memoryChunks.forEach(chunk => {
      const type = chunk.chunk_type || 'unknown';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });

    stats.memoryChunks.byType = Array.from(typeMap.entries())
      .map(([chunkType, count]) => ({ chunkType, count }))
      .sort((a, b) => b.count - a.count);
  }

  // Quality checks
  stats.quality.missingEmbeddings = stats.overview.totalEntries - stats.overview.withEmbeddings;

  // Check for empty content
  const { count: emptyCount } = await supabase
    .from('knowledge_base')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .or('content.is.null,content.eq.');

  stats.quality.emptyContent = emptyCount || 0;

  // Check for orphaned entries (simplified check)
  try {
    const { data: orphaned } = await supabase.rpc('find_orphaned_knowledge');
    stats.quality.orphanedEntries = orphaned?.length || 0;
  } catch (error) {
    // Function may not exist yet
    stats.quality.orphanedEntries = 0;
  }

  // Get storage sizes (requires appropriate permissions)
  try {
    const { data: healthMetrics } = await supabase
      .from('knowledge_health_metrics')
      .select('table_size')
      .single();

    if (healthMetrics) {
      stats.storage.knowledgeBaseSize = healthMetrics.table_size;
    }

    const { data: memoryMetrics } = await supabase
      .from('memory_health_metrics')
      .select('table_size')
      .single();

    if (memoryMetrics) {
      stats.storage.memoryChunksSize = memoryMetrics.table_size;
    }
  } catch (error) {
    // Views may not exist yet
  }

  // Get recent activity
  const { data: recentActivity } = await supabase
    .from('knowledge_base')
    .select('id, title, source_type, category, created_at, embedding')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentActivity) {
    stats.recentActivity = recentActivity.map(item => ({
      id: item.id,
      title: item.title || 'Untitled',
      sourceType: item.source_type || 'unknown',
      category: item.category || 'uncategorized',
      createdAt: item.created_at,
      hasEmbedding: !!item.embedding
    }));
  }

  return stats;
}

/**
 * Get detailed stats for a specific source type
 * GET /api/knowledge/stats?userId=xxx&sourceType=conversation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, sourceType, category, startDate, endDate } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('knowledge_base')
      .select('*')
      .eq('user_id', userId);

    if (sourceType) {
      query = query.eq('source_type', sourceType);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate detailed stats
    const detailedStats = {
      totalEntries: data?.length || 0,
      withEmbeddings: data?.filter(e => e.embedding).length || 0,
      avgImportance: data && data.length > 0
        ? data.reduce((sum, e) => sum + (e.importance || 0.5), 0) / data.length
        : 0,
      tags: extractTopTags(data || []),
      timeline: generateTimeline(data || []),
      importanceDistribution: calculateImportanceDistribution(data || [])
    };

    return NextResponse.json(detailedStats);

  } catch (error: any) {
    console.error('Detailed stats error:', error);
    return NextResponse.json(
      { error: 'Failed to generate detailed stats', details: error.message },
      { status: 500 }
    );
  }
}

// Helper functions
function extractTopTags(data: any[]): Array<{ tag: string; count: number }> {
  const tagMap = new Map<string, number>();

  data.forEach(entry => {
    if (entry.tags && Array.isArray(entry.tags)) {
      entry.tags.forEach((tag: string) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    }
  });

  return Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

function generateTimeline(data: any[]): Array<{ date: string; count: number }> {
  const timelineMap = new Map<string, number>();

  data.forEach(entry => {
    if (entry.created_at) {
      const date = new Date(entry.created_at).toISOString().split('T')[0];
      timelineMap.set(date, (timelineMap.get(date) || 0) + 1);
    }
  });

  return Array.from(timelineMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function calculateImportanceDistribution(data: any[]): {
  low: number;
  medium: number;
  high: number;
} {
  const distribution = { low: 0, medium: 0, high: 0 };

  data.forEach(entry => {
    const importance = entry.importance || 0.5;
    if (importance < 0.4) {
      distribution.low++;
    } else if (importance < 0.7) {
      distribution.medium++;
    } else {
      distribution.high++;
    }
  });

  return distribution;
}
