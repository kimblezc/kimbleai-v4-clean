// app/api/storage/stats/route.ts
// Monitor Supabase database usage to prevent hitting limits
// Free tier: 500 MB database, 500K API requests/month

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Supabase free tier limits
const FREE_TIER_DB_LIMIT_MB = 500;
const FREE_TIER_API_LIMIT = 500000;

/**
 * GET /api/storage/stats
 * Returns database storage statistics and warnings
 */
export async function GET(request: NextRequest) {
  try {
    // Get total row count
    const { count: totalRows, error: countError } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('[Storage Stats] Error counting rows:', countError);
    }

    // Get sample row to estimate size
    const { data: sampleRows, error: sampleError } = await supabase
      .from('knowledge_base')
      .select('*')
      .limit(100);

    if (sampleError) {
      console.error('[Storage Stats] Error getting sample:', sampleError);
    }

    // Calculate average row size
    let avgRowSizeBytes = 0;
    let totalSampleSize = 0;

    if (sampleRows && sampleRows.length > 0) {
      for (const row of sampleRows) {
        // Estimate size: content (500 chars) + embedding (1536 floats * 4 bytes) + metadata (~500 bytes)
        const contentSize = (row.content || '').length;
        const embeddingSize = row.embedding ? 1536 * 4 : 0; // 1536 dimensions * 4 bytes per float
        const metadataSize = JSON.stringify(row.metadata || {}).length;
        const otherFields = 500; // ID, timestamps, etc.

        totalSampleSize += contentSize + embeddingSize + metadataSize + otherFields;
      }

      avgRowSizeBytes = totalSampleSize / sampleRows.length;
    }

    // Estimate total database size
    const estimatedTotalBytes = (totalRows || 0) * avgRowSizeBytes;
    const estimatedTotalMB = estimatedTotalBytes / (1024 * 1024);

    // Calculate usage percentage
    const usagePercent = (estimatedTotalMB / FREE_TIER_DB_LIMIT_MB) * 100;

    // Determine warning level
    let warningLevel = 'ok';
    let message = 'Storage usage is healthy';

    if (usagePercent >= 90) {
      warningLevel = 'critical';
      message = 'CRITICAL: Approaching Supabase free tier limit! Upgrade to Pro ($25/mo) immediately.';
    } else if (usagePercent >= 75) {
      warningLevel = 'warning';
      message = 'WARNING: Using 75%+ of free tier. Consider upgrading to Pro soon.';
    } else if (usagePercent >= 50) {
      warningLevel = 'caution';
      message = 'Storage is over 50% of free tier limit.';
    }

    // Get indexing state
    const { data: indexingState, error: stateError } = await supabase
      .from('indexing_state')
      .select('*');

    const stats = {
      database: {
        totalRows: totalRows || 0,
        estimatedSizeMB: estimatedTotalMB.toFixed(2),
        avgRowSizeKB: (avgRowSizeBytes / 1024).toFixed(2),
        usagePercent: usagePercent.toFixed(1),
        freeTierLimitMB: FREE_TIER_DB_LIMIT_MB,
        remainingMB: (FREE_TIER_DB_LIMIT_MB - estimatedTotalMB).toFixed(2)
      },
      indexing: indexingState || [],
      warning: {
        level: warningLevel,
        message: message
      },
      recommendations: []
    };

    // Add recommendations
    if (warningLevel === 'critical' || warningLevel === 'warning') {
      stats.recommendations.push('Upgrade Supabase to Pro plan ($25/mo for 8 GB storage)');
    }

    if (totalRows && totalRows > 10000) {
      stats.recommendations.push('Consider archiving old or irrelevant content');
    }

    // Log stats
    console.log('[Storage Stats]', {
      totalRows: totalRows || 0,
      estimatedMB: estimatedTotalMB.toFixed(2),
      usagePercent: usagePercent.toFixed(1) + '%',
      warningLevel
    });

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Storage Stats] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get storage stats'
    }, { status: 500 });
  }
}

// Export config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
