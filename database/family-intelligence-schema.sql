-- Family Intelligence Hub Schema
-- Phase 5: Shared Knowledge, Calendar Intelligence, and Email Management
-- For Zach and Rebecca Kimble

-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Family Knowledge Base
-- Shared notes, memories, decisions, and project spaces
CREATE TABLE IF NOT EXISTS family_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_by TEXT NOT NULL CHECK (created_by IN ('zach', 'rebecca')),
    category TEXT NOT NULL CHECK (category IN (
        'family_decisions',
        'travel_plans',
        'home_projects',
        'financial',
        'goals',
        'memories',
        'ideas',
        'shopping',
        'health',
        'other'
    )),
    tags TEXT[] DEFAULT '{}',
    shared_with TEXT[] DEFAULT '{}' CHECK (
        array_length(shared_with, 1) IS NULL OR
        shared_with <@ ARRAY['zach', 'rebecca', 'both']
    ),
    is_pinned BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for family_knowledge
CREATE INDEX IF NOT EXISTS idx_family_knowledge_created_by ON family_knowledge(created_by);
CREATE INDEX IF NOT EXISTS idx_family_knowledge_category ON family_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_family_knowledge_tags ON family_knowledge USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_family_knowledge_shared_with ON family_knowledge USING GIN(shared_with);
CREATE INDEX IF NOT EXISTS idx_family_knowledge_created_at ON family_knowledge(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_knowledge_embedding ON family_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_family_knowledge_pinned ON family_knowledge(is_pinned) WHERE is_pinned = true;

-- Family Calendar Events
-- Joint calendar events and scheduling
CREATE TABLE IF NOT EXISTS family_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT false,
    location TEXT,
    attendees TEXT[] NOT NULL DEFAULT '{}',
    created_by TEXT NOT NULL CHECK (created_by IN ('zach', 'rebecca')),
    event_type TEXT NOT NULL CHECK (event_type IN (
        'date_night',
        'family_meeting',
        'home_project',
        'travel',
        'appointment',
        'social',
        'work',
        'personal',
        'other'
    )),
    color TEXT DEFAULT 'blue',
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT,
    google_event_id_zach TEXT,
    google_event_id_rebecca TEXT,
    calendar_id_zach TEXT,
    calendar_id_rebecca TEXT,
    reminder_minutes INTEGER[] DEFAULT '{15, 60}',
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('tentative', 'confirmed', 'cancelled')),
    is_conflict BOOLEAN DEFAULT false,
    conflict_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for family_calendar_events
CREATE INDEX IF NOT EXISTS idx_family_calendar_start_time ON family_calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_family_calendar_end_time ON family_calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_family_calendar_attendees ON family_calendar_events USING GIN(attendees);
CREATE INDEX IF NOT EXISTS idx_family_calendar_event_type ON family_calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_family_calendar_created_by ON family_calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_family_calendar_status ON family_calendar_events(status);

-- Family Email Categories
-- Email classification and management
CREATE TABLE IF NOT EXISTS family_email_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gmail_message_id TEXT NOT NULL UNIQUE,
    thread_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    from_email TEXT NOT NULL,
    to_email TEXT[],
    cc_email TEXT[],
    subject TEXT,
    snippet TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'bills_financial',
        'travel',
        'home_property',
        'joint_projects',
        'family',
        'shopping',
        'insurance',
        'legal',
        'healthcare',
        'utilities',
        'subscriptions',
        'other'
    )),
    subcategory TEXT,
    is_shared BOOLEAN DEFAULT false,
    shared_with TEXT[] DEFAULT '{}',
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    action_required BOOLEAN DEFAULT false,
    action_items TEXT[],
    tags TEXT[] DEFAULT '{}',
    is_archived BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    starred BOOLEAN DEFAULT false,
    has_attachments BOOLEAN DEFAULT false,
    attachment_count INTEGER DEFAULT 0,
    received_date TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    embedding vector(1536),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for family_email_categories
CREATE INDEX IF NOT EXISTS idx_family_email_gmail_message_id ON family_email_categories(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_family_email_thread_id ON family_email_categories(thread_id);
CREATE INDEX IF NOT EXISTS idx_family_email_user_email ON family_email_categories(user_email);
CREATE INDEX IF NOT EXISTS idx_family_email_category ON family_email_categories(category);
CREATE INDEX IF NOT EXISTS idx_family_email_received_date ON family_email_categories(received_date DESC);
CREATE INDEX IF NOT EXISTS idx_family_email_is_shared ON family_email_categories(is_shared) WHERE is_shared = true;
CREATE INDEX IF NOT EXISTS idx_family_email_action_required ON family_email_categories(action_required) WHERE action_required = true;
CREATE INDEX IF NOT EXISTS idx_family_email_tags ON family_email_categories USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_family_email_embedding ON family_email_categories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Family Projects
-- Shared project tracking
CREATE TABLE IF NOT EXISTS family_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'home_improvement',
        'travel_planning',
        'financial_planning',
        'event_planning',
        'shopping',
        'learning',
        'health_fitness',
        'other'
    )),
    status TEXT DEFAULT 'planning' CHECK (status IN (
        'planning',
        'in_progress',
        'on_hold',
        'completed',
        'cancelled'
    )),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    owners TEXT[] NOT NULL DEFAULT '{}',
    start_date DATE,
    target_completion_date DATE,
    actual_completion_date DATE,
    budget_amount DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    tags TEXT[] DEFAULT '{}',
    tasks JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    linked_knowledge_ids UUID[],
    linked_calendar_event_ids UUID[],
    linked_email_ids UUID[],
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for family_projects
CREATE INDEX IF NOT EXISTS idx_family_projects_category ON family_projects(category);
CREATE INDEX IF NOT EXISTS idx_family_projects_status ON family_projects(status);
CREATE INDEX IF NOT EXISTS idx_family_projects_owners ON family_projects USING GIN(owners);
CREATE INDEX IF NOT EXISTS idx_family_projects_tags ON family_projects USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_family_projects_target_date ON family_projects(target_completion_date);

-- Family Activity Feed
-- Activity log for collaborative features
CREATE TABLE IF NOT EXISTS family_activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL CHECK (user_id IN ('zach', 'rebecca')),
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'knowledge_created',
        'knowledge_updated',
        'knowledge_shared',
        'calendar_event_created',
        'calendar_event_updated',
        'email_categorized',
        'email_shared',
        'project_created',
        'project_updated',
        'project_completed',
        'comment_added',
        'file_uploaded',
        'task_completed'
    )),
    title TEXT NOT NULL,
    description TEXT,
    resource_type TEXT NOT NULL CHECK (resource_type IN (
        'knowledge',
        'calendar_event',
        'email',
        'project',
        'task',
        'file'
    )),
    resource_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_visible_to TEXT[] DEFAULT '{zach, rebecca}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for family_activity_feed
CREATE INDEX IF NOT EXISTS idx_family_activity_user_id ON family_activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_family_activity_type ON family_activity_feed(activity_type);
CREATE INDEX IF NOT EXISTS idx_family_activity_resource_type ON family_activity_feed(resource_type);
CREATE INDEX IF NOT EXISTS idx_family_activity_created_at ON family_activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_activity_is_visible ON family_activity_feed USING GIN(is_visible_to);

-- Family Availability Slots
-- Pre-computed mutual availability
CREATE TABLE IF NOT EXISTS family_availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    available_users TEXT[] NOT NULL,
    duration_minutes INTEGER NOT NULL,
    is_mutual BOOLEAN DEFAULT false,
    slot_type TEXT DEFAULT 'free' CHECK (slot_type IN ('free', 'busy', 'tentative')),
    computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for family_availability_slots
CREATE INDEX IF NOT EXISTS idx_family_availability_date ON family_availability_slots(date);
CREATE INDEX IF NOT EXISTS idx_family_availability_mutual ON family_availability_slots(is_mutual) WHERE is_mutual = true;
CREATE INDEX IF NOT EXISTS idx_family_availability_users ON family_availability_slots USING GIN(available_users);

-- Shared Reminders
CREATE TABLE IF NOT EXISTS family_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    created_by TEXT NOT NULL CHECK (created_by IN ('zach', 'rebecca')),
    assigned_to TEXT[] NOT NULL DEFAULT '{}',
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    completed_by TEXT,
    recurrence_rule TEXT,
    linked_project_id UUID REFERENCES family_projects(id) ON DELETE SET NULL,
    linked_knowledge_id UUID REFERENCES family_knowledge(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for family_reminders
CREATE INDEX IF NOT EXISTS idx_family_reminders_due_date ON family_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_family_reminders_created_by ON family_reminders(created_by);
CREATE INDEX IF NOT EXISTS idx_family_reminders_assigned_to ON family_reminders USING GIN(assigned_to);
CREATE INDEX IF NOT EXISTS idx_family_reminders_completed ON family_reminders(is_completed) WHERE is_completed = false;

-- Family Preferences
-- Shared settings and preferences
CREATE TABLE IF NOT EXISTS family_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE CHECK (user_id IN ('zach', 'rebecca')),
    theme TEXT DEFAULT 'dark',
    notification_preferences JSONB DEFAULT '{
        "email_digest": true,
        "calendar_reminders": true,
        "shared_knowledge_updates": true,
        "project_updates": true
    }'::jsonb,
    calendar_color TEXT DEFAULT 'purple',
    default_calendar_id TEXT,
    gmail_labels JSONB DEFAULT '[]'::jsonb,
    timezone TEXT DEFAULT 'America/New_York',
    working_hours JSONB DEFAULT '{
        "start": "09:00",
        "end": "17:00",
        "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for family_preferences
CREATE INDEX IF NOT EXISTS idx_family_preferences_user_id ON family_preferences(user_id);

-- Functions

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_family_knowledge_updated_at BEFORE UPDATE ON family_knowledge
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_calendar_updated_at BEFORE UPDATE ON family_calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_projects_updated_at BEFORE UPDATE ON family_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_reminders_updated_at BEFORE UPDATE ON family_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_preferences_updated_at BEFORE UPDATE ON family_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Search family knowledge with semantic search
CREATE OR REPLACE FUNCTION search_family_knowledge(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_user text DEFAULT NULL,
    filter_category text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    title text,
    content text,
    created_by text,
    category text,
    tags text[],
    created_at timestamptz,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fk.id,
        fk.title,
        fk.content,
        fk.created_by,
        fk.category,
        fk.tags,
        fk.created_at,
        1 - (fk.embedding <=> query_embedding) as similarity
    FROM family_knowledge fk
    WHERE
        (filter_user IS NULL OR fk.created_by = filter_user OR filter_user = ANY(fk.shared_with))
        AND (filter_category IS NULL OR fk.category = filter_category)
        AND fk.is_archived = false
        AND (1 - (fk.embedding <=> query_embedding)) > match_threshold
    ORDER BY fk.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function: Find mutual availability
CREATE OR REPLACE FUNCTION find_mutual_availability(
    start_date_param date,
    end_date_param date,
    min_duration_minutes int DEFAULT 60
)
RETURNS TABLE (
    date date,
    start_time time,
    end_time time,
    duration_minutes int
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fas.date,
        fas.start_time,
        fas.end_time,
        fas.duration_minutes
    FROM family_availability_slots fas
    WHERE
        fas.date BETWEEN start_date_param AND end_date_param
        AND fas.is_mutual = true
        AND fas.duration_minutes >= min_duration_minutes
    ORDER BY fas.date, fas.start_time;
END;
$$;

-- Function: Get family activity feed
CREATE OR REPLACE FUNCTION get_family_activity_feed(
    limit_count int DEFAULT 50,
    offset_count int DEFAULT 0,
    filter_user text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    user_id text,
    activity_type text,
    title text,
    description text,
    resource_type text,
    resource_id uuid,
    created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        faf.id,
        faf.user_id,
        faf.activity_type,
        faf.title,
        faf.description,
        faf.resource_type,
        faf.resource_id,
        faf.created_at
    FROM family_activity_feed faf
    WHERE
        (filter_user IS NULL OR filter_user = ANY(faf.is_visible_to))
    ORDER BY faf.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

-- Insert default preferences for Zach and Rebecca
INSERT INTO family_preferences (user_id, theme, calendar_color, timezone)
VALUES
    ('zach', 'dark', 'purple', 'America/New_York'),
    ('rebecca', 'dark', 'pink', 'America/New_York')
ON CONFLICT (user_id) DO NOTHING;

-- Add RLS (Row Level Security) policies
ALTER TABLE family_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_email_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_preferences ENABLE ROW LEVEL SECURITY;

-- Grant permissions (adjust based on your Supabase setup)
-- These policies ensure users can only access their own data or shared data

-- Comments for documentation
COMMENT ON TABLE family_knowledge IS 'Shared knowledge base for family notes, memories, and decisions';
COMMENT ON TABLE family_calendar_events IS 'Joint calendar events and scheduling for the family';
COMMENT ON TABLE family_email_categories IS 'Categorized and shared family emails';
COMMENT ON TABLE family_projects IS 'Shared family projects with tasks and tracking';
COMMENT ON TABLE family_activity_feed IS 'Activity log for collaborative family features';
COMMENT ON TABLE family_availability_slots IS 'Pre-computed mutual availability for scheduling';
COMMENT ON TABLE family_reminders IS 'Shared reminders and tasks for the family';
COMMENT ON TABLE family_preferences IS 'User preferences for family intelligence features';

-- Grant access to service role
GRANT ALL ON family_knowledge TO service_role;
GRANT ALL ON family_calendar_events TO service_role;
GRANT ALL ON family_email_categories TO service_role;
GRANT ALL ON family_projects TO service_role;
GRANT ALL ON family_activity_feed TO service_role;
GRANT ALL ON family_availability_slots TO service_role;
GRANT ALL ON family_reminders TO service_role;
GRANT ALL ON family_preferences TO service_role;
