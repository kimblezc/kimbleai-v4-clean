// app/api/audio/transcribe-from-drive/route.ts
// Transcribe audio files directly from Google Drive (no Supabase upload needed)

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { generateEmbedding } from '@/lib/embeddings';
import { trackAPICall, enforceApiCallBudget } from '@/lib/cost-monitor';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { fileId, fileName, userId, projectId = 'general' } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: 'No Google Drive fileId provided' },
        { status: 400 }
      );
    }

    console.log(`[DRIVE-TRANSCRIBE] Processing ${fileName} from Google Drive`);

    // Check budget before transcribing
    console.log('[DRIVE-TRANSCRIBE] Checking cost limits...');
    const budgetCheck = await enforceApiCallBudget(userId, '/api/audio/transcribe-from-drive');
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        { error: budgetCheck.reason || 'Service paused due to budget limits.' },
        { status: 429 }
      );
    }

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

    // Initialize Google Drive client
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

    // Get file metadata
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, size, mimeType, modifiedTime'
    });

    console.log(`[DRIVE-TRANSCRIBE] File: ${fileMetadata.data.name}, Size: ${fileMetadata.data.size} bytes`);

    // Check file size (Whisper limit: 25MB)
    const maxSize = 25 * 1024 * 1024; // 25MB
    const fileSize = parseInt(fileMetadata.data.size || '0');

    if (fileSize > maxSize) {
      return NextResponse.json({
        error: `File too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB. Maximum: 25MB. For larger files, split them first.`,
        fileSize: fileSize,
        maxSize: maxSize
      }, { status: 400 });
    }

    // Download file from Google Drive
    console.log('[DRIVE-TRANSCRIBE] Downloading from Google Drive...');
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const audioBuffer = Buffer.from(response.data as ArrayBuffer);

    // Create File object for OpenAI
    const audioFile = new File(
      [audioBuffer],
      fileMetadata.data.name || 'audio.m4a',
      { type: fileMetadata.data.mimeType || 'audio/mp4' }
    );

    // Transcribe using Whisper
    console.log('[DRIVE-TRANSCRIBE] Starting Whisper transcription...');
    const transcriptionStartTime = Date.now();
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
    });
    const transcriptionDuration = Date.now() - transcriptionStartTime;

    console.log('[DRIVE-TRANSCRIBE] Transcription completed');

    // Record transcription cost
    const audioDurationMinutes = transcription.duration / 60;
    const transcriptionCost = audioDurationMinutes * 0.006; // $0.006 per minute
    console.log(`[DRIVE-TRANSCRIBE] Recording cost: ${audioDurationMinutes.toFixed(2)} minutes = $${transcriptionCost.toFixed(4)}`);

    await trackAPICall({
      user_id: userId,
      model: 'whisper-1',
      endpoint: '/api/audio/transcribe-from-drive',
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: transcriptionCost,
      timestamp: new Date().toISOString(),
      metadata: {
        googleDriveFileId: fileId,
        filename: fileMetadata.data.name,
        fileSize: fileSize,
        audioDuration: transcription.duration,
        audioDurationMinutes: audioDurationMinutes,
        language: transcription.language,
        processingTime: transcriptionDuration,
        textLength: transcription.text.length,
      }
    });

    // Generate embedding for semantic search
    let embedding: number[] | null = null;
    if (transcription.text) {
      console.log('[DRIVE-TRANSCRIBE] Generating embedding for search...');
      try {
        embedding = await generateEmbedding(
          `Transcription: ${fileMetadata.data.name}\n\n${transcription.text.substring(0, 8000)}`
        );
      } catch (embeddingError) {
        console.error('[DRIVE-TRANSCRIBE] Embedding generation failed:', embeddingError);
      }
    }

    // Store transcription in database (not the audio file)
    const { data: storedTranscription, error: dbError } = await supabase
      .from('audio_transcriptions')
      .insert({
        user_id: userId,
        project_id: projectId,
        filename: fileMetadata.data.name,
        file_size: fileSize,
        duration: transcription.duration,
        text: transcription.text,
        segments: transcription.segments,
        language: transcription.language,
        embedding: embedding,
        metadata: {
          source: 'google_drive',
          googleDriveFileId: fileId,
          googleDriveModifiedTime: fileMetadata.data.modifiedTime,
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('[DRIVE-TRANSCRIBE] Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to store transcription', details: dbError.message },
        { status: 500 }
      );
    }

    console.log('[DRIVE-TRANSCRIBE] Transcription stored successfully');

    return NextResponse.json({
      success: true,
      transcription: {
        id: storedTranscription?.id,
        text: transcription.text,
        duration: transcription.duration,
        durationMinutes: audioDurationMinutes.toFixed(2),
        language: transcription.language,
        segments: transcription.segments,
        filename: fileMetadata.data.name,
        cost: `$${transcriptionCost.toFixed(4)}`,
        source: 'google_drive',
        googleDriveFileId: fileId,
      }
    });

  } catch (error: any) {
    console.error('[DRIVE-TRANSCRIBE] Error:', error);
    return NextResponse.json(
      { error: 'Transcription failed', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to list audio files from Google Drive
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach';
    const folderId = searchParams.get('folderId'); // Optional: search within folder

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

    // Initialize Google Drive client
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

    // Search for audio files
    let query = "mimeType contains 'audio/' and trashed=false";
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }

    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, size, mimeType, createdTime, modifiedTime, webViewLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 100
    });

    const files = response.data.files || [];

    // Filter and format
    const audioFiles = files.map(file => ({
      id: file.id,
      name: file.name,
      size: parseInt(file.size || '0'),
      sizeFormatted: formatFileSize(parseInt(file.size || '0')),
      mimeType: file.mimeType,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      canTranscribe: parseInt(file.size || '0') <= 25 * 1024 * 1024, // 25MB limit
    }));

    return NextResponse.json({
      success: true,
      files: audioFiles,
      count: audioFiles.length
    });

  } catch (error: any) {
    console.error('[DRIVE-TRANSCRIBE] List error:', error);
    return NextResponse.json(
      { error: 'Failed to list audio files', details: error.message },
      { status: 500 }
    );
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
