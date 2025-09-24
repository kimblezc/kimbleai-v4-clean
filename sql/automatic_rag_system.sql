-- Automatic RAG System Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for conversation summaries (for quick context)
CREATE TABLE IF NOT EXISTS conversation_summaries (
  conversation_id TEXT PRIMARY KEY,
  summary TEXT,
  message_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for memory chunks (extracted from messages)
CREATE TABLE IF NOT EXISTS memory_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id TEXT NOT NULL,
  message_id TEXT,
  content TEXT NOT NULL,
  chunk_type TEXT NOT NULL, -- 'fact', 'preference', 'decision', 'event', 'relationship', 'summary'
  embedding vector(1536),
  importance FLOAT DEFAULT 0.5,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Add foreign key constraints if your tables support them
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table for message references (detailed message tracking)
CREATE TABLE IF NOT EXISTS message_references (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  project_id TEXT,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memory_chunks_user_id ON memory_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_chunks_conversation_id ON memory_chunks(conversation_id);
CREATE INDEX IF NOT EXISTS idx_memory_chunks_type ON memory_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_memory_chunks_importance ON memory_chunks(importance DESC);
CREATE INDEX IF NOT EXISTS idx_memory_chunks_created_at ON memory_chunks(created_at DESC);

-- Vector similarity index for memory chunks
CREATE INDEX IF NOT EXISTS idx_memory_chunks_embedding ON memory_chunks
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Indexes for message references
CREATE INDEX IF NOT EXISTS idx_message_references_user_id ON message_references(user_id);
CREATE INDEX IF NOT EXISTS idx_message_references_conversation_id ON message_references(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_references_project_id ON message_references(project_id);
CREATE INDEX IF NOT EXISTS idx_message_references_role ON message_references(role);
CREATE INDEX IF NOT EXISTS idx_message_references_timestamp ON message_references(timestamp DESC);

-- Full text search index for message content
CREATE INDEX IF NOT EXISTS idx_message_references_content_fts ON message_references
USING gin(to_tsvector('english', content));

-- Indexes for conversation summaries
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_updated ON conversation_summaries(last_updated DESC);

-- Function to search memory chunks by vector similarity
CREATE OR REPLACE FUNCTION search_memory_chunks(
  query_embedding vector(1536),
  p_user_id UUID,
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

-- Function to get comprehensive context for a user query
CREATE OR REPLACE FUNCTION get_user_context(
  query_embedding vector(1536),
  p_user_id UUID,
  include_recent_messages INT DEFAULT 20,
  include_memory_chunks INT DEFAULT 10,
  include_knowledge_items INT DEFAULT 10
)
RETURNS TABLE (
  context_type TEXT,
  content TEXT,
  source TEXT,
  importance FLOAT,
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
    kb.created_at AS timestamp,
    kb.metadata
  FROM search_knowledge_base(query_embedding, p_user_id, include_knowledge_items) kb

  ORDER BY importance DESC, timestamp DESC;
$$;

-- Row Level Security policies
ALTER TABLE memory_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Policies for memory_chunks
CREATE POLICY "Users can access their own memory chunks" ON memory_chunks
  FOR ALL
  USING (auth.uid() = user_id);

-- Policies for message_references
CREATE POLICY "Users can access their own message references" ON message_references
  FOR ALL
  USING (auth.uid() = user_id);

-- Policies for conversation_summaries (allow access if user has access to conversation)
CREATE POLICY "Users can access summaries of their conversations" ON conversation_summaries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_summaries.conversation_id
      AND c.user_id = auth.uid()
    )
  );

-- Insert some initial test data to verify the system works
-- (This will be replaced by real data from the automatic indexing system)

-- Note: Make sure you have these base tables created first:
-- - users (with id as UUID primary key)
-- - conversations (with id, user_id, title, created_at, updated_at)
-- - messages (with id, conversation_id, user_id, role, content, embedding, created_at)
-- - knowledge_base (with the search_knowledge_base function)

-- Grant necessary permissions
GRANT ALL ON memory_chunks TO authenticated;
GRANT ALL ON message_references TO authenticated;
GRANT ALL ON conversation_summaries TO authenticated;

GRANT EXECUTE ON FUNCTION search_memory_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_context TO authenticated;