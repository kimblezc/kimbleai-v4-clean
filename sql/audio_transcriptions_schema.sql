-- audio_transcriptions_schema.sql
-- Database schema for audio transcriptions with Whisper

-- Create audio transcriptions table
CREATE TABLE IF NOT EXISTS audio_transcriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT DEFAULT 'general',
  filename TEXT NOT NULL,
  file_size BIGINT,
  duration FLOAT,
  text TEXT NOT NULL,
  segments JSONB, -- Stores word-level timestamps from Whisper
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_audio_transcriptions_user_id ON audio_transcriptions(user_id);
CREATE INDEX idx_audio_transcriptions_project_id ON audio_transcriptions(project_id);
CREATE INDEX idx_audio_transcriptions_created_at ON audio_transcriptions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE audio_transcriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own transcriptions" ON audio_transcriptions
  FOR SELECT
  USING (user_id = current_setting('app.user_id')::TEXT);

CREATE POLICY "Users can insert their own transcriptions" ON audio_transcriptions
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id')::TEXT);

CREATE POLICY "Users can update their own transcriptions" ON audio_transcriptions
  FOR UPDATE
  USING (user_id = current_setting('app.user_id')::TEXT);

CREATE POLICY "Users can delete their own transcriptions" ON audio_transcriptions
  FOR DELETE
  USING (user_id = current_setting('app.user_id')::TEXT);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_audio_transcriptions_updated_at
  BEFORE UPDATE ON audio_transcriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for transcription statistics
CREATE VIEW transcription_stats AS
SELECT 
  user_id,
  project_id,
  COUNT(*) as total_transcriptions,
  SUM(duration) as total_duration_seconds,
  SUM(file_size) as total_file_size_bytes,
  MAX(created_at) as last_transcription
FROM audio_transcriptions
GROUP BY user_id, project_id;

-- Grant permissions
GRANT ALL ON audio_transcriptions TO authenticated;
GRANT ALL ON transcription_stats TO authenticated;
