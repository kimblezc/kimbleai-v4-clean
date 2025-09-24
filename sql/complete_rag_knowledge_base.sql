-- COMPLETE RAG SYSTEM WITH KNOWLEDGE BASE
-- Run this ENTIRE block in Supabase SQL Editor
-- Project: gbmefnaqsxtoseufjixp

-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base table (stores ALL types of information)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT CHECK (source_type IN ('conversation', 'file', 'email', 'drive', 'manual', 'extracted')),
  source_id TEXT, -- Reference to original source
  category TEXT, -- fact, preference, document, note, task, appointment, etc.
  title TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- Flexible storage for any data type
  embedding vector(1536),
  importance FLOAT DEFAULT 0.5,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- For temporary information
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
  storage_location TEXT, -- local path, drive URL, etc.
  content_hash TEXT,
  full_text TEXT, -- Extracted text content
  chunks JSONB, -- File broken into chunks for RAG
  metadata JSONB DEFAULT '{}',
  indexed_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP DEFAULT NOW()
);

-- Create indexes for file table
CREATE INDEX IF NOT EXISTS idx_files_user ON indexed_files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_type ON indexed_files(file_type);

-- Drop existing function if it exists (to avoid conflicts)
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

-- Quick stats function to check what's in the knowledge base
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

-- Add some initial test data to verify it's working
DO $$
DECLARE
  test_user_id UUID;
  test_embedding vector(1536);
BEGIN
  -- Get Zach's user ID
  SELECT id INTO test_user_id FROM users WHERE name = 'Zach' LIMIT 1;
  
  -- Only proceed if user exists
  IF test_user_id IS NOT NULL THEN
    -- Create a dummy embedding (in real use, this comes from OpenAI)
    test_embedding := array_fill(0.1, ARRAY[1536])::vector;
    
    -- Insert a test knowledge entry
    INSERT INTO knowledge_base (
      user_id, 
      source_type, 
      category, 
      title, 
      content,
      embedding,
      importance,
      tags
    ) VALUES (
      test_user_id,
      'manual',
      'test',
      'System Test Entry',
      'Knowledge base system is now active and ready for comprehensive memory storage',
      test_embedding,
      1.0,
      ARRAY['system', 'test', 'initial']
    ) ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Knowledge base tables created successfully!';
  END IF;
END $$;

-- Grant permissions for the service role
GRANT ALL ON knowledge_base TO service_role;
GRANT ALL ON indexed_files TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ KNOWLEDGE BASE SYSTEM CREATED SUCCESSFULLY!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - knowledge_base (for all information)';
  RAISE NOTICE '  - indexed_files (for document tracking)';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - search_knowledge_base() for RAG retrieval';
  RAISE NOTICE '  - get_knowledge_stats() for checking content';
  RAISE NOTICE '';
  RAISE NOTICE 'Your system can now store:';
  RAISE NOTICE '  - Conversations';
  RAISE NOTICE '  - Files and documents';
  RAISE NOTICE '  - Emails';
  RAISE NOTICE '  - Google Drive content';
  RAISE NOTICE '  - Manual notes';
  RAISE NOTICE '  - Extracted facts';
  RAISE NOTICE '===========================================';
END $$;