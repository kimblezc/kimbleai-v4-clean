import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

// Helper function to estimate audio duration (rough estimate based on file size)
function estimateAudioDuration(fileSizeBytes: number, format: string): number {
  // Rough estimates for common formats (in seconds)
  const estimatesPerMB = {
    'mp3': 60,    // ~1 minute per MB for average quality MP3
    'm4a': 45,    // ~45 seconds per MB for M4A
    'wav': 10,    // ~10 seconds per MB for uncompressed WAV
    'aac': 50,    // ~50 seconds per MB for AAC
    'ogg': 55,    // ~55 seconds per MB for OGG
    'default': 45
  };

  const fileSizeMB = fileSizeBytes / (1024 * 1024);
  const format_key = format.toLowerCase() as keyof typeof estimatesPerMB;
  const secondsPerMB = estimatesPerMB[format_key] || estimatesPerMB.default;

  return Math.round(fileSizeMB * secondsPerMB);
}

// Extract important knowledge from transcription
function extractTranscriptionFacts(transcription: string, fileName: string): Array<{
  category: string;
  title: string;
  content: string;
  importance: number;
  tags: string[];
}> {
  const facts: Array<{
    category: string;
    title: string;
    content: string;
    importance: number;
    tags: string[];
  }> = [];

  // Extract meeting participants mentioned by name
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:said|says|mentioned|asked|responded)/g;
  const names = [...transcription.matchAll(namePattern)];
  names.forEach(match => {
    facts.push({
      category: 'meeting',
      title: `Meeting Participant: ${match[1]}`,
      content: `${match[1]} was a participant in the meeting`,
      importance: 0.8,
      tags: ['meeting', 'participant', match[1].toLowerCase()]
    });
  });

  // Extract action items and tasks
  const actionPattern = /(?:action item|todo|task|need to|should|must|will)\s+([^.!?]+)/gi;
  const actions = [...transcription.matchAll(actionPattern)];
  actions.forEach((match, index) => {
    facts.push({
      category: 'task',
      title: `Action Item from ${fileName}`,
      content: match[0].trim(),
      importance: 0.9,
      tags: ['action-item', 'task', 'meeting']
    });
  });

  // Extract dates and deadlines mentioned in the transcription
  const datePattern = /(?:due|deadline|by|before|on|scheduled for)\s+([A-Za-z]+ \d+(?:st|nd|rd|th)?(?:,? \d{4})?|next week|next month|tomorrow|today)/gi;
  const dates = [...transcription.matchAll(datePattern)];
  dates.forEach(match => {
    facts.push({
      category: 'deadline',
      title: 'Important Date from Meeting',
      content: match[0],
      importance: 0.9,
      tags: ['deadline', 'date', 'meeting']
    });
  });

  // Extract key decisions
  const decisionPattern = /(?:decided|decision|agreed|concluded|determined)\s+([^.!?]+)/gi;
  const decisions = [...transcription.matchAll(decisionPattern)];
  decisions.forEach(match => {
    facts.push({
      category: 'decision',
      title: 'Meeting Decision',
      content: match[0].trim(),
      importance: 0.8,
      tags: ['decision', 'meeting', 'important']
    });
  });

  return facts.slice(0, 20); // Limit to top 20 facts to avoid overwhelming the system
}

export async function GET() {
  return NextResponse.json({
    status: 'OK',
    service: 'KimbleAI Audio Transcription API',
    version: '4.0',
    features: {
      whisperTranscription: true,
      chunkedProcessing: true,
      largeFileSupport: '600MB+',
      knowledgeExtraction: true,
      supportedFormats: ['m4a', 'mp3', 'wav', 'ogg', 'aac', 'webm']
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const userId = formData.get('userId') as string || 'zach';
    const projectId = formData.get('projectId') as string || 'general';
    const chunkIndex = formData.get('chunkIndex') as string;
    const totalChunks = formData.get('totalChunks') as string;
    const isChunked = formData.get('isChunked') === 'true';

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (userError || !userData) {
      console.error('User fetch error:', userError);
      return NextResponse.json({
        error: 'User not found',
        details: userError?.message
      }, { status: 404 });
    }

    console.log(`Processing audio: ${audioFile.name} (${audioFile.size} bytes)`);

    // Check file size limits
    const maxSize = 100 * 1024 * 1024; // 100MB limit for individual chunks/files sent to Whisper
    if (audioFile.size > maxSize && !isChunked) {
      return NextResponse.json({
        error: 'File too large. Please use chunked processing for files over 100MB.',
        maxSize: '100MB',
        receivedSize: `${(audioFile.size / 1024 / 1024).toFixed(1)}MB`
      }, { status: 413 });
    }

    // Convert File to buffer for Whisper API
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a temporary file for Whisper (it expects File-like object)
    const tempFile = new File([buffer], audioFile.name, { type: audioFile.type });

    console.log(`Sending to Whisper API: ${tempFile.name} (${tempFile.size} bytes)`);

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: tempFile,
      model: 'whisper-1',
      language: 'en', // Can be made dynamic
      response_format: 'verbose_json', // Get timestamps and metadata
      temperature: 0.0 // More deterministic transcription
    });

    const transcriptionText = transcription.text;
    const duration = transcription.duration || estimateAudioDuration(audioFile.size, audioFile.name.split('.').pop() || 'unknown');

    console.log(`Transcription completed: ${transcriptionText.length} characters, ${duration} seconds`);

    // For chunked processing, return just the transcription
    if (isChunked) {
      console.log(`Chunk ${chunkIndex}/${totalChunks} processed successfully`);
      return NextResponse.json({
        success: true,
        transcription: transcriptionText,
        duration: duration,
        chunkIndex: parseInt(chunkIndex || '0'),
        totalChunks: parseInt(totalChunks || '1'),
        metadata: {
          fileName: audioFile.name,
          fileSize: audioFile.size,
          format: audioFile.type
        }
      });
    }

    // Extract knowledge facts from transcription
    const facts = extractTranscriptionFacts(transcriptionText, audioFile.name);

    // For complete files (non-chunked), save to database and extract knowledge
    try {
      // Save transcription to database
      const { data: transcriptionData, error: saveError } = await supabase
        .from('audio_transcriptions')
        .insert({
          user_id: userData.name, // Use name instead of id for consistency
          filename: audioFile.name,
          file_size: audioFile.size,
          duration: duration,
          text: transcriptionText,
          project_id: projectId,
          language: transcription.language || 'en',
          segments: transcription.segments || null
        })
        .select()
        .single();

      if (saveError) {
        console.error('Failed to save transcription:', saveError);
      } else {
        console.log('Transcription saved to database:', transcriptionData?.id);
      }

      // Save extracted facts to knowledge base
      if (facts.length > 0) {
        for (const fact of facts) {
          // Generate embedding for the fact
          try {
            const embeddingResponse = await openai.embeddings.create({
              model: 'text-embedding-3-small',
              input: fact.content,
              dimensions: 1536
            });

            await supabase.from('knowledge_base').insert({
              user_id: userData.id,
              source_type: 'transcription',
              category: fact.category,
              title: fact.title,
              content: fact.content,
              embedding: embeddingResponse.data[0].embedding,
              importance: fact.importance,
              tags: fact.tags,
              metadata: {
                transcription_id: transcriptionData?.id,
                source_file: audioFile.name,
                audio_duration: duration,
                file_format: audioFile.type
              }
            });
          } catch (embeddingError) {
            console.error('Failed to create embedding for fact:', embeddingError);
            // Continue without embedding if it fails
            await supabase.from('knowledge_base').insert({
              user_id: userData.id,
              source_type: 'transcription',
              category: fact.category,
              title: fact.title,
              content: fact.content,
              importance: fact.importance,
              tags: fact.tags,
              metadata: {
                transcription_id: transcriptionData?.id,
                source_file: audioFile.name,
                audio_duration: duration,
                file_format: audioFile.type
              }
            });
          }
        }
        console.log(`Extracted and saved ${facts.length} facts from transcription`);
      }

    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      // Continue with response even if DB save fails
    }

    return NextResponse.json({
      success: true,
      transcription: transcriptionText,
      duration: duration,
      factsExtracted: facts?.length || 0,
      metadata: {
        fileName: audioFile.name,
        fileSize: audioFile.size,
        fileSizeMB: (audioFile.size / 1024 / 1024).toFixed(1),
        format: audioFile.type,
        language: transcription.language || 'en',
        model: 'whisper-1'
      }
    });

  } catch (error: any) {
    console.error('Transcription API error:', error);

    // Handle specific OpenAI errors
    if (error.message?.includes('audio file is too long')) {
      return NextResponse.json({
        error: 'Audio file is too long for processing',
        suggestion: 'Please split your audio file into smaller chunks (under 25MB each) and try again.',
        details: error.message
      }, { status: 413 });
    }

    if (error.message?.includes('Invalid file format')) {
      return NextResponse.json({
        error: 'Unsupported audio format',
        supportedFormats: ['m4a', 'mp3', 'wav', 'ogg', 'aac', 'webm'],
        details: error.message
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Audio transcription failed',
      details: error.message
    }, { status: 500 });
  }
}