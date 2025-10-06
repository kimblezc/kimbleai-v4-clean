// Transcribe large files from Google Drive using AssemblyAI
// Downloads from Drive → Uploads to AssemblyAI → Returns job ID for polling

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY!;
const ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com/v2';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Handle GET requests for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: 'AssemblyAI Drive Transcription',
    method: 'POST',
    status: 'ready',
    apiKeyConfigured: !!ASSEMBLYAI_API_KEY,
    apiKeyLength: ASSEMBLYAI_API_KEY?.length || 0,
    apiKeyPreview: ASSEMBLYAI_API_KEY ? ASSEMBLYAI_API_KEY.substring(0, 8) + '...' : 'NOT SET',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  console.log('[DRIVE-ASSEMBLYAI] Request received');

  try {
    const body = await request.json();
    console.log('[DRIVE-ASSEMBLYAI] Request body:', JSON.stringify(body));

    const { fileId, fileName, userId = 'zach', projectId = 'general' } = body;

    if (!fileId) {
      console.error('[DRIVE-ASSEMBLYAI] No fileId provided');
      return NextResponse.json({ error: 'No Google Drive fileId provided' }, { status: 400 });
    }

    console.log(`[DRIVE-ASSEMBLYAI] Processing ${fileName} from Google Drive`);

    // Get user's Google tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData?.access_token) {
      return NextResponse.json({
        error: 'User not authenticated with Google. Please sign in.',
        needsAuth: true
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

    const fileSize = parseInt(fileMetadata.data.size || '0');
    console.log(`[DRIVE-ASSEMBLYAI] File: ${fileMetadata.data.name}, Size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

    // Download file from Google Drive
    console.log('[DRIVE-ASSEMBLYAI] Downloading from Google Drive...');
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const audioBuffer = Buffer.from(response.data as ArrayBuffer);

    // Upload to AssemblyAI
    console.log('[DRIVE-ASSEMBLYAI] Uploading to AssemblyAI...');
    console.log('[DRIVE-ASSEMBLYAI] API Key length:', ASSEMBLYAI_API_KEY?.length);
    console.log('[DRIVE-ASSEMBLYAI] API Key preview:', ASSEMBLYAI_API_KEY?.substring(0, 8) + '...');
    console.log('[DRIVE-ASSEMBLYAI] Has leading space:', ASSEMBLYAI_API_KEY !== ASSEMBLYAI_API_KEY?.trimStart());
    console.log('[DRIVE-ASSEMBLYAI] Has trailing space:', ASSEMBLYAI_API_KEY !== ASSEMBLYAI_API_KEY?.trimEnd());

    const uploadResponse = await fetch(`${ASSEMBLYAI_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ASSEMBLYAI_API_KEY}`,
        'Content-Type': 'application/octet-stream',
      },
      body: audioBuffer,
    });

    console.log('[DRIVE-ASSEMBLYAI] Upload response status:', uploadResponse.status);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[DRIVE-ASSEMBLYAI] Upload failed:', errorText);
      console.error('[DRIVE-ASSEMBLYAI] Response headers:', JSON.stringify([...uploadResponse.headers.entries()]));
      throw new Error(`AssemblyAI upload failed: ${errorText}`);
    }

    const uploadData = await uploadResponse.json();
    const audioUrl = uploadData.upload_url;

    console.log('[DRIVE-ASSEMBLYAI] File uploaded, starting transcription...');

    // Start transcription with speaker diarization
    const transcriptResponse = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ASSEMBLYAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true, // Enable speaker diarization
      }),
    });

    if (!transcriptResponse.ok) {
      throw new Error(`Transcription request failed: ${transcriptResponse.statusText}`);
    }

    const transcriptData = await transcriptResponse.json();
    const jobId = transcriptData.id;

    console.log(`[DRIVE-ASSEMBLYAI] Transcription job created: ${jobId}`);

    // Store metadata for tracking
    await supabase.from('audio_transcriptions').insert({
      user_id: userId,
      project_id: projectId,
      filename: fileName,
      file_size: fileSize,
      metadata: {
        source: 'google_drive',
        googleDriveFileId: fileId,
        assemblyaiJobId: jobId,
        status: 'processing'
      },
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      jobId: jobId,
      message: 'Transcription started. Use /api/transcribe/status to check progress.'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('[DRIVE-ASSEMBLYAI] Error:', error);
    console.error('[DRIVE-ASSEMBLYAI] Stack:', error.stack);
    return NextResponse.json({
      success: false,
      error: 'Transcription failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
