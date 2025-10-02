-- Add project support to audio transcriptions
-- This allows organizing transcriptions into projects like "D&D Campaign" or "Military Transition"

-- Add project_id to audio_transcriptions if it doesn't exist
ALTER TABLE audio_transcriptions
  ADD COLUMN IF NOT EXISTS project_id TEXT,
  ADD CONSTRAINT fk_transcription_project FOREIGN KEY (project_id)
    REFERENCES projects(id) ON DELETE SET NULL;

-- Create index for efficient project-based queries
CREATE INDEX IF NOT EXISTS idx_transcriptions_project
  ON audio_transcriptions(project_id);

-- Create index for user + project queries
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_project
  ON audio_transcriptions(user_id, project_id);

-- Add helpful comment
COMMENT ON COLUMN audio_transcriptions.project_id IS 'Optional project ID for organizing transcriptions (e.g., D&D Campaign, Military Transition)';
