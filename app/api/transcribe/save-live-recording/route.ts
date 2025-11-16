// app/api/transcribe/save-live-recording/route.ts
// Save live recording audio file and transcript to Supabase

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const userId = formData.get('userId') as string;
    const projectId = formData.get('projectId') as string;
    const transcript = formData.get('transcript') as string;

    if (!audioFile || !userId || !transcript) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `live-recording-${timestamp}.webm`;
    const filepath = `${userId}/${filename}`;

    // Upload audio file to Supabase Storage
    const audioBuffer = await audioFile.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-recordings')
      .upload(filepath, audioBuffer, {
        contentType: 'audio/webm',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload audio file' },
        { status: 500 }
      );
    }

    // Get public URL for the audio file
    const { data: { publicUrl } } = supabase.storage
      .from('audio-recordings')
      .getPublicUrl(filepath);

    // Create conversation with transcript
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        project_id: projectId !== 'general' ? projectId : null,
        title: `Live Recording ${new Date().toLocaleString()}`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (convError) {
      console.error('Conversation error:', convError);
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    // Save transcript as message
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: `**Live Recording Transcript**\n\n${transcript}\n\n[Audio File](${publicUrl})`,
        created_at: new Date().toISOString()
      });

    if (msgError) {
      console.error('Message error:', msgError);
      return NextResponse.json(
        { error: 'Failed to save transcript' },
        { status: 500 }
      );
    }

    // Save file metadata
    const { error: fileError } = await supabase
      .from('attachments')
      .insert({
        user_id: userId,
        conversation_id: conversation.id,
        filename: filename,
        file_path: publicUrl,
        file_size: audioFile.size,
        mime_type: 'audio/webm',
        created_at: new Date().toISOString()
      });

    if (fileError) {
      console.error('File metadata error:', fileError);
      // Non-critical error, continue
    }

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      audioUrl: publicUrl,
      message: 'Recording saved successfully'
    });

  } catch (error: any) {
    console.error('Save recording error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save recording' },
      { status: 500 }
    );
  }
}
