-- ============================================================================
-- INTEGRATION HUB SCHEMA
-- Unified platform connections, sync management, and cross-platform search
-- Phase 6: Integration Hub - Bringing all AI platforms together
-- ============================================================================

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- PLATFORM CONNECTIONS TABLE
-- Stores API keys and connection settings for all integrated platforms
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    platform_type TEXT NOT NULL, -- 'kimbleai', 'claude', 'chatgpt', 'google', 'notion', 'github', 'slack', 'mcp'
    platform_name TEXT NOT NULL, -- Display name
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'error', 'syncing'
    api_key_encrypted TEXT, -- Encrypted API key
    refresh_token_encrypted TEXT, -- Encrypted refresh token
    access_token_encrypted TEXT, -- Encrypted access token
    token_expires_at TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}', -- Platform-specific settings
    sync_schedule TEXT DEFAULT 'manual', -- 'manual', 'realtime', '5min', '15min', '1hour', '6hours', '24hours'
    last_sync_at TIMESTAMP WITH TIME ZONE,
    next_sync_at TIMESTAMP WITH TIME ZONE,
    sync_enabled BOOLEAN DEFAULT true,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    last_error_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PLATFORM SYNC LOGS TABLE
-- Tracks all sync operations and errors
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES public.platform_connections(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    platform_type TEXT NOT NULL,
    sync_type TEXT NOT NULL, -- 'full', 'incremental', 'manual'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    items_processed INTEGER DEFAULT 0,
    items_created INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    error_message TEXT,
    error_details JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CROSS PLATFORM REFERENCES TABLE
-- Links content across different platforms
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cross_platform_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    source_platform TEXT NOT NULL, -- Platform where the content originated
    source_id TEXT NOT NULL, -- ID in the source platform
    source_type TEXT NOT NULL, -- 'conversation', 'file', 'note', 'email', 'event'
    target_platform TEXT NOT NULL, -- Platform where content was migrated/linked
    target_id TEXT NOT NULL, -- ID in the target platform
    target_type TEXT NOT NULL,
    reference_type TEXT NOT NULL, -- 'migration', 'link', 'duplicate', 'mention'
    confidence_score FLOAT DEFAULT 1.0, -- 0-1 confidence in the link
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- UNIFIED SEARCH INDEX TABLE
-- Aggregated search index across all platforms
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.unified_search_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    platform_type TEXT NOT NULL,
    content_type TEXT NOT NULL, -- 'conversation', 'message', 'file', 'note', 'email', 'event', 'code', 'task'
    content_id TEXT NOT NULL, -- ID in the source platform
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    author TEXT,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL,
    modified_date TIMESTAMP WITH TIME ZONE,
    embedding vector(1536), -- OpenAI text-embedding-3-small
    tags TEXT[] DEFAULT '{}',
    category TEXT,
    url TEXT, -- Link to view content in source platform
    parent_id TEXT, -- Parent content ID (for hierarchical content)
    search_vector tsvector, -- Full-text search vector
    metadata JSONB DEFAULT '{}',
    indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- IMPORTED CONVERSATIONS TABLE
-- Stores conversations imported from other platforms
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.imported_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    source_platform TEXT NOT NULL, -- 'chatgpt', 'claude', 'notion', 'docs'
    source_id TEXT NOT NULL, -- Original ID in source platform
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    message_count INTEGER DEFAULT 0,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL,
    modified_date TIMESTAMP WITH TIME ZONE,
    embedding vector(1536),
    tags TEXT[] DEFAULT '{}',
    category TEXT,
    migrated_to_main BOOLEAN DEFAULT false, -- Migrated to main conversations table
    main_conversation_id UUID, -- ID in main conversations table if migrated
    import_batch_id UUID, -- Batch import identifier
    dedup_hash TEXT, -- Hash for deduplication
    metadata JSONB DEFAULT '{}',
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PLATFORM ACTIVITY FEED TABLE
-- Unified activity feed across all platforms
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    platform_type TEXT NOT NULL,
    activity_type TEXT NOT NULL, -- 'conversation', 'file_upload', 'email_received', 'event_created', 'sync', 'error'
    title TEXT NOT NULL,
    description TEXT,
    actor TEXT, -- User or system that performed the action
    target_id TEXT, -- ID of the affected resource
    target_type TEXT, -- Type of the affected resource
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'synced', 'failed'
    status TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
    url TEXT, -- Link to view the activity
    icon TEXT, -- Icon identifier
    metadata JSONB DEFAULT '{}',
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PLATFORM USAGE STATS TABLE
-- Track usage statistics for each platform
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    platform_type TEXT NOT NULL,
    stat_date DATE NOT NULL,
    api_calls INTEGER DEFAULT 0,
    api_errors INTEGER DEFAULT 0,
    items_synced INTEGER DEFAULT 0,
    storage_bytes BIGINT DEFAULT 0,
    cost_usd DECIMAL(10, 4) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform_type, stat_date)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Platform connections
CREATE INDEX IF NOT EXISTS idx_platform_conn_user ON public.platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_conn_type ON public.platform_connections(platform_type);
CREATE INDEX IF NOT EXISTS idx_platform_conn_status ON public.platform_connections(status);
CREATE INDEX IF NOT EXISTS idx_platform_conn_next_sync ON public.platform_sync_logs(next_sync_at) WHERE sync_enabled = true;

-- Sync logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_connection ON public.platform_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_user ON public.platform_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_platform ON public.platform_sync_logs(platform_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON public.platform_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON public.platform_sync_logs(created_at DESC);

-- Cross-platform references
CREATE INDEX IF NOT EXISTS idx_cross_ref_user ON public.cross_platform_references(user_id);
CREATE INDEX IF NOT EXISTS idx_cross_ref_source ON public.cross_platform_references(source_platform, source_id);
CREATE INDEX IF NOT EXISTS idx_cross_ref_target ON public.cross_platform_references(target_platform, target_id);
CREATE INDEX IF NOT EXISTS idx_cross_ref_type ON public.cross_platform_references(reference_type);

-- Unified search index
CREATE INDEX IF NOT EXISTS idx_unified_search_user ON public.unified_search_index(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_search_platform ON public.unified_search_index(platform_type);
CREATE INDEX IF NOT EXISTS idx_unified_search_content_type ON public.unified_search_index(content_type);
CREATE INDEX IF NOT EXISTS idx_unified_search_created ON public.unified_search_index(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_unified_search_modified ON public.unified_search_index(modified_date DESC);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_unified_search_vector ON public.unified_search_index USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_unified_search_tags ON public.unified_search_index USING gin(tags);

-- Vector similarity search
CREATE INDEX IF NOT EXISTS idx_unified_search_embedding
ON public.unified_search_index
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Imported conversations
CREATE INDEX IF NOT EXISTS idx_imported_conv_user ON public.imported_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_imported_conv_platform ON public.imported_conversations(source_platform);
CREATE INDEX IF NOT EXISTS idx_imported_conv_source_id ON public.imported_conversations(source_id);
CREATE INDEX IF NOT EXISTS idx_imported_conv_dedup ON public.imported_conversations(dedup_hash);
CREATE INDEX IF NOT EXISTS idx_imported_conv_migrated ON public.imported_conversations(migrated_to_main);
CREATE INDEX IF NOT EXISTS idx_imported_conv_batch ON public.imported_conversations(import_batch_id);

-- Vector search for imported conversations
CREATE INDEX IF NOT EXISTS idx_imported_conv_embedding
ON public.imported_conversations
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Activity feed
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON public.platform_activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_platform ON public.platform_activity_feed(platform_type);
CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON public.platform_activity_feed(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_feed_occurred ON public.platform_activity_feed(occurred_at DESC);

-- Usage stats
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_date ON public.platform_usage_stats(user_id, stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_stats_platform ON public.platform_usage_stats(platform_type);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_integration_hub_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_platform_connections_updated_at
    BEFORE UPDATE ON public.platform_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_integration_hub_updated_at();

CREATE TRIGGER update_cross_platform_references_updated_at
    BEFORE UPDATE ON public.cross_platform_references
    FOR EACH ROW
    EXECUTE FUNCTION public.update_integration_hub_updated_at();

CREATE TRIGGER update_unified_search_index_updated_at
    BEFORE UPDATE ON public.unified_search_index
    FOR EACH ROW
    EXECUTE FUNCTION public.update_integration_hub_updated_at();

CREATE TRIGGER update_imported_conversations_updated_at
    BEFORE UPDATE ON public.imported_conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_integration_hub_updated_at();

CREATE TRIGGER update_platform_usage_stats_updated_at
    BEFORE UPDATE ON public.platform_usage_stats
    FOR EACH ROW
    EXECUTE FUNCTION public.update_integration_hub_updated_at();

-- Auto-update search vector on content change
CREATE OR REPLACE FUNCTION public.update_unified_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_vector = to_tsvector('english',
        COALESCE(NEW.title, '') || ' ' ||
        COALESCE(NEW.content, '') || ' ' ||
        COALESCE(NEW.summary, '')
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_search_vector
    BEFORE INSERT OR UPDATE ON public.unified_search_index
    FOR EACH ROW
    EXECUTE FUNCTION public.update_unified_search_vector();

-- ============================================================================
-- SECURITY POLICIES
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_platform_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_usage_stats ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY "Service role can manage all platform connections"
ON public.platform_connections FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage all sync logs"
ON public.platform_sync_logs FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage all cross-platform references"
ON public.cross_platform_references FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage all unified search index"
ON public.unified_search_index FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage all imported conversations"
ON public.imported_conversations FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage all activity feed"
ON public.platform_activity_feed FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage all usage stats"
ON public.platform_usage_stats FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================================
-- SEARCH FUNCTIONS
-- ============================================================================

-- Universal search across all platforms
CREATE OR REPLACE FUNCTION public.universal_search(
    query_embedding vector(1536),
    p_user_id text,
    platform_filter text[] DEFAULT NULL,
    content_type_filter text[] DEFAULT NULL,
    similarity_threshold float DEFAULT 0.7,
    match_count int DEFAULT 20,
    start_date timestamptz DEFAULT NULL,
    end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    platform_type text,
    content_type text,
    content_id text,
    title text,
    content text,
    summary text,
    created_date timestamptz,
    similarity float,
    url text,
    tags text[],
    metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.platform_type,
        s.content_type,
        s.content_id,
        s.title,
        s.content,
        s.summary,
        s.created_date,
        1 - (s.embedding <=> query_embedding) as similarity,
        s.url,
        s.tags,
        s.metadata
    FROM public.unified_search_index s
    WHERE
        s.embedding IS NOT NULL
        AND s.user_id = p_user_id
        AND (platform_filter IS NULL OR s.platform_type = ANY(platform_filter))
        AND (content_type_filter IS NULL OR s.content_type = ANY(content_type_filter))
        AND (start_date IS NULL OR s.created_date >= start_date)
        AND (end_date IS NULL OR s.created_date <= end_date)
        AND 1 - (s.embedding <=> query_embedding) > similarity_threshold
    ORDER BY s.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Get platform statistics
CREATE OR REPLACE FUNCTION public.get_platform_stats(p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_agg(platform_stats) INTO result
    FROM (
        SELECT
            pc.platform_type,
            pc.platform_name,
            pc.status,
            pc.last_sync_at,
            pc.next_sync_at,
            pc.sync_enabled,
            pc.error_count,
            (
                SELECT COUNT(*)
                FROM public.platform_sync_logs sl
                WHERE sl.connection_id = pc.id AND sl.status = 'completed'
            ) as successful_syncs,
            (
                SELECT COUNT(*)
                FROM public.platform_sync_logs sl
                WHERE sl.connection_id = pc.id AND sl.status = 'failed'
            ) as failed_syncs,
            (
                SELECT SUM(items_processed)
                FROM public.platform_sync_logs sl
                WHERE sl.connection_id = pc.id
            ) as total_items_synced
        FROM public.platform_connections pc
        WHERE pc.user_id = p_user_id
    ) platform_stats;

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Get recent activity across all platforms
CREATE OR REPLACE FUNCTION public.get_recent_activity(
    p_user_id text,
    platform_filter text[] DEFAULT NULL,
    limit_count int DEFAULT 50
)
RETURNS TABLE (
    id uuid,
    platform_type text,
    activity_type text,
    title text,
    description text,
    action text,
    status text,
    url text,
    occurred_at timestamptz,
    metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.platform_type,
        a.activity_type,
        a.title,
        a.description,
        a.action,
        a.status,
        a.url,
        a.occurred_at,
        a.metadata
    FROM public.platform_activity_feed a
    WHERE
        a.user_id = p_user_id
        AND (platform_filter IS NULL OR a.platform_type = ANY(platform_filter))
    ORDER BY a.occurred_at DESC
    LIMIT limit_count;
END;
$$;

-- Find duplicate imported conversations
CREATE OR REPLACE FUNCTION public.find_duplicate_conversations(
    p_user_id text,
    similarity_threshold float DEFAULT 0.9
)
RETURNS TABLE (
    conversation1_id uuid,
    conversation2_id uuid,
    similarity float,
    platform1 text,
    platform2 text,
    title1 text,
    title2 text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (LEAST(c1.id, c2.id), GREATEST(c1.id, c2.id))
        c1.id as conversation1_id,
        c2.id as conversation2_id,
        1 - (c1.embedding <=> c2.embedding) as similarity,
        c1.source_platform as platform1,
        c2.source_platform as platform2,
        c1.title as title1,
        c2.title as title2
    FROM public.imported_conversations c1
    CROSS JOIN public.imported_conversations c2
    WHERE
        c1.user_id = p_user_id
        AND c2.user_id = p_user_id
        AND c1.id < c2.id
        AND c1.embedding IS NOT NULL
        AND c2.embedding IS NOT NULL
        AND 1 - (c1.embedding <=> c2.embedding) > similarity_threshold
    ORDER BY LEAST(c1.id, c2.id), GREATEST(c1.id, c2.id), similarity DESC;
END;
$$;

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

GRANT ALL ON public.platform_connections TO service_role;
GRANT ALL ON public.platform_sync_logs TO service_role;
GRANT ALL ON public.cross_platform_references TO service_role;
GRANT ALL ON public.unified_search_index TO service_role;
GRANT ALL ON public.imported_conversations TO service_role;
GRANT ALL ON public.platform_activity_feed TO service_role;
GRANT ALL ON public.platform_usage_stats TO service_role;

GRANT SELECT ON public.platform_connections TO authenticated;
GRANT SELECT ON public.platform_sync_logs TO authenticated;
GRANT SELECT ON public.cross_platform_references TO authenticated;
GRANT SELECT ON public.unified_search_index TO authenticated;
GRANT SELECT ON public.imported_conversations TO authenticated;
GRANT SELECT ON public.platform_activity_feed TO authenticated;
GRANT SELECT ON public.platform_usage_stats TO authenticated;

GRANT EXECUTE ON FUNCTION public.universal_search TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_stats TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_recent_activity TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_duplicate_conversations TO authenticated, service_role;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ INTEGRATION HUB SCHEMA CREATED SUCCESSFULLY!';
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - platform_connections (API keys and settings)';
    RAISE NOTICE '  - platform_sync_logs (sync history and errors)';
    RAISE NOTICE '  - cross_platform_references (content links)';
    RAISE NOTICE '  - unified_search_index (universal search)';
    RAISE NOTICE '  - imported_conversations (imported content)';
    RAISE NOTICE '  - platform_activity_feed (unified activity)';
    RAISE NOTICE '  - platform_usage_stats (usage tracking)';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '  - universal_search() - Search across all platforms';
    RAISE NOTICE '  - get_platform_stats() - Platform statistics';
    RAISE NOTICE '  - get_recent_activity() - Activity feed';
    RAISE NOTICE '  - find_duplicate_conversations() - Deduplication';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for Phase 6 Integration Hub!';
    RAISE NOTICE '================================================================';
END $$;
