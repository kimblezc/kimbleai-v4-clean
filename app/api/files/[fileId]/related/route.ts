import { NextRequest, NextResponse } from 'next/server';
import { UnifiedFileSystem } from '@/lib/unified-file-system';

/**
 * GET /api/files/[fileId]/related
 * Get related files
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const files = await UnifiedFileSystem.getRelatedFiles(fileId, limit);

    return NextResponse.json({
      success: true,
      files,
      total: files.length
    });

  } catch (error: any) {
    console.error('[FILE API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get related files'
    }, { status: 500 });
  }
}
