-- ================================================================================================
-- FILE REGISTRY MIGRATION
-- ================================================================================================
-- Purpose: Create unified file registry table for all file sources
-- Date: 2025-01-13
-- ================================================================================================

-- Create file_registry table
CREATE TABLE IF NOT EXISTS file_registry (
  id TEXT PRIMARY KEY DEFAULT ('file_reg_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id UUID NOT NULL,
  file_source TEXT NOT NULL CHECK (file_source IN ('upload', 'drive', 'email_attachment', 'calendar_attachment', 'link')),
  source_id TEXT NOT NULL, -- Original ID from source system (Drive file ID, email message ID, etc.)
  source_metadata JSONB DEFAULT '{}', -- Email details, Drive path, sender, etc.
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase Storage path or external URL
  preview_url TEXT,
  thumbnail_url TEXT,
  processed BOOLEAN DEFAULT false,
  processing_result JSONB, -- Results from file processors
  knowledge_base_ids TEXT[] DEFAULT '{}', -- Array of related knowledge_base IDs
  tags TEXT[] DEFAULT '{}',
  projects TEXT[] DEFAULT '{}', -- Array of project IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  indexed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_file_registry_user ON file_registry(user_id);
CREATE INDEX IF NOT EXISTS idx_file_registry_source ON file_registry(file_source);
CREATE INDEX IF NOT EXISTS idx_file_registry_source_id ON file_registry(source_id);
CREATE INDEX IF NOT EXISTS idx_file_registry_user_source ON file_registry(user_id, file_source);
CREATE INDEX IF NOT EXISTS idx_file_registry_created ON file_registry(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_registry_processed ON file_registry(processed);
CREATE INDEX IF NOT EXISTS idx_file_registry_tags ON file_registry USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_file_registry_projects ON file_registry USING GIN(projects);
CREATE INDEX IF NOT EXISTS idx_file_registry_filename ON file_registry USING GIN(to_tsvector('english', filename));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_file_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_file_registry_updated_at ON file_registry;
CREATE TRIGGER update_file_registry_updated_at
  BEFORE UPDATE ON file_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_file_registry_updated_at();

-- Enable Row Level Security
ALTER TABLE file_registry ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own files" ON file_registry;
CREATE POLICY "Users can view own files"
  ON file_registry FOR SELECT
  USING (user_id IN (
    SELECT id FROM users
    WHERE email IN ('zach.kimble@gmail.com', 'becky.aza.kimble@gmail.com')
  ));

DROP POLICY IF EXISTS "Users can insert own files" ON file_registry;
CREATE POLICY "Users can insert own files"
  ON file_registry FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM users
    WHERE email IN ('zach.kimble@gmail.com', 'becky.aza.kimble@gmail.com')
  ));

DROP POLICY IF EXISTS "Users can update own files" ON file_registry;
CREATE POLICY "Users can update own files"
  ON file_registry FOR UPDATE
  USING (user_id IN (
    SELECT id FROM users
    WHERE email IN ('zach.kimble@gmail.com', 'becky.aza.kimble@gmail.com')
  ));

DROP POLICY IF EXISTS "Users can delete own files" ON file_registry;
CREATE POLICY "Users can delete own files"
  ON file_registry FOR DELETE
  USING (user_id IN (
    SELECT id FROM users
    WHERE email IN ('zach.kimble@gmail.com', 'becky.aza.kimble@gmail.com')
  ));

-- Create view for file statistics
CREATE OR REPLACE VIEW file_registry_stats AS
SELECT
  user_id,
  file_source,
  COUNT(*) as file_count,
  SUM(file_size) as total_size_bytes,
  SUM(file_size) / 1024 / 1024 as total_size_mb,
  AVG(file_size) as avg_size_bytes,
  COUNT(CASE WHEN processed THEN 1 END) as processed_count,
  COUNT(CASE WHEN NOT processed THEN 1 END) as unprocessed_count,
  MAX(created_at) as latest_file_date,
  MIN(created_at) as earliest_file_date
FROM file_registry
GROUP BY user_id, file_source;

-- Grant permissions
GRANT SELECT ON file_registry_stats TO authenticated;

-- Comments
COMMENT ON TABLE file_registry IS 'Unified registry for all files from all sources (uploads, Drive, Gmail, Calendar)';
COMMENT ON COLUMN file_registry.file_source IS 'Source of the file: upload, drive, email_attachment, calendar_attachment, link';
COMMENT ON COLUMN file_registry.source_id IS 'Original ID from source system (e.g., Gmail message ID, Drive file ID)';
COMMENT ON COLUMN file_registry.source_metadata IS 'Additional metadata from source (email sender, Drive folder, etc.)';
COMMENT ON COLUMN file_registry.storage_path IS 'Supabase Storage path or external URL';
COMMENT ON COLUMN file_registry.knowledge_base_ids IS 'Array of knowledge_base entry IDs created from this file';
COMMENT ON COLUMN file_registry.projects IS 'Array of project IDs this file is linked to';

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE '✅ File registry migration complete!';
END $$;
