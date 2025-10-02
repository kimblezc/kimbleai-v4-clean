-- Audio Transfer Agent Schema
-- Optimized m4a audio transfer and processing for immediate reference

-- Audio files storage and metadata
CREATE TABLE IF NOT EXISTS audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- File information
  original_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT DEFAULT 'audio/m4a',
  duration_seconds INTEGER,

  -- Storage
  storage_path TEXT,
  storage_bucket TEXT DEFAULT 'audio-files',
  storage_key TEXT,

  -- Transfer details
  transfer_method TEXT CHECK (transfer_method IN ('direct', 'chunked', 'streaming')),
  total_chunks INTEGER,
  chunks_uploaded INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'processing', 'completed', 'failed', 'cancelled')),
  error TEXT,

  -- Processing flags
  auto_transcribe BOOLEAN DEFAULT true,
  quick_ref_generated BOOLEAN DEFAULT false,
  transcription_queued BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),

  -- Metadata extracted from audio
  metadata JSONB DEFAULT '{}'::jsonb,
  waveform_data JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  upload_started_at TIMESTAMP WITH TIME ZONE,
  upload_completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Webhook for notifications
  webhook_url TEXT,
  webhook_called BOOLEAN DEFAULT false,

  -- Performance metrics
  upload_time_ms INTEGER,
  processing_time_ms INTEGER
);

-- Audio file chunks for large file uploads
CREATE TABLE IF NOT EXISTS audio_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_id UUID REFERENCES audio_files(id) ON DELETE CASCADE,

  -- Chunk details
  chunk_index INTEGER NOT NULL,
  chunk_size BIGINT NOT NULL,
  chunk_hash TEXT,
  storage_key TEXT NOT NULL,

  -- Status
  uploaded BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_audio_chunk UNIQUE (audio_id, chunk_index)
);

-- Quick references for immediate access
CREATE TABLE IF NOT EXISTS quick_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_id UUID REFERENCES audio_files(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Quick reference content
  summary TEXT NOT NULL,
  key_points TEXT[] DEFAULT '{}',
  speakers TEXT[] DEFAULT '{}',
  topics TEXT[] DEFAULT '{}',
  action_items TEXT[] DEFAULT '{}',

  -- Quality metrics
  confidence NUMERIC(3,2) DEFAULT 0.0,
  completeness NUMERIC(3,2) DEFAULT 0.0,

  -- Generation details
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generation_method TEXT CHECK (generation_method IN ('ai_quick', 'ai_full', 'manual')),
  generation_time_ms INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Transcription queue
CREATE TABLE IF NOT EXISTS transcription_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_id UUID REFERENCES audio_files(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Queue details
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),

  -- Processing
  assigned_worker TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Results
  transcription_id UUID,
  error TEXT,

  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Timestamps
  queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  estimated_completion TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Transfer progress tracking
CREATE TABLE IF NOT EXISTS transfer_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_id UUID REFERENCES audio_files(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Progress metrics
  bytes_uploaded BIGINT DEFAULT 0,
  total_bytes BIGINT NOT NULL,
  percentage NUMERIC(5,2) DEFAULT 0.0,

  -- Speed metrics
  upload_speed_bps BIGINT,
  estimated_time_remaining_seconds INTEGER,

  -- Status
  current_chunk INTEGER,
  total_chunks INTEGER,
  status TEXT DEFAULT 'uploading' CHECK (status IN ('uploading', 'completed', 'failed', 'cancelled')),

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Errors
  error TEXT,
  retry_available BOOLEAN DEFAULT true
);

-- Transfer statistics
CREATE TABLE IF NOT EXISTS transfer_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Time period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Transfer stats
  total_transfers INTEGER DEFAULT 0,
  successful_transfers INTEGER DEFAULT 0,
  failed_transfers INTEGER DEFAULT 0,
  cancelled_transfers INTEGER DEFAULT 0,

  -- Size stats
  total_bytes_transferred BIGINT DEFAULT 0,
  total_files_size BIGINT DEFAULT 0,
  avg_file_size BIGINT DEFAULT 0,

  -- Performance stats
  avg_upload_speed_bps BIGINT,
  avg_upload_time_ms INTEGER,
  avg_processing_time_ms INTEGER,

  -- Processing stats
  quick_refs_generated INTEGER DEFAULT 0,
  transcriptions_queued INTEGER DEFAULT 0,
  transcriptions_completed INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audio_files_user ON audio_files(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_status ON audio_files(status);
CREATE INDEX IF NOT EXISTS idx_audio_files_created ON audio_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_chunks_audio ON audio_chunks(audio_id);
CREATE INDEX IF NOT EXISTS idx_audio_chunks_uploaded ON audio_chunks(uploaded);
CREATE INDEX IF NOT EXISTS idx_quick_refs_audio ON quick_references(audio_id);
CREATE INDEX IF NOT EXISTS idx_quick_refs_user ON quick_references(user_id);
CREATE INDEX IF NOT EXISTS idx_transcription_queue_status ON transcription_queue(status);
CREATE INDEX IF NOT EXISTS idx_transcription_queue_priority ON transcription_queue(priority);
CREATE INDEX IF NOT EXISTS idx_transfer_progress_audio ON transfer_progress(audio_id);
CREATE INDEX IF NOT EXISTS idx_transfer_progress_status ON transfer_progress(status);
CREATE INDEX IF NOT EXISTS idx_transfer_stats_user ON transfer_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_transfer_stats_period ON transfer_statistics(period_start, period_end);

-- Trigger to update chunk progress
CREATE OR REPLACE FUNCTION update_chunk_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.uploaded = true AND (OLD.uploaded = false OR OLD.uploaded IS NULL) THEN
    UPDATE audio_files
    SET
      chunks_uploaded = chunks_uploaded + 1,
      updated_at = NOW()
    WHERE id = NEW.audio_id;

    -- Check if all chunks uploaded
    UPDATE audio_files af
    SET status = 'processing'
    WHERE af.id = NEW.audio_id
      AND af.chunks_uploaded = af.total_chunks
      AND af.status = 'uploading';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chunk_progress
AFTER UPDATE ON audio_chunks
FOR EACH ROW
WHEN (OLD.uploaded IS DISTINCT FROM NEW.uploaded)
EXECUTE FUNCTION update_chunk_progress();

-- Trigger to queue transcription on upload completion
CREATE OR REPLACE FUNCTION auto_queue_transcription()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'processing' AND NEW.auto_transcribe = true AND NEW.transcription_queued = false THEN
    INSERT INTO transcription_queue (audio_id, user_id, priority)
    VALUES (NEW.id, NEW.user_id, NEW.priority);

    UPDATE audio_files
    SET transcription_queued = true
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_queue_transcription
AFTER UPDATE ON audio_files
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'processing')
EXECUTE FUNCTION auto_queue_transcription();

-- Trigger to update transfer progress
CREATE OR REPLACE FUNCTION update_transfer_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE transfer_progress
  SET
    bytes_uploaded = (
      SELECT COALESCE(SUM(chunk_size), 0)
      FROM audio_chunks
      WHERE audio_id = NEW.audio_id AND uploaded = true
    ),
    current_chunk = NEW.chunks_uploaded,
    percentage = ROUND((NEW.chunks_uploaded::NUMERIC / NULLIF(NEW.total_chunks, 0)::NUMERIC) * 100, 2),
    last_updated = NOW()
  WHERE audio_id = NEW.audio_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transfer_progress
AFTER UPDATE ON audio_files
FOR EACH ROW
WHEN (OLD.chunks_uploaded IS DISTINCT FROM NEW.chunks_uploaded)
EXECUTE FUNCTION update_transfer_progress();
