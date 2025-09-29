// app/api/transcribe/upload-stream/route.ts
// Server-side streaming upload to AssemblyAI for large files

import { NextRequest, NextResponse } from 'next/server';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY!;

export async function POST(request: NextRequest) {
  try {
    console.log('Starting streaming upload to AssemblyAI');

    if (!ASSEMBLYAI_API_KEY) {
      return NextResponse.json(
        { error: 'AssemblyAI API key not configured' },
        { status: 500 }
      );
    }

    // Get the file from form data
    const formData = await request.formData();
    const file = formData.get('audio') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log(`Streaming ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) to AssemblyAI`);

    // Convert file to stream
    const fileStream = file.stream();

    // Upload to AssemblyAI with streaming
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ASSEMBLYAI_API_KEY}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': file.size.toString(),
      },
      body: fileStream,
      // @ts-ignore - duplex is needed for streaming uploads
      duplex: 'half',
    });

    console.log('AssemblyAI upload response status:', uploadResponse.status);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('AssemblyAI upload error:', errorText);
      return NextResponse.json(
        { error: `Upload failed: ${errorText}` },
        { status: uploadResponse.status }
      );
    }

    const uploadData = await uploadResponse.json();
    console.log('Upload successful, got URL');

    return NextResponse.json({
      success: true,
      upload_url: uploadData.upload_url
    });

  } catch (error: any) {
    console.error('Stream upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error.message },
      { status: 500 }
    );
  }
}