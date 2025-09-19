-- Session Continuity System Database Schema
-- Run this in Supabase SQL editor to enable automatic session preservation

-- Create session_snapshots table
CREATE TABLE IF NOT EXISTS session_snapshots (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX idx_session_snapshots_conversation ON session_snapshots(conversation_id);
CREATE INDEX idx_session_snapshots_project ON session_snapshots(project_id);
CREATE INDEX idx_session_snapshots_user ON session_snapshots(user_id);
CREATE INDEX idx_session_snapshots_timestamp ON session_snapshots(timestamp);
CREATE INDEX idx_session_snapshots_token_count ON session_snapshots(token_count);

-- Create token_usage_tracking table
CREATE TABLE IF NOT EXISTS token_usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tokens_used INTEGER NOT NULL,
  cumulative_tokens INTEGER NOT NULL,
  model TEXT,
  warning_sent BOOLEAN DEFAULT FALSE,
  auto_export_triggered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for token tracking
CREATE INDEX idx_token_usage_conversation ON token_usage_tracking(conversation_id);
CREATE INDEX idx_token_usage_timestamp ON token_usage_tracking(timestamp);
CREATE INDEX idx_token_usage_cumulative ON token_usage_tracking(cumulative_tokens);

-- Function to get latest snapshot for a conversation
CREATE OR REPLACE FUNCTION get_latest_snapshot(conv_id UUID)
RETURNS session_snapshots AS $$
BEGIN
  RETURN (
    SELECT * FROM session_snapshots
    WHERE conversation_id = conv_id
    ORDER BY timestamp DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if auto-export is needed
CREATE OR REPLACE FUNCTION check_token_limit(conv_id UUID, current_tokens INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  total_tokens INTEGER;
  warning_threshold INTEGER := 90000;
  export_threshold INTEGER := 95000;
BEGIN
  -- Get cumulative tokens for conversation
  SELECT COALESCE(SUM(tokens_used), 0) + current_tokens
  INTO total_tokens
  FROM token_usage_tracking
  WHERE conversation_id = conv_id;
  
  -- Check if export is needed
  IF total_tokens >= export_threshold THEN
    -- Log auto-export trigger
    INSERT INTO token_usage_tracking (
      conversation_id,
      user_id,
      tokens_used,
      cumulative_tokens,
      auto_export_triggered
    )
    SELECT 
      conv_id,
      user_id,
      current_tokens,
      total_tokens,
      TRUE
    FROM conversations
    WHERE id = conv_id;
    
    RETURN TRUE;
  ELSIF total_tokens >= warning_threshold THEN
    -- Log warning
    INSERT INTO token_usage_tracking (
      conversation_id,
      user_id,
      tokens_used,
      cumulative_tokens,
      warning_sent
    )
    SELECT 
      conv_id,
      user_id,
      current_tokens,
      total_tokens,
      TRUE
    FROM conversations
    WHERE id = conv_id;
    
    RETURN FALSE;
  ELSE
    -- Just log usage
    INSERT INTO token_usage_tracking (
      conversation_id,
      user_id,
      tokens_used,
      cumulative_tokens
    )
    SELECT 
      conv_id,
      user_id,
      current_tokens,
      total_tokens,
      FALSE
    FROM conversations
    WHERE id = conv_id;
    
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_session_snapshots_updated_at
  BEFORE UPDATE ON session_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON session_snapshots TO authenticated;
GRANT ALL ON token_usage_tracking TO authenticated;

-- Enable Row Level Security
ALTER TABLE session_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own snapshots" ON session_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own snapshots" ON session_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own token usage" ON token_usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can track own token usage" ON token_usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE session_snapshots IS 'Complete session snapshots for continuity across conversations';
COMMENT ON TABLE token_usage_tracking IS 'Track token usage to trigger auto-exports before limits';
COMMENT ON FUNCTION get_latest_snapshot IS 'Get the most recent snapshot for a conversation';
COMMENT ON FUNCTION check_token_limit IS 'Check if token limit is approaching and trigger auto-export';