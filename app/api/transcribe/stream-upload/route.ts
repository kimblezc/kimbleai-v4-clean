// app/api/transcribe/stream-upload/route.ts
// Stream file directly to AssemblyAI without loading into memory

import { NextRequest, NextResponse } from 'next/server';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY!;

export async function POST(request: NextRequest) {
  try {
    console.log('Stream upload: Starting');

    if (!ASSEMBLYAI_API_KEY) {
      return NextResponse.json(
        { error: 'AssemblyAI API key not configured' },
        { status: 500 }
      );
    }

    // Get the raw body as a stream
    const body = request.body;
    if (!body) {
      return NextResponse.json(
        { error: 'No file data provided' },
        { status: 400 }
      );
    }

    console.log('Stream upload: Forwarding to AssemblyAI');

    // Stream directly to AssemblyAI
    const response = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ASSEMBLYAI_API_KEY}`,
        'Content-Type': 'application/octet-stream',
      },
      body: body,
      duplex: 'half',
    } as any);

    console.log('Stream upload: AssemblyAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Stream upload: AssemblyAI error:', errorText);
      return NextResponse.json(
        { error: `Upload failed: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Stream upload: Success, got upload URL');

    return NextResponse.json({
      success: true,
      upload_url: data.upload_url
    });

  } catch (error: any) {
    console.error('Stream upload error:', error);
    return NextResponse.json(
      { error: 'Stream upload failed', details: error.message },
      { status: 500 }
    );
  }
}