-- ADD EMBEDDING COLUMNS AND SEARCH FUNCTIONS
-- Enhances existing tables with vector embeddings for semantic search
-- Run this in Supabase SQL Editor

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================
-- ADD EMBEDDING COLUMNS
-- ================================

-- Add embedding column to messages table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE messages ADD COLUMN embedding vector(1536);
    RAISE NOTICE 'Added embedding column to messages table';
  ELSE
    RAISE NOTICE 'Embedding column already exists in messages table';
  END IF;
END $$;

-- Add embedding column to audio_transcriptions table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audio_transcriptions' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE audio_transcriptions ADD COLUMN embedding vector(1536);
    RAISE NOTICE 'Added embedding column to audio_transcriptions table';
  ELSE
    RAISE NOTICE 'Embedding column already exists in audio_transcriptions table';
  END IF;
END $$;

-- Update indexed_files table to ensure embedding column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'indexed_files' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE indexed_files ADD COLUMN embedding vector(1536);
    RAISE NOTICE 'Added embedding column to indexed_files table';
  ELSE
    RAISE NOTICE 'Embedding column already exists in indexed_files table';
  END IF;
END $$;

-- ================================
-- CREATE VECTOR INDEXES
-- ================================

-- Messages embedding index (using HNSW for better performance)
DROP INDEX IF EXISTS idx_messages_embedding;
CREATE INDEX idx_messages_embedding ON messages
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Audio transcriptions embedding index
DROP INDEX IF EXISTS idx_transcriptions_embedding;
CREATE INDEX idx_transcriptions_embedding ON audio_transcriptions
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Indexed files embedding index (if not already exists from schema)
DROP INDEX IF EXISTS idx_indexed_files_embedding;
CREATE INDEX idx_indexed_files_embedding ON indexed_files
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ================================
-- SEARCH FUNCTIONS
-- ================================

-- Search messages by semantic similarity
CREATE OR REPLACE FUNCTION match_messages(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_user_id text DEFAULT NULL,
  p_project_id text DEFAULT NULL,
  p_conversation_id text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  content text,
  role text,
  conversation_id text,
  user_id text,
  created_at timestamptz,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.role,
    m.conversation_id,
    m.user_id,
    m.created_at,
    m.metadata,
    1 - (m.embedding <=> query_embedding) as similarity
  FROM messages m
  WHERE m.embedding IS NOT NULL
    AND (p_user_id IS NULL OR m.user_id = p_user_id)
    AND (p_conversation_id IS NULL OR m.conversation_id = p_conversation_id)
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Search files by semantic similarity
CREATE OR REPLACE FUNCTION match_files(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_user_id text DEFAULT NULL,
  p_project_id text DEFAULT NULL,
  p_file_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  filename text,
  file_type text,
  full_text text,
  content_preview text,
  user_id text,
  project_id text,
  created_at timestamptz,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.filename,
    f.file_type,
    f.full_text,
    f.content_preview,
    f.user_id,
    f.project_id,
    f.created_at,
    f.metadata,
    1 - (f.embedding <=> query_embedding) as similarity
  FROM indexed_files f
  WHERE f.embedding IS NOT NULL
    AND (p_user_id IS NULL OR f.user_id = p_user_id)
    AND (p_project_id IS NULL OR f.project_id = p_project_id)
    AND (p_file_type IS NULL OR f.file_type = p_file_type)
    AND 1 - (f.embedding <=> query_embedding) > match_threshold
  ORDER BY f.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Search transcriptions by semantic similarity
CREATE OR REPLACE FUNCTION match_transcriptions(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_user_id text DEFAULT NULL,
  p_project_id text DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  filename text,
  text text,
  duration float,
  language text,
  user_id text,
  project_id text,
  created_at timestamptz,
  segments jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.filename,
    t.text,
    t.duration,
    t.language,
    t.user_id,
    t.project_id,
    t.created_at,
    t.segments,
    1 - (t.embedding <=> query_embedding) as similarity
  FROM audio_transcriptions t
  WHERE t.embedding IS NOT NULL
    AND (p_user_id IS NULL OR t.user_id = p_user_id)
    AND (p_project_id IS NULL OR t.project_id = p_project_id)
    AND (p_start_date IS NULL OR t.created_at >= p_start_date)
    AND (p_end_date IS NULL OR t.created_at <= p_end_date)
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Unified search across all content types
CREATE OR REPLACE FUNCTION search_all_content(
  query_embedding vector(1536),
  p_user_id text,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20,
  p_project_id text DEFAULT NULL,
  p_content_types text[] DEFAULT NULL
)
RETURNS TABLE (
  id text,
  content_type text,
  title text,
  content text,
  source_id text,
  project_id text,
  created_at timestamptz,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH all_results AS (
    -- Messages
    SELECT
      m.id::text as id,
      'message'::text as content_type,
      COALESCE(c.title, 'Untitled Conversation')::text as title,
      m.content,
      m.conversation_id::text as source_id,
      COALESCE(c.project_id, 'general')::text as project_id,
      m.created_at,
      m.metadata,
      1 - (m.embedding <=> query_embedding) as similarity
    FROM messages m
    LEFT JOIN conversations c ON c.id = m.conversation_id
    WHERE m.embedding IS NOT NULL
      AND m.user_id = p_user_id
      AND (p_project_id IS NULL OR c.project_id = p_project_id)
      AND (p_content_types IS NULL OR 'message' = ANY(p_content_types))
      AND 1 - (m.embedding <=> query_embedding) > match_threshold

    UNION ALL

    -- Files
    SELECT
      f.id::text as id,
      'file'::text as content_type,
      f.filename::text as title,
      COALESCE(f.content_preview, f.full_text, '')::text as content,
      f.id::text as source_id,
      COALESCE(f.project_id, 'general')::text as project_id,
      f.created_at,
      f.metadata,
      1 - (f.embedding <=> query_embedding) as similarity
    FROM indexed_files f
    WHERE f.embedding IS NOT NULL
      AND f.user_id = p_user_id
      AND (p_project_id IS NULL OR f.project_id = p_project_id)
      AND (p_content_types IS NULL OR 'file' = ANY(p_content_types))
      AND 1 - (f.embedding <=> query_embedding) > match_threshold

    UNION ALL

    -- Transcriptions
    SELECT
      t.id::text as id,
      'transcript'::text as content_type,
      t.filename::text as title,
      SUBSTRING(t.text, 1, 500)::text as content,
      t.id::text as source_id,
      COALESCE(t.project_id, 'general')::text as project_id,
      t.created_at,
      jsonb_build_object(
        'duration', t.duration,
        'language', t.language,
        'segments', t.segments
      ) as metadata,
      1 - (t.embedding <=> query_embedding) as similarity
    FROM audio_transcriptions t
    WHERE t.embedding IS NOT NULL
      AND t.user_id = p_user_id
      AND (p_project_id IS NULL OR t.project_id = p_project_id)
      AND (p_content_types IS NULL OR 'transcript' = ANY(p_content_types))
      AND 1 - (t.embedding <=> query_embedding) > match_threshold

    UNION ALL

    -- Knowledge Base
    SELECT
      kb.id::text as id,
      'knowledge'::text as content_type,
      kb.title::text as title,
      kb.content,
      kb.source_id::text as source_id,
      COALESCE(kb.metadata->>'project_id', 'general')::text as project_id,
      kb.created_at,
      kb.metadata,
      1 - (kb.embedding <=> query_embedding) as similarity
    FROM knowledge_base kb
    WHERE kb.embedding IS NOT NULL
      AND kb.user_id = p_user_id
      AND (p_project_id IS NULL OR kb.metadata->>'project_id' = p_project_id)
      AND (p_content_types IS NULL OR 'knowledge' = ANY(p_content_types))
      AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  )
  SELECT * FROM all_results
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- ================================
-- HELPER FUNCTIONS
-- ================================

-- Get search statistics
CREATE OR REPLACE FUNCTION get_search_stats(p_user_id text)
RETURNS TABLE (
  content_type text,
  total_items bigint,
  items_with_embeddings bigint,
  embedding_coverage_percent numeric
)
LANGUAGE sql
AS $$
  SELECT 'messages'::text as content_type,
         COUNT(*)::bigint as total_items,
         COUNT(embedding)::bigint as items_with_embeddings,
         ROUND((COUNT(embedding)::numeric / NULLIF(COUNT(*), 0) * 100), 2) as embedding_coverage_percent
  FROM messages WHERE user_id = p_user_id

  UNION ALL

  SELECT 'files'::text as content_type,
         COUNT(*)::bigint as total_items,
         COUNT(embedding)::bigint as items_with_embeddings,
         ROUND((COUNT(embedding)::numeric / NULLIF(COUNT(*), 0) * 100), 2) as embedding_coverage_percent
  FROM indexed_files WHERE user_id = p_user_id

  UNION ALL

  SELECT 'transcripts'::text as content_type,
         COUNT(*)::bigint as total_items,
         COUNT(embedding)::bigint as items_with_embeddings,
         ROUND((COUNT(embedding)::numeric / NULLIF(COUNT(*), 0) * 100), 2) as embedding_coverage_percent
  FROM audio_transcriptions WHERE user_id = p_user_id

  UNION ALL

  SELECT 'knowledge_base'::text as content_type,
         COUNT(*)::bigint as total_items,
         COUNT(embedding)::bigint as items_with_embeddings,
         ROUND((COUNT(embedding)::numeric / NULLIF(COUNT(*), 0) * 100), 2) as embedding_coverage_percent
  FROM knowledge_base WHERE user_id = p_user_id;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION match_messages TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION match_files TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION match_transcriptions TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_all_content TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_search_stats TO authenticated, service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ EMBEDDING COLUMNS AND SEARCH FUNCTIONS CREATED SUCCESSFULLY!';
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Enhanced tables:';
  RAISE NOTICE '  - messages (with vector embeddings)';
  RAISE NOTICE '  - audio_transcriptions (with vector embeddings)';
  RAISE NOTICE '  - indexed_files (with vector embeddings)';
  RAISE NOTICE '';
  RAISE NOTICE 'Search functions created:';
  RAISE NOTICE '  - match_messages() - Search messages semantically';
  RAISE NOTICE '  - match_files() - Search files semantically';
  RAISE NOTICE '  - match_transcriptions() - Search transcripts semantically';
  RAISE NOTICE '  - search_all_content() - Unified search across all content';
  RAISE NOTICE '  - get_search_stats() - View embedding coverage';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Run backfill script to generate embeddings for existing content';
  RAISE NOTICE '  2. Test search with: SELECT * FROM get_search_stats(''zach-admin-001'');';
  RAISE NOTICE '================================================================';
END $$;
