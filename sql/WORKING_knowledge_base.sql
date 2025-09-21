-- FIX FOR USER_ID COLUMN ISSUE
-- The column is user_id (lowercase, no quotes)
-- Run this ENTIRE block in Supabase SQL Editor

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge base table with CORRECT column reference
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- NO QUOTES on user_id!
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

-- Create file storage table with CORRECT column reference
CREATE TABLE IF NOT EXISTS indexed_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- NO QUOTES on user_id!
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

-- Create all indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_user ON knowledge_base(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge_base(source_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON knowledge_base USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_files_user ON indexed_files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_type ON indexed_files(file_type);

-- Create search function with CORRECT column reference
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
  WHERE kb.user_id = user_id_param  -- NO QUOTES!
    AND kb.is_active = true
    AND (category_filter IS NULL OR kb.category = category_filter)
    AND (source_filter IS NULL OR kb.source_type = source_filter)
    AND kb.embedding IS NOT NULL
  ORDER BY kb.embedding <=> query_embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Stats function with CORRECT column reference
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
  WHERE kb.user_id = user_id_param  -- NO QUOTES!
  GROUP BY kb.source_type, kb.category
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON knowledge_base TO service_role;
GRANT ALL ON indexed_files TO service_role;
GRANT ALL ON knowledge_base TO anon;
GRANT ALL ON indexed_files TO anon;

-- Success message
SELECT 'SUCCESS: Knowledge base tables created!' as status;