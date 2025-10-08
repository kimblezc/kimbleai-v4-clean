-- Create semantic search function for knowledge base
-- This enables RAG (Retrieval Augmented Generation) by finding similar content using vector embeddings

CREATE OR REPLACE FUNCTION match_knowledge_base (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  source_type text,
  source_id text,
  category text,
  tags text[],
  importance float,
  created_at timestamptz,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.source_type,
    kb.source_id,
    kb.category,
    kb.tags,
    kb.importance,
    kb.created_at,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create an index to speed up similarity searches
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx
ON knowledge_base
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION match_knowledge_base TO anon, authenticated, service_role;

-- Test the function
SELECT COUNT(*) as total_entries,
       COUNT(embedding) as entries_with_embeddings
FROM knowledge_base;
