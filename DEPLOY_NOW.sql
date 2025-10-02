-- ============================================================================
-- KIMBLEAI V4 - PHASE 1 DATABASE DEPLOYMENT (FIXED)
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your project: gbmefnaqsxtoseufjixp
-- 3. Go to SQL Editor (left sidebar)
-- 4. Copy and paste this ENTIRE file
-- 5. Click "RUN"
-- 6. Wait for completion (should show success messages)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- STEP 1: ADD VECTOR EMBEDDING COLUMNS
-- ============================================================================

-- Messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE messages ADD COLUMN embedding vector(1536);
    RAISE NOTICE '✅ Added embedding column to messages';
  ELSE
    RAISE NOTICE '✅ Embedding column already exists in messages';
  END IF;
END $$;

-- Audio transcriptions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audio_transcriptions' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE audio_transcriptions ADD COLUMN embedding vector(1536);
    RAISE NOTICE '✅ Added embedding column to audio_transcriptions';
  ELSE
    RAISE NOTICE '✅ Embedding column already exists in audio_transcriptions';
  END IF;
END $$;

-- Indexed files table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'indexed_files' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE indexed_files ADD COLUMN embedding vector(1536);
    RAISE NOTICE '✅ Added embedding column to indexed_files';
  ELSE
    RAISE NOTICE '✅ Embedding column already exists in indexed_files';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE VECTOR INDEXES (for fast search)
-- ============================================================================

-- Messages embedding index
DROP INDEX IF EXISTS idx_messages_embedding;
CREATE INDEX IF NOT EXISTS idx_messages_embedding ON messages
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Audio transcriptions embedding index
DROP INDEX IF EXISTS idx_transcriptions_embedding;
CREATE INDEX IF NOT EXISTS idx_transcriptions_embedding ON audio_transcriptions
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Indexed files embedding index
DROP INDEX IF EXISTS idx_indexed_files_embedding;
CREATE INDEX IF NOT EXISTS idx_indexed_files_embedding ON indexed_files
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- STEP 3: CREATE SEARCH FUNCTIONS (FIXED TYPE CASTING)
-- ============================================================================

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
    -- Messages (handle both uuid and text user_id)
    SELECT
      m.id::text as id,
      'message'::text as content_type,
      COALESCE(c.title, 'Untitled Conversation')::text as title,
      m.content,
      m.conversation_id::text as source_id,
      COALESCE(c.project_id, 'general')::text as project_id,
      m.created_at,
      COALESCE(m.metadata, '{}'::jsonb) as metadata,
      1 - (m.embedding <=> query_embedding) as similarity
    FROM messages m
    LEFT JOIN conversations c ON c.id = m.conversation_id
    WHERE m.embedding IS NOT NULL
      AND m.user_id::text = p_user_id
      AND (p_project_id IS NULL OR c.project_id = p_project_id)
      AND (p_content_types IS NULL OR 'message' = ANY(p_content_types))
      AND 1 - (m.embedding <=> query_embedding) > match_threshold

    UNION ALL

    -- Files (handle both uuid and text user_id)
    SELECT
      f.id::text as id,
      'file'::text as content_type,
      f.filename::text as title,
      COALESCE(f.content_preview, f.full_text, '')::text as content,
      f.id::text as source_id,
      COALESCE(f.project_id, 'general')::text as project_id,
      f.created_at,
      COALESCE(f.metadata, '{}'::jsonb) as metadata,
      1 - (f.embedding <=> query_embedding) as similarity
    FROM indexed_files f
    WHERE f.embedding IS NOT NULL
      AND f.user_id::text = p_user_id
      AND (p_project_id IS NULL OR f.project_id = p_project_id)
      AND (p_content_types IS NULL OR 'file' = ANY(p_content_types))
      AND 1 - (f.embedding <=> query_embedding) > match_threshold

    UNION ALL

    -- Transcriptions (handle both uuid and text user_id)
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
        'segments', COALESCE(t.segments, '[]'::jsonb)
      ) as metadata,
      1 - (t.embedding <=> query_embedding) as similarity
    FROM audio_transcriptions t
    WHERE t.embedding IS NOT NULL
      AND t.user_id::text = p_user_id
      AND (p_project_id IS NULL OR t.project_id = p_project_id)
      AND (p_content_types IS NULL OR 'transcript' = ANY(p_content_types))
      AND 1 - (t.embedding <=> query_embedding) > match_threshold

    UNION ALL

    -- Knowledge Base (handle both uuid and text user_id)
    SELECT
      kb.id::text as id,
      'knowledge'::text as content_type,
      kb.title::text as title,
      kb.content,
      COALESCE(kb.source_id, kb.id)::text as source_id,
      COALESCE(kb.metadata->>'project_id', 'general')::text as project_id,
      kb.created_at,
      COALESCE(kb.metadata, '{}'::jsonb) as metadata,
      1 - (kb.embedding <=> query_embedding) as similarity
    FROM knowledge_base kb
    WHERE kb.embedding IS NOT NULL
      AND kb.user_id::text = p_user_id
      AND (p_project_id IS NULL OR kb.metadata->>'project_id' = p_project_id)
      AND (p_content_types IS NULL OR 'knowledge' = ANY(p_content_types))
      AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  )
  SELECT * FROM all_results
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Get search statistics (FIXED)
CREATE OR REPLACE FUNCTION get_search_stats(p_user_id text)
RETURNS TABLE (
  content_type text,
  total_items bigint,
  items_with_embeddings bigint,
  embedding_coverage_percent numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Messages
  SELECT
    'messages'::text as content_type,
    COUNT(*)::bigint as total_items,
    COUNT(embedding)::bigint as items_with_embeddings,
    ROUND((COUNT(embedding)::numeric / NULLIF(COUNT(*), 0) * 100), 2) as embedding_coverage_percent
  FROM messages
  WHERE user_id::text = p_user_id

  UNION ALL

  -- Files
  SELECT
    'files'::text as content_type,
    COUNT(*)::bigint as total_items,
    COUNT(embedding)::bigint as items_with_embeddings,
    ROUND((COUNT(embedding)::numeric / NULLIF(COUNT(*), 0) * 100), 2) as embedding_coverage_percent
  FROM indexed_files
  WHERE user_id::text = p_user_id

  UNION ALL

  -- Transcripts
  SELECT
    'transcripts'::text as content_type,
    COUNT(*)::bigint as total_items,
    COUNT(embedding)::bigint as items_with_embeddings,
    ROUND((COUNT(embedding)::numeric / NULLIF(COUNT(*), 0) * 100), 2) as embedding_coverage_percent
  FROM audio_transcriptions
  WHERE user_id::text = p_user_id

  UNION ALL

  -- Knowledge Base
  SELECT
    'knowledge_base'::text as content_type,
    COUNT(*)::bigint as total_items,
    COUNT(embedding)::bigint as items_with_embeddings,
    ROUND((COUNT(embedding)::numeric / NULLIF(COUNT(*), 0) * 100), 2) as embedding_coverage_percent
  FROM knowledge_base
  WHERE user_id::text = p_user_id;
END;
$$;

-- ============================================================================
-- STEP 4: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION search_all_content TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION get_search_stats TO authenticated, service_role, anon;

-- ============================================================================
-- DEPLOYMENT COMPLETE!
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ PHASE 1 DATABASE DEPLOYMENT COMPLETE!';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'What was deployed:';
  RAISE NOTICE '  ✅ Vector embedding columns (messages, files, transcripts)';
  RAISE NOTICE '  ✅ HNSW vector indexes (for fast search)';
  RAISE NOTICE '  ✅ search_all_content() function (with type casting fix)';
  RAISE NOTICE '  ✅ get_search_stats() function (with type casting fix)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Create Storage buckets (files, thumbnails)';
  RAISE NOTICE '  2. Test semantic search API';
  RAISE NOTICE '  3. Run: npx tsx scripts/backfill-embeddings.ts';
  RAISE NOTICE '';
  RAISE NOTICE 'Verify deployment:';
  RAISE NOTICE '  SELECT * FROM get_search_stats(''zach-admin-001'');';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;
