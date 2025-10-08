-- Create export_logs table for tracking export history
CREATE TABLE IF NOT EXISTS export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  export_type TEXT NOT NULL, -- 'single' or 'batch'
  transcription_count INTEGER NOT NULL DEFAULT 1,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  category TEXT, -- project/category name
  transcription_ids TEXT[], -- array of transcription IDs
  results JSONB, -- successful export results
  errors JSONB, -- any errors that occurred
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_export_logs_user_id ON export_logs(user_id);

-- Create index on created_at for sorting by date
CREATE INDEX IF NOT EXISTS idx_export_logs_created_at ON export_logs(created_at DESC);

-- Create index on export_type for filtering
CREATE INDEX IF NOT EXISTS idx_export_logs_type ON export_logs(export_type);
