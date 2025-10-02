// app/api/files/[id]/status/route.ts
// File processing status endpoint

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params;

    const { data: file, error } = await supabase
      .from('uploaded_files')
      .select('id, filename, status, processing_result, error_message, created_at, processed_at')
      .eq('id', fileId)
      .single();

    if (error || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Calculate progress percentage
    let progress = 0;
    let message = '';

    switch (file.status) {
      case 'processing':
        progress = 50;
        message = 'Processing file...';
        break;
      case 'completed':
        progress = 100;
        message = 'Processing completed';
        break;
      case 'failed':
        progress = 0;
        message = file.error_message || 'Processing failed';
        break;
      default:
        progress = 0;
        message = 'Unknown status';
    }

    // Calculate processing time
    let processingTime = null;
    if (file.processed_at && file.created_at) {
      const start = new Date(file.created_at).getTime();
      const end = new Date(file.processed_at).getTime();
      processingTime = Math.round((end - start) / 1000); // seconds
    }

    return NextResponse.json({
      fileId: file.id,
      filename: file.filename,
      status: file.status,
      progress,
      message,
      processingResult: file.processing_result,
      error: file.error_message,
      processingTime,
      createdAt: file.created_at,
      processedAt: file.processed_at
    });

  } catch (error: any) {
    console.error('[STATUS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get status', details: error.message },
      { status: 500 }
    );
  }
}
