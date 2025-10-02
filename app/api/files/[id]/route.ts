// app/api/files/[id]/route.ts
// Individual file operations (GET, DELETE, PATCH)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Retrieve single file details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params;

    const { data: file, error } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Get related data based on file category
    let relatedData = null;

    if (file.category === 'audio') {
      const { data: transcription } = await supabase
        .from('audio_transcriptions')
        .select('*')
        .eq('file_id', fileId)
        .single();
      relatedData = transcription;
    } else if (file.category === 'image') {
      const { data: imageData } = await supabase
        .from('processed_images')
        .select('*')
        .eq('file_id', fileId)
        .single();
      relatedData = imageData;
    } else if (['pdf', 'document', 'spreadsheet', 'email'].includes(file.category)) {
      const { data: documentData } = await supabase
        .from('processed_documents')
        .select('*')
        .eq('file_id', fileId)
        .single();
      relatedData = documentData;
    }

    return NextResponse.json({
      success: true,
      file: file,
      processedData: relatedData
    });

  } catch (error: any) {
    console.error('[FILE] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve file', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete file and all related data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params;

    // Get file details
    const { data: file, error: fileError } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Delete from storage
    if (file.category === 'audio') {
      await supabase.storage
        .from('audio-files')
        .remove([`${file.user_id}/${fileId}/${file.filename}`]);
    } else if (file.category === 'image') {
      await supabase.storage
        .from('images')
        .remove([
          `${file.user_id}/${fileId}/${file.filename}`,
          `${file.user_id}/${fileId}/thumb_${file.filename}`
        ]);
    } else {
      await supabase.storage
        .from('documents')
        .remove([`${file.user_id}/${fileId}/${file.filename}`]);
    }

    // Delete related data
    if (file.category === 'audio') {
      await supabase
        .from('audio_transcriptions')
        .delete()
        .eq('file_id', fileId);
    } else if (file.category === 'image') {
      await supabase
        .from('processed_images')
        .delete()
        .eq('file_id', fileId);
    } else if (['pdf', 'document', 'spreadsheet', 'email'].includes(file.category)) {
      await supabase
        .from('processed_documents')
        .delete()
        .eq('file_id', fileId);
    }

    // Delete from knowledge base
    await supabase
      .from('knowledge_base')
      .delete()
      .eq('source_id', fileId);

    // Delete file record
    const { error: deleteError } = await supabase
      .from('uploaded_files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      console.error('[FILE] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete file', details: deleteError.message },
        { status: 500 }
      );
    }

    // Log to Zapier
    if (process.env.ZAPIER_WEBHOOK_URL) {
      fetch(process.env.ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'FILE_DELETED',
          fileId: fileId,
          filename: file.filename,
          userId: file.user_id,
          timestamp: new Date().toISOString()
        })
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      fileId: fileId
    });

  } catch (error: any) {
    console.error('[FILE] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update file metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params;
    const body = await request.json();

    // Allowed fields to update
    const allowedFields = ['filename', 'project_id', 'metadata', 'tags'];
    const updates: any = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: updatedFile, error } = await supabase
      .from('uploaded_files')
      .update(updates)
      .eq('id', fileId)
      .select()
      .single();

    if (error) {
      console.error('[FILE] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update file', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File updated successfully',
      file: updatedFile
    });

  } catch (error: any) {
    console.error('[FILE] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update file', details: error.message },
      { status: 500 }
    );
  }
}
