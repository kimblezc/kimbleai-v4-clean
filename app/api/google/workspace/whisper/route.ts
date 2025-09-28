import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { WorkspaceRAGSystem } from '../rag-system';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const userId = formData.get('userId') as string || 'zach';
    const language = formData.get('language') as string || 'auto';
    const model = formData.get('model') as string || 'whisper-1';
    const title = formData.get('title') as string || audioFile.name;
    const tags = formData.get('tags') as string || '';

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Check file size (25MB limit for OpenAI Whisper API)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxSize) {
      return NextResponse.json({
        error: 'Audio file too large. Maximum size: 25MB for single API call. Use chunking for larger files.'
      }, { status: 400 });
    }

    // Check audio format
    const supportedFormats = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/x-m4a'];
    if (!supportedFormats.includes(audioFile.type)) {
      return NextResponse.json({
        error: `Unsupported audio format: ${audioFile.type}. Supported: ${supportedFormats.join(', ')}`
      }, { status: 400 });
    }

    console.log(`Starting Whisper transcription for ${audioFile.name} (${(audioFile.size / 1024 / 1024).toFixed(2)}MB)`);

    // Get user's Google token
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json({
        error: 'User not authenticated with Google'
      }, { status: 401 });
    }

    // Initialize Google Drive and RAG system
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const ragSystem = new WorkspaceRAGSystem(drive);
    await ragSystem.initialize(userId);

    // Store original audio file
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const audioId = await ragSystem.storeCompressedMemory(userId, audioBuffer.toString('base64'), {
      type: 'audio',
      title: `${title} (Original Audio)`,
      tags: ['audio', 'original', ...tags.split(',')],
      importance: 0.6
    });

    // Transcribe with OpenAI Whisper
    const transcriptionResult = await transcribeWithWhisper(audioFile, language, model);

    if (!transcriptionResult.success) {
      return NextResponse.json({
        error: 'Transcription failed',
        details: transcriptionResult.error
      }, { status: 500 });
    }

    // Store transcription with RAG integration
    const transcriptionData = {
      id: `whisper_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      audioId: audioId,
      fileName: audioFile.name,
      fileSize: audioFile.size,
      duration: transcriptionResult.duration || 'Unknown',
      language: transcriptionResult.language || language,
      model: model,
      confidence: transcriptionResult.confidence || 'Unknown',
      transcript: transcriptionResult.text,
      segments: transcriptionResult.segments || [],
      created: new Date().toISOString(),
      metadata: {
        originalFormat: audioFile.type,
        processingTime: transcriptionResult.processingTime
      }
    };

    // Store full transcription
    const fullTranscriptionId = await ragSystem.storeCompressedMemory(
      userId,
      JSON.stringify(transcriptionData, null, 2),
      {
        type: 'transcription',
        title: `${title} - Full Transcription`,
        tags: ['transcription', 'whisper', 'full', ...tags.split(',')],
        importance: 0.9
      }
    );

    // Store transcription with intelligent chunking for RAG
    const ragResult = await ragSystem.storeTranscriptionEfficient(
      userId,
      audioFile.name,
      transcriptionResult.text,
      transcriptionResult.duration
    );

    // Store individual segments if available (for better searchability)
    const segmentIds: string[] = [];
    if (transcriptionResult.segments && transcriptionResult.segments.length > 0) {
      for (let i = 0; i < Math.min(transcriptionResult.segments.length, 20); i++) { // Limit to 20 segments
        const segment = transcriptionResult.segments[i];
        const segmentId = await ragSystem.storeCompressedMemory(userId, segment.text, {
          type: 'transcription',
          title: `${title} - Segment ${i + 1} (${segment.start}s-${segment.end}s)`,
          tags: ['transcription', 'segment', ...tags.split(',')],
          importance: 0.7
        });
        segmentIds.push(segmentId);
      }
    }

    console.log(`Whisper transcription completed: ${ragResult.chunks.length} chunks created`);

    return NextResponse.json({
      success: true,
      transcription: {
        id: transcriptionData.id,
        audioId: audioId,
        fullTranscriptionId: fullTranscriptionId,
        text: transcriptionResult.text,
        language: transcriptionResult.language,
        duration: transcriptionResult.duration,
        confidence: transcriptionResult.confidence
      },
      storage: {
        ragTranscriptionId: ragResult.transcriptionId,
        chunks: ragResult.chunks.length,
        segments: segmentIds.length,
        storageStats: ragResult.storageStats
      },
      metadata: {
        fileName: audioFile.name,
        fileSize: audioFile.size,
        processingTime: transcriptionResult.processingTime,
        model: model
      }
    });

  } catch (error: any) {
    console.error('Whisper transcription error:', error);
    return NextResponse.json({
      error: 'Failed to transcribe audio',
      details: error.message
    }, { status: 500 });
  }
}

// Transcribe audio using OpenAI Whisper API
async function transcribeWithWhisper(
  audioFile: File,
  language: string = 'auto',
  model: string = 'whisper-1'
): Promise<{
  success: boolean;
  text?: string;
  language?: string;
  duration?: number;
  confidence?: string;
  segments?: any[];
  processingTime?: number;
  error?: string;
}> {
  try {
    const startTime = Date.now();

    // Create FormData for OpenAI API
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', model);
    formData.append('response_format', 'verbose_json'); // Get detailed response with segments

    if (language !== 'auto') {
      formData.append('language', language);
    }

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    const processingTime = Date.now() - startTime;

    console.log(`Whisper transcription completed in ${(processingTime / 1000).toFixed(2)}s`);

    return {
      success: true,
      text: result.text,
      language: result.language,
      duration: result.duration,
      confidence: 'High', // Whisper doesn't provide confidence scores
      segments: result.segments,
      processingTime: processingTime
    };

  } catch (error: any) {
    console.error('Whisper API error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Chunk large audio files (for files > 25MB)
// Chunked processing disabled for Vercel deployment
/*
export async function POST_CHUNKED(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const userId = formData.get('userId') as string || 'zach';
    const chunkDuration = parseInt(formData.get('chunkDuration') as string || '300'); // 5 minutes default
    const title = formData.get('title') as string || audioFile.name;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // For large files, we would need to:
    // 1. Split audio into chunks using ffmpeg
    // 2. Transcribe each chunk separately
    // 3. Combine transcriptions with timing adjustments
    // 4. Store in workspace memory system

    return NextResponse.json({
      message: 'Chunked transcription not yet implemented',
      note: 'This endpoint will handle files larger than 25MB by splitting them into chunks',
      fileSize: audioFile.size,
      maxSingleFileSize: '25MB',
      suggestedChunkDuration: `${chunkDuration} seconds`
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Chunked transcription failed',
      details: error.message
    }, { status: 500 });
  }
}
*/

export async function GET() {
  return NextResponse.json({
    message: 'Google Workspace Whisper Transcription System',
    features: [
      'OpenAI Whisper integration',
      'Automatic language detection',
      'Segment-level transcription',
      'RAG integration with vector search',
      'Compressed storage in Google Workspace',
      'Intelligent chunking for searchability'
    ],
    limits: {
      singleFile: '25MB',
      supportedFormats: ['mp3', 'mp4', 'wav', 'webm', 'm4a'],
      languages: 'Auto-detect or specify ISO 639-1 code'
    },
    endpoints: {
      transcribe: 'POST /api/google/workspace/whisper',
      chunkedTranscribe: 'POST /api/google/workspace/whisper (chunked mode - coming soon)'
    }
  });
}