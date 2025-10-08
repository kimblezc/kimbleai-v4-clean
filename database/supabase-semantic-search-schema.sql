-- ============================================================================
-- Semantic Search System Database Schema
-- Supports OpenAI embeddings, vector similarity search, and multi-format content
-- ============================================================================

-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- MAIN CONTENT TABLE
-- Stores processed content with embeddings and metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.semantic_content (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT NOT NULL, -- text, pdf, audio, image, document
    mime_type TEXT NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimensions
    metadata JSONB DEFAULT '{}',
    user_id TEXT NOT NULL DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CONTENT CHUNKS TABLE
-- Stores chunked content for better search granularity
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.semantic_chunks (
    id TEXT PRIMARY KEY,
    content_id TEXT NOT NULL REFERENCES public.semantic_content(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimensions
    position INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_semantic_content_user_id ON public.semantic_content(user_id);
CREATE INDEX IF NOT EXISTS idx_semantic_content_type ON public.semantic_content(content_type);
CREATE INDEX IF NOT EXISTS idx_semantic_content_created ON public.semantic_content(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_content_size ON public.semantic_content(size);

-- Chunk indexes
CREATE INDEX IF NOT EXISTS idx_semantic_chunks_content_id ON public.semantic_chunks(content_id);
CREATE INDEX IF NOT EXISTS idx_semantic_chunks_position ON public.semantic_chunks(position);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_semantic_content_fts ON public.semantic_content USING gin(to_tsvector('english', title || ' ' || content));
CREATE INDEX IF NOT EXISTS idx_semantic_chunks_fts ON public.semantic_chunks USING gin(to_tsvector('english', content));

-- HNSW vector indexes for fast similarity search
CREATE INDEX IF NOT EXISTS idx_semantic_content_embedding
ON public.semantic_content
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_semantic_chunks_embedding
ON public.semantic_chunks
USING hnsw (embedding vector_cosine_ops);

-- Metadata indexes (using GIN for JSONB)
CREATE INDEX IF NOT EXISTS idx_semantic_content_metadata ON public.semantic_content USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_semantic_chunks_metadata ON public.semantic_chunks USING gin(metadata);

-- ============================================================================
-- SECURITY POLICIES
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE public.semantic_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semantic_chunks ENABLE ROW LEVEL SECURITY;

-- Service role can manage all content
CREATE POLICY "Service role can manage all semantic content"
ON public.semantic_content
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can manage all semantic chunks"
ON public.semantic_chunks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Users can only access their own content (if implementing user-specific access)
CREATE POLICY "Users can access their own semantic content"
ON public.semantic_content
FOR SELECT
TO authenticated
USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can access their own semantic chunks"
ON public.semantic_chunks
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.semantic_content
    WHERE id = semantic_chunks.content_id
    AND user_id = current_setting('app.current_user_id', true)
));

-- ============================================================================
-- FUNCTIONS FOR SEMANTIC SEARCH
-- ============================================================================

-- Function to search content using vector similarity
CREATE OR REPLACE FUNCTION public.search_all_content(
    query_embedding vector(1536),
    similarity_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    user_id_filter text DEFAULT NULL
)
RETURNS TABLE (
    id text,
    title text,
    content text,
    content_type text,
    mime_type text,
    similarity float,
    metadata jsonb,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.id,
        sc.title,
        sc.content,
        sc.content_type,
        sc.mime_type,
        1 - (sc.embedding <=> query_embedding) as similarity,
        sc.metadata,
        sc.created_at
    FROM public.semantic_content sc
    WHERE
        sc.embedding IS NOT NULL
        AND (user_id_filter IS NULL OR sc.user_id = user_id_filter)
        AND 1 - (sc.embedding <=> query_embedding) > similarity_threshold
    ORDER BY sc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to search chunks using vector similarity
CREATE OR REPLACE FUNCTION public.search_content_chunks(
    query_embedding vector(1536),
    similarity_threshold float DEFAULT 0.7,
    match_count int DEFAULT 20,
    user_id_filter text DEFAULT NULL
)
RETURNS TABLE (
    chunk_id text,
    content_id text,
    content text,
    position integer,
    similarity float,
    chunk_metadata jsonb,
    content_title text,
    content_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sch.id as chunk_id,
        sch.content_id,
        sch.content,
        sch.position,
        1 - (sch.embedding <=> query_embedding) as similarity,
        sch.metadata as chunk_metadata,
        sc.title as content_title,
        sc.content_type
    FROM public.semantic_chunks sch
    JOIN public.semantic_content sc ON sc.id = sch.content_id
    WHERE
        sch.embedding IS NOT NULL
        AND (user_id_filter IS NULL OR sc.user_id = user_id_filter)
        AND 1 - (sch.embedding <=> query_embedding) > similarity_threshold
    ORDER BY sch.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to get search statistics
CREATE OR REPLACE FUNCTION public.get_search_stats()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    result jsonb;
    total_docs int;
    total_chunks int;
    content_type_stats jsonb;
    last_indexed_date timestamp with time zone;
    index_health text;
BEGIN
    -- Get total documents
    SELECT COUNT(*) INTO total_docs FROM public.semantic_content;

    -- Get total chunks
    SELECT COUNT(*) INTO total_chunks FROM public.semantic_chunks;

    -- Get content type breakdown
    SELECT jsonb_object_agg(content_type, count) INTO content_type_stats
    FROM (
        SELECT content_type, COUNT(*) as count
        FROM public.semantic_content
        GROUP BY content_type
    ) t;

    -- Get last indexed date
    SELECT MAX(created_at) INTO last_indexed_date FROM public.semantic_content;

    -- Check index health (simplified)
    SELECT CASE
        WHEN total_docs > 0 THEN 'healthy'
        ELSE 'empty'
    END INTO index_health;

    -- Build result
    result := jsonb_build_object(
        'total_documents', total_docs,
        'total_chunks', total_chunks,
        'content_types', COALESCE(content_type_stats, '{}'::jsonb),
        'last_indexed', last_indexed_date,
        'index_health', index_health
    );

    RETURN result;
END;
$$;

-- Function to clean up orphaned chunks
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_chunks()
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count int;
BEGIN
    DELETE FROM public.semantic_chunks
    WHERE content_id NOT IN (SELECT id FROM public.semantic_content);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_semantic_content_updated_at
    BEFORE UPDATE ON public.semantic_content
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to service role
GRANT ALL ON public.semantic_content TO service_role;
GRANT ALL ON public.semantic_chunks TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant read permissions to authenticated users
GRANT SELECT ON public.semantic_content TO authenticated;
GRANT SELECT ON public.semantic_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_all_content TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_content_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_search_stats TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.semantic_content IS 'Main table for storing processed content with OpenAI embeddings for semantic search';
COMMENT ON TABLE public.semantic_chunks IS 'Chunked content for granular search and better context retrieval';

COMMENT ON COLUMN public.semantic_content.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions)';
COMMENT ON COLUMN public.semantic_content.content_type IS 'Processed content type: text, pdf, audio, image, document';
COMMENT ON COLUMN public.semantic_content.mime_type IS 'Original file MIME type';
COMMENT ON COLUMN public.semantic_content.metadata IS 'Flexible metadata storage for file-specific information';

COMMENT ON COLUMN public.semantic_chunks.embedding IS 'OpenAI text-embedding-3-small vector for chunk content';
COMMENT ON COLUMN public.semantic_chunks.position IS 'Position of chunk within the original content';

COMMENT ON FUNCTION public.search_all_content IS 'Performs vector similarity search across all content';
COMMENT ON FUNCTION public.search_content_chunks IS 'Performs vector similarity search across content chunks for more granular results';
COMMENT ON FUNCTION public.get_search_stats IS 'Returns comprehensive statistics about the semantic search system';

-- ============================================================================
-- SAMPLE DATA INSERTION (for testing)
-- ============================================================================

-- Insert a sample document for testing
INSERT INTO public.semantic_content (
    id,
    title,
    content,
    content_type,
    mime_type,
    size,
    metadata,
    user_id
) VALUES (
    'sample-doc-001',
    'Welcome to Semantic Search',
    'This is a sample document to test the semantic search functionality. The system supports multiple file formats including text, PDF, audio, images, and Word documents. Content is automatically processed, chunked, and embedded using OpenAI embeddings.',
    'text',
    'text/plain',
    256,
    '{"tags": ["sample", "test"], "language": "en", "source": "manual"}',
    'default'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- View for monitoring content statistics
CREATE OR REPLACE VIEW public.content_stats AS
SELECT
    content_type,
    COUNT(*) as document_count,
    AVG(size) as avg_size,
    SUM(size) as total_size,
    MAX(created_at) as latest_upload,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as embedded_count
FROM public.semantic_content
GROUP BY content_type;

-- View for monitoring chunk statistics
CREATE OR REPLACE VIEW public.chunk_stats AS
SELECT
    sc.content_type,
    COUNT(sch.*) as total_chunks,
    AVG(LENGTH(sch.content)) as avg_chunk_size,
    COUNT(CASE WHEN sch.embedding IS NOT NULL THEN 1 END) as embedded_chunks
FROM public.semantic_chunks sch
JOIN public.semantic_content sc ON sc.id = sch.content_id
GROUP BY sc.content_type;

-- Grant access to views
GRANT SELECT ON public.content_stats TO service_role, authenticated;
GRANT SELECT ON public.chunk_stats TO service_role, authenticated;