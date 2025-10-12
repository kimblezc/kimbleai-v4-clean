import { NextRequest, NextResponse } from 'next/server';
import { UnifiedFileSystem } from '@/lib/unified-file-system';

// Force dynamic rendering to avoid build-time static analysis issues
export const dynamic = 'force-dynamic';

/**
 * GET /api/files/[fileId]
 * Get a specific file by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params;
    const { searchParams } = new URL(request.url);
    const includeContent = searchParams.get('includeContent') === 'true';

    let file;
    if (includeContent) {
      file = await UnifiedFileSystem.getFileWithContent(fileId);
    } else {
      file = await UnifiedFileSystem.getFile(fileId);
    }

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'File not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      file
    });

  } catch (error: any) {
    console.error('[FILE API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get file'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/files/[fileId]
 * Delete a file
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params;

    const success = await UnifiedFileSystem.deleteFile(fileId);

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete file'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true
    });

  } catch (error: any) {
    console.error('[FILE API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete file'
    }, { status: 500 });
  }
}

/**
 * PATCH /api/files/[fileId]
 * Update file metadata (tags, projects, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params;
    const { action, tags, projectId } = await request.json();

    if (action === 'add_tags' && tags) {
      await UnifiedFileSystem.addTags(fileId, tags);
    } else if (action === 'link_project' && projectId) {
      await UnifiedFileSystem.linkToProject(fileId, projectId);
    } else if (action === 'unlink_project' && projectId) {
      await UnifiedFileSystem.unlinkFromProject(fileId, projectId);
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action'
      }, { status: 400 });
    }

    // Get updated file
    const file = await UnifiedFileSystem.getFile(fileId);

    return NextResponse.json({
      success: true,
      file
    });

  } catch (error: any) {
    console.error('[FILE API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update file'
    }, { status: 500 });
  }
}
