-- Add job tracking fields to audio_transcriptions table
-- This allows status tracking across serverless instances

ALTER TABLE audio_transcriptions
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS job_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS assemblyai_id TEXT,
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS error TEXT;

-- Create index for fast job lookups
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_job_id ON audio_transcriptions(job_id);
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_assemblyai_id ON audio_transcriptions(assemblyai_id);
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_status ON audio_transcriptions(status);

-- Update existing records to have completed status
UPDATE audio_transcriptions
SET status = 'completed', progress = 100
WHERE status IS NULL;

COMMENT ON COLUMN audio_transcriptions.status IS 'Job status: queued, uploading, processing, analyzing, saving, completed, error';
COMMENT ON COLUMN audio_transcriptions.job_id IS 'Internal job ID for tracking (e.g., assemblyai_timestamp_random)';
COMMENT ON COLUMN audio_transcriptions.assemblyai_id IS 'AssemblyAI transcript ID for querying their API';
COMMENT ON COLUMN audio_transcriptions.progress IS 'Progress percentage (0-100)';
COMMENT ON COLUMN audio_transcriptions.error IS 'Error message if status is error';
