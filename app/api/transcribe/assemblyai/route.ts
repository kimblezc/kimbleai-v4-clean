// app/api/transcribe/assemblyai/route.ts
// AssemblyAI transcription with advanced features

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY!;
const ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com/v2';

// Job status tracking
const jobStore = new Map<string, {
  status: string;
  progress: number;
  eta: number;
  assemblyai_id?: string;
  result?: any;
  error?: string;
  startTime: number;
}>();

async function uploadToAssemblyAIStream(audioFile: File): Promise<string> {
  // Convert File to ReadableStream for streaming upload
  const stream = audioFile.stream();

  const uploadResponse = await fetch(`${ASSEMBLYAI_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ASSEMBLYAI_API_KEY}`,
      'Content-Type': 'application/octet-stream',
    },
    body: stream,
    duplex: 'half',
  } as any);

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Upload failed (${uploadResponse.status}): ${errorText}`);
  }

  const uploadData = await uploadResponse.json();
  return uploadData.upload_url;
}

async function startTranscription(audioUrl: string): Promise<string> {
  const transcriptRequest = {
    audio_url: audioUrl,
    speaker_labels: true,          // Speaker diarization
    auto_chapters: true,           // Automatic chapter detection
    sentiment_analysis: true,      // Sentiment analysis
    entity_detection: true,        // Entity detection
    iab_categories: true,          // Topic classification
    content_safety_labels: true,   // Content moderation
    auto_highlights: true,         // Key phrases
    summarization: true,           // Auto summary
    summary_model: 'informative',
    summary_type: 'bullets',
  };

  const response = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ASSEMBLYAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(transcriptRequest),
  });

  if (!response.ok) {
    throw new Error(`Transcription request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}

async function checkTranscriptionStatus(transcriptId: string) {
  const response = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript/${transcriptId}`, {
    headers: {
      'Authorization': `Bearer ${ASSEMBLYAI_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Status check failed: ${response.statusText}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  const jobId = `assemblyai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

    console.log(`[ASSEMBLYAI] Starting job ${jobId} for ${audioFile.name} (${(audioFile.size / 1024 / 1024).toFixed(1)}MB)`);

    // Initialize job tracking
    jobStore.set(jobId, {
      status: 'uploading',
      progress: 0,
      eta: Math.round(audioFile.size / (1024 * 1024) * 2), // ~2 min per MB estimate
      startTime: Date.now()
    });

    // Process in background
    processAssemblyAI(audioFile, userId, projectId, jobId);

    return NextResponse.json({
      success: true,
      jobId,
      service: 'AssemblyAI',
      features: [
        'speaker_diarization',
        'auto_chapters',
        'sentiment_analysis',
        'topic_detection',
        'auto_summary'
      ]
    });

  } catch (error: any) {
    console.error(`[ASSEMBLYAI] Job ${jobId} failed:`, error);
    return NextResponse.json(
      { error: 'Failed to start AssemblyAI transcription', details: error.message },
      { status: 500 }
    );
  }
}

async function processAssemblyAI(audioFile: File, userId: string, projectId: string, jobId: string) {
  try {
    // Update: Uploading
    updateJobStatus(jobId, 10, 'uploading');

    // Stream upload directly to AssemblyAI without loading into memory
    const uploadUrl = await uploadToAssemblyAIStream(audioFile);

    // Update: Starting transcription
    updateJobStatus(jobId, 20, 'transcribing');

    const transcriptId = await startTranscription(uploadUrl);

    // Store AssemblyAI ID for status tracking
    const job = jobStore.get(jobId);
    if (job) {
      job.assemblyai_id = transcriptId;
      jobStore.set(jobId, job);
    }

    // Poll for completion
    let result;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      result = await checkTranscriptionStatus(transcriptId);

      if (result.status === 'completed') {
        break;
      } else if (result.status === 'error') {
        throw new Error(result.error);
      }

      // Update progress based on status
      let progress = 20;
      if (result.status === 'processing') {
        progress = 30 + (attempts * 50) / maxAttempts; // 30-80%
      } else if (result.status === 'completed') {
        progress = 90;
      }

      updateJobStatus(jobId, Math.min(progress, 85), result.status);
      attempts++;
    }

    if (!result || result.status !== 'completed') {
      throw new Error('Transcription timed out or failed');
    }

    // Save to database
    updateJobStatus(jobId, 90, 'saving');

    const { data: transcriptionData, error: saveError } = await supabase
      .from('audio_transcriptions')
      .insert({
        user_id: userId,
        project_id: projectId,
        filename: audioFile.name,
        file_size: audioFile.size,
        duration: result.audio_duration,
        text: result.text,
        service: 'assemblyai',
        metadata: {
          speaker_labels: result.speaker_labels,
          chapters: result.chapters,
          sentiment_analysis_results: result.sentiment_analysis_results,
          entities: result.entities,
          iab_categories_result: result.iab_categories_result,
          auto_highlights_result: result.auto_highlights_result,
          summary: result.summary
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('[ASSEMBLYAI] Database save error:', saveError);
    }

    // Complete
    const finalJob = jobStore.get(jobId);
    if (finalJob) {
      jobStore.set(jobId, {
        ...finalJob,
        status: 'completed',
        progress: 100,
        eta: 0,
        result: {
          text: result.text,
          duration: result.audio_duration,
          speakers: result.speaker_labels?.length || 0,
          chapters: result.chapters?.length || 0,
          summary: result.summary,
          sentiment: result.sentiment_analysis_results,
          entities: result.entities,
          filename: audioFile.name,
          id: transcriptionData?.id
        }
      });
    }

    console.log(`[ASSEMBLYAI] Job ${jobId} completed successfully`);

  } catch (error: any) {
    console.error(`[ASSEMBLYAI] Job ${jobId} failed:`, error);
    const job = jobStore.get(jobId);
    if (job) {
      jobStore.set(jobId, {
        ...job,
        status: 'failed',
        progress: 0,
        eta: 0,
        error: error.message
      });
    }
  }
}

function updateJobStatus(jobId: string, progress: number, status: string) {
  const job = jobStore.get(jobId);
  if (job) {
    const remainingProgress = 100 - progress;
    const eta = Math.round(remainingProgress * 3); // ~3 seconds per percent remaining

    jobStore.set(jobId, {
      ...job,
      progress: Math.round(progress),
      status,
      eta: Math.max(0, eta)
    });
  }
}

// GET endpoint for progress checking
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

    const job = jobStore.get(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Clean up completed jobs after 10 minutes
    if ((job.status === 'completed' || job.status === 'failed') &&
        (Date.now() - job.startTime > 10 * 60 * 1000)) {
      jobStore.delete(jobId);
    }

    return NextResponse.json({
      success: true,
      jobId,
      progress: job.progress,
      eta: job.eta,
      status: job.status,
      result: job.result || null,
      error: job.error || null
    });

  } catch (error: any) {
    console.error('[ASSEMBLYAI] Progress check error:', error);
    return NextResponse.json(
      { error: 'Failed to check progress' },
      { status: 500 }
    );
  }
}