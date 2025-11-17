import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Force route to be dynamic and increase timeout for large audio files
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max (same as AssemblyAI)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

// Helper function to estimate audio duration (improved estimates based on file size and format)
function estimateAudioDuration(fileSizeBytes: number, format: string): number {
  // More accurate estimates for common formats (in seconds per MB)
  // Based on typical bitrates: M4A ~128kbps, MP3 ~128-320kbps, WAV ~1411kbps
  const estimatesPerMB = {
    'mp3': 70,    // ~70 seconds per MB for 128kbps MP3
    'm4a': 75,    // ~75 seconds per MB for 128kbps M4A/AAC (more accurate)
    'aac': 75,    // Same as M4A
    'wav': 6,     // ~6 seconds per MB for uncompressed WAV (44.1kHz 16-bit stereo)
    'ogg': 65,    // ~65 seconds per MB for OGG Vorbis
    'webm': 65,   // ~65 seconds per MB for WebM audio
    'default': 70 // Default to MP3-like estimate
  };

  const fileSizeMB = fileSizeBytes / (1024 * 1024);
  const format_key = format.toLowerCase() as keyof typeof estimatesPerMB;
  const secondsPerMB = estimatesPerMB[format_key] || estimatesPerMB.default;

  const estimatedDuration = Math.round(fileSizeMB * secondsPerMB);

  // Ensure minimum duration for very small files
  return Math.max(1, estimatedDuration);
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

    console.log(`Processing audio: ${audioFile.name} (${audioFile.size} bytes)${isChunked ? ` [Chunk ${chunkIndex}/${totalChunks}]` : ''}`);

    // Check file size limits - Whisper API has a 25MB limit, but we'll allow up to 24MB for safety
    const whisperMaxSize = 24 * 1024 * 1024; // 24MB limit for individual chunks sent to Whisper
    const overallMaxSize = 100 * 1024 * 1024; // 100MB limit for non-chunked files

    if (audioFile.size > whisperMaxSize) {
      if (isChunked) {
        return NextResponse.json({
          error: 'Chunk too large for Whisper API',
          maxChunkSize: '24MB',
          receivedChunkSize: `${(audioFile.size / 1024 / 1024).toFixed(1)}MB`,
          suggestion: 'Split audio into smaller chunks (under 24MB each)',
          chunkInfo: {
            chunkIndex: parseInt(chunkIndex || '0'),
            totalChunks: parseInt(totalChunks || '1')
          }
        }, { status: 413 });
      } else if (audioFile.size > overallMaxSize) {
        return NextResponse.json({
          error: 'File too large. Please use chunked processing for files over 100MB.',
          maxSize: '100MB',
          receivedSize: `${(audioFile.size / 1024 / 1024).toFixed(1)}MB`,
          suggestion: 'Use chunked processing to split large files into smaller pieces'
        }, { status: 413 });
      } else {
        return NextResponse.json({
          error: 'File too large for direct processing',
          maxDirectSize: '24MB',
          receivedSize: `${(audioFile.size / 1024 / 1024).toFixed(1)}MB`,
          suggestion: 'Use chunked processing to split this file into smaller pieces'
        }, { status: 413 });
      }
    }

    // Convert File to buffer for Whisper API
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a temporary file for Whisper (it expects File-like object)
    const tempFile = new File([buffer], audioFile.name, { type: audioFile.type });

    console.log(`Sending to Whisper API: ${tempFile.name} (${tempFile.size} bytes)${isChunked ? ` [Chunk ${chunkIndex}/${totalChunks}]` : ''}`);

    let transcription;
    try {
      // Call OpenAI Whisper API with better error handling
      transcription = await openai.audio.transcriptions.create({
        file: tempFile,
        model: 'whisper-1',
        language: 'en', // Can be made dynamic
        response_format: 'verbose_json', // Get timestamps and metadata
        temperature: 0.0 // More deterministic transcription
      });

      console.log(`Whisper API success: ${tempFile.name} transcribed successfully`);
    } catch (whisperError: any) {
      console.error(`Whisper API error for ${tempFile.name}:`, whisperError);

      // Provide detailed error information for debugging
      let errorMessage = 'Unknown Whisper API error';
      let errorCode = 500;

      if (whisperError.message?.includes('file is too large')) {
        errorMessage = `Audio file/chunk is too large for Whisper API (received: ${(audioFile.size / 1024 / 1024).toFixed(1)}MB, max: 25MB)`;
        errorCode = 413;
      } else if (whisperError.message?.includes('Invalid file format')) {
        errorMessage = `Unsupported audio format: ${audioFile.type}`;
        errorCode = 400;
      } else if (whisperError.message?.includes('duration')) {
        errorMessage = `Audio duration exceeds Whisper API limits`;
        errorCode = 413;
      } else if (whisperError.status === 429) {
        errorMessage = 'Whisper API rate limit exceeded. Please try again in a moment.';
        errorCode = 429;
      } else if (whisperError.status === 413) {
        errorMessage = `Request too large for Whisper API (file size: ${(audioFile.size / 1024 / 1024).toFixed(1)}MB)`;
        errorCode = 413;
      } else {
        errorMessage = whisperError.message || 'Whisper API processing failed';
      }

      return NextResponse.json({
        error: isChunked ? `Chunk ${chunkIndex} transcription failed` : 'Audio transcription failed',
        details: errorMessage,
        whisperError: whisperError.message,
        chunkInfo: isChunked ? {
          chunkIndex: parseInt(chunkIndex || '0'),
          totalChunks: parseInt(totalChunks || '1'),
          chunkSize: `${(audioFile.size / 1024 / 1024).toFixed(1)}MB`
        } : undefined,
        fileInfo: {
          name: audioFile.name,
          size: audioFile.size,
          type: audioFile.type,
          sizeMB: `${(audioFile.size / 1024 / 1024).toFixed(1)}MB`
        }
      }, { status: errorCode });
    }

    const transcriptionText = transcription.text;
    const actualDuration = transcription.duration;
    const estimatedDuration = estimateAudioDuration(audioFile.size, audioFile.name.split('.').pop() || 'unknown');
    const duration = actualDuration || estimatedDuration;

    console.log(`Transcription completed: ${transcriptionText.length} characters, ${duration} seconds (${actualDuration ? 'actual' : 'estimated'} duration)${isChunked ? ` [Chunk ${chunkIndex}/${totalChunks}]` : ''}`);

    // Log duration estimation accuracy for debugging
    if (actualDuration && estimatedDuration) {
      const accuracy = Math.abs(actualDuration - estimatedDuration) / actualDuration * 100;
      console.log(`Duration estimation accuracy: ${(100 - accuracy).toFixed(1)}% (estimated: ${estimatedDuration}s, actual: ${actualDuration}s)`);
    }

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