-- Migration: Add metadata and service columns to audio_transcriptions
-- Date: 2025-11-17
-- Purpose: Fix PGRST204 error - "Could not find the 'metadata' column"
--
-- Background:
-- The code was trying to insert 'metadata' and 'service' columns but the table
-- schema didn't have them. This caused transcription saves to fail silently.

ALTER TABLE audio_transcriptions
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS service TEXT DEFAULT 'assemblyai';

-- Create index for metadata queries (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_metadata
  ON audio_transcriptions USING GIN (metadata);

-- Create index for service column
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_service
  ON audio_transcriptions(service);

COMMENT ON COLUMN audio_transcriptions.metadata IS 'Stores AssemblyAI enhanced features: speaker_labels, chapters, sentiment_analysis_results, entities, IAB categories, auto_highlights, summary, and auto-tagging results';
COMMENT ON COLUMN audio_transcriptions.service IS 'Transcription service used (assemblyai, whisper, etc.)';
