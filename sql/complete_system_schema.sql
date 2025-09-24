-- Complete KimbleAI System Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ================================
-- USERS AND AUTHENTICATION
-- ================================

-- Enhanced users table with full role management
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'viewer')) DEFAULT 'user',
  avatar_url TEXT,
  preferences JSONB DEFAULT '{
    "theme": "light",
    "language": "en",
    "timezone": "UTC",
    "notifications": {
      "email": true,
      "push": false,
      "mentions": true,
      "projects": true,
      "deadlines": true
    },
    "dashboard": {
      "default_view": "projects",
      "widgets_enabled": ["projects", "conversations", "calendar"],
      "layout": "comfortable"
    },
    "ai": {
      "response_style": "friendly",
      "auto_summarize": true,
      "proactive_suggestions": false,
      "context_length": "medium"
    }
  }',
  permissions JSONB DEFAULT '{
    "can_create_projects": true,
    "can_delete_projects": false,
    "can_manage_users": false,
    "can_access_analytics": false,
    "can_export_data": false,
    "can_configure_integrations": false,
    "can_view_all_conversations": false,
    "max_projects": 10,
    "max_collaborators_per_project": 5
  }',
  metadata JSONB DEFAULT '{
    "created_at": null,
    "last_login": null,
    "total_conversations": 0,
    "total_messages": 0,
    "favorite_projects": [],
    "google_connected": false,
    "calendar_sync_enabled": false,
    "drive_sync_enabled": false,
    "gmail_sync_enabled": false
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User tokens for Google OAuth
CREATE TABLE IF NOT EXISTS user_tokens (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User activity log
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================
-- PROJECTS AND ORGANIZATION
-- ================================

-- Enhanced projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'paused', 'archived')) DEFAULT 'active',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  owner_id TEXT NOT NULL,
  collaborators TEXT[] DEFAULT '{}',
  parent_project_id TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{
    "created_at": null,
    "updated_at": null,
    "deadline": null,
    "budget": null,
    "progress_percentage": 0,
    "client": null,
    "tech_stack": [],
    "repository_url": null,
    "deployment_url": null
  }',
  stats JSONB DEFAULT '{
    "total_conversations": 0,
    "total_messages": 0,
    "active_tasks": 0,
    "completed_tasks": 0,
    "last_activity": null
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Project tasks
CREATE TABLE IF NOT EXISTS project_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'review', 'completed', 'blocked')) DEFAULT 'todo',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  assigned_to TEXT,
  due_date TIMESTAMPTZ,
  estimated_hours INTEGER,
  actual_hours INTEGER,
  tags TEXT[] DEFAULT '{}',
  conversation_refs TEXT[] DEFAULT '{}',
  dependencies TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Project tags (global tag management)
CREATE TABLE IF NOT EXISTS project_tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#6366f1',
  category TEXT NOT NULL CHECK (category IN ('technical', 'business', 'client', 'priority', 'status', 'custom')) DEFAULT 'custom',
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================
-- CONVERSATIONS AND MESSAGES
-- ================================

-- Enhanced conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  status TEXT DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  participant_count INTEGER DEFAULT 1,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Enhanced messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  tokens_used INTEGER,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Conversation summaries for quick context
CREATE TABLE IF NOT EXISTS conversation_summaries (
  conversation_id TEXT PRIMARY KEY,
  summary TEXT NOT NULL,
  key_points TEXT[] DEFAULT '{}',
  participants TEXT[] DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  auto_generated BOOLEAN DEFAULT true,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- ================================
-- KNOWLEDGE BASE AND MEMORY
-- ================================

-- Enhanced knowledge base
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'conversation', 'drive', 'email', 'calendar', 'upload', 'manual'
  source_id TEXT,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  importance FLOAT DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
  confidence FLOAT DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Memory chunks from automatic extraction
CREATE TABLE IF NOT EXISTS memory_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  conversation_id TEXT,
  message_id TEXT,
  content TEXT NOT NULL,
  chunk_type TEXT NOT NULL CHECK (chunk_type IN ('fact', 'preference', 'decision', 'event', 'relationship', 'summary')),
  embedding vector(1536),
  importance FLOAT DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
  confidence FLOAT DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Message references for granular tracking
CREATE TABLE IF NOT EXISTS message_references (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  project_id TEXT,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- ================================
-- FILE MANAGEMENT
-- ================================

-- Indexed files from uploads
CREATE TABLE IF NOT EXISTS indexed_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  project_id TEXT,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  file_path TEXT,
  content_preview TEXT,
  full_text TEXT,
  chunks JSONB DEFAULT '[]',
  embedding vector(1536),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);

-- Project indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to ON project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(status);

-- Conversation indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Knowledge base indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_base_user_id ON knowledge_base(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source_type ON knowledge_base(source_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_importance ON knowledge_base(importance DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_created_at ON knowledge_base(created_at DESC);

-- Memory chunk indexes
CREATE INDEX IF NOT EXISTS idx_memory_chunks_user_id ON memory_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_chunks_conversation_id ON memory_chunks(conversation_id);
CREATE INDEX IF NOT EXISTS idx_memory_chunks_type ON memory_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_memory_chunks_importance ON memory_chunks(importance DESC);

-- Vector similarity indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_memory_chunks_embedding ON memory_chunks
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_messages_embedding ON messages
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_base_content_fts ON knowledge_base
USING gin(to_tsvector('english', content));

CREATE INDEX IF NOT EXISTS idx_messages_content_fts ON messages
USING gin(to_tsvector('english', content));

CREATE INDEX IF NOT EXISTS idx_projects_name_fts ON projects
USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ================================
-- VECTOR SEARCH FUNCTIONS
-- ================================

-- Enhanced knowledge base search
CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_embedding vector(1536),
  p_user_id TEXT,
  match_count INT DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  source_type TEXT,
  importance FLOAT,
  similarity FLOAT,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.category,
    kb.source_type,
    kb.importance,
    1 - (kb.embedding <=> query_embedding) AS similarity,
    kb.tags,
    kb.metadata,
    kb.created_at
  FROM knowledge_base kb
  WHERE kb.user_id = p_user_id
    AND 1 - (kb.embedding <=> query_embedding) > similarity_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Memory chunks search
CREATE OR REPLACE FUNCTION search_memory_chunks(
  query_embedding vector(1536),
  p_user_id TEXT,
  match_count INT DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  chunk_type TEXT,
  importance FLOAT,
  similarity FLOAT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    mc.id,
    mc.content,
    mc.chunk_type,
    mc.importance,
    1 - (mc.embedding <=> query_embedding) AS similarity,
    mc.metadata,
    mc.created_at
  FROM memory_chunks mc
  WHERE mc.user_id = p_user_id
    AND 1 - (mc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY mc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Comprehensive context search
CREATE OR REPLACE FUNCTION get_comprehensive_context(
  query_embedding vector(1536),
  p_user_id TEXT,
  include_recent_messages INT DEFAULT 10,
  include_memory_chunks INT DEFAULT 5,
  include_knowledge_items INT DEFAULT 5
)
RETURNS TABLE (
  context_type TEXT,
  content TEXT,
  source TEXT,
  importance FLOAT,
  similarity FLOAT,
  timestamp TIMESTAMPTZ,
  metadata JSONB
)
LANGUAGE SQL STABLE
AS $$
  -- Recent messages
  SELECT
    'recent_message' AS context_type,
    m.content,
    'messages' AS source,
    0.6 AS importance,
    0.0 AS similarity,
    m.created_at AS timestamp,
    json_build_object('conversation_id', m.conversation_id, 'role', m.role) AS metadata
  FROM messages m
  WHERE m.user_id = p_user_id
  ORDER BY m.created_at DESC
  LIMIT include_recent_messages

  UNION ALL

  -- Relevant memory chunks
  SELECT
    'memory_chunk' AS context_type,
    mc.content,
    'memory' AS source,
    mc.importance,
    mc.similarity,
    mc.created_at AS timestamp,
    mc.metadata
  FROM search_memory_chunks(query_embedding, p_user_id, include_memory_chunks) mc

  UNION ALL

  -- Relevant knowledge base items
  SELECT
    'knowledge_item' AS context_type,
    kb.content,
    'knowledge_base' AS source,
    kb.importance,
    kb.similarity,
    kb.created_at AS timestamp,
    kb.metadata
  FROM search_knowledge_base(query_embedding, p_user_id, include_knowledge_items) kb

  ORDER BY importance DESC, similarity DESC, timestamp DESC;
$$;

-- ================================
-- ROW LEVEL SECURITY
-- ================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE indexed_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: Can access own data, admins can access all
CREATE POLICY "Users can access own data" ON users
  FOR ALL USING (id = current_setting('app.current_user_id', true) OR
                EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin'));

-- User tokens: Own tokens only
CREATE POLICY "Users can access own tokens" ON user_tokens
  FOR ALL USING (user_id = current_setting('app.current_user_id', true));

-- Projects: Owners and collaborators can access
CREATE POLICY "Project access control" ON projects
  FOR ALL USING (owner_id = current_setting('app.current_user_id', true) OR
                current_setting('app.current_user_id', true) = ANY(collaborators) OR
                EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin'));

-- Conversations: User's own conversations
CREATE POLICY "Conversation access control" ON conversations
  FOR ALL USING (user_id = current_setting('app.current_user_id', true) OR
                EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin'));

-- Messages: User's own messages
CREATE POLICY "Message access control" ON messages
  FOR ALL USING (user_id = current_setting('app.current_user_id', true) OR
                EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin'));

-- Knowledge base: User's own knowledge
CREATE POLICY "Knowledge base access control" ON knowledge_base
  FOR ALL USING (user_id = current_setting('app.current_user_id', true));

-- Memory chunks: User's own memory
CREATE POLICY "Memory chunks access control" ON memory_chunks
  FOR ALL USING (user_id = current_setting('app.current_user_id', true));

-- ================================
-- TRIGGERS AND FUNCTIONS
-- ================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update conversation message count
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE conversations
    SET message_count = message_count + 1,
        last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE conversations
    SET message_count = message_count - 1
    WHERE id = OLD.conversation_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_stats AFTER INSERT OR DELETE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_message_count();

-- ================================
-- INITIAL DATA
-- ================================

-- Insert default users (Zach as Admin, Rebecca as User)
INSERT INTO users (id, name, email, role, permissions, metadata) VALUES
(
  'zach-admin-001',
  'Zach',
  'zach@kimbleai.com',
  'admin',
  '{
    "can_create_projects": true,
    "can_delete_projects": true,
    "can_manage_users": true,
    "can_access_analytics": true,
    "can_export_data": true,
    "can_configure_integrations": true,
    "can_view_all_conversations": true,
    "max_projects": -1,
    "max_collaborators_per_project": -1
  }',
  json_build_object(
    'created_at', NOW(),
    'last_login', NOW(),
    'total_conversations', 0,
    'total_messages', 0,
    'favorite_projects', '[]'::json,
    'google_connected', false,
    'calendar_sync_enabled', false,
    'drive_sync_enabled', false,
    'gmail_sync_enabled', false
  )
),
(
  'rebecca-user-001',
  'Rebecca',
  'rebecca@kimbleai.com',
  'user',
  '{
    "can_create_projects": true,
    "can_delete_projects": false,
    "can_manage_users": false,
    "can_access_analytics": false,
    "can_export_data": false,
    "can_configure_integrations": false,
    "can_view_all_conversations": false,
    "max_projects": 10,
    "max_collaborators_per_project": 5
  }',
  json_build_object(
    'created_at', NOW(),
    'last_login', NOW(),
    'total_conversations', 0,
    'total_messages', 0,
    'favorite_projects', '[]'::json,
    'google_connected', false,
    'calendar_sync_enabled', false,
    'drive_sync_enabled', false,
    'gmail_sync_enabled', false
  )
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  updated_at = NOW();

-- Insert default project tags
INSERT INTO project_tags (id, name, color, category, description, created_by) VALUES
('tag-frontend', 'frontend', '#3b82f6', 'technical', 'Frontend development related', 'zach-admin-001'),
('tag-backend', 'backend', '#10b981', 'technical', 'Backend development related', 'zach-admin-001'),
('tag-ai', 'ai', '#8b5cf6', 'technical', 'AI and machine learning related', 'zach-admin-001'),
('tag-urgent', 'urgent', '#ef4444', 'priority', 'High priority items', 'zach-admin-001'),
('tag-client', 'client', '#f59e0b', 'business', 'Client-related work', 'zach-admin-001')
ON CONFLICT (name) DO NOTHING;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create indexes on JSONB fields for better performance
CREATE INDEX IF NOT EXISTS idx_users_preferences_gin ON users USING gin(preferences);
CREATE INDEX IF NOT EXISTS idx_users_metadata_gin ON users USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_projects_metadata_gin ON projects USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_projects_stats_gin ON projects USING gin(stats);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_metadata_gin ON knowledge_base USING gin(metadata);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_messages_user_conversation ON messages(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_user_source ON knowledge_base(user_id, source_type);
CREATE INDEX IF NOT EXISTS idx_projects_owner_status ON projects(owner_id, status);

COMMENT ON TABLE users IS 'User accounts with role-based permissions and preferences';
COMMENT ON TABLE projects IS 'Projects with hierarchical organization and collaboration features';
COMMENT ON TABLE knowledge_base IS 'AI-powered knowledge base with vector embeddings';
COMMENT ON TABLE memory_chunks IS 'Automatically extracted memory chunks from conversations';
COMMENT ON FUNCTION search_knowledge_base IS 'Vector similarity search for knowledge base items';
COMMENT ON FUNCTION get_comprehensive_context IS 'Retrieves comprehensive context for AI responses';