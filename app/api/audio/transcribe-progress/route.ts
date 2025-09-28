// app/api/audio/transcribe-progress/route.ts
// Audio transcription with progress tracking and ETA

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Store for progress tracking
const progressStore = new Map<string, {
  progress: number;
  eta: number;
  status: string;
  startTime: number;
  fileSize: number;
  duration?: number;
}>();

// Helper function to estimate audio duration from file size (rough approximation)
function estimateAudioDuration(fileSize: number, format: string): number {
  // Rough estimates in seconds based on typical bitrates:
  // M4A/AAC: ~128kbps = 16KB/s
  // MP3: ~128kbps = 16KB/s
  // WAV: ~1411kbps = 176KB/s
  const bitrates = {
    'm4a': 16000,   // bytes per second
    'mp3': 16000,
    'wav': 176000,
    'default': 20000
  };

  const ext = format.toLowerCase();
  const bytesPerSecond = bitrates[ext as keyof typeof bitrates] || bitrates.default;

  return Math.max(1, Math.round(fileSize / bytesPerSecond));
}

// Helper function to calculate processing ETA
function calculateETA(fileSize: number, estimatedDuration: number, currentProgress: number): number {
  // Whisper typically processes at 2-5x real-time speed
  // Larger files may process slower due to memory constraints
  const baseProcessingRate = estimatedDuration <= 60 ? 3.5 : 2.5; // 3.5x for short, 2.5x for long
  const sizeMultiplier = fileSize > 10 * 1024 * 1024 ? 0.8 : 1; // Slow down for files > 10MB

  const estimatedProcessingTime = (estimatedDuration / baseProcessingRate) * sizeMultiplier;
  const remainingProgress = 100 - currentProgress;
  const remainingTime = (estimatedProcessingTime * remainingProgress) / 100;

  return Math.max(1, Math.round(remainingTime));
}

export async function POST(request: NextRequest) {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const userId = formData.get('userId') as string;
    const projectId = formData.get('projectId') as string || 'general';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!audioFile.type.includes('audio')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an audio file.' },
        { status: 400 }
      );
    }

    const fileSize = audioFile.size;
    const fileExtension = audioFile.name.split('.').pop() || 'unknown';
    const estimatedDuration = estimateAudioDuration(fileSize, fileExtension);

    // Initialize progress tracking
    progressStore.set(jobId, {
      progress: 0,
      eta: calculateETA(fileSize, estimatedDuration, 0),
      status: 'initializing',
      startTime: Date.now(),
      fileSize,
      duration: estimatedDuration
    });

    console.log(`[AUDIO] Starting transcription job ${jobId} for ${audioFile.name} (${(fileSize/1024/1024).toFixed(1)}MB, ~${estimatedDuration}s)`);

    // Process asynchronously and update progress
    processAudioWithProgress(audioFile, userId, projectId, jobId);

    return NextResponse.json({
      success: true,
      jobId,
      estimatedDuration,
      fileSize,
      filename: audioFile.name
    });

  } catch (error: any) {
    console.error('[AUDIO] Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to start transcription', details: error.message },
      { status: 500 }
    );
  }
}

async function processAudioWithProgress(
  audioFile: File,
  userId: string,
  projectId: string,
  jobId: string
) {
  try {
    const progress = progressStore.get(jobId);
    if (!progress) return;

    // Update progress: File preparation
    updateProgress(jobId, 5, 'preparing_file');

    // Convert File to Buffer for OpenAI
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    updateProgress(jobId, 15, 'uploading_to_whisper');

    // Create a File object that OpenAI expects
    const file = new File([buffer], audioFile.name, {
      type: audioFile.type,
    });

    updateProgress(jobId, 25, 'transcribing');

    // Start transcription with progress simulation
    const transcriptionPromise = openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
    });

    // Simulate progress during transcription
    const progressInterval = setInterval(() => {
      const currentProgress = progressStore.get(jobId);
      if (currentProgress && currentProgress.progress < 85) {
        const increment = Math.random() * 8 + 2; // 2-10% increments
        const newProgress = Math.min(85, currentProgress.progress + increment);
        updateProgress(jobId, newProgress, 'transcribing');
      }
    }, 2000);

    const transcription = await transcriptionPromise;
    clearInterval(progressInterval);

    updateProgress(jobId, 90, 'saving_to_database');

    // Store transcription in database
    const { data: storedTranscription, error: dbError } = await supabase
      .from('audio_transcriptions')
      .insert({
        user_id: userId,
        project_id: projectId,
        filename: audioFile.name,
        file_size: audioFile.size,
        duration: transcription.duration,
        text: transcription.text,
        segments: transcription.segments,
        language: transcription.language,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('[AUDIO] Database error:', dbError);
    }

    updateProgress(jobId, 95, 'generating_embeddings');

    // Generate embeddings for RAG system
    if (transcription.text) {
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: transcription.text
      });

      await supabase
        .from('memory_vectors')
        .insert({
          user_id: userId,
          content: transcription.text,
          embedding: embedding.data[0].embedding,
          metadata: {
            type: 'audio_transcription',
            filename: audioFile.name,
            project_id: projectId,
            duration: transcription.duration
          }
        });
    }

    // Complete
    progressStore.set(jobId, {
      ...progress,
      progress: 100,
      eta: 0,
      status: 'completed',
      //@ts-ignore
      result: {
        text: transcription.text,
        duration: transcription.duration,
        language: transcription.language,
        segments: transcription.segments,
        filename: audioFile.name,
        id: storedTranscription?.id
      }
    });

    console.log(`[AUDIO] Transcription job ${jobId} completed successfully`);

  } catch (error: any) {
    console.error(`[AUDIO] Job ${jobId} failed:`, error);
    const progress = progressStore.get(jobId);
    if (progress) {
      progressStore.set(jobId, {
        ...progress,
        progress: 0,
        eta: 0,
        status: 'failed',
        //@ts-ignore
        error: error.message
      });
    }
  }
}

function updateProgress(jobId: string, newProgress: number, status: string) {
  const progress = progressStore.get(jobId);
  if (!progress) return;

  const eta = calculateETA(
    progress.fileSize,
    progress.duration || 60,
    newProgress
  );

  progressStore.set(jobId, {
    ...progress,
    progress: Math.round(newProgress),
    eta,
    status
  });
}

// GET endpoint to check progress
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID required' },
        { status: 400 }
      );
    }

    const progress = progressStore.get(jobId);

    if (!progress) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Clean up completed jobs after 5 minutes
    if (progress.status === 'completed' || progress.status === 'failed') {
      const age = Date.now() - progress.startTime;
      if (age > 5 * 60 * 1000) { // 5 minutes
        progressStore.delete(jobId);
      }
    }

    return NextResponse.json({
      success: true,
      jobId,
      progress: progress.progress,
      eta: progress.eta,
      status: progress.status,
      //@ts-ignore
      result: progress.result || null,
      //@ts-ignore
      error: progress.error || null
    });

  } catch (error: any) {
    console.error('[AUDIO] Progress check error:', error);
    return NextResponse.json(
      { error: 'Failed to check progress' },
      { status: 500 }
    );
  }
}