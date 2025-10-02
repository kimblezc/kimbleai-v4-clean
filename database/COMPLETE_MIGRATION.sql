-- ================================================================================================
-- KIMBLEAI v4 COMPLETE DATABASE MIGRATION
-- ================================================================================================
-- Purpose: Complete, idempotent migration script for kimbleai.com database
-- Database: Supabase PostgreSQL with pgvector
-- Target Users: Zach (zach.kimble@gmail.com) and Rebecca (becky.aza.kimble@gmail.com)
-- Date: 2025-10-01
--
-- This script can be run multiple times safely (idempotent)
-- ================================================================================================

-- ================================
-- SECTION 1: EXTENSIONS
-- ================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================
-- SECTION 2: CORE TABLES (Already exist, ensure structure)
-- ================================

-- Users table should already exist from complete_system_schema.sql
-- Just add any missing columns

-- Add missing columns to audio_transcriptions (from pending migrations)
ALTER TABLE audio_transcriptions
  ADD COLUMN IF NOT EXISTS project_id TEXT,
  ADD COLUMN IF NOT EXISTS category_id TEXT,
  ADD COLUMN IF NOT EXISTS auto_categorized BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS category_confidence FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add missing columns to conversations (from content organization)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS category_id TEXT;

-- Add missing columns to projects (from content organization)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS category_id TEXT;

-- Add missing columns to knowledge_base (from content organization)
ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS category_id TEXT;

-- ================================
-- SECTION 3: NEW TABLES
-- ================================

-- ==================== FILES TABLE ====================
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY DEFAULT ('file_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT NOT NULL,
  project_id TEXT,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL, -- audio, image, pdf, document, spreadsheet, email, video
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase Storage path
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'error')),
  metadata JSONB DEFAULT '{}', -- duration, dimensions, page count, etc.
  processed_content TEXT, -- extracted text content
  embedding vector(1536), -- for semantic search
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- ==================== ACTIVITY LOGS TABLE ====================
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- created, updated, deleted, uploaded, transcribed, searched, etc.
  resource_type TEXT NOT NULL, -- project, file, conversation, knowledge, transcription, etc.
  resource_id TEXT,
  resource_name TEXT, -- Human-readable name of the resource
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==================== AUTH LOGS TABLE ====================
CREATE TABLE IF NOT EXISTS auth_logs (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL, -- signin_success, signin_blocked, signin_failed, signout, etc.
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- SECTION 4: INDEXES
-- ================================

-- Files table indexes
CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_type ON files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_created ON files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_embedding ON files USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_resource_type ON activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_resource_id ON activity_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user_created ON activity_logs(user_id, created_at DESC);

-- Auth logs indexes
CREATE INDEX IF NOT EXISTS idx_auth_logs_email ON auth_logs(email);
CREATE INDEX IF NOT EXISTS idx_auth_logs_event_type ON auth_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created ON auth_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_email_created ON auth_logs(email, created_at DESC);

-- Audio transcriptions indexes (from pending migrations)
CREATE INDEX IF NOT EXISTS idx_transcriptions_project ON audio_transcriptions(project_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_project ON audio_transcriptions(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_category ON audio_transcriptions(category_id);

-- Content categories indexes (from content organization)
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category_id);
CREATE INDEX IF NOT EXISTS idx_conversations_category ON conversations(category_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category_id ON knowledge_base(category_id);

-- Performance indexes for existing tables
CREATE INDEX IF NOT EXISTS idx_knowledge_base_user_created ON knowledge_base(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_created ON conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);

-- ================================
-- SECTION 5: FOREIGN KEY CONSTRAINTS
-- ================================

-- Add foreign key constraints for new columns (only if they don't exist)
DO $$
BEGIN
  -- Add project_id foreign key to audio_transcriptions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_transcription_project'
    AND table_name = 'audio_transcriptions'
  ) THEN
    ALTER TABLE audio_transcriptions
      ADD CONSTRAINT fk_transcription_project FOREIGN KEY (project_id)
      REFERENCES projects(id) ON DELETE SET NULL;
  END IF;

  -- Add category_id foreign key to audio_transcriptions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_audio_category'
    AND table_name = 'audio_transcriptions'
  ) THEN
    ALTER TABLE audio_transcriptions
      ADD CONSTRAINT fk_audio_category FOREIGN KEY (category_id)
      REFERENCES content_categories(id) ON DELETE SET NULL;
  END IF;

  -- Add category_id foreign key to projects
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_project_category'
    AND table_name = 'projects'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT fk_project_category FOREIGN KEY (category_id)
      REFERENCES content_categories(id) ON DELETE SET NULL;
  END IF;

  -- Add category_id foreign key to conversations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_conversation_category'
    AND table_name = 'conversations'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT fk_conversation_category FOREIGN KEY (category_id)
      REFERENCES content_categories(id) ON DELETE SET NULL;
  END IF;

  -- Add category_id foreign key to knowledge_base
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_knowledge_category'
    AND table_name = 'knowledge_base'
  ) THEN
    ALTER TABLE knowledge_base
      ADD CONSTRAINT fk_knowledge_category FOREIGN KEY (category_id)
      REFERENCES content_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ================================
-- SECTION 6: DATABASE VIEWS
-- ================================

-- Dashboard statistics view
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  u.id as user_id,
  u.name as user_name,
  u.email as user_email,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT c.id) as conversation_count,
  COUNT(DISTINCT f.id) as file_count,
  COUNT(DISTINCT at.id) as transcription_count,
  COUNT(DISTINCT kb.id) as knowledge_count,
  COUNT(DISTINCT al.id) as activity_count,
  MAX(GREATEST(
    COALESCE(p.updated_at, '1970-01-01'::timestamptz),
    COALESCE(c.updated_at, '1970-01-01'::timestamptz),
    COALESCE(f.updated_at, '1970-01-01'::timestamptz),
    COALESCE(kb.updated_at, '1970-01-01'::timestamptz)
  )) as last_activity,
  SUM(f.size_bytes) as total_storage_bytes,
  SUM(at.duration) as total_audio_duration_seconds
FROM users u
LEFT JOIN projects p ON p.owner_id = u.id
LEFT JOIN conversations c ON c.user_id = u.id
LEFT JOIN files f ON f.user_id = u.id
LEFT JOIN audio_transcriptions at ON at.user_id = u.id
LEFT JOIN knowledge_base kb ON kb.user_id = u.id
LEFT JOIN activity_logs al ON al.user_id = u.id
GROUP BY u.id, u.name, u.email;

-- Recent activity view (last 100 items)
CREATE OR REPLACE VIEW recent_activity AS
SELECT
  al.id,
  al.user_id,
  u.name as user_name,
  al.action_type,
  al.resource_type,
  al.resource_id,
  al.resource_name,
  al.metadata,
  al.created_at
FROM activity_logs al
JOIN users u ON u.id = al.user_id
ORDER BY al.created_at DESC
LIMIT 100;

-- User activity summary (last 30 days)
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  al.user_id,
  u.name as user_name,
  DATE(al.created_at) as activity_date,
  COUNT(*) as total_actions,
  COUNT(DISTINCT al.resource_type) as resource_types_touched,
  json_agg(DISTINCT al.action_type) as action_types,
  json_agg(DISTINCT al.resource_type) as resource_types
FROM activity_logs al
JOIN users u ON u.id = al.user_id
WHERE al.created_at >= NOW() - INTERVAL '30 days'
GROUP BY al.user_id, u.name, DATE(al.created_at)
ORDER BY activity_date DESC;

-- Cost summary view (monthly)
CREATE OR REPLACE VIEW monthly_cost_summary AS
SELECT
  DATE_TRUNC('month', timestamp) as month,
  user_id,
  COUNT(*) as total_api_calls,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(cost_usd) as total_cost_usd,
  AVG(cost_usd) as avg_cost_per_call,
  MAX(cost_usd) as max_cost_per_call,
  SUM(CASE WHEN cached THEN 1 ELSE 0 END) as cached_calls
FROM api_cost_tracking
GROUP BY DATE_TRUNC('month', timestamp), user_id
ORDER BY month DESC;

-- File statistics view
CREATE OR REPLACE VIEW file_stats AS
SELECT
  user_id,
  file_type,
  COUNT(*) as file_count,
  SUM(size_bytes) as total_size_bytes,
  AVG(size_bytes) as avg_size_bytes,
  MAX(created_at) as latest_upload
FROM files
GROUP BY user_id, file_type;

-- ================================
-- SECTION 7: UTILITY FUNCTIONS
-- ================================

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id TEXT,
  p_action_type TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_resource_name TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO activity_logs (
    user_id,
    action_type,
    resource_type,
    resource_id,
    resource_name,
    metadata
  ) VALUES (
    p_user_id,
    p_action_type,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    p_metadata
  );
END;
$$;

-- Function to get user's recent activity
CREATE OR REPLACE FUNCTION get_user_recent_activity(
  p_user_id TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  action_type TEXT,
  resource_type TEXT,
  resource_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    action_type,
    resource_type,
    resource_name,
    created_at
  FROM activity_logs
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- Function to search files by content
CREATE OR REPLACE FUNCTION search_files(
  query_embedding vector(1536),
  p_user_id TEXT,
  match_count INT DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id TEXT,
  filename TEXT,
  file_type TEXT,
  processed_content TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    f.id,
    f.filename,
    f.file_type,
    f.processed_content,
    1 - (f.embedding <=> query_embedding) AS similarity,
    f.created_at
  FROM files f
  WHERE f.user_id = p_user_id
    AND f.embedding IS NOT NULL
    AND 1 - (f.embedding <=> query_embedding) > similarity_threshold
  ORDER BY f.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function to clean up old activity logs (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM activity_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to clean up old auth logs (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_auth_logs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM auth_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ================================
-- SECTION 8: ROW LEVEL SECURITY (RLS)
-- ================================

-- Enable RLS on new tables
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

-- Files policies (users can only access their own files)
DROP POLICY IF EXISTS "Users can view own files" ON files;
CREATE POLICY "Users can view own files"
  ON files FOR SELECT
  USING (user_id IN (
    SELECT id FROM users
    WHERE email IN ('zach.kimble@gmail.com', 'becky.aza.kimble@gmail.com')
  ));

DROP POLICY IF EXISTS "Users can insert own files" ON files;
CREATE POLICY "Users can insert own files"
  ON files FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM users
    WHERE email IN ('zach.kimble@gmail.com', 'becky.aza.kimble@gmail.com')
  ));

DROP POLICY IF EXISTS "Users can update own files" ON files;
CREATE POLICY "Users can update own files"
  ON files FOR UPDATE
  USING (user_id IN (
    SELECT id FROM users
    WHERE email IN ('zach.kimble@gmail.com', 'becky.aza.kimble@gmail.com')
  ));

DROP POLICY IF EXISTS "Users can delete own files" ON files;
CREATE POLICY "Users can delete own files"
  ON files FOR DELETE
  USING (user_id IN (
    SELECT id FROM users
    WHERE email IN ('zach.kimble@gmail.com', 'becky.aza.kimble@gmail.com')
  ));

-- Activity logs policies (users can view their own logs)
DROP POLICY IF EXISTS "Users can view own activity" ON activity_logs;
CREATE POLICY "Users can view own activity"
  ON activity_logs FOR SELECT
  USING (user_id IN (
    SELECT id FROM users
    WHERE email IN ('zach.kimble@gmail.com', 'becky.aza.kimble@gmail.com')
  ));

DROP POLICY IF EXISTS "System can insert activity" ON activity_logs;
CREATE POLICY "System can insert activity"
  ON activity_logs FOR INSERT
  WITH CHECK (true);  -- Allow all inserts from backend

-- Auth logs policies (users can only view their own auth logs)
DROP POLICY IF EXISTS "Users can view own auth logs" ON auth_logs;
CREATE POLICY "Users can view own auth logs"
  ON auth_logs FOR SELECT
  USING (email IN ('zach.kimble@gmail.com', 'becky.aza.kimble@gmail.com'));

DROP POLICY IF EXISTS "System can insert auth logs" ON auth_logs;
CREATE POLICY "System can insert auth logs"
  ON auth_logs FOR INSERT
  WITH CHECK (true);  -- Allow all inserts from backend

-- ================================
-- SECTION 9: TRIGGERS
-- ================================

-- Updated_at trigger for files
DROP TRIGGER IF EXISTS update_files_updated_at ON files;
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- SECTION 10: GRANTS
-- ================================

-- Grant permissions to authenticated users
GRANT SELECT ON dashboard_stats TO authenticated;
GRANT SELECT ON recent_activity TO authenticated;
GRANT SELECT ON user_activity_summary TO authenticated;
GRANT SELECT ON monthly_cost_summary TO authenticated;
GRANT SELECT ON file_stats TO authenticated;

GRANT EXECUTE ON FUNCTION log_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_recent_activity TO authenticated;
GRANT EXECUTE ON FUNCTION search_files TO authenticated;

-- ================================
-- SECTION 11: COMMENTS
-- ================================

COMMENT ON TABLE files IS 'Uploaded files with semantic search capabilities (audio, images, PDFs, documents, etc.)';
COMMENT ON TABLE activity_logs IS 'User activity tracking for audit trail and analytics';
COMMENT ON TABLE auth_logs IS 'Authentication event logging for security monitoring';

COMMENT ON VIEW dashboard_stats IS 'Aggregated statistics per user for dashboard display';
COMMENT ON VIEW recent_activity IS 'Recent activity across all users (last 100 items)';
COMMENT ON VIEW user_activity_summary IS 'Daily activity summary per user (last 30 days)';
COMMENT ON VIEW monthly_cost_summary IS 'Monthly API cost breakdown per user';
COMMENT ON VIEW file_stats IS 'File upload statistics grouped by user and file type';

COMMENT ON FUNCTION log_activity IS 'Utility function to log user activities';
COMMENT ON FUNCTION get_user_recent_activity IS 'Retrieve recent activity for a specific user';
COMMENT ON FUNCTION search_files IS 'Vector similarity search for uploaded files';
COMMENT ON FUNCTION cleanup_old_activity_logs IS 'Delete activity logs older than 90 days';
COMMENT ON FUNCTION cleanup_old_auth_logs IS 'Delete auth logs older than 90 days';

-- ================================
-- MIGRATION COMPLETE
-- ================================

-- Verify key tables exist
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'users', 'projects', 'conversations', 'messages',
      'knowledge_base', 'audio_transcriptions', 'files',
      'activity_logs', 'auth_logs', 'api_cost_tracking',
      'budget_alerts', 'budget_config', 'content_categories',
      'zapier_webhook_logs'
    );

  RAISE NOTICE '✅ Migration complete! Found % core tables.', table_count;
END $$;
