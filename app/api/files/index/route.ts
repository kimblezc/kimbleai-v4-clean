// app/api/files/index/route.ts
// File indexing API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { FileAutoIndexPipeline } from '@/lib/file-auto-index';
import { RAGSearchSystem } from '@/lib/rag-search';

// Force dynamic rendering to avoid build-time static analysis issues
export const dynamic = 'force-dynamic';

/**
 * POST /api/files/index
 * Manually trigger indexing for specific files or all unprocessed files
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, fileId, processAll = false, reindex = false, fileSource, projectId, limit } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Process single file
    if (fileId && !processAll) {
      console.log(`[INDEX API] Processing file ${fileId}`);

      let result;
      if (reindex) {
        result = await RAGSearchSystem.reindexFile(fileId, userId, projectId);
      } else {
        result = await FileAutoIndexPipeline.processFile(fileId, userId, projectId);
      }

      return NextResponse.json({
        success: result.success,
        fileId,
        entriesCreated: result.entriesCreated,
        error: result.error,
      });
    }

    // Process all unprocessed files
    if (processAll && !reindex) {
      console.log(`[INDEX API] Processing all unprocessed files for user ${userId}`);

      const stats = await FileAutoIndexPipeline.processUnindexedFiles(userId, {
        fileSource,
        projectId,
        limit,
      });

      return NextResponse.json({
        success: true,
        stats,
      });
    }

    // Re-index all files
    if (reindex && processAll) {
      console.log(`[INDEX API] Re-indexing all files for user ${userId}`);

      const stats = await FileAutoIndexPipeline.reindexAllFiles(userId, {
        fileSource,
        projectId,
        limit,
      });

      return NextResponse.json({
        success: true,
        stats,
      });
    }

    return NextResponse.json(
      { error: 'Invalid request: must specify fileId or processAll=true' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[INDEX API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process indexing request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/files/index
 * Get indexing queue status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const status = await FileAutoIndexPipeline.getQueueStatus(userId);
    const indexStats = await RAGSearchSystem.getIndexStats(userId);

    return NextResponse.json({
      success: true,
      queue: status,
      index: indexStats,
    });
  } catch (error: any) {
    console.error('[INDEX API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get queue status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files/index
 * Clean up failed processing attempts
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const cleanedCount = await FileAutoIndexPipeline.cleanupFailedProcessing(userId);

    return NextResponse.json({
      success: true,
      cleanedCount,
    });
  } catch (error: any) {
    console.error('[INDEX API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cleanup failed processing' },
      { status: 500 }
    );
  }
}
