// Export transcription to various formats
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { transcriptionId, format = 'txt', includeTimestamps = true, includeSpeakers = true } = await request.json();

    // Fetch transcription from database
    const { data: transcription, error } = await supabase
      .from('audio_transcriptions')
      .select('*')
      .eq('id', transcriptionId)
      .single();

    if (error || !transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'txt') {
      // Plain text format
      content = formatAsText(transcription, includeTimestamps, includeSpeakers);
      filename = `${transcription.filename.replace(/\.[^/.]+$/, '')}_transcript.txt`;
      mimeType = 'text/plain';
    } else if (format === 'json') {
      // JSON format with full metadata
      content = JSON.stringify({
        filename: transcription.filename,
        duration: transcription.duration,
        created_at: transcription.created_at,
        text: transcription.text,
        utterances: transcription.metadata?.utterances || [],
        speaker_labels: transcription.metadata?.speaker_labels,
        words: transcription.metadata?.words,
        auto_tags: transcription.metadata?.auto_tags,
        action_items: transcription.metadata?.action_items,
        key_topics: transcription.metadata?.key_topics
      }, null, 2);
      filename = `${transcription.filename.replace(/\.[^/.]+$/, '')}_transcript.json`;
      mimeType = 'application/json';
    } else if (format === 'srt') {
      // SRT subtitle format
      content = formatAsSRT(transcription);
      filename = `${transcription.filename.replace(/\.[^/.]+$/, '')}_transcript.srt`;
      mimeType = 'text/plain';
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error('[EXPORT] Error:', error);
    return NextResponse.json(
      { error: 'Export failed', details: error.message },
      { status: 500 }
    );
  }
}

function formatAsText(transcription: any, includeTimestamps: boolean, includeSpeakers: boolean): string {
  let content = `TRANSCRIPTION: ${transcription.filename}\n`;
  content += `Duration: ${Math.floor(transcription.duration / 60)}:${(transcription.duration % 60).toString().padStart(2, '0')}\n`;
  content += `Date: ${new Date(transcription.created_at).toLocaleString()}\n`;
  content += `\n${'='.repeat(80)}\n\n`;

  const utterances = transcription.metadata?.utterances || [];

  if (utterances.length > 0) {
    utterances.forEach((utterance: any) => {
      let line = '';

      if (includeTimestamps) {
        const startTime = Math.floor(utterance.start / 1000);
        const minutes = Math.floor(startTime / 60);
        const seconds = startTime % 60;
        line += `[${minutes}:${seconds.toString().padStart(2, '0')}] `;
      }

      if (includeSpeakers) {
        line += `Speaker ${utterance.speaker}: `;
      }

      line += utterance.text;
      content += line + '\n\n';
    });
  } else {
    // Fallback to plain text
    content += transcription.text;
  }

  return content;
}

function formatAsSRT(transcription: any): string {
  const utterances = transcription.metadata?.utterances || [];
  let content = '';

  utterances.forEach((utterance: any, index: number) => {
    const startTime = formatSRTTime(utterance.start);
    const endTime = formatSRTTime(utterance.end);

    content += `${index + 1}\n`;
    content += `${startTime} --> ${endTime}\n`;
    content += `${utterance.text}\n\n`;
  });

  return content;
}

function formatSRTTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}
