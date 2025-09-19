-- Message Reference System Database Schema (CORRECTED)
-- Run this FIRST in Supabase SQL editor

-- Create message_references table with comprehensive tracking
CREATE TABLE IF NOT EXISTS message_references (
  id TEXT PRIMARY KEY,
  conversation_id UUID NOT NULL,
  project_id UUID,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indices for fast lookups
CREATE INDEX IF NOT EXISTS idx_message_references_conversation ON message_references(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_references_project ON message_references(project_id);
CREATE INDEX IF NOT EXISTS idx_message_references_user ON message_references(user_id);
CREATE INDEX IF NOT EXISTS idx_message_references_timestamp ON message_references(timestamp);
CREATE INDEX IF NOT EXISTS idx_message_references_role ON message_references(role);
CREATE INDEX IF NOT EXISTS idx_message_references_metadata ON message_references USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_message_references_context ON message_references USING GIN (context);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_message_references_content_search ON message_references USING GIN (to_tsvector('english', content));

-- Create message_links table for tracking references between messages
CREATE TABLE IF NOT EXISTS message_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_message_id TEXT NOT NULL,
  target_message_id TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('reference', 'reply', 'continuation', 'correction', 'elaboration')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_message_id, target_message_id, link_type)
);

-- Create index for message links
CREATE INDEX IF NOT EXISTS idx_message_links_source ON message_links(source_message_id);
CREATE INDEX IF NOT EXISTS idx_message_links_target ON message_links(target_message_id);

-- Create code_blocks table for extracted code
CREATE TABLE IF NOT EXISTS code_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_code_blocks_message ON code_blocks(message_id);
CREATE INDEX IF NOT EXISTS idx_code_blocks_language ON code_blocks(language);
CREATE INDEX IF NOT EXISTS idx_code_blocks_filename ON code_blocks(filename);

-- Create decisions table
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  project_id UUID,
  description TEXT NOT NULL,
  options_considered TEXT[],
  choice_made TEXT NOT NULL,
  reasoning TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for decisions
CREATE INDEX IF NOT EXISTS idx_decisions_message ON decisions(message_id);
CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_timestamp ON decisions(timestamp);

-- Create action_items table
CREATE TABLE IF NOT EXISTS action_items (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  project_id UUID,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to UUID,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  related_messages TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for action items
CREATE INDEX IF NOT EXISTS idx_action_items_message ON action_items(message_id);
CREATE INDEX IF NOT EXISTS idx_action_items_project ON action_items(project_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_assigned ON action_items(assigned_to);

-- Create file_mentions table
CREATE TABLE IF NOT EXISTS file_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  filepath TEXT,
  operation TEXT CHECK (operation IN ('create', 'read', 'update', 'delete', 'mention')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for file mentions
CREATE INDEX IF NOT EXISTS idx_file_mentions_message ON file_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_file_mentions_filename ON file_mentions(filename);