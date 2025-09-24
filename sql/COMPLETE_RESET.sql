-- SUPABASE COMPLETE RESET AND FIX
-- Run this entire script in Supabase SQL Editor

-- 1. Drop everything first to start clean
DROP FUNCTION IF EXISTS search_messages_simple CASCADE;
DROP FUNCTION IF EXISTS match_messages CASCADE;
DROP FUNCTION IF EXISTS match_memories CASCADE;
DROP FUNCTION IF EXISTS search_similar_messages CASCADE;

DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 3. Create fresh tables
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Insert users
INSERT INTO users (name, email) VALUES 
  ('Zach', 'zach.kimble@gmail.com'),
  ('Rebecca', 'becky.aza.kimble@gmail.com');

-- 5. Create vector search function
CREATE OR REPLACE FUNCTION search_messages_simple(
  query_embedding vector(1536),
  user_id_param UUID,
  limit_count INT DEFAULT 15
)
RETURNS SETOF messages
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM messages
  WHERE 
    user_id = user_id_param
    AND embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT limit_count;
$$;

-- 6. Create indexes for performance
CREATE INDEX messages_embedding_idx 
  ON messages USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

CREATE INDEX messages_user_created_idx 
  ON messages(user_id, created_at DESC);

CREATE INDEX conversations_user_idx
  ON conversations(user_id);

-- 7. Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 8. Verify setup
SELECT 'Users created:' as status, COUNT(*) as count FROM users
UNION ALL
SELECT 'Tables ready:' as status, 3 as count
UNION ALL  
SELECT 'Vector extension:' as status, 1 as count WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector');
