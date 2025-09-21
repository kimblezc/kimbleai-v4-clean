-- COMPLETE RAG SYSTEM WITH KNOWLEDGE BASE
-- Fixed version - Run this ENTIRE block in Supabase SQL Editor
-- Project: gbmefnaqsxtoseufjixp

-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base table (stores ALL types of information)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT CHECK (source_type IN ('conversation', 'file', 'email', 'drive', 'manual', 'extracted')),
  source_id TEXT,
  category TEXT,
  title TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536),
  importance FLOAT DEFAULT 0.5,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_knowledge_user ON knowledge_base(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge_base(source_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON knowledge_base USING hnsw (embedding vector_cosine_ops);

-- File storage table
CREATE TABLE IF NOT EXISTS indexed_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_location TEXT,
  content_hash TEXT,
  full_text TEXT,
  chunks JSONB,
  metadata JSONB DEFAULT '{}',
  indexed_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP DEFAULT NOW()
);

-- Create indexes for file table
CREATE INDEX IF NOT EXISTS idx_files_user ON indexed_files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_type ON indexed_files(file_type);

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS search_knowledge_base CASCADE;

-- Enhanced search function that searches EVERYTHING
CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_embedding vector(1536),
  user_id_param UUID,
  limit_count INT DEFAULT 20,
  category_filter TEXT DEFAULT NULL,
  source_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  source_type TEXT,
  category TEXT,
  title TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.id,
    kb.source_type,
    kb.category,
    kb.title,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) as similarity
  FROM knowledge_base kb
  WHERE kb.user_id = user_id_param
    AND kb.is_active = true
    AND (category_filter IS NULL OR kb.category = category_filter)
    AND (source_filter IS NULL OR kb.source_type = source_filter)
    AND kb.embedding IS NOT NULL
  ORDER BY kb.embedding <=> query_embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Quick stats function
CREATE OR REPLACE FUNCTION get_knowledge_stats(user_id_param UUID)
RETURNS TABLE(
  source_type TEXT,
  category TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.source_type,
    kb.category,
    COUNT(*)::BIGINT
  FROM knowledge_base kb
  WHERE kb.user_id = user_id_param
  GROUP BY kb.source_type, kb.category
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON knowledge_base TO service_role;
GRANT ALL ON indexed_files TO service_role;

-- Success verification
DO $$
BEGIN
  RAISE NOTICE 'KNOWLEDGE BASE SYSTEM CREATED SUCCESSFULLY!';
  RAISE NOTICE 'Tables: knowledge_base, indexed_files';
  RAISE NOTICE 'Functions: search_knowledge_base, get_knowledge_stats';
  RAISE NOTICE 'Ready for comprehensive RAG implementation';
END $$;