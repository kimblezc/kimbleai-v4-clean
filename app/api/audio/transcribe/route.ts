// app/api/audio/transcribe/route.ts
// Audio M4A transcription API using OpenAI Whisper

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/lib/embeddings';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const userId = formData.get('userId') as string;
    const projectId = formData.get('projectId') as string || 'general';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!audioFile.type.includes('audio')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an audio file.' },
        { status: 400 }
      );
    }

    console.log(`[AUDIO] Processing ${audioFile.name} for user ${userId}`);

    // Convert File to Buffer for OpenAI
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a File object that OpenAI expects
    const file = new File([buffer], audioFile.name, {
      type: audioFile.type,
    });

    // Transcribe using Whisper
    console.log('[AUDIO] Starting Whisper transcription...');
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en', // Optional: specify language
      response_format: 'verbose_json', // Get timestamps
    });

    console.log('[AUDIO] Transcription completed');

    // Generate embedding for semantic search
    let embedding: number[] | null = null;
    if (transcription.text) {
      console.log('[AUDIO] Generating embedding for search...');
      try {
        embedding = await generateEmbedding(
          `Transcription: ${audioFile.name}\n\n${transcription.text.substring(0, 8000)}`
        );
      } catch (embeddingError) {
        console.error('[AUDIO] Embedding generation failed:', embeddingError);
        // Continue even if embedding fails
      }
    }

    // Store transcription in database with embedding
    const { data: storedTranscription, error: dbError } = await supabase
      .from('audio_transcriptions')
      .insert({
        user_id: userId,
        project_id: projectId,
        filename: audioFile.name,
        file_size: audioFile.size,
        duration: transcription.duration,
        text: transcription.text,
        segments: transcription.segments, // Store word-level timestamps
        language: transcription.language,
        embedding: embedding, // Store embedding for semantic search
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('[AUDIO] Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to store transcription', details: dbError.message },
        { status: 500 }
      );
    }

    console.log('[AUDIO] Transcription stored successfully with embedding');

    return NextResponse.json({
      success: true,
      transcription: {
        text: transcription.text,
        duration: transcription.duration,
        language: transcription.language,
        segments: transcription.segments,
        filename: audioFile.name,
        id: storedTranscription?.id
      }
    });

  } catch (error: any) {
    console.error('[AUDIO] Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve transcriptions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const projectId = searchParams.get('projectId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('audio_transcriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query.limit(20);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      transcriptions: data
    });

  } catch (error) {
    console.error('[AUDIO] Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcriptions' },
      { status: 500 }
    );
  }
}
