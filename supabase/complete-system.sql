-- KIMBLEAI V4 COMPLETE SUPABASE SCHEMA
-- Dynamic Projects, Tagging, and Persistent Memory with Zapier Integration

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users table (Zach and Rebecca)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Dynamic projects (auto-created by Zapier)
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  color TEXT DEFAULT '#3B82F6',
  icon TEXT,
  description TEXT,
  auto_created BOOLEAN DEFAULT FALSE,
  conversation_count INTEGER DEFAULT 0,
  last_activity TIMESTAMP DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, user_id)
);

-- Conversations with project and tag support
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  title TEXT,
  tags TEXT[],
  auto_organized BOOLEAN DEFAULT FALSE,
  organization_confidence FLOAT,
  is_family_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Memory chunks for semantic search (populated by Zapier)
CREATE TABLE IF NOT EXISTS memory_chunks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  conversation_id TEXT,
  content TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN ('fact', 'preference', 'event', 'knowledge', 'instruction')),
  embedding vector(1536),
  relevance_score FLOAT DEFAULT 1.0,
  is_family_shared BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tags table for tag management
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversation tags junction table
CREATE TABLE IF NOT EXISTS conversation_tags (
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (conversation_id, tag_id)
);

-- Zapier webhook logs
CREATE TABLE IF NOT EXISTS zapier_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  webhook_type TEXT,
  payload JSONB,
  response JSONB,
  success BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Deployment logs (for auto-fixing)
CREATE TABLE IF NOT EXISTS deployment_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  deployment_id TEXT,
  error_message TEXT,
  suggested_fix TEXT,
  auto_fixed BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_embedding ON messages USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_memory_embedding ON memory_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_memory_user ON memory_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

-- Function to search memories with vector similarity
CREATE OR REPLACE FUNCTION search_similar_messages(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.75,
  match_count INT DEFAULT 10,
  user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  memory_id UUID,
  content TEXT,
  similarity FLOAT,
  conversation_id TEXT,
  content_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mc.id as memory_id,
    mc.content,
    1 - (mc.embedding <=> query_embedding) as similarity,
    mc.conversation_id,
    mc.content_type
  FROM memory_chunks mc
  WHERE 
    (user_id IS NULL OR mc.user_id = user_id OR mc.is_family_shared = true)
    AND mc.embedding IS NOT NULL
    AND 1 - (mc.embedding <=> query_embedding) > match_threshold
  ORDER BY mc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-archive inactive projects
CREATE OR REPLACE FUNCTION archive_inactive_projects()
RETURNS void AS $$
BEGIN
  UPDATE projects
  SET archived = true
  WHERE 
    last_activity < NOW() - INTERVAL '30 days'
    AND archived = false
    AND auto_created = true;
END;
$$ LANGUAGE plpgsql;

-- Function to increment project conversation count
CREATE OR REPLACE FUNCTION increment_project_count(project_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE projects
  SET 
    conversation_count = conversation_count + 1,
    last_activity = NOW()
  WHERE id = project_id;
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Everyone can see everything (family use)
CREATE POLICY "Family access all" ON users FOR ALL USING (true);
CREATE POLICY "Family access all" ON projects FOR ALL USING (true);
CREATE POLICY "Family access all" ON conversations FOR ALL USING (true);
CREATE POLICY "Family access all" ON messages FOR ALL USING (true);
CREATE POLICY "Family access all" ON memory_chunks FOR ALL USING (true);
CREATE POLICY "Family access all" ON tags FOR ALL USING (true);

-- Insert family members
INSERT INTO users (email, name, role) VALUES 
  ('zach@kimbleai.com', 'Zach', 'admin'),
  ('rebecca@kimbleai.com', 'Rebecca', 'user')
ON CONFLICT (email) DO NOTHING;

-- Insert some default projects
INSERT INTO projects (name, user_id, color, icon, auto_created) 
SELECT 'Personal', id, '#3B82F6', '👤', false FROM users WHERE name = 'Zach'
ON CONFLICT DO NOTHING;

INSERT INTO projects (name, user_id, color, icon, auto_created) 
SELECT 'Work', id, '#10B981', '💼', false FROM users WHERE name = 'Zach'
ON CONFLICT DO NOTHING;

INSERT INTO projects (name, user_id, color, icon, auto_created) 
SELECT 'Family', id, '#EC4899', '👨‍👩‍👧‍👦', false FROM users WHERE name = 'Rebecca'
ON CONFLICT DO NOTHING;