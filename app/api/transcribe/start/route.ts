// app/api/transcribe/start/route.ts
// Start AssemblyAI transcription with uploaded audio URL

import { NextRequest, NextResponse } from 'next/server';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { audio_url, filename } = await request.json();

    if (!audio_url) {
      return NextResponse.json(
        { error: 'Audio URL is required' },
        { status: 400 }
      );
    }

    // Start transcription with advanced features
    const transcriptRequest = {
      audio_url: audio_url,
      speech_model: 'universal',
      speaker_labels: true,
      auto_chapters: true,
      sentiment_analysis: true,
      entity_detection: true,
      iab_categories: true,
      auto_highlights: true,
      summarization: true,
      summary_model: 'informative',
      summary_type: 'bullets',
    };

    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ASSEMBLYAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transcriptRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Transcription request failed: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      transcript_id: data.id,
      status: data.status
    });

  } catch (error: any) {
    console.error('Start transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to start transcription', details: error.message },
      { status: 500 }
    );
  }
}