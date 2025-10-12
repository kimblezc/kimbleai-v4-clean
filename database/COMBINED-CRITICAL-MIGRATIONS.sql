-- ================================================================================
-- KIMBLEAI V4 - COMBINED CRITICAL MIGRATIONS
-- ================================================================================
-- This file combines all critical migrations needed for production deployment
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/gbmefnaqsxtoseufjixp/sql
-- ================================================================================

-- ================================================================================================
-- MIGRATION 1: FILE REGISTRY
-- ================================================================================================
-- Purpose: Create unified file registry for multi-source file management
-- ================================================================================================

-- Create file_registry table if it doesn't exist
CREATE TABLE IF NOT EXISTS file_registry (
  id TEXT PRIMARY KEY DEFAULT ('file_' || gen_random_uuid()::text),
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT,
  file_source TEXT NOT NULL CHECK (file_source IN ('upload', 'gmail', 'drive', 'calendar')),
  source_id TEXT,
  storage_path TEXT,
  preview_url TEXT,
  processed BOOLEAN DEFAULT FALSE,
  indexed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_file_registry_user ON file_registry(user_id);
CREATE INDEX IF NOT EXISTS idx_file_registry_source ON file_registry(file_source, source_id);
CREATE INDEX IF NOT EXISTS idx_file_registry_processed ON file_registry(processed);
CREATE INDEX IF NOT EXISTS idx_file_registry_created ON file_registry(created_at DESC);

-- Enable RLS
ALTER TABLE file_registry ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own files" ON file_registry;
CREATE POLICY "Users can view their own files"
  ON file_registry FOR SELECT
  USING (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert their own files" ON file_registry;
CREATE POLICY "Users can insert their own files"
  ON file_registry FOR INSERT
  WITH CHECK (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own files" ON file_registry;
CREATE POLICY "Users can update their own files"
  ON file_registry FOR UPDATE
  USING (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own files" ON file_registry;
CREATE POLICY "Users can delete their own files"
  ON file_registry FOR DELETE
  USING (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

-- ================================================================================================
-- MIGRATION 2: FILE INTEGRATION ENHANCEMENT
-- ================================================================================================
-- Purpose: Add file_id column to knowledge_base and ensure vector support
-- ================================================================================================

-- Ensure vector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Add file_id column to knowledge_base if it doesn't exist
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS file_id TEXT REFERENCES file_registry(id) ON DELETE CASCADE;

-- Ensure embedding column exists with correct dimensions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'knowledge_base'
    AND column_name = 'embedding'
  ) THEN
    ALTER TABLE knowledge_base ADD COLUMN embedding vector(1536);
  END IF;
END $$;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_base_file_id ON knowledge_base(file_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_user_file ON knowledge_base(user_id, file_id);

-- Create vector index for fast similarity search using HNSW
DROP INDEX IF EXISTS knowledge_base_embedding_idx;
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_hnsw_idx
ON knowledge_base USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Drop existing function(s) if they exist
DROP FUNCTION IF EXISTS search_knowledge_base CASCADE;

-- Create function for hybrid search (vector + keyword)
CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_embedding vector(1536),
  query_text text,
  user_id_param text,
  project_id_param text DEFAULT NULL,
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id text,
  title text,
  content text,
  category text,
  source_type text,
  source_id text,
  file_id text,
  similarity float,
  metadata jsonb,
  tags text[],
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.category,
    kb.source_type,
    kb.source_id,
    kb.file_id,
    1 - (kb.embedding <=> query_embedding) as similarity,
    kb.metadata,
    kb.tags,
    kb.created_at
  FROM knowledge_base kb
  WHERE
    kb.user_id = user_id_param
    AND kb.embedding IS NOT NULL
    AND (project_id_param IS NULL OR kb.metadata->>'project_id' = project_id_param)
    AND (
      -- Vector similarity match
      1 - (kb.embedding <=> query_embedding) > similarity_threshold
      OR
      -- Keyword match (full-text search)
      to_tsvector('english', kb.title || ' ' || kb.content) @@ plainto_tsquery('english', query_text)
    )
  ORDER BY
    -- Hybrid ranking: combine vector similarity with keyword relevance
    (1 - (kb.embedding <=> query_embedding)) * 0.7 +
    ts_rank(to_tsvector('english', kb.title || ' ' || kb.content), plainto_tsquery('english', query_text)) * 0.3 DESC
  LIMIT match_count;
END;
$$;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_related_files_semantic CASCADE;

-- Create function to get related files via semantic similarity
CREATE OR REPLACE FUNCTION get_related_files_semantic(
  file_id_param text,
  user_id_param text,
  similarity_threshold float DEFAULT 0.75,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  file_id text,
  filename text,
  mime_type text,
  file_source text,
  similarity float,
  preview_url text,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  file_embedding vector(1536);
BEGIN
  -- Get the average embedding for the source file
  SELECT AVG(embedding)::vector(1536) INTO file_embedding
  FROM knowledge_base
  WHERE knowledge_base.file_id = file_id_param
  AND embedding IS NOT NULL;

  IF file_embedding IS NULL THEN
    RETURN;
  END IF;

  -- Find similar files
  RETURN QUERY
  SELECT DISTINCT
    fr.id,
    fr.filename,
    fr.mime_type,
    fr.file_source,
    AVG(1 - (kb.embedding <=> file_embedding))::float as similarity,
    fr.preview_url,
    fr.created_at
  FROM knowledge_base kb
  JOIN file_registry fr ON fr.id = kb.file_id
  WHERE
    fr.user_id = user_id_param
    AND fr.id != file_id_param
    AND kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> file_embedding) > similarity_threshold
  GROUP BY fr.id, fr.filename, fr.mime_type, fr.file_source, fr.preview_url, fr.created_at
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_knowledge_base TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_related_files_semantic TO service_role, authenticated;

-- ================================================================================================
-- MIGRATION 3: NOTIFICATIONS SYSTEM
-- ================================================================================================
-- Purpose: Create notifications tables for real-time user notifications
-- ================================================================================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('success', 'error', 'info', 'warning')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Enable Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can create their own notifications" ON notifications;
CREATE POLICY "Users can create their own notifications"
  ON notifications FOR INSERT
  WITH CHECK (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  toast_enabled BOOLEAN DEFAULT TRUE,
  sound_enabled BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{
    "file_upload": true,
    "file_indexed": true,
    "transcription_completed": true,
    "budget_alerts": true,
    "gmail_sync": true,
    "backup_completed": true,
    "agent_task_completed": true
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for notification preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON notification_preferences;
CREATE POLICY "Users can view their own preferences"
  ON notification_preferences FOR SELECT
  USING (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own preferences" ON notification_preferences;
CREATE POLICY "Users can update their own preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

-- Create trigger for notification preferences updated_at
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS notifications;

-- ================================================================================================
-- MIGRATION 4: BACKUPS SYSTEM
-- ================================================================================================
-- Purpose: Create backups table for automated backup tracking
-- ================================================================================================

-- Create backups table
CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('manual', 'automatic', 'scheduled')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  backup_data JSONB NOT NULL DEFAULT '{}',
  file_count INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  storage_location TEXT,
  drive_file_id TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_backups_user ON backups(user_id);
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_created ON backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backups_type ON backups(backup_type);

-- Enable RLS
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own backups" ON backups;
CREATE POLICY "Users can view their own backups"
  ON backups FOR SELECT
  USING (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can create their own backups" ON backups;
CREATE POLICY "Users can create their own backups"
  ON backups FOR INSERT
  WITH CHECK (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own backups" ON backups;
CREATE POLICY "Users can update their own backups"
  ON backups FOR UPDATE
  USING (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

-- ================================================================================================
-- MIGRATION COMPLETE
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ All critical migrations completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Migration Summary:';
  RAISE NOTICE '   ✅ File Registry - Unified file management system';
  RAISE NOTICE '   ✅ File Integration - Vector search and semantic relations';
  RAISE NOTICE '   ✅ Notifications - Real-time notification system';
  RAISE NOTICE '   ✅ Backups - Automated backup tracking';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Your database is ready for production!';
END $$;
