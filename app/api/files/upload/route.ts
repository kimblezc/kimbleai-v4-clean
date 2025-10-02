// app/api/files/upload/route.ts
// Enhanced file upload endpoint with multi-file support and comprehensive processing

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processFile, validateFile } from '@/lib/file-processors';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Store upload progress in memory (for 2 users, this is fine)
const uploadProgress = new Map<string, {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  fileId?: string;
  data?: any;
  error?: string;
}>();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string || 'zach';
    const projectId = formData.get('projectId') as string || 'general';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log(`[UPLOAD] Received ${file.name} (${file.size} bytes) from user ${userId}`);

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Generate unique file ID
    const fileId = `file_${crypto.randomBytes(16).toString('hex')}`;

    // Initialize progress tracking
    uploadProgress.set(fileId, {
      status: 'processing',
      progress: 10,
      message: 'Uploading file...'
    });

    // Get or create user
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create file record
    const { data: fileRecord, error: fileError } = await supabase
      .from('uploaded_files')
      .insert({
        id: fileId,
        user_id: userData.id,
        project_id: projectId,
        filename: file.name,
        file_type: file.type,
        file_size: file.size,
        status: 'processing',
        category: validation.category,
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (fileError) {
      console.error('[UPLOAD] Database error:', fileError);
      return NextResponse.json(
        { error: 'Failed to create file record', details: fileError.message },
        { status: 500 }
      );
    }

    // Update progress
    uploadProgress.set(fileId, {
      status: 'processing',
      progress: 30,
      message: 'Processing file...'
    });

    // Process file asynchronously (don't wait for completion)
    processFileAsync(file, userData.id, projectId, fileId);

    // Return immediately with file ID for progress tracking
    return NextResponse.json({
      success: true,
      fileId: fileId,
      status: 'processing',
      message: 'File uploaded and queued for processing',
      filename: file.name,
      size: file.size,
      category: validation.category
    });

  } catch (error: any) {
    console.error('[UPLOAD] Error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error.message },
      { status: 500 }
    );
  }
}

// Asynchronous file processing
async function processFileAsync(
  file: File,
  userId: string,
  projectId: string,
  fileId: string
) {
  try {
    // Update progress
    uploadProgress.set(fileId, {
      status: 'processing',
      progress: 50,
      message: 'Analyzing file content...'
    });

    // Process file
    const result = await processFile(file, userId, projectId, fileId);

    if (result.success) {
      // Update progress
      uploadProgress.set(fileId, {
        status: 'completed',
        progress: 100,
        message: 'Processing completed',
        fileId: fileId,
        data: result.data
      });

      // Update file record
      await supabase
        .from('uploaded_files')
        .update({
          status: 'completed',
          processing_result: result.data,
          processed_at: new Date().toISOString()
        })
        .eq('id', fileId);

      // Log to Zapier
      if (process.env.ZAPIER_WEBHOOK_URL) {
        fetch(process.env.ZAPIER_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'FILE_PROCESSED',
            fileId: fileId,
            filename: file.name,
            fileSize: file.size,
            processingType: result.processingType,
            userId: userId,
            projectId: projectId,
            timestamp: new Date().toISOString()
          })
        }).catch(console.error);
      }

      console.log(`[UPLOAD] Successfully processed ${file.name} (${fileId})`);
    } else {
      // Update progress with error
      uploadProgress.set(fileId, {
        status: 'failed',
        progress: 0,
        message: 'Processing failed',
        error: result.error
      });

      // Update file record
      await supabase
        .from('uploaded_files')
        .update({
          status: 'failed',
          error_message: result.error
        })
        .eq('id', fileId);

      console.error(`[UPLOAD] Failed to process ${file.name}: ${result.error}`);
    }

  } catch (error: any) {
    console.error('[UPLOAD] Processing error:', error);

    uploadProgress.set(fileId, {
      status: 'failed',
      progress: 0,
      message: 'Processing failed',
      error: error.message
    });

    await supabase
      .from('uploaded_files')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('id', fileId);
  }
}

// GET endpoint for progress tracking
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID required' },
        { status: 400 }
      );
    }

    // Check progress
    const progress = uploadProgress.get(fileId);

    if (!progress) {
      // Check database for completed files
      const { data: fileRecord } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (fileRecord) {
        return NextResponse.json({
          status: fileRecord.status,
          progress: fileRecord.status === 'completed' ? 100 : 0,
          message: fileRecord.status === 'completed' ? 'Processing completed' : 'File not found',
          data: fileRecord.processing_result
        });
      }

      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(progress);

  } catch (error: any) {
    console.error('[UPLOAD] Progress check error:', error);
    return NextResponse.json(
      { error: 'Failed to check progress', details: error.message },
      { status: 500 }
    );
  }
}

// Batch upload endpoint
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const userId = formData.get('userId') as string || 'zach';
    const projectId = formData.get('projectId') as string || 'general';

    // Get all files
    const files: File[] = [];
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

    console.log(`[UPLOAD] Batch upload: ${files.length} files from user ${userId}`);

    // Validate all files
    const validations = files.map(file => ({
      file,
      validation: validateFile(file)
    }));

    const invalidFiles = validations.filter(v => !v.validation.valid);
    if (invalidFiles.length > 0) {
      return NextResponse.json({
        error: 'Some files are invalid',
        invalidFiles: invalidFiles.map(v => ({
          filename: v.file.name,
          error: v.validation.error
        }))
      }, { status: 400 });
    }

    // Get user
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create file records and start processing
    const fileIds: string[] = [];

    for (const { file, validation } of validations) {
      const fileId = `file_${crypto.randomBytes(16).toString('hex')}`;
      fileIds.push(fileId);

      // Create file record
      await supabase
        .from('uploaded_files')
        .insert({
          id: fileId,
          user_id: userData.id,
          project_id: projectId,
          filename: file.name,
          file_type: file.type,
          file_size: file.size,
          status: 'processing',
          category: validation.category,
          metadata: {
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            batchUpload: true
          }
        });

      // Initialize progress
      uploadProgress.set(fileId, {
        status: 'processing',
        progress: 10,
        message: 'Queued for processing...'
      });

      // Process asynchronously
      processFileAsync(file, userData.id, projectId, fileId);
    }

    return NextResponse.json({
      success: true,
      message: `${files.length} files uploaded and queued for processing`,
      fileIds: fileIds,
      files: files.map((file, index) => ({
        fileId: fileIds[index],
        filename: file.name,
        size: file.size,
        status: 'processing'
      }))
    });

  } catch (error: any) {
    console.error('[UPLOAD] Batch upload error:', error);
    return NextResponse.json(
      { error: 'Batch upload failed', details: error.message },
      { status: 500 }
    );
  }
}
