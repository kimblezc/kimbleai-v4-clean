-- ============================================================================
-- CHATGPT IMPORT SYSTEM SCHEMA
-- Stores imported ChatGPT conversations with full RAG semantic search support
-- ============================================================================

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- CHATGPT CONVERSATIONS TABLE
-- Stores imported ChatGPT conversations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chatgpt_conversations (
    id TEXT PRIMARY KEY, -- Original ChatGPT conversation ID
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    create_time BIGINT NOT NULL, -- Unix timestamp from ChatGPT export
    update_time BIGINT NOT NULL, -- Unix timestamp from ChatGPT export
    message_count INTEGER NOT NULL DEFAULT 0,
    full_text TEXT NOT NULL, -- All messages concatenated for embedding
    embedding vector(1536), -- OpenAI text-embedding-3-small
    drive_file_id TEXT, -- Google Drive file ID where export is stored
    import_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CHATGPT MESSAGES TABLE
-- Stores individual messages from ChatGPT conversations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chatgpt_messages (
    id TEXT PRIMARY KEY, -- Original message node ID from ChatGPT export
    conversation_id TEXT NOT NULL REFERENCES public.chatgpt_conversations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL, -- 'system', 'user', 'assistant', 'tool'
    content TEXT NOT NULL,
    create_time BIGINT NOT NULL, -- Unix timestamp
    parent_id TEXT, -- Parent message ID
    position INTEGER NOT NULL DEFAULT 0, -- Message position in conversation
    embedding vector(1536), -- OpenAI text-embedding-3-small
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CHATGPT CONVERSATION CHUNKS TABLE
-- Stores chunked conversations for better semantic search granularity
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chatgpt_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id TEXT NOT NULL REFERENCES public.chatgpt_conversations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    message_ids TEXT[] NOT NULL, -- Array of message IDs in this chunk
    embedding vector(1536), -- OpenAI text-embedding-3-small
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CHATGPT IMPORT LOGS TABLE
-- Tracks import history and status
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chatgpt_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    drive_file_id TEXT,
    total_conversations INTEGER NOT NULL DEFAULT 0,
    total_messages INTEGER NOT NULL DEFAULT 0,
    import_status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT,
    processing_time_ms INTEGER,
    import_stats JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_chatgpt_conv_user_id ON public.chatgpt_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chatgpt_conv_create_time ON public.chatgpt_conversations(create_time DESC);
CREATE INDEX IF NOT EXISTS idx_chatgpt_conv_import_date ON public.chatgpt_conversations(import_date DESC);
CREATE INDEX IF NOT EXISTS idx_chatgpt_conv_drive_file ON public.chatgpt_conversations(drive_file_id);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_chatgpt_msg_conversation ON public.chatgpt_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatgpt_msg_user_id ON public.chatgpt_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chatgpt_msg_role ON public.chatgpt_messages(role);
CREATE INDEX IF NOT EXISTS idx_chatgpt_msg_position ON public.chatgpt_messages(position);

-- Chunk indexes
CREATE INDEX IF NOT EXISTS idx_chatgpt_chunk_conversation ON public.chatgpt_chunks(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatgpt_chunk_user_id ON public.chatgpt_chunks(user_id);

-- Import log indexes
CREATE INDEX IF NOT EXISTS idx_chatgpt_import_user_id ON public.chatgpt_import_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chatgpt_import_status ON public.chatgpt_import_logs(import_status);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_chatgpt_conv_fts ON public.chatgpt_conversations
USING gin(to_tsvector('english', title || ' ' || full_text));

CREATE INDEX IF NOT EXISTS idx_chatgpt_msg_fts ON public.chatgpt_messages
USING gin(to_tsvector('english', content));

-- HNSW vector indexes for fast similarity search
CREATE INDEX IF NOT EXISTS idx_chatgpt_conv_embedding
ON public.chatgpt_conversations
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_chatgpt_msg_embedding
ON public.chatgpt_messages
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_chatgpt_chunk_embedding
ON public.chatgpt_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Metadata indexes (using GIN for JSONB)
CREATE INDEX IF NOT EXISTS idx_chatgpt_conv_metadata ON public.chatgpt_conversations USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_chatgpt_msg_metadata ON public.chatgpt_messages USING gin(metadata);

-- ============================================================================
-- SECURITY POLICIES
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE public.chatgpt_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatgpt_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatgpt_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatgpt_import_logs ENABLE ROW LEVEL SECURITY;

-- Service role can manage all ChatGPT data
CREATE POLICY "Service role can manage all ChatGPT conversations"
ON public.chatgpt_conversations FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage all ChatGPT messages"
ON public.chatgpt_messages FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage all ChatGPT chunks"
ON public.chatgpt_chunks FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage all ChatGPT imports"
ON public.chatgpt_import_logs FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Users can only access their own ChatGPT data
CREATE POLICY "Users can access their own ChatGPT conversations"
ON public.chatgpt_conversations FOR SELECT TO authenticated
USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can access their own ChatGPT messages"
ON public.chatgpt_messages FOR SELECT TO authenticated
USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can access their own ChatGPT chunks"
ON public.chatgpt_chunks FOR SELECT TO authenticated
USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can access their own import logs"
ON public.chatgpt_import_logs FOR SELECT TO authenticated
USING (user_id = current_setting('app.current_user_id', true));

-- ============================================================================
-- FUNCTIONS FOR CHATGPT SEMANTIC SEARCH
-- ============================================================================

-- Search ChatGPT conversations by vector similarity
CREATE OR REPLACE FUNCTION public.search_chatgpt_conversations(
    query_embedding vector(1536),
    p_user_id text,
    similarity_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    start_date bigint DEFAULT NULL,
    end_date bigint DEFAULT NULL
)
RETURNS TABLE (
    id text,
    title text,
    full_text text,
    create_time bigint,
    update_time bigint,
    message_count integer,
    similarity float,
    metadata jsonb,
    import_date timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.title,
        c.full_text,
        c.create_time,
        c.update_time,
        c.message_count,
        1 - (c.embedding <=> query_embedding) as similarity,
        c.metadata,
        c.import_date
    FROM public.chatgpt_conversations c
    WHERE
        c.embedding IS NOT NULL
        AND c.user_id = p_user_id
        AND (start_date IS NULL OR c.create_time >= start_date)
        AND (end_date IS NULL OR c.create_time <= end_date)
        AND 1 - (c.embedding <=> query_embedding) > similarity_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Search ChatGPT chunks by vector similarity (more granular)
CREATE OR REPLACE FUNCTION public.search_chatgpt_chunks(
    query_embedding vector(1536),
    p_user_id text,
    similarity_threshold float DEFAULT 0.7,
    match_count int DEFAULT 20
)
RETURNS TABLE (
    chunk_id uuid,
    conversation_id text,
    conversation_title text,
    content text,
    chunk_index integer,
    message_ids text[],
    similarity float,
    create_time bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ch.id as chunk_id,
        ch.conversation_id,
        c.title as conversation_title,
        ch.content,
        ch.chunk_index,
        ch.message_ids,
        1 - (ch.embedding <=> query_embedding) as similarity,
        c.create_time
    FROM public.chatgpt_chunks ch
    JOIN public.chatgpt_conversations c ON c.id = ch.conversation_id
    WHERE
        ch.embedding IS NOT NULL
        AND ch.user_id = p_user_id
        AND 1 - (ch.embedding <=> query_embedding) > similarity_threshold
    ORDER BY ch.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Search ChatGPT messages by vector similarity
CREATE OR REPLACE FUNCTION public.search_chatgpt_messages(
    query_embedding vector(1536),
    p_user_id text,
    similarity_threshold float DEFAULT 0.7,
    match_count int DEFAULT 20,
    role_filter text DEFAULT NULL
)
RETURNS TABLE (
    message_id text,
    conversation_id text,
    conversation_title text,
    role text,
    content text,
    create_time bigint,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id as message_id,
        m.conversation_id,
        c.title as conversation_title,
        m.role,
        m.content,
        m.create_time,
        1 - (m.embedding <=> query_embedding) as similarity
    FROM public.chatgpt_messages m
    JOIN public.chatgpt_conversations c ON c.id = m.conversation_id
    WHERE
        m.embedding IS NOT NULL
        AND m.user_id = p_user_id
        AND (role_filter IS NULL OR m.role = role_filter)
        AND 1 - (m.embedding <=> query_embedding) > similarity_threshold
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Get ChatGPT import statistics
CREATE OR REPLACE FUNCTION public.get_chatgpt_stats(p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    result jsonb;
    total_convs int;
    total_msgs int;
    total_chunks int;
    embedded_convs int;
    embedded_msgs int;
    embedded_chunks int;
    date_range jsonb;
    latest_import timestamptz;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO total_convs FROM public.chatgpt_conversations WHERE user_id = p_user_id;
    SELECT COUNT(*) INTO total_msgs FROM public.chatgpt_messages WHERE user_id = p_user_id;
    SELECT COUNT(*) INTO total_chunks FROM public.chatgpt_chunks WHERE user_id = p_user_id;

    SELECT COUNT(*) INTO embedded_convs
    FROM public.chatgpt_conversations
    WHERE user_id = p_user_id AND embedding IS NOT NULL;

    SELECT COUNT(*) INTO embedded_msgs
    FROM public.chatgpt_messages
    WHERE user_id = p_user_id AND embedding IS NOT NULL;

    SELECT COUNT(*) INTO embedded_chunks
    FROM public.chatgpt_chunks
    WHERE user_id = p_user_id AND embedding IS NOT NULL;

    -- Get date range
    SELECT jsonb_build_object(
        'earliest', MIN(create_time),
        'latest', MAX(create_time)
    ) INTO date_range
    FROM public.chatgpt_conversations
    WHERE user_id = p_user_id;

    -- Get latest import
    SELECT MAX(import_date) INTO latest_import
    FROM public.chatgpt_conversations
    WHERE user_id = p_user_id;

    -- Build result
    result := jsonb_build_object(
        'total_conversations', total_convs,
        'total_messages', total_msgs,
        'total_chunks', total_chunks,
        'embedded_conversations', embedded_convs,
        'embedded_messages', embedded_msgs,
        'embedded_chunks', embedded_chunks,
        'embedding_coverage_percent', CASE
            WHEN total_convs > 0 THEN ROUND((embedded_convs::numeric / total_convs * 100), 2)
            ELSE 0
        END,
        'date_range', date_range,
        'latest_import', latest_import
    );

    RETURN result;
END;
$$;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.update_chatgpt_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_chatgpt_conversations_updated_at
    BEFORE UPDATE ON public.chatgpt_conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_chatgpt_updated_at();

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to service role
GRANT ALL ON public.chatgpt_conversations TO service_role;
GRANT ALL ON public.chatgpt_messages TO service_role;
GRANT ALL ON public.chatgpt_chunks TO service_role;
GRANT ALL ON public.chatgpt_import_logs TO service_role;

-- Grant read permissions to authenticated users
GRANT SELECT ON public.chatgpt_conversations TO authenticated;
GRANT SELECT ON public.chatgpt_messages TO authenticated;
GRANT SELECT ON public.chatgpt_chunks TO authenticated;
GRANT SELECT ON public.chatgpt_import_logs TO authenticated;

-- Grant execute permissions for search functions
GRANT EXECUTE ON FUNCTION public.search_chatgpt_conversations TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_chatgpt_chunks TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_chatgpt_messages TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_chatgpt_stats TO authenticated, service_role;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.chatgpt_conversations IS 'Imported ChatGPT conversations with embeddings for semantic search';
COMMENT ON TABLE public.chatgpt_messages IS 'Individual messages from ChatGPT conversations';
COMMENT ON TABLE public.chatgpt_chunks IS 'Chunked ChatGPT conversations for granular search';
COMMENT ON TABLE public.chatgpt_import_logs IS 'Import history and status tracking';

COMMENT ON FUNCTION public.search_chatgpt_conversations IS 'Search ChatGPT conversations using vector similarity';
COMMENT ON FUNCTION public.search_chatgpt_chunks IS 'Search ChatGPT chunks for granular results';
COMMENT ON FUNCTION public.search_chatgpt_messages IS 'Search individual ChatGPT messages';
COMMENT ON FUNCTION public.get_chatgpt_stats IS 'Get statistics about imported ChatGPT data';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ CHATGPT IMPORT SCHEMA CREATED SUCCESSFULLY!';
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - chatgpt_conversations (main conversations with embeddings)';
    RAISE NOTICE '  - chatgpt_messages (individual messages with embeddings)';
    RAISE NOTICE '  - chatgpt_chunks (chunked conversations for granular search)';
    RAISE NOTICE '  - chatgpt_import_logs (import tracking)';
    RAISE NOTICE '';
    RAISE NOTICE 'Search functions created:';
    RAISE NOTICE '  - search_chatgpt_conversations() - Search conversations semantically';
    RAISE NOTICE '  - search_chatgpt_chunks() - Search chunks for granular results';
    RAISE NOTICE '  - search_chatgpt_messages() - Search individual messages';
    RAISE NOTICE '  - get_chatgpt_stats() - View import statistics';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Create import API endpoint to upload conversations.json';
    RAISE NOTICE '  2. Build embedding pipeline for imported conversations';
    RAISE NOTICE '  3. Upload to Google Drive and create vector search UI';
    RAISE NOTICE '================================================================';
END $$;
