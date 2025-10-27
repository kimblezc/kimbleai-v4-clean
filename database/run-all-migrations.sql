-- ================================================================================================
-- KIMBLEAI v4 - MASTER MIGRATION FILE
-- ================================================================================================
-- Purpose: Run all database migrations in the correct order
-- Database: Supabase PostgreSQL with pgvector
-- Target Users: Zach (zach.kimble@gmail.com) and Rebecca (becky.aza.kimble@gmail.com)
-- Date: October 27, 2025
--
-- This script runs all migrations in the correct order with error handling
-- Safe to run multiple times (idempotent where possible)
--
-- USAGE:
--   1. Open Supabase SQL Editor
--   2. Copy and paste this entire file
--   3. Click "Run" to execute
--   4. Review results and verify success
--
-- IMPORTANT: This will create all tables, functions, and RLS policies
--            Run this on a FRESH database or ensure you understand the impacts
-- ================================================================================================

-- ================================================================================================
-- SETUP: Create migration tracking table
-- ================================================================================================

CREATE TABLE IF NOT EXISTS migration_history (
  id SERIAL PRIMARY KEY,
  migration_name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  execution_time_ms INTEGER
);

-- ================================================================================================
-- PHASE 1: EXTENSIONS
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 1: Installing Extensions...';
END $$;

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

INSERT INTO migration_history (migration_name, success)
VALUES ('00_extensions', true)
ON CONFLICT (migration_name) DO NOTHING;

-- ================================================================================================
-- PHASE 2: CORE SCHEMA
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 2: Creating Core Tables...';
END $$;

-- Users table (CRITICAL - foundation for all other tables)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  preferences JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (id = current_user);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT ('proj_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT,
  parent_project_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  metadata JSONB DEFAULT '{}',
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own projects" ON projects;
CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (user_id = current_user);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY DEFAULT ('conv_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT,
  category_id TEXT,
  summary TEXT,
  embedding vector(1536),
  is_pinned BOOLEAN DEFAULT false,
  pinned_at TIMESTAMPTZ,
  pinned_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own conversations" ON conversations;
CREATE POLICY "Users can manage own conversations" ON conversations
  FOR ALL USING (user_id = current_user);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT ('msg_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER,
  cost_usd NUMERIC(10, 6),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (user_id = current_user);

-- Knowledge base table
CREATE TABLE IF NOT EXISTS knowledge_base (
  id TEXT PRIMARY KEY DEFAULT ('kb_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  category_id TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('conversation', 'file', 'manual', 'gmail', 'drive', 'web')),
  source_id TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own knowledge" ON knowledge_base;
CREATE POLICY "Users can manage own knowledge" ON knowledge_base
  FOR ALL USING (user_id = current_user);

-- Add constraint for source_id (if source_type requires it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_base_source_id_check'
  ) THEN
    ALTER TABLE knowledge_base
    ADD CONSTRAINT knowledge_base_source_id_check
    CHECK (
      (source_type = 'manual' AND source_id IS NULL) OR
      (source_type != 'manual' AND source_id IS NOT NULL)
    );
  END IF;
END $$;

-- Files table
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY DEFAULT ('file_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'error')),
  metadata JSONB DEFAULT '{}',
  processed_content TEXT,
  embedding vector(1536),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own files" ON files;
CREATE POLICY "Users can manage own files" ON files
  FOR ALL USING (user_id = current_user);

-- Audio transcriptions table
CREATE TABLE IF NOT EXISTS audio_transcriptions (
  id TEXT PRIMARY KEY DEFAULT ('trans_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  category_id TEXT,
  file_id TEXT REFERENCES files(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  duration_seconds INTEGER,
  transcription TEXT,
  job_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  service_used TEXT DEFAULT 'assemblyai',
  auto_categorized BOOLEAN DEFAULT false,
  category_confidence FLOAT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audio_transcriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own transcriptions" ON audio_transcriptions;
CREATE POLICY "Users can manage own transcriptions" ON audio_transcriptions
  FOR ALL USING (user_id = current_user);

-- Processed images table
CREATE TABLE IF NOT EXISTS processed_images (
  id TEXT PRIMARY KEY DEFAULT ('img_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id TEXT REFERENCES files(id) ON DELETE CASCADE,
  analysis TEXT,
  objects_detected JSONB DEFAULT '[]',
  text_extracted TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE processed_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own processed images" ON processed_images;
CREATE POLICY "Users can manage own processed images" ON processed_images
  FOR ALL USING (user_id = current_user);

-- Processed documents table
CREATE TABLE IF NOT EXISTS processed_documents (
  id TEXT PRIMARY KEY DEFAULT ('doc_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id TEXT REFERENCES files(id) ON DELETE CASCADE,
  text_content TEXT,
  page_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE processed_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own processed documents" ON processed_documents;
CREATE POLICY "Users can manage own processed documents" ON processed_documents
  FOR ALL USING (user_id = current_user);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  resource_name TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activity" ON activity_logs;
CREATE POLICY "Users can view own activity" ON activity_logs
  FOR SELECT USING (user_id = current_user);

-- Auth logs table (no RLS - system table)
CREATE TABLE IF NOT EXISTS auth_logs (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT ('cat_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own categories" ON categories;
CREATE POLICY "Users can manage own categories" ON categories
  FOR ALL USING (user_id = current_user);

INSERT INTO migration_history (migration_name, success)
VALUES ('01_core_schema', true)
ON CONFLICT (migration_name) DO NOTHING;

-- ================================================================================================
-- PHASE 3: AUTHENTICATION & TOKENS
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 3: Setting up Authentication...';
END $$;

CREATE TABLE IF NOT EXISTS user_tokens (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tokens" ON user_tokens;
CREATE POLICY "Users can manage own tokens" ON user_tokens
  FOR ALL USING (user_id = current_user);

INSERT INTO migration_history (migration_name, success)
VALUES ('02_user_tokens', true)
ON CONFLICT (migration_name) DO NOTHING;

-- ================================================================================================
-- PHASE 4: INDEXES FOR PERFORMANCE
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 4: Creating Performance Indexes...';
END $$;

-- Vector similarity search indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_conversations_embedding ON conversations USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_files_embedding ON files USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_projects_embedding ON projects USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Standard indexes for queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON conversations(is_pinned) WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_type ON files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_user_id ON knowledge_base(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_project_id ON knowledge_base(project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source ON knowledge_base(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_created_at ON knowledge_base(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_user_id ON audio_transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_status ON audio_transcriptions(status);
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_created_at ON audio_transcriptions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

INSERT INTO migration_history (migration_name, success)
VALUES ('03_indexes', true)
ON CONFLICT (migration_name) DO NOTHING;

-- ================================================================================================
-- PHASE 5: SEMANTIC SEARCH FUNCTION
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 5: Creating Semantic Search Function...';
END $$;

CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_user_id text DEFAULT NULL,
  filter_project_id text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  user_id text,
  project_id text,
  title text,
  content text,
  source_type text,
  source_id text,
  tags text[],
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.user_id,
    kb.project_id,
    kb.title,
    kb.content,
    kb.source_type,
    kb.source_id,
    kb.tags,
    1 - (kb.embedding <=> query_embedding) as similarity,
    kb.created_at
  FROM knowledge_base kb
  WHERE
    (filter_user_id IS NULL OR kb.user_id = filter_user_id)
    AND (filter_project_id IS NULL OR kb.project_id = filter_project_id)
    AND kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

INSERT INTO migration_history (migration_name, success)
VALUES ('04_search_function', true)
ON CONFLICT (migration_name) DO NOTHING;

-- ================================================================================================
-- PHASE 6: NOTIFICATIONS SYSTEM
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 6: Creating Notifications System...';
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT ('notif_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'budget_alert')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications;
CREATE POLICY "Users can manage own notifications" ON notifications
  FOR ALL USING (user_id = current_user);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

INSERT INTO migration_history (migration_name, success)
VALUES ('05_notifications', true)
ON CONFLICT (migration_name) DO NOTHING;

-- ================================================================================================
-- PHASE 7: BACKUP SYSTEM
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 7: Creating Backup System...';
END $$;

CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY DEFAULT ('backup_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  backup_type TEXT DEFAULT 'full' CHECK (backup_type IN ('full', 'incremental', 'manual')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  file_path TEXT,
  drive_file_id TEXT,
  size_bytes BIGINT,
  file_count INTEGER,
  duration_seconds INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own backups" ON backups;
CREATE POLICY "Users can view own backups" ON backups
  FOR SELECT USING (user_id = current_user);

CREATE INDEX IF NOT EXISTS idx_backups_user_id ON backups(user_id);
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at DESC);

INSERT INTO migration_history (migration_name, success)
VALUES ('06_backups', true)
ON CONFLICT (migration_name) DO NOTHING;

-- ================================================================================================
-- PHASE 8: COST TRACKING SYSTEM
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 8: Creating Cost Tracking System...';
END $$;

-- Cost models table (pricing reference)
CREATE TABLE IF NOT EXISTS cost_models (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  cost_per_1k_input_tokens NUMERIC(10, 6) NOT NULL,
  cost_per_1k_output_tokens NUMERIC(10, 6) NOT NULL,
  cost_per_1k_image_tokens NUMERIC(10, 6),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, model_name)
);

-- API cost tracking table
CREATE TABLE IF NOT EXISTS api_cost_tracking (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id TEXT,
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  provider TEXT DEFAULT 'openai',
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  request_duration_ms INTEGER,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'cached')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_cost_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own costs" ON api_cost_tracking;
CREATE POLICY "Users can view own costs" ON api_cost_tracking
  FOR SELECT USING (user_id = current_user);

CREATE INDEX IF NOT EXISTS idx_api_cost_tracking_user_id ON api_cost_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_api_cost_tracking_timestamp ON api_cost_tracking(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_cost_tracking_model ON api_cost_tracking(model);
CREATE INDEX IF NOT EXISTS idx_api_cost_tracking_provider ON api_cost_tracking(provider);

-- Budget configuration table
CREATE TABLE IF NOT EXISTS budget_config (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  daily_limit_usd NUMERIC(10, 2) DEFAULT 5.00,
  monthly_limit_usd NUMERIC(10, 2) DEFAULT 100.00,
  alert_threshold_pct INTEGER DEFAULT 80,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE budget_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own budget" ON budget_config;
CREATE POLICY "Users can manage own budget" ON budget_config
  FOR ALL USING (user_id = current_user);

-- Budget alerts table
CREATE TABLE IF NOT EXISTS budget_alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('daily', 'monthly')),
  threshold_pct INTEGER NOT NULL,
  amount_spent_usd NUMERIC(10, 2) NOT NULL,
  limit_usd NUMERIC(10, 2) NOT NULL,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own alerts" ON budget_alerts;
CREATE POLICY "Users can view own alerts" ON budget_alerts
  FOR SELECT USING (user_id = current_user);

-- Insert default pricing for common models
INSERT INTO cost_models (provider, model_name, cost_per_1k_input_tokens, cost_per_1k_output_tokens)
VALUES
  ('openai', 'gpt-4o', 0.0025, 0.01),
  ('openai', 'gpt-4o-mini', 0.00015, 0.0006),
  ('openai', 'gpt-4-turbo', 0.01, 0.03),
  ('openai', 'gpt-3.5-turbo', 0.0005, 0.0015),
  ('openai', 'text-embedding-3-small', 0.00002, 0),
  ('openai', 'text-embedding-3-large', 0.00013, 0),
  ('anthropic', 'claude-3-5-sonnet-20241022', 0.003, 0.015),
  ('anthropic', 'claude-3-opus-20240229', 0.015, 0.075),
  ('anthropic', 'claude-3-sonnet-20240229', 0.003, 0.015),
  ('anthropic', 'claude-3-haiku-20240307', 0.00025, 0.00125)
ON CONFLICT (provider, model_name) DO UPDATE
SET
  cost_per_1k_input_tokens = EXCLUDED.cost_per_1k_input_tokens,
  cost_per_1k_output_tokens = EXCLUDED.cost_per_1k_output_tokens,
  updated_at = NOW();

INSERT INTO migration_history (migration_name, success)
VALUES ('07_cost_tracking', true)
ON CONFLICT (migration_name) DO NOTHING;

-- ================================================================================================
-- PHASE 9: MODEL PERFORMANCE TRACKING (Phase 4 Feature)
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 9: Creating Model Performance Tracking...';
END $$;

CREATE TABLE IF NOT EXISTS model_performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  task_type TEXT,
  response_time_ms INTEGER NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  error_occurred BOOLEAN DEFAULT false,
  error_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE model_performance_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own performance metrics" ON model_performance_metrics;
CREATE POLICY "Users can view own performance metrics" ON model_performance_metrics
  FOR SELECT USING (user_id = current_user);

CREATE INDEX IF NOT EXISTS idx_model_performance_user_id ON model_performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_model_performance_model ON model_performance_metrics(model_name);
CREATE INDEX IF NOT EXISTS idx_model_performance_created_at ON model_performance_metrics(created_at DESC);

INSERT INTO migration_history (migration_name, success)
VALUES ('08_model_performance', true)
ON CONFLICT (migration_name) DO NOTHING;

-- ================================================================================================
-- PHASE 10: GOOGLE WORKSPACE INTEGRATION
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 10: Creating Google Workspace Integration Tables...';
END $$;

-- Indexing state table (for Gmail/Drive sync)
CREATE TABLE IF NOT EXISTS indexing_state (
  id TEXT PRIMARY KEY DEFAULT ('idx_state_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('gmail', 'drive', 'calendar')),
  last_indexed_at TIMESTAMPTZ,
  cursor TEXT,
  page_token TEXT,
  sync_token TEXT,
  items_indexed INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  last_error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service)
);

ALTER TABLE indexing_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own indexing state" ON indexing_state;
CREATE POLICY "Users can manage own indexing state" ON indexing_state
  FOR ALL USING (user_id = current_user);

-- Drive edit approval table
CREATE TABLE IF NOT EXISTS drive_edit_requests (
  id TEXT PRIMARY KEY DEFAULT ('edit_req_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  proposed_changes TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE drive_edit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own edit requests" ON drive_edit_requests;
CREATE POLICY "Users can manage own edit requests" ON drive_edit_requests
  FOR ALL USING (user_id = current_user);

-- Zapier webhook logs
CREATE TABLE IF NOT EXISTS zapier_webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  webhook_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response JSONB,
  status_code INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO migration_history (migration_name, success)
VALUES ('09_google_workspace', true)
ON CONFLICT (migration_name) DO NOTHING;

-- ================================================================================================
-- PHASE 11: DEVICE SYNC & CONTINUITY
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 11: Creating Device Sync System...';
END $$;

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY DEFAULT ('dev_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'web')),
  user_agent TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own devices" ON devices;
CREATE POLICY "Users can manage own devices" ON devices
  FOR ALL USING (user_id = current_user);

-- Device sync queue
CREATE TABLE IF NOT EXISTS device_sync_queue (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  target_device_id TEXT,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('context', 'conversation', 'file', 'settings')),
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
  synced_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE device_sync_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own sync queue" ON device_sync_queue;
CREATE POLICY "Users can manage own sync queue" ON device_sync_queue
  FOR ALL USING (user_id = current_user);

-- Device context table
CREATE TABLE IF NOT EXISTS device_context (
  id TEXT PRIMARY KEY DEFAULT ('ctx_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL,
  context_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(device_id, context_type)
);

ALTER TABLE device_context ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own device context" ON device_context;
CREATE POLICY "Users can manage own device context" ON device_context
  FOR ALL USING (user_id = current_user);

INSERT INTO migration_history (migration_name, success)
VALUES ('10_device_sync', true)
ON CONFLICT (migration_name) DO NOTHING;

-- ================================================================================================
-- PHASE 12: AUTONOMOUS AGENTS
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 12: Creating Autonomous Agent System...';
END $$;

-- Agent tasks table
CREATE TABLE IF NOT EXISTS agent_tasks (
  id TEXT PRIMARY KEY DEFAULT ('task_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  description TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  result JSONB,
  error_message TEXT,
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_priority ON agent_tasks(priority DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_scheduled ON agent_tasks(scheduled_for);

-- Agent findings table
CREATE TABLE IF NOT EXISTS agent_findings (
  id TEXT PRIMARY KEY DEFAULT ('finding_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES agent_tasks(id) ON DELETE CASCADE,
  finding_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  confidence FLOAT CHECK (confidence BETWEEN 0 AND 1),
  actionable BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_findings_user_id ON agent_findings(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_findings_actionable ON agent_findings(actionable) WHERE actionable = true;

-- Agent execution log
CREATE TABLE IF NOT EXISTS agent_execution_log (
  id BIGSERIAL PRIMARY KEY,
  task_id TEXT REFERENCES agent_tasks(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_execution_log_task_id ON agent_execution_log(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_execution_log_created_at ON agent_execution_log(created_at DESC);

INSERT INTO migration_history (migration_name, success)
VALUES ('11_autonomous_agents', true)
ON CONFLICT (migration_name) DO NOTHING;

-- ================================================================================================
-- PHASE 13: MCP (Model Context Protocol) SERVERS
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 13: Creating MCP Server Management...';
END $$;

-- MCP servers table
CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY DEFAULT ('mcp_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  name TEXT NOT NULL UNIQUE,
  command TEXT NOT NULL,
  args TEXT[] DEFAULT '{}',
  env JSONB DEFAULT '{}',
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error', 'starting', 'stopping')),
  active BOOLEAN DEFAULT true,
  auto_start BOOLEAN DEFAULT false,
  description TEXT,
  last_health_check TIMESTAMPTZ,
  health_status TEXT CHECK (health_status IN ('healthy', 'unhealthy', 'unknown')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MCP tools table (capabilities)
CREATE TABLE IF NOT EXISTS mcp_tools (
  id SERIAL PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  description TEXT,
  input_schema JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, tool_name)
);

-- MCP health checks table
CREATE TABLE IF NOT EXISTS mcp_health_checks (
  id BIGSERIAL PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'unhealthy', 'timeout', 'error')),
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_health_checks_server_id ON mcp_health_checks(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_health_checks_created_at ON mcp_health_checks(created_at DESC);

INSERT INTO migration_history (migration_name, success)
VALUES ('12_mcp_servers', true)
ON CONFLICT (migration_name) DO NOTHING;

-- ================================================================================================
-- PHASE 14: WORKFLOW AUTOMATION
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 14: Creating Workflow Automation...';
END $$;

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY DEFAULT ('wf_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('schedule', 'webhook', 'event', 'manual')),
  trigger_config JSONB NOT NULL,
  actions JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own workflows" ON workflows;
CREATE POLICY "Users can manage own workflows" ON workflows
  FOR ALL USING (user_id = current_user);

-- Workflow executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
  id TEXT PRIMARY KEY DEFAULT ('wf_exec_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  trigger_data JSONB,
  steps_completed INTEGER DEFAULT 0,
  steps_total INTEGER,
  result JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at DESC);

INSERT INTO migration_history (migration_name, success)
VALUES ('13_workflow_automation', true)
ON CONFLICT (migration_name) DO NOTHING;

-- ================================================================================================
-- PHASE 15: CHATGPT IMPORT
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 15: Creating ChatGPT Import Tables...';
END $$;

-- ChatGPT imports table
CREATE TABLE IF NOT EXISTS chatgpt_imports (
  id TEXT PRIMARY KEY DEFAULT ('import_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  imported_conversations INTEGER DEFAULT 0,
  failed_conversations INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE chatgpt_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own imports" ON chatgpt_imports;
CREATE POLICY "Users can view own imports" ON chatgpt_imports
  FOR SELECT USING (user_id = current_user);

INSERT INTO migration_history (migration_name, success)
VALUES ('14_chatgpt_import', true)
ON CONFLICT (migration_name) DO NOTHING;

-- ================================================================================================
-- PHASE 16: API LOGGING
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 16: Creating API Logging...';
END $$;

CREATE TABLE IF NOT EXISTS api_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  request_body JSONB,
  response_body JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON api_logs(status_code);

INSERT INTO migration_history (migration_name, success)
VALUES ('15_api_logs', true)
ON CONFLICT (migration_name) DO NOTHING;

-- ================================================================================================
-- COMPLETION
-- ================================================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All tables, indexes, and functions created successfully.';
  RAISE NOTICE 'Review the migration_history table for details.';
END $$;

-- Show migration summary
SELECT
  migration_name,
  applied_at,
  success,
  COALESCE(error_message, 'Success') as result
FROM migration_history
ORDER BY applied_at DESC;

-- Show table count
SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public';

-- Show RLS status
SELECT
  schemaname,
  COUNT(CASE WHEN rowsecurity THEN 1 END) as rls_enabled,
  COUNT(CASE WHEN NOT rowsecurity THEN 1 END) as rls_disabled
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY schemaname;
