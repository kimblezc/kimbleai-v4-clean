/**
 * Audio Transfer Agent
 * Optimized for m4a audio files - efficient transfer, chunking, and immediate reference
 * Handles large files (up to 2GB) with streaming and quick access
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { Readable } from 'stream';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AudioFile {
  id: string;
  name: string;
  size: number;
  duration?: number; // seconds
  format: string; // m4a, mp3, wav
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  hash: string;
  originalPath?: string;
  cloudUrl?: string;
  thumbnailUrl?: string; // Waveform visualization
  userId: string;
  uploadedAt: Date;
  metadata?: Record<string, any>;
}

export interface AudioChunk {
  id: string;
  audioId: string;
  chunkIndex: number;
  size: number;
  duration: number;
  startTime: number;
  endTime: number;
  url: string;
  transcription?: string;
  processed: boolean;
}

export interface TransferProgress {
  audioId: string;
  totalBytes: number;
  transferredBytes: number;
  percentage: number;
  chunksCompleted: number;
  totalChunks: number;
  status: 'preparing' | 'transferring' | 'processing' | 'complete' | 'error';
  startTime: Date;
  estimatedTimeRemaining?: number;
  currentChunk?: number;
  error?: string;
}

export interface QuickReference {
  audioId: string;
  summary: string;
  keyPoints: string[];
  speakers: string[];
  topics: string[];
  actionItems: string[];
  timestamp: Date;
  confidence: number;
}

export class AudioTransferAgent {
  private readonly CHUNK_SIZE = 25 * 1024 * 1024; // 25MB chunks for streaming
  private readonly MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
  private readonly SUPPORTED_FORMATS = ['.m4a', '.mp3', '.wav', '.flac', '.webm'];

  private transfers: Map<string, TransferProgress> = new Map();
  private progressCallbacks: Map<string, Function[]> = new Map();

  /**
   * Start optimized audio transfer
   */
  async transferAudio(
    filePath: string,
    userId: string,
    options: {
      autoTranscribe?: boolean;
      generateQuickRef?: boolean;
      priority?: 'high' | 'normal' | 'low';
      webhook?: string;
    } = {}
  ): Promise<AudioFile> {
    // Validate file
    const validation = await this.validateAudioFile(filePath);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const stats = fs.statSync(filePath);
    const audioId = `audio_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Create audio record
    const audioFile: AudioFile = {
      id: audioId,
      name: path.basename(filePath),
      size: stats.size,
      format: path.extname(filePath).slice(1),
      hash: await this.calculateHash(filePath),
      originalPath: filePath,
      userId,
      uploadedAt: new Date(),
      metadata: {
        priority: options.priority || 'normal',
        autoTranscribe: options.autoTranscribe !== false,
        generateQuickRef: options.generateQuickRef !== false,
      },
    };

    // Initialize transfer progress
    const progress: TransferProgress = {
      audioId,
      totalBytes: stats.size,
      transferredBytes: 0,
      percentage: 0,
      chunksCompleted: 0,
      totalChunks: Math.ceil(stats.size / this.CHUNK_SIZE),
      status: 'preparing',
      startTime: new Date(),
    };

    this.transfers.set(audioId, progress);

    // Store initial record
    await supabase.from('audio_files').insert({
      id: audioFile.id,
      name: audioFile.name,
      size: audioFile.size,
      format: audioFile.format,
      hash: audioFile.hash,
      user_id: audioFile.userId,
      uploaded_at: audioFile.uploadedAt.toISOString(),
      metadata: audioFile.metadata,
      status: 'transferring',
    });

    // Start async transfer
    this.executeTransfer(filePath, audioFile, progress, options).catch(error => {
      console.error(`[AUDIO-TRANSFER] Transfer failed for ${audioId}:`, error);
      progress.status = 'error';
      progress.error = error.message;
    });

    return audioFile;
  }

  /**
   * Execute chunked transfer with optimization
   */
  private async executeTransfer(
    filePath: string,
    audioFile: AudioFile,
    progress: TransferProgress,
    options: any
  ) {
    try {
      progress.status = 'transferring';

      // For files > 100MB, use chunked upload
      if (audioFile.size > 100 * 1024 * 1024) {
        await this.chunkedUpload(filePath, audioFile, progress);
      } else {
        // Direct upload for smaller files
        await this.directUpload(filePath, audioFile, progress);
      }

      progress.status = 'processing';
      audioFile.cloudUrl = await this.getCloudUrl(audioFile.id);

      // Extract audio metadata
      const metadata = await this.extractAudioMetadata(filePath);
      audioFile.duration = metadata.duration;
      audioFile.bitrate = metadata.bitrate;
      audioFile.sampleRate = metadata.sampleRate;
      audioFile.channels = metadata.channels;

      // Update database
      await supabase
        .from('audio_files')
        .update({
          cloud_url: audioFile.cloudUrl,
          duration: audioFile.duration,
          bitrate: audioFile.bitrate,
          sample_rate: audioFile.sampleRate,
          channels: audioFile.channels,
          status: 'ready',
        })
        .eq('id', audioFile.id);

      // Generate quick reference if requested
      if (options.generateQuickRef) {
        await this.generateQuickReference(audioFile);
      }

      // Auto-transcribe if requested
      if (options.autoTranscribe) {
        await this.queueTranscription(audioFile, options.priority);
      }

      // Generate waveform thumbnail
      audioFile.thumbnailUrl = await this.generateWaveform(audioFile);

      progress.status = 'complete';
      progress.percentage = 100;

      // Webhook notification
      if (options.webhook) {
        await this.sendWebhook(options.webhook, {
          event: 'transfer_complete',
          audioFile,
          progress,
        });
      }

      console.log(`[AUDIO-TRANSFER] Transfer complete for ${audioFile.id}`);
    } catch (error) {
      progress.status = 'error';
      progress.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Chunked upload for large files
   */
  private async chunkedUpload(
    filePath: string,
    audioFile: AudioFile,
    progress: TransferProgress
  ) {
    const fileStream = fs.createReadStream(filePath, {
      highWaterMark: this.CHUNK_SIZE,
    });

    let chunkIndex = 0;
    const chunks: Buffer[] = [];

    for await (const chunk of fileStream) {
      // Upload chunk to Supabase Storage
      const chunkPath = `audio/${audioFile.userId}/${audioFile.id}/chunk_${chunkIndex}`;

      const { error } = await supabase.storage
        .from('audio-files')
        .upload(chunkPath, chunk, {
          contentType: `audio/${audioFile.format}`,
          upsert: false,
        });

      if (error) {
        throw new Error(`Chunk upload failed: ${error.message}`);
      }

      // Update progress
      progress.transferredBytes += (chunk as Buffer).length;
      progress.chunksCompleted = chunkIndex + 1;
      progress.percentage = (progress.transferredBytes / progress.totalBytes) * 100;
      progress.currentChunk = chunkIndex;

      // Estimate time remaining
      const elapsed = Date.now() - progress.startTime.getTime();
      const bytesPerMs = progress.transferredBytes / elapsed;
      const remainingBytes = progress.totalBytes - progress.transferredBytes;
      progress.estimatedTimeRemaining = Math.round(remainingBytes / bytesPerMs);

      // Notify progress callbacks
      this.notifyProgress(audioFile.id, progress);

      chunks.push(chunk as Buffer);
      chunkIndex++;
    }

    // Store chunk information
    await supabase.from('audio_chunks').insert(
      Array.from({ length: chunkIndex }, (_, i) => ({
        audio_id: audioFile.id,
        chunk_index: i,
        size: chunks[i]?.length || 0,
        url: `audio/${audioFile.userId}/${audioFile.id}/chunk_${i}`,
        processed: false,
      }))
    );

    console.log(`[AUDIO-TRANSFER] Uploaded ${chunkIndex} chunks for ${audioFile.id}`);
  }

  /**
   * Direct upload for smaller files
   */
  private async directUpload(
    filePath: string,
    audioFile: AudioFile,
    progress: TransferProgress
  ) {
    const fileBuffer = fs.readFileSync(filePath);
    const uploadPath = `audio/${audioFile.userId}/${audioFile.id}/${audioFile.name}`;

    const { error } = await supabase.storage
      .from('audio-files')
      .upload(uploadPath, fileBuffer, {
        contentType: `audio/${audioFile.format}`,
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    progress.transferredBytes = fileBuffer.length;
    progress.chunksCompleted = 1;
    progress.totalChunks = 1;
    progress.percentage = 100;

    this.notifyProgress(audioFile.id, progress);
  }

  /**
   * Generate quick reference for immediate access
   */
  private async generateQuickReference(audioFile: AudioFile): Promise<QuickReference> {
    console.log(`[AUDIO-TRANSFER] Generating quick reference for ${audioFile.id}`);

    // For m4a files, we can extract metadata and create a preliminary reference
    // before full transcription
    const quickRef: QuickReference = {
      audioId: audioFile.id,
      summary: `Audio file: ${audioFile.name} (${this.formatDuration(audioFile.duration || 0)})`,
      keyPoints: [
        `Duration: ${this.formatDuration(audioFile.duration || 0)}`,
        `Format: ${audioFile.format.toUpperCase()}`,
        `Quality: ${audioFile.bitrate ? `${Math.round(audioFile.bitrate / 1000)}kbps` : 'Unknown'}`,
      ],
      speakers: [], // Will be filled after transcription
      topics: [], // Will be filled after analysis
      actionItems: [], // Will be filled after transcription
      timestamp: new Date(),
      confidence: 0.5, // Low confidence until transcribed
    };

    // Store quick reference
    await supabase.from('quick_references').insert({
      audio_id: audioFile.id,
      summary: quickRef.summary,
      key_points: quickRef.keyPoints,
      speakers: quickRef.speakers,
      topics: quickRef.topics,
      action_items: quickRef.actionItems,
      confidence: quickRef.confidence,
      created_at: quickRef.timestamp.toISOString(),
    });

    return quickRef;
  }

  /**
   * Queue transcription job
   */
  private async queueTranscription(audioFile: AudioFile, priority: string = 'normal') {
    await supabase.from('transcription_queue').insert({
      audio_id: audioFile.id,
      user_id: audioFile.userId,
      priority,
      status: 'queued',
      queued_at: new Date().toISOString(),
    });

    console.log(`[AUDIO-TRANSFER] Queued transcription for ${audioFile.id}`);
  }

  /**
   * Extract audio metadata (duration, bitrate, etc)
   */
  private async extractAudioMetadata(filePath: string): Promise<{
    duration: number;
    bitrate: number;
    sampleRate: number;
    channels: number;
  }> {
    // This would use a library like ffprobe or similar
    // For now, returning estimated values
    const stats = fs.statSync(filePath);

    // Estimate duration based on file size and typical m4a bitrate
    // Typical m4a: 128kbps = 16KB/s
    const estimatedDuration = Math.round(stats.size / (16 * 1024));

    return {
      duration: estimatedDuration,
      bitrate: 128000, // 128kbps typical for m4a
      sampleRate: 44100, // 44.1kHz standard
      channels: 2, // Stereo
    };
  }

  /**
   * Generate waveform visualization
   */
  private async generateWaveform(audioFile: AudioFile): Promise<string> {
    // This would generate a waveform image
    // For now, return placeholder
    return `/api/audio/waveform/${audioFile.id}`;
  }

  /**
   * Get cloud URL for audio file
   */
  private async getCloudUrl(audioId: string): Promise<string> {
    // Get signed URL from Supabase storage
    const { data } = await supabase.storage
      .from('audio-files')
      .createSignedUrl(`audio/${audioId}`, 3600 * 24 * 7); // 7 days

    return data?.signedUrl || '';
  }

  /**
   * Validate audio file
   */
  private async validateAudioFile(filePath: string): Promise<{
    valid: boolean;
    error?: string;
  }> {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: 'File does not exist' };
    }

    const stats = fs.statSync(filePath);

    if (stats.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum size: ${this.MAX_FILE_SIZE / (1024 * 1024 * 1024)}GB`,
      };
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!this.SUPPORTED_FORMATS.includes(ext)) {
      return {
        valid: false,
        error: `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Calculate file hash
   */
  private async calculateHash(filePath: string): Promise<string> {
    const fileBuffer = fs.readFileSync(filePath);
    return createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Register progress callback
   */
  onProgress(audioId: string, callback: (progress: TransferProgress) => void) {
    if (!this.progressCallbacks.has(audioId)) {
      this.progressCallbacks.set(audioId, []);
    }
    this.progressCallbacks.get(audioId)!.push(callback);
  }

  /**
   * Notify progress callbacks
   */
  private notifyProgress(audioId: string, progress: TransferProgress) {
    const callbacks = this.progressCallbacks.get(audioId) || [];
    callbacks.forEach(callback => callback(progress));
  }

  /**
   * Get transfer progress
   */
  getProgress(audioId: string): TransferProgress | null {
    return this.transfers.get(audioId) || null;
  }

  /**
   * Get audio file info
   */
  async getAudioFile(audioId: string): Promise<AudioFile | null> {
    const { data } = await supabase
      .from('audio_files')
      .select('*')
      .eq('id', audioId)
      .single();

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      size: data.size,
      duration: data.duration,
      format: data.format,
      bitrate: data.bitrate,
      sampleRate: data.sample_rate,
      channels: data.channels,
      hash: data.hash,
      cloudUrl: data.cloud_url,
      thumbnailUrl: data.thumbnail_url,
      userId: data.user_id,
      uploadedAt: new Date(data.uploaded_at),
      metadata: data.metadata,
    };
  }

  /**
   * Get quick reference
   */
  async getQuickReference(audioId: string): Promise<QuickReference | null> {
    const { data } = await supabase
      .from('quick_references')
      .select('*')
      .eq('audio_id', audioId)
      .single();

    if (!data) return null;

    return {
      audioId: data.audio_id,
      summary: data.summary,
      keyPoints: data.key_points,
      speakers: data.speakers,
      topics: data.topics,
      actionItems: data.action_items,
      timestamp: new Date(data.created_at),
      confidence: data.confidence,
    };
  }

  /**
   * Stream audio chunks
   */
  async streamAudio(audioId: string): Promise<Readable> {
    const { data: chunks } = await supabase
      .from('audio_chunks')
      .select('*')
      .eq('audio_id', audioId)
      .order('chunk_index', { ascending: true });

    if (!chunks || chunks.length === 0) {
      throw new Error('No chunks found for audio');
    }

    // Create readable stream from chunks
    const stream = new Readable({
      async read() {
        for (const chunk of chunks) {
          const { data } = await supabase.storage
            .from('audio-files')
            .download(chunk.url);

          if (data) {
            const buffer = Buffer.from(await data.arrayBuffer());
            this.push(buffer);
          }
        }
        this.push(null); // End stream
      },
    });

    return stream;
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(url: string, data: any) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('[AUDIO-TRANSFER] Webhook failed:', error);
    }
  }

  /**
   * Get user's recent audio files
   */
  async getUserAudioFiles(userId: string, limit: number = 50): Promise<AudioFile[]> {
    const { data } = await supabase
      .from('audio_files')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })
      .limit(limit);

    return (data || []).map(d => ({
      id: d.id,
      name: d.name,
      size: d.size,
      duration: d.duration,
      format: d.format,
      bitrate: d.bitrate,
      sampleRate: d.sample_rate,
      channels: d.channels,
      hash: d.hash,
      cloudUrl: d.cloud_url,
      thumbnailUrl: d.thumbnail_url,
      userId: d.user_id,
      uploadedAt: new Date(d.uploaded_at),
      metadata: d.metadata,
    }));
  }
}

// Singleton instance
export const audioTransfer = new AudioTransferAgent();
