-- Session Logs System
-- Enables seamless platform switching (laptop ↔ PC) by storing all session context

CREATE TABLE IF NOT EXISTS session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Session metadata
  session_id TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL CHECK (device_name IN ('laptop', 'pc', 'other')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Context
  project_path TEXT NOT NULL,
  git_branch TEXT,
  git_commit_hash TEXT,
  working_directory TEXT,

  -- Session summary
  title TEXT NOT NULL,
  summary TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Detailed logs
  conversation_transcript JSONB,
  files_modified TEXT[] DEFAULT '{}',
  git_commits JSONB[] DEFAULT '{}',
  todos JSONB[] DEFAULT '{}',

  -- Quick reference
  key_decisions TEXT[] DEFAULT '{}',
  next_steps TEXT[] DEFAULT '{}',
  blockers TEXT[] DEFAULT '{}',

  -- Search
  search_vector TSVECTOR,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_logs_user_id ON session_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_started_at ON session_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_logs_device ON session_logs(device_name);
CREATE INDEX IF NOT EXISTS idx_session_logs_tags ON session_logs USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_session_logs_search ON session_logs USING gin(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_session_logs_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(NEW.files_modified, ' ')), 'C') ||
    setweight(to_tsvector('english', array_to_string(NEW.key_decisions, ' ')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search vector
CREATE TRIGGER trigger_update_session_logs_search_vector
  BEFORE INSERT OR UPDATE ON session_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_session_logs_search_vector();

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_session_logs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_session_logs_timestamp
  BEFORE UPDATE ON session_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_session_logs_timestamp();

-- RLS (Row Level Security) policies
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY session_logs_select_own ON session_logs
  FOR SELECT USING (user_id = current_setting('app.user_id', true)::TEXT);

-- Users can only insert their own sessions
CREATE POLICY session_logs_insert_own ON session_logs
  FOR INSERT WITH CHECK (user_id = current_setting('app.user_id', true)::TEXT);

-- Users can only update their own sessions
CREATE POLICY session_logs_update_own ON session_logs
  FOR UPDATE USING (user_id = current_setting('app.user_id', true)::TEXT);

-- Users can only delete their own sessions
CREATE POLICY session_logs_delete_own ON session_logs
  FOR DELETE USING (user_id = current_setting('app.user_id', true)::TEXT);

-- Comments for documentation
COMMENT ON TABLE session_logs IS 'Stores Claude Code session logs for seamless platform switching';
COMMENT ON COLUMN session_logs.session_id IS 'Unique identifier for the session (format: session_YYYY-MM-DD_HHMM)';
COMMENT ON COLUMN session_logs.device_name IS 'Device where session occurred: laptop, pc, or other';
COMMENT ON COLUMN session_logs.conversation_transcript IS 'Full conversation with Claude Code (JSON format)';
COMMENT ON COLUMN session_logs.git_commits IS 'Array of git commit objects made during session';
COMMENT ON COLUMN session_logs.todos IS 'TODO list state at end of session';
COMMENT ON COLUMN session_logs.key_decisions IS 'Important decisions made during session';
COMMENT ON COLUMN session_logs.next_steps IS 'Actions to take in next session';
COMMENT ON COLUMN session_logs.blockers IS 'Issues blocking progress';
COMMENT ON COLUMN session_logs.search_vector IS 'Full-text search index (auto-generated)';
