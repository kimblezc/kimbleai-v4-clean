/**
 * File Upload System for Semantic Search
 * Multi-format file upload handling with content extraction and semantic indexing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UniversalFileProcessor } from '@/lib/file-processors';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UploadRequest {
  file: File;
  userId?: string;
  title?: string;
  tags?: string[];
  generateEmbeddings?: boolean;
  contentType?: string;
}

interface UploadResult {
  id: string;
  title: string;
  contentType: string;
  size: number;
  chunks: number;
  processingTime: number;
  embeddingsGenerated: boolean;
  metadata: Record<string, any>;
}

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  'text/*': 10 * 1024 * 1024, // 10MB
  'application/pdf': 50 * 1024 * 1024, // 50MB
  'audio/*': 1024 * 1024 * 1024, // 1GB
  'image/*': 20 * 1024 * 1024, // 20MB
  'application/*': 100 * 1024 * 1024, // 100MB
  default: 50 * 1024 * 1024 // 50MB default
};

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string || 'default';
    const title = formData.get('title') as string || file?.name || 'Untitled';
    const tagsString = formData.get('tags') as string || '';
    const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()) : [];
    const generateEmbeddings = formData.get('generateEmbeddings') !== 'false';

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file size
    const sizeLimit = getFileSizeLimit(file.type);
    if (file.size > sizeLimit) {
      return NextResponse.json(
        {
          error: 'File too large',
          details: `Maximum size for ${file.type}: ${Math.round(sizeLimit / (1024 * 1024))}MB`
        },
        { status: 400 }
      );
    }

    // Check if file type is supported
    const supportedTypes = UniversalFileProcessor.getSupportedMimeTypes();
    if (!supportedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Unsupported file type',
          supportedTypes,
          receivedType: file.type
        },
        { status: 400 }
      );
    }

    // Process file
    const processor = UniversalFileProcessor.getInstance();
    const processedContent = await processor.processFile(file, title, file.type, {
      generateEmbeddings,
      userId,
      tags
    });

    // Store in database
    const contentId = await processor.storeContent(processedContent);

    const processingTime = Date.now() - startTime;

    const result: UploadResult = {
      id: contentId,
      title: processedContent.title,
      contentType: processedContent.contentType,
      size: file.size,
      chunks: processedContent.chunks.length,
      processingTime,
      embeddingsGenerated: generateEmbeddings,
      metadata: processedContent.metadata
    };

    return NextResponse.json({
      success: true,
      message: 'File uploaded and processed successfully',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      {
        error: 'File upload failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Handle batch file uploads
 */
export async function PUT(req: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await req.formData();
    const files: File[] = [];
    const userId = formData.get('userId') as string || 'default';
    const generateEmbeddings = formData.get('generateEmbeddings') !== 'false';

    // Extract all files from form data
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = 500 * 1024 * 1024; // 500MB total
    if (totalSize > maxTotalSize) {
      return NextResponse.json(
        { error: 'Total file size exceeds limit (500MB)' },
        { status: 400 }
      );
    }

    // Process files
    const processor = UniversalFileProcessor.getInstance();
    const results: UploadResult[] = [];
    const errors: Array<{ fileName: string; error: string }> = [];

    for (const file of files) {
      try {
        // Check individual file
        const supportedTypes = UniversalFileProcessor.getSupportedMimeTypes();
        if (!supportedTypes.includes(file.type)) {
          errors.push({
            fileName: file.name,
            error: `Unsupported file type: ${file.type}`
          });
          continue;
        }

        const sizeLimit = getFileSizeLimit(file.type);
        if (file.size > sizeLimit) {
          errors.push({
            fileName: file.name,
            error: `File too large (max: ${Math.round(sizeLimit / (1024 * 1024))}MB)`
          });
          continue;
        }

        // Process file
        const processedContent = await processor.processFile(file, file.name, file.type, {
          generateEmbeddings,
          userId,
          tags: ['batch-upload']
        });

        // Store in database
        const contentId = await processor.storeContent(processedContent);

        results.push({
          id: contentId,
          title: processedContent.title,
          contentType: processedContent.contentType,
          size: file.size,
          chunks: processedContent.chunks.length,
          processingTime: 0, // Individual timing not tracked in batch
          embeddingsGenerated: generateEmbeddings,
          metadata: processedContent.metadata
        });

      } catch (error) {
        errors.push({
          fileName: file.name,
          error: (error as Error).message
        });
      }
    }

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Batch upload completed: ${results.length} files processed`,
      results,
      errors,
      stats: {
        totalFiles: files.length,
        successfulFiles: results.length,
        failedFiles: errors.length,
        totalProcessingTime: processingTime
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Batch upload error:', error);
    return NextResponse.json(
      {
        error: 'Batch upload failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Get upload status and capabilities
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      // Get upload statistics
      const stats = await getUploadStats();
      return NextResponse.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });
    }

    // Default: return API capabilities
    return NextResponse.json({
      service: 'File Upload System for Semantic Search',
      version: '1.0.0',
      status: 'operational',
      capabilities: {
        supportedTypes: UniversalFileProcessor.getSupportedMimeTypes(),
        maxFileSizes: {
          text: '10MB',
          pdf: '50MB',
          audio: '1GB',
          images: '20MB',
          documents: '100MB'
        },
        batchUpload: true,
        automaticEmbeddings: true,
        contentExtraction: true
      },
      features: [
        'Multi-format file processing',
        'Automatic content extraction',
        'Semantic embedding generation',
        'Intelligent chunking for large files',
        'Batch upload support',
        'Comprehensive metadata extraction'
      ],
      endpoints: {
        singleUpload: 'POST /api/files/upload',
        batchUpload: 'PUT /api/files/upload',
        stats: 'GET /api/files/upload?action=stats'
      },
      requestFormat: {
        singleUpload: {
          file: 'File (required)',
          userId: 'String (optional, default: "default")',
          title: 'String (optional, defaults to filename)',
          tags: 'Comma-separated string (optional)',
          generateEmbeddings: 'Boolean (optional, default: true)'
        },
        batchUpload: {
          'file1, file2, ...': 'Multiple files',
          userId: 'String (optional)',
          generateEmbeddings: 'Boolean (optional, default: true)'
        }
      }
    });

  } catch (error: any) {
    console.error('Upload API GET error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Delete uploaded content
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contentId = searchParams.get('id');
    const userId = searchParams.get('userId') || 'default';

    if (!contentId) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      );
    }

    // Delete content and chunks
    const { error: chunksError } = await supabase
      .from('semantic_chunks')
      .delete()
      .eq('content_id', contentId);

    if (chunksError) {
      throw new Error(`Failed to delete chunks: ${chunksError.message}`);
    }

    const { error: contentError } = await supabase
      .from('semantic_content')
      .delete()
      .eq('id', contentId)
      .eq('user_id', userId);

    if (contentError) {
      throw new Error(`Failed to delete content: ${contentError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Content deleted successfully',
      contentId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Delete content error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete content',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Get file size limit based on MIME type
 */
function getFileSizeLimit(mimeType: string): number {
  if (mimeType.startsWith('text/')) {
    return FILE_SIZE_LIMITS['text/*'];
  }
  if (mimeType.startsWith('audio/')) {
    return FILE_SIZE_LIMITS['audio/*'];
  }
  if (mimeType.startsWith('image/')) {
    return FILE_SIZE_LIMITS['image/*'];
  }
  if (mimeType === 'application/pdf') {
    return FILE_SIZE_LIMITS['application/pdf'];
  }
  if (mimeType.startsWith('application/')) {
    return FILE_SIZE_LIMITS['application/*'];
  }
  return FILE_SIZE_LIMITS.default;
}

/**
 * Get upload system statistics
 */
async function getUploadStats(): Promise<Record<string, any>> {
  try {
    const { data: stats, error } = await supabase
      .from('semantic_content')
      .select('content_type, size, created_at');

    if (error) {
      throw new Error(`Failed to get upload stats: ${error.message}`);
    }

    const totalFiles = stats?.length || 0;
    const totalSize = stats?.reduce((sum, item) => sum + (item.size || 0), 0) || 0;

    const contentTypes: Record<string, number> = {};
    stats?.forEach(item => {
      const type = item.content_type || 'unknown';
      contentTypes[type] = (contentTypes[type] || 0) + 1;
    });

    // Get recent uploads (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentUploads = stats?.filter(item =>
      new Date(item.created_at) > oneWeekAgo
    ).length || 0;

    return {
      totalFiles,
      totalSize: Math.round(totalSize / (1024 * 1024)), // MB
      contentTypes,
      recentUploads,
      averageFileSize: totalFiles > 0 ? Math.round(totalSize / totalFiles / 1024) : 0 // KB
    };

  } catch (error) {
    console.error('Error getting upload stats:', error);
    return {
      totalFiles: 0,
      totalSize: 0,
      contentTypes: {},
      recentUploads: 0,
      averageFileSize: 0,
      error: (error as Error).message
    };
  }
}