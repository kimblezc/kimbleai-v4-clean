// app/api/transcribe/status/route.ts
// Check AssemblyAI transcription status

import { NextRequest, NextResponse } from 'next/server';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transcriptId = searchParams.get('id');

    if (!transcriptId) {
      return NextResponse.json(
        { error: 'Transcript ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: {
        'Authorization': `Bearer ${ASSEMBLYAI_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Status check failed: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      status: data.status,
      text: data.text,
      audio_duration: data.audio_duration,
      speaker_labels: data.speaker_labels,
      chapters: data.chapters,
      sentiment_analysis_results: data.sentiment_analysis_results,
      entities: data.entities,
      iab_categories_result: data.iab_categories_result,
      auto_highlights_result: data.auto_highlights_result,
      summary: data.summary,
      error: data.error
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status', details: error.message },
      { status: 500 }
    );
  }
}