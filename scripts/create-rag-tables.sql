-- ============================================================================
-- KimbleAI RAG (Retrieval-Augmented Generation) Tables
-- Version: 11.9.14
-- Date: 2026-02-05
--
-- PURPOSE:
-- 1. Create user_memories table for explicit memory storage
-- 2. Create search functions for semantic similarity search
-- 3. Enable pgvector extension if not already enabled
--
-- CRITICAL: Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable pgvector extension (if not already enabled)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- STEP 2: Create user_memories table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_memories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  category text DEFAULT 'fact' CHECK (category IN ('preference', 'fact', 'instruction', 'context')),
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Unique constraint: one key per user
  UNIQUE(user_id, key)
);

-- Indexes for user_memories
CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON public.user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_category ON public.user_memories(category);
CREATE INDEX IF NOT EXISTS idx_user_memories_updated_at ON public.user_memories(updated_at DESC);

-- Vector index for similarity search (HNSW is faster for queries)
CREATE INDEX IF NOT EXISTS idx_user_memories_embedding ON public.user_memories
USING hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- STEP 3: Add embedding column to messages if not exists
-- ============================================================================

-- Check if embedding column exists, add if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN embedding vector(1536);
    CREATE INDEX IF NOT EXISTS idx_messages_embedding ON public.messages
    USING hnsw (embedding vector_cosine_ops);
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Create search_all_content function
-- This searches across messages and files using vector similarity
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
-- STEP 5: Create search_user_memories function
-- ============================================================================

CREATE OR REPLACE FUNCTION search_user_memories(
  query_embedding text,
  user_id_filter uuid,
  similarity_threshold float DEFAULT 0.6,
  result_limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  key text,
  value text,
  category text,
  similarity float,
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
  SELECT
    m.id,
    m.key,
    m.value,
    m.category,
    1 - (m.embedding <=> query_vec) as similarity,
    m.created_at
  FROM public.user_memories m
  WHERE m.user_id = user_id_filter
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_vec) >= similarity_threshold
  ORDER BY similarity DESC
  LIMIT result_limit;
END;
$$;

-- ============================================================================
-- STEP 6: Create function to generate embeddings for new messages
-- This is a trigger that will be called by the application
-- (We don't auto-generate embeddings in SQL to avoid blocking inserts)
-- ============================================================================

-- Note: Message embedding generation is handled by the application layer
-- after the message is saved to avoid blocking the chat response.

-- ============================================================================
-- STEP 7: RLS Policies for user_memories
-- ============================================================================

ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;

-- Users can only see their own memories
CREATE POLICY "Users can view own memories"
  ON public.user_memories FOR SELECT
  USING (auth.uid() = user_id OR user_id = (SELECT id FROM public.users WHERE email = auth.email()));

-- Users can only insert their own memories
CREATE POLICY "Users can insert own memories"
  ON public.user_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id = (SELECT id FROM public.users WHERE email = auth.email()));

-- Users can only update their own memories
CREATE POLICY "Users can update own memories"
  ON public.user_memories FOR UPDATE
  USING (auth.uid() = user_id OR user_id = (SELECT id FROM public.users WHERE email = auth.email()));

-- Users can only delete their own memories
CREATE POLICY "Users can delete own memories"
  ON public.user_memories FOR DELETE
  USING (auth.uid() = user_id OR user_id = (SELECT id FROM public.users WHERE email = auth.email()));

-- ============================================================================
-- DONE!
--
-- After running this script:
-- 1. The user_memories table will be created
-- 2. Search functions will be available for RAG
-- 3. Messages table will have embedding column if not exists
-- ============================================================================

-- Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_memories', 'messages', 'files')
ORDER BY table_name;
