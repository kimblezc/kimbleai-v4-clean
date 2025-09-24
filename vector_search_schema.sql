-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;

-- Create or update users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create or update conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  project TEXT,
  tags TEXT[],
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create or update messages table with vector support
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create memory chunks for better context retrieval
CREATE TABLE IF NOT EXISTS memory_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  conversation_id TEXT,
  content TEXT NOT NULL,
  chunk_type TEXT CHECK (chunk_type IN ('message', 'summary', 'fact', 'decision', 'preference')),
  embedding vector(1536),
  importance FLOAT DEFAULT 0.5,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default users if not exist
INSERT INTO users (name, email) VALUES 
  ('Zach', 'zach.kimble@gmail.com'),
  ('Rebecca', 'becky.aza.kimble@gmail.com')
ON CONFLICT (name) DO NOTHING;

-- Create optimized indexes for vector search
CREATE INDEX IF NOT EXISTS messages_embedding_idx ON messages 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
  
CREATE INDEX IF NOT EXISTS memory_chunks_embedding_idx ON memory_chunks 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_messages_user_created ON messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_memory_user_created ON memory_chunks(user_id, created_at DESC);

-- Drop old function if exists
DROP FUNCTION IF EXISTS search_similar_messages CASCADE;

-- Create working vector similarity search function
CREATE OR REPLACE FUNCTION match_messages(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  role text,
  similarity float,
  created_at timestamp,
  conversation_id text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.role,
    1 - (m.embedding <=> query_embedding) AS similarity,
    m.created_at,
    m.conversation_id
  FROM messages m
  WHERE 
    m.user_id = match_messages.user_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create memory chunk search function
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  chunk_type text,
  similarity float,
  importance float,
  metadata jsonb,
  created_at timestamp
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.id,
    mc.content,
    mc.chunk_type,
    1 - (mc.embedding <=> query_embedding) AS similarity,
    mc.importance,
    mc.metadata,
    mc.created_at
  FROM memory_chunks mc
  WHERE 
    mc.user_id = match_memories.user_id
    AND mc.embedding IS NOT NULL
    AND 1 - (mc.embedding <=> query_embedding) > match_threshold
  ORDER BY 
    (mc.embedding <=> query_embedding) * (1.0 / (mc.importance + 0.1))
  LIMIT match_count;
END;
$$;

-- Create combined context search
CREATE OR REPLACE FUNCTION get_relevant_context(
  query_embedding vector(1536),
  user_id uuid,
  max_messages int DEFAULT 10,
  max_memories int DEFAULT 5,
  threshold float DEFAULT 0.7
)
RETURNS TABLE (
  source_type text,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Get relevant messages
  SELECT 
    'message'::text as source_type,
    m.content,
    m.similarity,
    jsonb_build_object(
      'role', m.role,
      'conversation_id', m.conversation_id,
      'created_at', m.created_at
    ) as metadata
  FROM match_messages(query_embedding, threshold, max_messages, user_id) m
  
  UNION ALL
  
  -- Get relevant memories
  SELECT
    'memory'::text as source_type,
    mc.content,
    mc.similarity,
    jsonb_build_object(
      'type', mc.chunk_type,
      'importance', mc.importance,
      'created_at', mc.created_at,
      'metadata', mc.metadata
    ) as metadata
  FROM match_memories(query_embedding, threshold, max_memories, user_id) mc
  
  ORDER BY similarity DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION match_messages TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION match_memories TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_relevant_context TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Verify installation
DO $$
BEGIN
  RAISE NOTICE 'Vector search functions created successfully!';
  RAISE NOTICE 'Functions available: match_messages, match_memories, get_relevant_context';
END $$;
