-- SUPABASE VECTOR/RAG FIX
-- Run in: https://supabase.com/dashboard/project/gbmefnaqsxtloseufjqp/sql

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop broken functions
DROP FUNCTION IF EXISTS search_similar_messages CASCADE;
DROP FUNCTION IF EXISTS match_messages CASCADE;
DROP FUNCTION IF EXISTS match_memories CASCADE;
DROP FUNCTION IF EXISTS search_messages_simple CASCADE;

-- Create tables
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT REFERENCES conversations(id),
  user_id UUID REFERENCES users(id),
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert users
INSERT INTO users (name, email) VALUES 
  ('Zach', 'zach.kimble@gmail.com'),
  ('Rebecca', 'becky.aza.kimble@gmail.com')
ON CONFLICT (name) DO NOTHING;

-- Create working vector search
CREATE OR REPLACE FUNCTION search_messages_simple(
  query_embedding vector(1536),
  user_id_param UUID,
  limit_count INT DEFAULT 15
)
RETURNS SETOF messages
LANGUAGE sql
AS $$
  SELECT *
  FROM messages
  WHERE 
    user_id = user_id_param
    AND embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT limit_count;
$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS messages_embedding_idx 
  ON messages USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);
CREATE INDEX IF NOT EXISTS messages_user_created_idx 
  ON messages(user_id, created_at DESC);

-- Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
