// app/api/transcribe/upload-url/route.ts
// Get AssemblyAI upload URL (no file upload, just URL generation)

import { NextRequest, NextResponse } from 'next/server';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Just get an upload URL from AssemblyAI (no file data)
    const response = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ASSEMBLYAI_API_KEY}`,
      },
      body: '', // Empty body to get upload URL
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Failed to get upload URL: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      upload_url: data.upload_url
    });

  } catch (error: any) {
    console.error('Upload URL error:', error);
    return NextResponse.json(
      { error: 'Failed to get upload URL', details: error.message },
      { status: 500 }
    );
  }
}