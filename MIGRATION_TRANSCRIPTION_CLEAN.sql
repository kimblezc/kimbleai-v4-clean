-- Transcription Job Tracking Migration
-- Run this on Supabase: https://gbmefnaqsxtoseufjixp.supabase.co/project/_/sql

ALTER TABLE audio_transcriptions
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS job_id TEXT,
  ADD COLUMN IF NOT EXISTS assemblyai_id TEXT,
  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS error TEXT;

CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_job_id
  ON audio_transcriptions(job_id);

CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_assemblyai_id
  ON audio_transcriptions(assemblyai_id);

CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_status
  ON audio_transcriptions(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_audio_transcriptions_job_id_unique
  ON audio_transcriptions(job_id)
  WHERE job_id IS NOT NULL;

UPDATE audio_transcriptions
  SET status = 'completed',
      progress = 100
  WHERE status IS NULL;
