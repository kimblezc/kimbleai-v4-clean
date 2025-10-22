-- Transcription Job Tracking Migration
-- Add these columns to enable cross-instance job status tracking

ALTER TABLE audio_transcriptions
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS job_id TEXT,
  ADD COLUMN IF NOT EXISTS assemblyai_id TEXT,
  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS error TEXT;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_job_id
  ON audio_transcriptions(job_id);

CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_assemblyai_id
  ON audio_transcriptions(assemblyai_id);

CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_status
  ON audio_transcriptions(status);

-- Add unique constraint to job_id (but allow NULL for old records)
CREATE UNIQUE INDEX IF NOT EXISTS idx_audio_transcriptions_job_id_unique
  ON audio_transcriptions(job_id)
  WHERE job_id IS NOT NULL;

-- Update existing records to have completed status
UPDATE audio_transcriptions
  SET status = 'completed',
      progress = 100
  WHERE status IS NULL;
