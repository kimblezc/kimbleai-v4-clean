// app/api/transcribe/assemblyai/route.ts
// AssemblyAI transcription with advanced features and auto-tagging

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AudioAutoTagger, TranscriptAnalysis } from '@/lib/audio-auto-tagger';
import { BackgroundIndexer } from '@/lib/background-indexer';
import { zapierClient } from '@/lib/zapier-client';
import { costMonitor } from '@/lib/cost-monitor';
import { uploadTranscriptionToDrive, GoogleDriveHelpers } from '@/lib/google-drive-uploader';

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

// Helper function to format timestamp in milliseconds to HH:MM:SS
function formatTimestamp(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function uploadToAssemblyAIStream(audioFile: File): Promise<string> {
  // Convert File to ArrayBuffer for upload (Vercel-compatible)
  const arrayBuffer = await audioFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadResponse = await fetch(`${ASSEMBLYAI_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      'authorization': ASSEMBLYAI_API_KEY,
      'content-type': 'application/octet-stream',
    },
    body: buffer,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Upload failed (${uploadResponse.status}): ${errorText}`);
  }

  const uploadData = await uploadResponse.json();
  return uploadData.upload_url;
}

async function startTranscription(audioUrl: string): Promise<string> {
  // COST-OPTIMIZED: Use minimal features to reduce costs
  // Base transcription: $0.37/hour vs full features: $0.65+/hour
  const transcriptRequest = {
    audio_url: audioUrl,
    speaker_labels: true,          // Essential: $0.04/hour - Speaker diarization
    // auto_chapters: true,        // DISABLED: Save $0.03/hour
    // sentiment_analysis: true,   // DISABLED: Save $0.02/hour
    // entity_detection: true,     // DISABLED: Save $0.08/hour
    // iab_categories: true,       // DISABLED: Save $0.15/hour
    // content_safety_labels: true, // DISABLED: Save $0.02/hour
    // auto_highlights: true,      // DISABLED: Save $0.03/hour
    // summarization: true,        // DISABLED: Save $0.03/hour
    // Cost: ~$0.41/hour instead of $0.65+/hour (37% savings)
  };

  const response = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript`, {
    method: 'POST',
    headers: {
      'authorization': ASSEMBLYAI_API_KEY,
      'content-type': 'application/json',
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
      'authorization': ASSEMBLYAI_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Status check failed: ${response.statusText}`);
  }

  return response.json();
}

// Auto-tagging helper function
async function performAutoTagging(
  transcriptionId: string,
  text: string,
  utterances: any[],
  metadata: any,
  userId: string,
  projectId: string
): Promise<TranscriptAnalysis> {
  try {
    console.log(`[AutoTagging] Analyzing transcription ${transcriptionId}`);

    // Perform auto-tagging analysis
    const analysis = AudioAutoTagger.analyzeTranscript(text, utterances, metadata);

    console.log(`[AutoTagging] Analysis complete:`, {
      tags: analysis.tags.length,
      actionItems: analysis.actionItems.length,
      topics: analysis.keyTopics.length,
      category: analysis.projectCategory,
      importance: analysis.importanceScore
    });

    // Generate embedding and store in knowledge base (async)
    storeTranscriptInKnowledgeBase(
      transcriptionId,
      userId,
      projectId,
      text,
      analysis
    ).catch(error => {
      console.error('[AutoTagging] Failed to store in knowledge base:', error);
    });

    // Trigger BackgroundIndexer for embedding generation (async)
    const indexer = BackgroundIndexer.getInstance();
    indexer.indexMessage(
      transcriptionId,
      transcriptionId, // Using transcription ID as conversation ID
      userId,
      'user', // Audio transcriptions are user content
      text,
      projectId
    ).catch(error => {
      console.error('[AutoTagging] Background indexing failed:', error);
    });

    return analysis;
  } catch (error: any) {
    console.error('[AutoTagging] Analysis failed:', error);
    throw error;
  }
}

// Store transcription in knowledge base with vector embeddings
async function storeTranscriptInKnowledgeBase(
  transcriptionId: string,
  userId: string,
  projectId: string,
  text: string,
  analysis: TranscriptAnalysis
): Promise<void> {
  try {
    // Generate embedding from transcription text
    const embedding = await generateEmbedding(text, userId);

    if (!embedding) {
      console.warn('[AutoTagging] Failed to generate embedding');
      return;
    }

    // Store in knowledge base
    const { error } = await supabase
      .from('knowledge_base')
      .insert({
        user_id: userId,
        source_type: 'audio_transcription',
        source_id: transcriptionId,
        category: 'audio',
        title: `Audio Transcription - ${analysis.projectCategory}`,
        content: text.substring(0, 8000), // Limit content size
        embedding: embedding,
        importance: analysis.importanceScore,
        tags: analysis.tags,
        metadata: {
          project_id: projectId,
          project_category: analysis.projectCategory,
          action_items: analysis.actionItems,
          key_topics: analysis.keyTopics,
          sentiment: analysis.sentiment,
          speaker_insights: analysis.speakerInsights,
          extracted_entities: analysis.extractedEntities,
          auto_tagged: true,
          indexed_at: new Date().toISOString()
        }
      });

    if (error) {
      console.error('[AutoTagging] Failed to store in knowledge base:', error);
    } else {
      console.log(`[AutoTagging] Stored transcription ${transcriptionId} in knowledge base`);
    }
  } catch (error) {
    console.error('[AutoTagging] Knowledge base storage error:', error);
  }
}

// Helper function to generate embeddings
async function generateEmbedding(text: string, userId?: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000),
        dimensions: 1536
      })
    });

    if (!response.ok) return null;

    const data = await response.json();

    // COST TRACKING: Track embedding generation
    if (userId && data.usage) {
      const embeddingCost = costMonitor.calculateCost('text-embedding-3-small', data.usage.total_tokens || 0, 0);
      await costMonitor.trackAPICall({
        user_id: userId,
        model: 'text-embedding-3-small',
        endpoint: '/api/transcribe/assemblyai/embedding',
        input_tokens: data.usage.total_tokens || 0,
        output_tokens: 0,
        cost_usd: embeddingCost,
        timestamp: new Date().toISOString(),
        metadata: {
          text_length: text.length,
          purpose: 'transcription_knowledge_base'
        },
      });
      console.log(`[CostMonitor] Tracked embedding: $${embeddingCost.toFixed(6)}`);
    }

    return data.data[0].embedding;
  } catch (error) {
    console.error('[AutoTagging] Embedding generation failed:', error);
    return null;
  }
}

// Daily usage tracking to prevent cost overruns
const dailyUsage = new Map<string, { hours: number, cost: number, date: string }>();

async function checkDailyLimits(userId: string, estimatedHours: number): Promise<{ allowed: boolean, message?: string }> {
  const today = new Date().toISOString().split('T')[0];

  // Get actual usage from database instead of in-memory cache
  const { data: transcriptions } = await supabase
    .from('audio_transcriptions')
    .select('duration')
    .eq('user_id', userId)
    .gte('created_at', today + 'T00:00:00Z');

  // Calculate actual usage from database
  const totalSeconds = (transcriptions || []).reduce((sum, t) => sum + (t.duration || 0), 0);
  const usedHours = totalSeconds / 3600;
  const usedCost = usedHours * 0.41;

  const DAILY_HOUR_LIMIT = 50; // Max 50 hours per day
  const DAILY_COST_LIMIT = 25.00; // $25 daily cost limit

  const newHours = usedHours + estimatedHours;
  const newCost = usedCost + (estimatedHours * 0.41); // $0.41/hour with minimal features

  console.log(`[ASSEMBLYAI] Daily usage check - Used: ${usedHours.toFixed(2)}h ($${usedCost.toFixed(2)}), New file: ${estimatedHours.toFixed(2)}h, Total would be: ${newHours.toFixed(2)}h ($${newCost.toFixed(2)})`);

  if (newHours > DAILY_HOUR_LIMIT) {
    return {
      allowed: false,
      message: `Daily limit exceeded. You've used ${usedHours.toFixed(1)}h today (limit: ${DAILY_HOUR_LIMIT}h). This file would add ${estimatedHours.toFixed(1)}h.`
    };
  }

  if (newCost > DAILY_COST_LIMIT) {
    return {
      allowed: false,
      message: `Daily cost limit exceeded. Today's cost: $${usedCost.toFixed(2)} (limit: $${DAILY_COST_LIMIT}). This file would add $${(estimatedHours * 0.41).toFixed(2)}.`
    };
  }

  return { allowed: true };
}

// Force route to be dynamic and increase timeout
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const jobId = `assemblyai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Verify API key is configured
    if (!ASSEMBLYAI_API_KEY) {
      console.error('[ASSEMBLYAI] API key not configured');
      return NextResponse.json(
        { error: 'AssemblyAI API key not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const contentType = request.headers.get('content-type');

    // Check if this is a direct URL submission (for large files uploaded client-side)
    if (contentType?.includes('application/json')) {
      const body = await request.json();
      const { audioUrl, userId, projectId, filename, fileSize } = body;

      if (!audioUrl) {
        return NextResponse.json(
          { error: 'No audio URL provided' },
          { status: 400 }
        );
      }

      console.log(`[ASSEMBLYAI] Starting transcription for pre-uploaded file: ${filename}, size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

      // Estimate audio duration and cost
      const fileSizeMB = fileSize / (1024 * 1024);
      const estimatedHours = fileSizeMB / 30; // Rough estimate: 30MB per hour
      const estimatedCost = estimatedHours * 0.41;

      // COST MONITORING: Check budget limits BEFORE processing
      const budgetCheck = await costMonitor.enforceApiCallBudget(userId, '/api/transcribe/assemblyai');
      if (!budgetCheck.allowed) {
        console.error(`[CostMonitor] Transcription blocked for user ${userId}: ${budgetCheck.reason}`);
        return NextResponse.json({
          error: 'Daily spending limit reached',
          details: budgetCheck.reason,
          action: 'Please try again tomorrow or contact support to increase your limit.',
          costMonitoringActive: true
        }, { status: 429 });
      }

      // Check daily limits (legacy check - will be replaced by cost monitor)
      const limitCheck = await checkDailyLimits(userId, estimatedHours);
      if (!limitCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Daily usage limit exceeded',
            details: limitCheck.message,
            estimatedCost: `$${estimatedCost.toFixed(2)}`,
            estimatedHours: `${estimatedHours.toFixed(1)}h`
          },
          { status: 429 }
        );
      }

      console.log(`[ASSEMBLYAI] Starting job ${jobId}`);

      // Initialize job tracking
      jobStore.set(jobId, {
        status: 'starting',
        progress: 25,
        eta: Math.round(fileSizeMB * 0.5 * 60), // ~30 sec per MB
        startTime: Date.now()
      });

      // Create initial database record BEFORE returning response
      // This ensures cross-instance polling can find the job
      const { error: insertError } = await supabase
        .from('audio_transcriptions')
        .insert({
          job_id: jobId,
          user_id: userId,
          project_id: projectId || 'general',
          filename: filename,
          file_size: fileSize,
          text: '',
          status: 'starting',
          progress: 25,
          metadata: {}
        });

      if (insertError) {
        console.error('[ASSEMBLYAI] Failed to create database record:', insertError);
      }

      // Process in background with pre-uploaded URL
      processAssemblyAIFromUrl(audioUrl, filename, fileSize, userId, projectId || 'general', jobId);

      return NextResponse.json({
        success: true,
        jobId,
        service: 'AssemblyAI',
        features: ['speaker_diarization']
      });
    }

    // Legacy: Handle small files uploaded through the API route (not recommended for >4MB)
    let formData;
    try {
      formData = await request.formData();
    } catch (parseError: any) {
      console.error('[ASSEMBLYAI] Failed to parse formData:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse audio file. File may be too large or corrupted. For files over 4MB, the system should use direct upload.' },
        { status: 400 }
      );
    }

    const audioFile = formData.get('audio') as File;
    const userId = formData.get('userId') as string;
    const projectId = formData.get('projectId') as string || 'general';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log(`[ASSEMBLYAI] Received file via upload: ${audioFile.name}, size: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB, type: ${audioFile.type}`);

    const fileSizeMB = audioFile.size / (1024 * 1024);

    // Estimate audio duration and cost
    const estimatedHours = fileSizeMB / 30; // Rough estimate: 30MB per hour
    const estimatedCost = estimatedHours * 0.41;

    // Check daily limits BEFORE processing
    const limitCheck = await checkDailyLimits(userId, estimatedHours);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Daily usage limit exceeded',
          details: limitCheck.message,
          estimatedCost: `$${estimatedCost.toFixed(2)}`,
          estimatedHours: `${estimatedHours.toFixed(1)}h`
        },
        { status: 429 }
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

    // Provide helpful error messages
    let errorMessage = 'Failed to start AssemblyAI transcription';
    let details = error.message;

    if (error.message?.includes('fetch')) {
      errorMessage = 'Network error while connecting to transcription service';
      details = 'Please check your internet connection and try again. If the problem persists, the file may be too large or in an unsupported format.';
    } else if (error.message?.includes('413') || error.message?.includes('too large')) {
      errorMessage = 'File too large';
      details = 'Please use a smaller audio file (under 50MB) or compress your audio.';
    }

    return NextResponse.json(
      { error: errorMessage, details },
      { status: 500 }
    );
  }
}

// New function for pre-uploaded URLs (bypasses Vercel upload limits)
async function processAssemblyAIFromUrl(audioUrl: string, filename: string, fileSize: number, userId: string, projectId: string, jobId: string) {
  try {
    // Database record already created in POST handler before this function is called
    // Update: Starting transcription (skip upload since it's already done)
    updateJobStatus(jobId, 30, 'starting_transcription');

    const transcriptId = await startTranscription(audioUrl);

    // Store AssemblyAI ID in database for status tracking
    await supabase
      .from('audio_transcriptions')
      .update({
        assemblyai_id: transcriptId,
        status: 'processing',
        progress: 35
      })
      .eq('job_id', jobId);

    // Store AssemblyAI ID for status tracking (legacy in-memory)
    const job = jobStore.get(jobId);
    if (job) {
      job.assemblyai_id = transcriptId;
      jobStore.set(jobId, job);
    }

    // Poll for completion
    let result;
    let attempts = 0;
    const maxAttempts = 2880; // 4 hours max (5 sec intervals) - supports up to ~8 hour audio files

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      result = await checkTranscriptionStatus(transcriptId);

      if (result.status === 'completed') {
        break;
      } else if (result.status === 'error') {
        throw new Error(result.error);
      }

      // Update progress based on status
      let progress = 30;
      if (result.status === 'processing' || result.status === 'queued') {
        progress = 30 + (attempts * 60) / maxAttempts; // 30-90%
      }

      updateJobStatus(jobId, Math.min(progress, 90), result.status);
      attempts++;
    }

    if (!result || result.status !== 'completed') {
      throw new Error('Transcription timed out or failed');
    }

    // Perform auto-tagging analysis
    updateJobStatus(jobId, 92, 'analyzing');
    let autoTagAnalysis: TranscriptAnalysis | undefined;

    try {
      autoTagAnalysis = await performAutoTagging(
        result.id || jobId, // Use AssemblyAI ID or fallback to jobId
        result.text,
        result.utterances || [],
        {
          speaker_labels: result.speaker_labels,
          words: result.words
        },
        userId,
        projectId
      );
      console.log(`[ASSEMBLYAI] Auto-tagging complete for ${jobId}`);
    } catch (tagError: any) {
      console.error('[ASSEMBLYAI] Auto-tagging failed:', tagError);
      // Continue even if auto-tagging fails
    }

    // Save to database with enhanced metadata
    updateJobStatus(jobId, 95, 'saving');

    // Update the existing job record with final results
    const { data: transcriptionData, error: saveError } = await supabase
      .from('audio_transcriptions')
      .update({
        project_id: autoTagAnalysis?.projectCategory || projectId,
        duration: result.audio_duration,
        text: result.text,
        status: 'completed',
        progress: 100,
        service: 'assemblyai',
        metadata: {
          assemblyai_id: result.id,
          speaker_labels: result.speaker_labels,
          utterances: result.utterances,
          words: result.words,
          // Auto-tagging results
          auto_tags: autoTagAnalysis?.tags || [],
          action_items: autoTagAnalysis?.actionItems || [],
          key_topics: autoTagAnalysis?.keyTopics || [],
          speaker_insights: autoTagAnalysis?.speakerInsights,
          sentiment: autoTagAnalysis?.sentiment,
          importance_score: autoTagAnalysis?.importanceScore,
          extracted_entities: autoTagAnalysis?.extractedEntities,
          auto_tagged_at: new Date().toISOString()
        }
      })
      .eq('job_id', jobId)
      .select()
      .single();

    let dbId = transcriptionData?.id || null;

    if (saveError) {
      console.error('[ASSEMBLYAI] Database update error:', saveError);
      console.error('[ASSEMBLYAI] Error details:', JSON.stringify(saveError));

      // If database update failed, try to find the job record
      const { data: existingTranscription } = await supabase
        .from('audio_transcriptions')
        .select('id')
        .eq('job_id', jobId)
        .single();

      if (existingTranscription) {
        dbId = existingTranscription.id;
        console.log('[ASSEMBLYAI] Found existing transcription with ID:', dbId);
      }
    } else {
      console.log('[ASSEMBLYAI] Updated database record with ID:', dbId);
    }

    // COST TRACKING: Track transcription cost
    try {
      const audioDurationHours = result.audio_duration / 3600; // Convert seconds to hours
      const transcriptionCost = audioDurationHours * 0.41; // $0.41 per hour with speaker diarization

      await costMonitor.trackAPICall({
        user_id: userId,
        model: 'assemblyai-transcription',
        endpoint: '/api/transcribe/assemblyai',
        input_tokens: 0, // Not applicable for transcription
        output_tokens: 0, // Not applicable for transcription
        cost_usd: transcriptionCost,
        timestamp: new Date().toISOString(),
        metadata: {
          audio_duration_seconds: result.audio_duration,
          audio_duration_hours: audioDurationHours,
          file_size_bytes: fileSize,
          filename: filename,
          speaker_count: result.utterances?.length || 0,
          transcription_id: dbId || result.id
        },
      });
      console.log(`[CostMonitor] Tracked transcription: ${audioDurationHours.toFixed(2)}h = $${transcriptionCost.toFixed(4)}`);
    } catch (costError) {
      console.error('[CostMonitor] Failed to track transcription cost:', costError);
      // Continue even if cost tracking fails
    }

    // GOOGLE DRIVE INTEGRATION: Upload transcription outputs to Google Drive
    try {
      console.log(`[GoogleDrive] Starting upload for transcription ${jobId}`);

      // Generate SRT subtitles from utterances
      const srtSubtitles = GoogleDriveHelpers.generateSRT(result.utterances || []);

      // Prepare outputs for upload
      const outputs = {
        transcriptText: result.text,
        speakerLabeled: {
          transcription_id: result.id || jobId,
          audio_duration: result.audio_duration,
          utterances: result.utterances || [],
          speaker_count: result.utterances?.length || 0
        },
        srtSubtitles: srtSubtitles,
        metadata: {
          transcription_id: result.id || jobId,
          filename: filename,
          file_size_bytes: fileSize,
          audio_duration_seconds: result.audio_duration,
          audio_duration_hours: audioDurationHours,
          speaker_count: result.utterances?.length || 0,
          cost_usd: transcriptionCost,
          service: 'assemblyai',
          created_at: new Date().toISOString(),
          auto_tags: autoTagAnalysis?.tags || [],
          action_items: autoTagAnalysis?.actionItems || [],
          key_topics: autoTagAnalysis?.keyTopics || [],
          project_category: autoTagAnalysis?.projectCategory,
          importance_score: autoTagAnalysis?.importanceScore
        }
      };

      // Upload to Google Drive (async, non-blocking)
      uploadTranscriptionToDrive(filename, result.id || jobId, outputs)
        .then((driveResult) => {
          if (driveResult.success) {
            const successCount = driveResult.uploads.filter(u => u.success).length;
            console.log(`[GoogleDrive] Upload complete: ${successCount}/${driveResult.uploads.length} files uploaded`);

            // Log each uploaded file
            driveResult.uploads.forEach((upload) => {
              if (upload.success) {
                console.log(`[GoogleDrive] ✓ ${upload.fileName} (ID: ${upload.fileId})`);
              } else {
                console.log(`[GoogleDrive] ✗ ${upload.fileName || 'unknown'} - ${upload.error}`);
              }
            });
          } else {
            console.log(`[GoogleDrive] Upload skipped or failed: ${driveResult.error}`);
          }
        })
        .catch((driveError) => {
          console.error('[GoogleDrive] Upload error:', driveError);
          // Don't fail the transcription if Google Drive upload fails
        });
    } catch (driveError: any) {
      console.error('[GoogleDrive] Failed to prepare upload:', driveError);
      // Continue even if Google Drive upload fails
    }

    // CONVERSATION CREATION: Save transcription to conversation history
    try {
      console.log('[CONVERSATION] Creating conversation for transcription...');
      console.log('[CONVERSATION] User ID:', userId, 'Project ID:', projectId, 'Filename:', filename);

      // Get user data to ensure proper UUID format
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email')
        .or(`id.eq.${userId},name.ilike.${userId},email.ilike.${userId}`)
        .single();

      if (userError || !userData) {
        console.error('[CONVERSATION] User lookup failed:', userError);
        console.error('[CONVERSATION] Attempted userId:', userId);
        throw new Error(`User not found for userId: ${userId}`);
      }

      const actualUserId = userData.id; // Use UUID
      console.log('[CONVERSATION] Found user:', userData.email, 'UUID:', actualUserId);

      // Generate conversation ID
      const conversationId = `conv_transcription_${Date.now()}_${jobId.substring(0, 8)}`;

      // Format speaker-labeled transcript for conversation
      const speakerTranscript = result.utterances && result.utterances.length > 0
        ? result.utterances
            .map((u: any, idx: number) =>
              `[${formatTimestamp(u.start)}] Speaker ${u.speaker}: ${u.text}`
            )
            .join('\n\n')
        : result.text;

      // Create conversation title from filename
      const conversationTitle = `Audio Transcription: ${filename}`;

      // Validate project_id exists if provided
      let validProjectId = null;
      if (projectId && projectId !== 'general') {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id')
          .eq('id', projectId)
          .single();

        if (projectError) {
          console.warn('[CONVERSATION] Project validation failed:', projectError);
          console.warn('[CONVERSATION] Using null project_id instead of:', projectId);
        } else {
          validProjectId = projectId;
        }
      }

      console.log('[CONVERSATION] Creating conversation with ID:', conversationId);
      console.log('[CONVERSATION] Title:', conversationTitle);
      console.log('[CONVERSATION] User UUID:', actualUserId);
      console.log('[CONVERSATION] Project ID:', validProjectId);

      // Create conversation record
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          id: conversationId,
          user_id: actualUserId, // Use UUID instead of string
          title: conversationTitle,
          project_id: validProjectId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (convError) {
        console.error('[CONVERSATION] Failed to create conversation:', convError);
        console.error('[CONVERSATION] Conversation data:', JSON.stringify({
          id: conversationId,
          user_id: actualUserId,
          title: conversationTitle,
          project_id: validProjectId
        }));
        throw convError;
      }

      console.log('[CONVERSATION] Conversation created successfully:', conversationId);

      // Generate embedding for transcription (for semantic search)
      let transcriptEmbedding: number[] | null = null;
      try {
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: result.text.substring(0, 8000) // Limit to 8000 chars for embedding
          })
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          transcriptEmbedding = embeddingData.data[0].embedding;
          console.log('[CONVERSATION] Embedding generated successfully');
        }
      } catch (embError) {
        console.error('[CONVERSATION] Embedding generation failed (continuing anyway):', embError);
      }

      // Create message record with speaker-labeled content
      const messageContent = `# Audio Transcription\n\n**File:** ${filename}\n**Duration:** ${Math.floor(result.audio_duration / 60)}m ${Math.floor(result.audio_duration % 60)}s\n**Speakers:** ${result.utterances?.length || 0} detected\n**Service:** AssemblyAI with Speaker Diarization\n\n---\n\n## Transcript\n\n${speakerTranscript}`;

      console.log('[CONVERSATION] Creating message in conversation:', conversationId);
      console.log('[CONVERSATION] Message length:', messageContent.length, 'chars');
      console.log('[CONVERSATION] Embedding:', transcriptEmbedding ? 'generated' : 'null');

      const { data: messageData, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: actualUserId, // Use UUID instead of string
          role: 'assistant',
          content: messageContent,
          embedding: transcriptEmbedding,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (msgError) {
        console.error('[CONVERSATION] Failed to create message:', msgError);
        console.error('[CONVERSATION] Message data:', JSON.stringify({
          conversation_id: conversationId,
          user_id: actualUserId,
          role: 'assistant',
          content_length: messageContent.length
        }));
        throw msgError;
      }

      console.log('[CONVERSATION] Message created successfully with ID:', messageData?.id);
      console.log('[CONVERSATION] Transcription now in chat history! Conversation ID:', conversationId);

    } catch (conversationError: any) {
      console.error('[CONVERSATION] Failed to save to conversation history:', conversationError);
      // Continue even if conversation creation fails (transcription still saved to audio_transcriptions table)
    }

    // Complete
    const finalJob = jobStore.get(jobId);
    if (finalJob) {
      // Use database ID if available, otherwise use AssemblyAI ID
      const resultId = dbId || result.id;
      console.log('[ASSEMBLYAI] Setting result with ID:', resultId, '(dbId:', dbId, ', assemblyaiId:', result.id, ')');
      console.log('[ASSEMBLYAI] Utterances count:', result.utterances?.length || 0);

      jobStore.set(jobId, {
        ...finalJob,
        status: 'completed',
        progress: 100,
        eta: 0,
        result: {
          text: result.text,
          duration: result.audio_duration,
          speakers: result.utterances?.length || 0,
          utterances: result.utterances || [],
          words: result.words || [],
          filename: filename,
          fileSize: fileSize,
          id: resultId,
          assemblyaiId: result.id
        }
      });
      console.log('[ASSEMBLYAI] Job completed, result:', JSON.stringify({
        id: dbId,
        utterancesCount: result.utterances?.length || 0,
        duration: result.audio_duration
      }));
    }

    // COST TRACKING: Track AssemblyAI transcription cost
    const audioDurationHours = (result.audio_duration || 0) / 3600; // Convert seconds to hours
    const transcriptionCost = audioDurationHours * 0.41; // $0.41/hour with minimal features

    await costMonitor.trackAPICall({
      user_id: userId,
      model: 'assemblyai-transcription',
      endpoint: '/api/transcribe/assemblyai',
      input_tokens: 0, // Not token-based
      output_tokens: 0,
      cost_usd: transcriptionCost,
      timestamp: new Date().toISOString(),
      metadata: {
        filename: filename,
        fileSize: fileSize,
        duration_seconds: result.audio_duration,
        duration_hours: audioDurationHours,
        speakers: result.utterances?.length || 0,
        project_id: projectId,
        job_id: jobId,
      },
    });

    console.log(`[CostMonitor] Tracked AssemblyAI transcription: $${transcriptionCost.toFixed(4)} (${audioDurationHours.toFixed(2)}h)`);
    console.log(`[ASSEMBLYAI] Job ${jobId} completed successfully`);

    // ZAPIER INTEGRATION: Send transcription complete webhook (async, non-blocking)
    if (autoTagAnalysis) {
      const hasUrgentTag = zapierClient.detectUrgentTag(result.text, autoTagAnalysis.tags);

      zapierClient.sendTranscriptionComplete(
        userId,
        result.id || jobId,
        result.text,
        autoTagAnalysis.actionItems,
        autoTagAnalysis.tags,
        {
          filename,
          fileSize,
          duration: result.audio_duration,
          speakers: result.utterances?.length || 0,
          projectCategory: autoTagAnalysis.projectCategory,
          importanceScore: autoTagAnalysis.importanceScore,
          hasUrgentTag
        }
      ).catch(error => {
        console.error('[Zapier] Failed to send transcription complete webhook:', error);
      });

      // Send urgent notification if detected
      if (hasUrgentTag) {
        zapierClient.sendUrgentNotification(
          userId,
          'Urgent Transcription Detected',
          `Transcription contains urgent items: ${autoTagAnalysis.actionItems.slice(0, 3).join(', ')}`,
          'transcription',
          {
            transcriptionId: result.id || jobId,
            filename
          }
        ).catch(error => {
          console.error('[Zapier] Failed to send urgent notification:', error);
        });
      }
    }

  } catch (error: any) {
    console.error(`[ASSEMBLYAI] Job ${jobId} failed:`, error);

    // Update database with error status
    await supabase
      .from('audio_transcriptions')
      .update({
        status: 'error',
        progress: 0,
        error: error.message
      })
      .eq('job_id', jobId);

    // Update in-memory job store (legacy)
    const job = jobStore.get(jobId);
    if (job) {
      jobStore.set(jobId, {
        ...job,
        status: 'error',
        progress: 0,
        eta: 0,
        error: error.message
      });
    }
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

    // Perform auto-tagging analysis
    updateJobStatus(jobId, 87, 'analyzing');
    let autoTagAnalysis: TranscriptAnalysis | undefined;

    try {
      autoTagAnalysis = await performAutoTagging(
        result.id || jobId,
        result.text,
        result.utterances || [],
        {
          speaker_labels: result.speaker_labels,
          chapters: result.chapters,
          sentiment_analysis_results: result.sentiment_analysis_results,
          entities: result.entities
        },
        userId,
        projectId
      );
      console.log(`[ASSEMBLYAI] Auto-tagging complete for ${jobId}`);
    } catch (tagError: any) {
      console.error('[ASSEMBLYAI] Auto-tagging failed:', tagError);
      // Continue even if auto-tagging fails
    }

    // Save to database with enhanced metadata
    updateJobStatus(jobId, 90, 'saving');

    const { data: transcriptionData, error: saveError } = await supabase
      .from('audio_transcriptions')
      .insert({
        user_id: userId,
        project_id: autoTagAnalysis?.projectCategory || projectId,
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
          summary: result.summary,
          // Auto-tagging results
          auto_tags: autoTagAnalysis?.tags || [],
          action_items: autoTagAnalysis?.actionItems || [],
          key_topics: autoTagAnalysis?.keyTopics || [],
          speaker_insights: autoTagAnalysis?.speakerInsights,
          sentiment: autoTagAnalysis?.sentiment,
          importance_score: autoTagAnalysis?.importanceScore,
          extracted_entities: autoTagAnalysis?.extractedEntities,
          auto_tagged_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('[ASSEMBLYAI] Database save error:', saveError);
    } else {
      console.log('[ASSEMBLYAI] Saved to database with ID:', transcriptionData?.id);
    }

    // COST TRACKING: Track transcription cost
    try {
      const audioDurationHours = result.audio_duration / 3600; // Convert seconds to hours
      const transcriptionCost = audioDurationHours * 0.41; // $0.41 per hour with speaker diarization

      await costMonitor.trackAPICall({
        user_id: userId,
        model: 'assemblyai-transcription',
        endpoint: '/api/transcribe/assemblyai',
        input_tokens: 0, // Not applicable for transcription
        output_tokens: 0, // Not applicable for transcription
        cost_usd: transcriptionCost,
        timestamp: new Date().toISOString(),
        metadata: {
          audio_duration_seconds: result.audio_duration,
          audio_duration_hours: audioDurationHours,
          file_size_bytes: audioFile.size,
          filename: audioFile.name,
          speaker_count: result.speaker_labels?.length || 0,
          transcription_id: transcriptionData?.id
        },
      });
      console.log(`[CostMonitor] Tracked transcription: ${audioDurationHours.toFixed(2)}h = $${transcriptionCost.toFixed(4)}`);
    } catch (costError) {
      console.error('[CostMonitor] Failed to track transcription cost:', costError);
      // Continue even if cost tracking fails
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
          utterances: result.utterances || [],
          words: result.words || [],
          chapters: result.chapters?.length || 0,
          summary: result.summary,
          sentiment: result.sentiment_analysis_results,
          entities: result.entities,
          filename: audioFile.name,
          id: transcriptionData?.id
        }
      });
    }

    // COST TRACKING: Track AssemblyAI transcription cost
    const audioDurationHours = (result.audio_duration || 0) / 3600; // Convert seconds to hours
    const transcriptionCost = audioDurationHours * 0.41; // $0.41/hour with minimal features

    await costMonitor.trackAPICall({
      user_id: userId,
      model: 'assemblyai-transcription',
      endpoint: '/api/transcribe/assemblyai',
      input_tokens: 0, // Not token-based
      output_tokens: 0,
      cost_usd: transcriptionCost,
      timestamp: new Date().toISOString(),
      metadata: {
        filename: audioFile.name,
        fileSize: audioFile.size,
        duration_seconds: result.audio_duration,
        duration_hours: audioDurationHours,
        speakers: result.speaker_labels?.length || 0,
        project_id: projectId,
        job_id: jobId,
      },
    });

    console.log(`[CostMonitor] Tracked AssemblyAI transcription: $${transcriptionCost.toFixed(4)} (${audioDurationHours.toFixed(2)}h)`);
    console.log(`[ASSEMBLYAI] Job ${jobId} completed successfully`);

    // ZAPIER INTEGRATION: Send transcription complete webhook (async, non-blocking)
    if (autoTagAnalysis) {
      const hasUrgentTag = zapierClient.detectUrgentTag(result.text, autoTagAnalysis.tags);

      zapierClient.sendTranscriptionComplete(
        userId,
        result.id || jobId,
        result.text,
        autoTagAnalysis.actionItems,
        autoTagAnalysis.tags,
        {
          filename: audioFile.name,
          fileSize: audioFile.size,
          duration: result.audio_duration,
          speakers: result.speaker_labels?.length || 0,
          projectCategory: autoTagAnalysis.projectCategory,
          importanceScore: autoTagAnalysis.importanceScore,
          hasUrgentTag
        }
      ).catch(error => {
        console.error('[Zapier] Failed to send transcription complete webhook:', error);
      });

      // Send urgent notification if detected
      if (hasUrgentTag) {
        zapierClient.sendUrgentNotification(
          userId,
          'Urgent Transcription Detected',
          `Transcription contains urgent items: ${autoTagAnalysis.actionItems.slice(0, 3).join(', ')}`,
          'transcription',
          {
            transcriptionId: result.id || jobId,
            filename: audioFile.name
          }
        ).catch(error => {
          console.error('[Zapier] Failed to send urgent notification:', error);
        });
      }
    }

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
  // Update in-memory job store (legacy)
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

  // Update database for cross-instance tracking
  supabase
    .from('audio_transcriptions')
    .update({
      status,
      progress: Math.round(progress)
    })
    .eq('job_id', jobId)
    .then(({ error }) => {
      if (error) {
        console.error(`[ASSEMBLYAI] Failed to update job ${jobId} in database:`, error);
      }
    });
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

    // Check database first for cross-instance support
    const { data: dbJob, error: dbError } = await supabase
      .from('audio_transcriptions')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (!dbError && dbJob) {
      console.log(`[ASSEMBLYAI] Found job ${jobId} in database: status=${dbJob.status}, progress=${dbJob.progress}`);

      // If job is in-progress and has assemblyai_id, query AssemblyAI for real-time status
      if (dbJob.assemblyai_id && dbJob.status !== 'completed' && dbJob.status !== 'error') {
        try {
          const assemblyaiStatus = await checkTranscriptionStatus(dbJob.assemblyai_id);

          // Update database with latest status from AssemblyAI
          let newProgress = dbJob.progress || 50;
          let newStatus = dbJob.status || 'processing';

          if (assemblyaiStatus.status === 'completed') {
            newProgress = 100;
            newStatus = 'completed';
          } else if (assemblyaiStatus.status === 'error') {
            newProgress = 0;
            newStatus = 'error';

            await supabase
              .from('audio_transcriptions')
              .update({
                status: 'error',
                error: assemblyaiStatus.error,
                progress: 0
              })
              .eq('job_id', jobId);

            return NextResponse.json({
              success: true,
              jobId,
              progress: 0,
              eta: 0,
              status: 'error',
              result: null,
              error: assemblyaiStatus.error
            });
          } else if (assemblyaiStatus.status === 'processing') {
            // Increment progress slightly for visual feedback
            newProgress = Math.min(dbJob.progress + 5, 90);
            newStatus = 'processing';
          }

          // Update progress in database
          await supabase
            .from('audio_transcriptions')
            .update({
              status: newStatus,
              progress: newProgress
            })
            .eq('job_id', jobId);

          console.log(`[ASSEMBLYAI] Updated job ${jobId} from AssemblyAI: status=${newStatus}, progress=${newProgress}`);

          return NextResponse.json({
            success: true,
            jobId,
            progress: newProgress,
            eta: Math.max(0, (100 - newProgress) * 3),
            status: newStatus,
            result: null,
            error: null
          });
        } catch (assemblyError: any) {
          console.error(`[ASSEMBLYAI] Failed to query AssemblyAI for ${jobId}:`, assemblyError);
          // Fall through to return database status
        }
      }

      // Return database status
      if (dbJob.status === 'completed') {
        return NextResponse.json({
          success: true,
          jobId,
          progress: 100,
          eta: 0,
          status: 'completed',
          result: {
            id: dbJob.id,
            text: dbJob.text,
            duration: dbJob.duration,
            speakers: dbJob.metadata?.utterances?.length || 0,
            utterances: dbJob.metadata?.utterances || [],
            words: dbJob.metadata?.words || [],
            filename: dbJob.filename,
            fileSize: dbJob.file_size,
            metadata: {
              assemblyai_id: dbJob.assemblyai_id || dbJob.metadata?.assemblyai_id
            }
          },
          error: null
        });
      } else if (dbJob.status === 'error') {
        return NextResponse.json({
          success: true,
          jobId,
          progress: 0,
          eta: 0,
          status: 'error',
          result: null,
          error: dbJob.error || 'Transcription failed'
        });
      } else {
        // In progress
        return NextResponse.json({
          success: true,
          jobId,
          progress: dbJob.progress || 30,
          eta: Math.max(0, (100 - (dbJob.progress || 30)) * 3),
          status: dbJob.status || 'processing',
          result: null,
          error: null
        });
      }
    }

    // Try memory as fallback (if same instance)
    const job = jobStore.get(jobId);
    if (job) {
      console.log(`[ASSEMBLYAI] Found job ${jobId} in memory: status=${job.status}, progress=${job.progress}`);

      return NextResponse.json({
        success: true,
        jobId,
        progress: job.progress,
        eta: job.eta,
        status: job.status,
        result: job.result || null,
        error: job.error || null
      });
    }

    // Job not found - check if it's been too long
    console.log(`[ASSEMBLYAI] Job ${jobId} not found in database or memory`);

    // Extract timestamp from jobId (format: assemblyai_{timestamp}_{random})
    const timestampMatch = jobId.match(/assemblyai_(\d+)_/);
    const jobCreatedTime = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();
    const timeSinceCreation = Date.now() - jobCreatedTime;

    // If job not found after 2 minutes, it likely failed to create
    if (timeSinceCreation > 120000) { // 2 minutes
      console.error(`[ASSEMBLYAI] Job ${jobId} not found after ${Math.round(timeSinceCreation/1000)}s - likely failed to create`);
      return NextResponse.json({
        success: false,
        jobId,
        progress: 0,
        eta: 0,
        status: 'error',
        result: null,
        error: 'Transcription job not found. It may have failed to start. Please try uploading again.'
      });
    }

    // Job is new (< 2 minutes), assume it's still starting
    return NextResponse.json({
      success: true,
      jobId,
      progress: 30,
      eta: 120,
      status: 'starting',
      result: null,
      error: null
    });

  } catch (error: any) {
    console.error('[ASSEMBLYAI] Progress check error:', error);
    return NextResponse.json(
      { error: 'Failed to check progress' },
      { status: 500 }
    );
  }
}