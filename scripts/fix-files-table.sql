-- ============================================================================
-- KimbleAI Files Table Fix
-- Version: 11.9.14
-- Date: 2026-02-05
--
-- PURPOSE:
-- The codebase references 'files' table but database has 'file_registry'.
-- This script creates the 'files' table with correct schema.
--
-- CRITICAL: Run this in your Supabase SQL Editor
-- ============================================================================

-- Option 1: Create 'files' table if it doesn't exist
-- This is the preferred approach - matches the code exactly

CREATE TABLE IF NOT EXISTS public.files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id text, -- projects.id is TEXT, not UUID

  -- File metadata
  name text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL,
  storage_path text NOT NULL,

  -- Source tracking (for Google Drive, etc.)
  source_platform text, -- 'local', 'google_drive', 'dropbox', etc.
  source_file_id text,  -- Original file ID from source platform

  -- Processed content
  extracted_text text,
  summary text,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  processed_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for files table
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON public.files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON public.files(mime_type);

-- Vector index for semantic search
CREATE INDEX IF NOT EXISTS idx_files_embedding ON public.files
USING hnsw (embedding vector_cosine_ops);

-- RLS Policies
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Users can only see their own files
DROP POLICY IF EXISTS "Users can view own files" ON public.files;
CREATE POLICY "Users can view own files"
  ON public.files FOR SELECT
  USING (user_id = (SELECT id FROM public.users WHERE email = auth.email()));

-- Users can only insert their own files
DROP POLICY IF EXISTS "Users can insert own files" ON public.files;
CREATE POLICY "Users can insert own files"
  ON public.files FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM public.users WHERE email = auth.email()));

-- Users can only update their own files
DROP POLICY IF EXISTS "Users can update own files" ON public.files;
CREATE POLICY "Users can update own files"
  ON public.files FOR UPDATE
  USING (user_id = (SELECT id FROM public.users WHERE email = auth.email()));

-- Users can only delete their own files
DROP POLICY IF EXISTS "Users can delete own files" ON public.files;
CREATE POLICY "Users can delete own files"
  ON public.files FOR DELETE
  USING (user_id = (SELECT id FROM public.users WHERE email = auth.email()));

-- ============================================================================
-- Option 2: If you have data in file_registry, migrate it to files
-- Uncomment and run if needed
-- ============================================================================

-- INSERT INTO public.files (
--   id, user_id, name, size_bytes, mime_type, storage_path,
--   source_platform, source_file_id, extracted_text, summary,
--   embedding, created_at, updated_at
-- )
-- SELECT
--   id, user_id, name,
--   COALESCE(size_bytes, 0) as size_bytes,
--   COALESCE(mime_type, 'application/octet-stream') as mime_type,
--   COALESCE(storage_path, '') as storage_path,
--   source_platform, source_file_id, extracted_text, summary,
--   embedding, created_at, updated_at
-- FROM public.file_registry
-- WHERE NOT EXISTS (
--   SELECT 1 FROM public.files f WHERE f.id = file_registry.id
-- );

-- ============================================================================
-- Update search_all_content function to include files table
-- ============================================================================

CREATE OR REPLACE FUNCTION search_all_content(
  query_embedding text,
  user_id_filter uuid,
  project_id_filter uuid DEFAULT NULL,
  similarity_threshold float DEFAULT 0.65,
  result_limit int DEFAULT 10,
  content_type_filter text DEFAULT 'all'
)
RETURNS TABLE (
  id uuid,
  content_type text,
  content text,
  summary text,
  similarity float,
  conversation_id uuid,
  conversation_title text,
  project_id uuid,
  project_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_vec vector(1536);
BEGIN
  -- Parse the embedding string into vector
  query_vec := query_embedding::vector;

  RETURN QUERY
  WITH message_results AS (
    SELECT
      m.id,
      'message'::text as content_type,
      m.content,
      NULL::text as summary,
      1 - (m.embedding <=> query_vec) as similarity,
      m.conversation_id,
      c.title as conversation_title,
      c.project_id,
      p.name as project_name,
      m.created_at
    FROM public.messages m
    LEFT JOIN public.conversations c ON m.conversation_id = c.id
    LEFT JOIN public.projects p ON c.project_id = p.id
    WHERE m.user_id = user_id_filter
      AND m.embedding IS NOT NULL
      AND (project_id_filter IS NULL OR c.project_id = project_id_filter)
      AND (content_type_filter = 'all' OR content_type_filter = 'messages')
      AND 1 - (m.embedding <=> query_vec) >= similarity_threshold
  ),
  file_results AS (
    SELECT
      f.id,
      'file'::text as content_type,
      COALESCE(f.extracted_text, f.name) as content,
      f.summary,
      1 - (f.embedding <=> query_vec) as similarity,
      NULL::uuid as conversation_id,
      NULL::text as conversation_title,
      f.project_id,
      p.name as project_name,
      f.created_at
    FROM public.files f
    LEFT JOIN public.projects p ON f.project_id = p.id
    WHERE f.user_id = user_id_filter
      AND f.embedding IS NOT NULL
      AND (project_id_filter IS NULL OR f.project_id = project_id_filter)
      AND (content_type_filter = 'all' OR content_type_filter = 'files')
      AND 1 - (f.embedding <=> query_vec) >= similarity_threshold
  )
  SELECT * FROM message_results
  UNION ALL
  SELECT * FROM file_results
  ORDER BY similarity DESC
  LIMIT result_limit;
END;
$$;

-- ============================================================================
-- Verify tables exist
-- ============================================================================

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('files', 'messages', 'user_memories', 'file_registry')
ORDER BY table_name;

-- ============================================================================
-- DONE!
-- Expected output: files, messages, user_memories (and optionally file_registry)
-- ============================================================================
