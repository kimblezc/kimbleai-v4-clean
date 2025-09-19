-- Session Continuity System Database Schema (CORRECTED)
-- Run this SECOND in Supabase SQL editor

-- Create session_snapshots table
CREATE TABLE IF NOT EXISTS session_snapshots (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  conversation_id UUID NOT NULL,
  project_id UUID,
  user_id UUID NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  token_count INTEGER NOT NULL DEFAULT 0,
  
  -- Complete snapshot data
  messages JSONB NOT NULL DEFAULT '[]',
  current_files JSONB DEFAULT '[]',
  pending_decisions JSONB DEFAULT '[]',
  active_tasks JSONB DEFAULT '[]',
  code_blocks JSONB DEFAULT '[]',
  environment_variables JSONB DEFAULT '{}',
  deployment_status JSONB DEFAULT '{}',
  git_status JSONB DEFAULT '{}',
  project_structure JSONB DEFAULT '{}',
  continuation JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_auto_export BOOLEAN DEFAULT FALSE,
  export_reason TEXT,
  transition_file_path TEXT
);

-- Create indices for fast lookups
CREATE INDEX IF NOT EXISTS idx_session_snapshots_conversation ON session_snapshots(conversation_id);
CREATE INDEX IF NOT EXISTS idx_session_snapshots_project ON session_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_session_snapshots_user ON session_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_session_snapshots_timestamp ON session_snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_session_snapshots_token_count ON session_snapshots(token_count);

-- Create token_usage_tracking table
CREATE TABLE IF NOT EXISTS token_usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tokens_used INTEGER NOT NULL,
  cumulative_tokens INTEGER NOT NULL,
  model TEXT,
  warning_sent BOOLEAN DEFAULT FALSE,
  auto_export_triggered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for token tracking
CREATE INDEX IF NOT EXISTS idx_token_usage_conversation ON token_usage_tracking(conversation_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage_tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_token_usage_cumulative ON token_usage_tracking(cumulative_tokens);