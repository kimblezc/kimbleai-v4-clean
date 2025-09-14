-- Message Reference System Database Schema
-- Run this in Supabase SQL editor to create the enhanced message tracking tables

-- Create message_references table with comprehensive tracking
CREATE TABLE IF NOT EXISTS message_references (
  id TEXT PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indices for fast lookups
CREATE INDEX idx_message_references_conversation ON message_references(conversation_id);
CREATE INDEX idx_message_references_project ON message_references(project_id);
CREATE INDEX idx_message_references_user ON message_references(user_id);
CREATE INDEX idx_message_references_timestamp ON message_references(timestamp);
CREATE INDEX idx_message_references_role ON message_references(role);
CREATE INDEX idx_message_references_metadata ON message_references USING GIN (metadata);
CREATE INDEX idx_message_references_context ON message_references USING GIN (context);

-- Full text search index
CREATE INDEX idx_message_references_content_search ON message_references USING GIN (to_tsvector('english', content));

-- Create message_links table for tracking references between messages
CREATE TABLE IF NOT EXISTS message_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_message_id TEXT NOT NULL REFERENCES message_references(id) ON DELETE CASCADE,
  target_message_id TEXT NOT NULL REFERENCES message_references(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('reference', 'reply', 'continuation', 'correction', 'elaboration')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_message_id, target_message_id, link_type)
);

-- Create index for message links
CREATE INDEX idx_message_links_source ON message_links(source_message_id);
CREATE INDEX idx_message_links_target ON message_links(target_message_id);

-- Create code_blocks table for extracted code
CREATE TABLE IF NOT EXISTS code_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES message_references(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  content TEXT NOT NULL,
  filename TEXT,
  line_start INTEGER,
  line_end INTEGER,
  purpose TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for code blocks
CREATE INDEX idx_code_blocks_message ON code_blocks(message_id);
CREATE INDEX idx_code_blocks_language ON code_blocks(language);
CREATE INDEX idx_code_blocks_filename ON code_blocks(filename);

-- Create decisions table
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES message_references(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  options_considered TEXT[],
  choice_made TEXT NOT NULL,
  reasoning TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for decisions
CREATE INDEX idx_decisions_message ON decisions(message_id);
CREATE INDEX idx_decisions_project ON decisions(project_id);
CREATE INDEX idx_decisions_timestamp ON decisions(timestamp);

-- Create action_items table
CREATE TABLE IF NOT EXISTS action_items (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES message_references(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  related_messages TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for action items
CREATE INDEX idx_action_items_message ON action_items(message_id);
CREATE INDEX idx_action_items_project ON action_items(project_id);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_action_items_assigned ON action_items(assigned_to);

-- Create file_mentions table
CREATE TABLE IF NOT EXISTS file_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES message_references(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  filepath TEXT,
  operation TEXT CHECK (operation IN ('create', 'read', 'update', 'delete', 'mention')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for file mentions
CREATE INDEX idx_file_mentions_message ON file_mentions(message_id);
CREATE INDEX idx_file_mentions_filename ON file_mentions(filename);

-- Function to search messages by content
CREATE OR REPLACE FUNCTION search_messages_by_content(
  search_query TEXT,
  user_id_filter UUID DEFAULT NULL,
  project_id_filter UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id TEXT,
  conversation_id UUID,
  project_id UUID,
  user_id UUID,
  role TEXT,
  content TEXT,
  timestamp TIMESTAMPTZ,
  metadata JSONB,
  context JSONB,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.project_id,
    m.user_id,
    m.role,
    m.content,
    m.timestamp,
    m.metadata,
    m.context,
    ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', search_query)) AS relevance
  FROM message_references m
  WHERE 
    to_tsvector('english', m.content) @@ plainto_tsquery('english', search_query)
    AND (user_id_filter IS NULL OR m.user_id = user_id_filter)
    AND (project_id_filter IS NULL OR m.project_id = project_id_filter)
  ORDER BY relevance DESC, m.timestamp DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get message context (surrounding messages)
CREATE OR REPLACE FUNCTION get_message_context(
  target_message_id TEXT,
  context_size INTEGER DEFAULT 3
)
RETURNS TABLE (
  id TEXT,
  conversation_id UUID,
  role TEXT,
  content TEXT,
  timestamp TIMESTAMPTZ,
  position_relative INTEGER
) AS $$
DECLARE
  target_conversation_id UUID;
  target_thread_position INTEGER;
BEGIN
  -- Get target message details
  SELECT 
    m.conversation_id,
    (m.context->>'thread_position')::INTEGER
  INTO target_conversation_id, target_thread_position
  FROM message_references m
  WHERE m.id = target_message_id;
  
  -- Return surrounding messages
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.role,
    m.content,
    m.timestamp,
    (m.context->>'thread_position')::INTEGER - target_thread_position AS position_relative
  FROM message_references m
  WHERE 
    m.conversation_id = target_conversation_id
    AND ABS((m.context->>'thread_position')::INTEGER - target_thread_position) <= context_size
  ORDER BY (m.context->>'thread_position')::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_message_references_updated_at
  BEFORE UPDATE ON message_references
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_action_items_updated_at
  BEFORE UPDATE ON action_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust based on your needs)
GRANT ALL ON message_references TO authenticated;
GRANT ALL ON message_links TO authenticated;
GRANT ALL ON code_blocks TO authenticated;
GRANT ALL ON decisions TO authenticated;
GRANT ALL ON action_items TO authenticated;
GRANT ALL ON file_mentions TO authenticated;

-- Enable Row Level Security
ALTER TABLE message_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_mentions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only see their own messages)
CREATE POLICY "Users can view own messages" ON message_references
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON message_references
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages" ON message_references
  FOR UPDATE USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE message_references IS 'Comprehensive message tracking with full context and references';
COMMENT ON TABLE message_links IS 'Tracks references and relationships between messages';
COMMENT ON TABLE code_blocks IS 'Extracted code blocks from messages';
COMMENT ON TABLE decisions IS 'Decisions made during conversations';
COMMENT ON TABLE action_items IS 'Action items extracted from conversations';
COMMENT ON TABLE file_mentions IS 'Files mentioned or manipulated in messages';