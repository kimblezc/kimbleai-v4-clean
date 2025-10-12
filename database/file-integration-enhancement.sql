-- ================================================================================================
-- FILE INTEGRATION ENHANCEMENT MIGRATION
-- ================================================================================================
-- Purpose: Add file_id column to knowledge_base and ensure vector support
-- Date: 2025-01-13
-- ================================================================================================

-- Ensure vector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Add file_id column to knowledge_base if it doesn't exist
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS file_id TEXT REFERENCES file_registry(id) ON DELETE CASCADE;

-- Ensure embedding column exists with correct dimensions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'knowledge_base'
    AND column_name = 'embedding'
  ) THEN
    ALTER TABLE knowledge_base ADD COLUMN embedding vector(1536);
  END IF;
END $$;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_base_file_id ON knowledge_base(file_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_user_file ON knowledge_base(user_id, file_id);

-- Create vector index for fast similarity search using HNSW
DROP INDEX IF EXISTS knowledge_base_embedding_idx;
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_hnsw_idx
ON knowledge_base USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Drop existing function(s) if they exist
DROP FUNCTION IF EXISTS search_knowledge_base CASCADE;

-- Create function for hybrid search (vector + keyword)
CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_embedding vector(1536),
  query_text text,
  user_id_param text,
  project_id_param text DEFAULT NULL,
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id text,
  title text,
  content text,
  category text,
  source_type text,
  source_id text,
  file_id text,
  similarity float,
  metadata jsonb,
  tags text[],
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.category,
    kb.source_type,
    kb.source_id,
    kb.file_id,
    1 - (kb.embedding <=> query_embedding) as similarity,
    kb.metadata,
    kb.tags,
    kb.created_at
  FROM knowledge_base kb
  WHERE
    kb.user_id = user_id_param
    AND kb.embedding IS NOT NULL
    AND (project_id_param IS NULL OR kb.metadata->>'project_id' = project_id_param)
    AND (
      -- Vector similarity match
      1 - (kb.embedding <=> query_embedding) > similarity_threshold
      OR
      -- Keyword match (full-text search)
      to_tsvector('english', kb.title || ' ' || kb.content) @@ plainto_tsquery('english', query_text)
    )
  ORDER BY
    -- Hybrid ranking: combine vector similarity with keyword relevance
    (1 - (kb.embedding <=> query_embedding)) * 0.7 +
    ts_rank(to_tsvector('english', kb.title || ' ' || kb.content), plainto_tsquery('english', query_text)) * 0.3 DESC
  LIMIT match_count;
END;
$$;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_related_files_semantic CASCADE;

-- Create function to get related files via semantic similarity
CREATE OR REPLACE FUNCTION get_related_files_semantic(
  file_id_param text,
  user_id_param text,
  similarity_threshold float DEFAULT 0.75,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  file_id text,
  filename text,
  mime_type text,
  file_source text,
  similarity float,
  preview_url text,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  file_embedding vector(1536);
BEGIN
  -- Get the average embedding for the source file
  SELECT AVG(embedding)::vector(1536) INTO file_embedding
  FROM knowledge_base
  WHERE knowledge_base.file_id = file_id_param
  AND embedding IS NOT NULL;

  IF file_embedding IS NULL THEN
    RETURN;
  END IF;

  -- Find similar files
  RETURN QUERY
  SELECT DISTINCT
    fr.id,
    fr.filename,
    fr.mime_type,
    fr.file_source,
    AVG(1 - (kb.embedding <=> file_embedding))::float as similarity,
    fr.preview_url,
    fr.created_at
  FROM knowledge_base kb
  JOIN file_registry fr ON fr.id = kb.file_id
  WHERE
    fr.user_id = user_id_param
    AND fr.id != file_id_param
    AND kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> file_embedding) > similarity_threshold
  GROUP BY fr.id, fr.filename, fr.mime_type, fr.file_source, fr.preview_url, fr.created_at
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Create view for file processing status
CREATE OR REPLACE VIEW file_processing_status AS
SELECT
  fr.id,
  fr.filename,
  fr.file_source,
  fr.mime_type,
  fr.processed,
  fr.indexed_at,
  COUNT(kb.id) as knowledge_entries_count,
  CASE
    WHEN fr.processed = false THEN 'pending'
    WHEN fr.processed = true AND COUNT(kb.id) = 0 THEN 'processed_no_content'
    WHEN fr.processed = true AND COUNT(kb.id) > 0 THEN 'indexed'
    ELSE 'unknown'
  END as status
FROM file_registry fr
LEFT JOIN knowledge_base kb ON kb.file_id = fr.id
GROUP BY fr.id, fr.filename, fr.file_source, fr.mime_type, fr.processed, fr.indexed_at;

-- Grant permissions
GRANT SELECT ON file_processing_status TO authenticated;
GRANT EXECUTE ON FUNCTION search_knowledge_base TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_related_files_semantic TO service_role, authenticated;

-- Comments
COMMENT ON COLUMN knowledge_base.file_id IS 'Links knowledge base entry to file registry for multi-format file support';
COMMENT ON FUNCTION search_knowledge_base IS 'Hybrid search combining vector similarity and keyword matching';
COMMENT ON FUNCTION get_related_files_semantic IS 'Find semantically related files based on content similarity';
COMMENT ON VIEW file_processing_status IS 'Shows processing and indexing status of all files';

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE '✅ File integration enhancement migration complete!';
  RAISE NOTICE '   - Vector extension enabled';
  RAISE NOTICE '   - file_id column added to knowledge_base';
  RAISE NOTICE '   - HNSW vector index created for fast similarity search';
  RAISE NOTICE '   - Hybrid search function created (vector + keyword)';
  RAISE NOTICE '   - Semantic file relation function created';
END $$;
