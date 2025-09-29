// app/api/transcribe/upload-url/route.ts
// Get AssemblyAI upload URL (no file upload, just URL generation)

import { NextRequest, NextResponse } from 'next/server';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Debug: Check if API key is available
    console.log('API Key available:', !!ASSEMBLYAI_API_KEY);
    console.log('API Key length:', ASSEMBLYAI_API_KEY?.length || 0);

    if (!ASSEMBLYAI_API_KEY) {
      return NextResponse.json(
        { error: 'AssemblyAI API key not configured' },
        { status: 500 }
      );
    }

    // AssemblyAI doesn't provide pre-signed URLs like S3
    // Instead, we need to return their upload endpoint and auth header
    // The frontend will upload directly to AssemblyAI with this auth
    return NextResponse.json({
      success: true,
      upload_url: 'https://api.assemblyai.com/v2/upload',
      auth_token: ASSEMBLYAI_API_KEY
    });

  } catch (error: any) {
    console.error('Upload URL error:', error);
    return NextResponse.json(
      { error: 'Failed to get upload URL', details: error.message },
      { status: 500 }
    );
  }
}