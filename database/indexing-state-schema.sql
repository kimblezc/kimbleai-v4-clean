-- Indexing State Schema
-- Tracks progress of indexing Drive and Gmail so it can resume across cron runs

CREATE TABLE IF NOT EXISTS indexing_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('drive', 'gmail')),

  -- Pagination cursor to resume from
  last_cursor TEXT,

  -- Progress tracking
  total_indexed INTEGER DEFAULT 0,
  last_indexed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'error')),

  -- Error tracking
  error_message TEXT,
  error_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one state per user per source
  UNIQUE(user_id, source)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_indexing_state_user_source ON indexing_state(user_id, source);
CREATE INDEX IF NOT EXISTS idx_indexing_state_status ON indexing_state(status);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_indexing_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_indexing_state_updated_at
  BEFORE UPDATE ON indexing_state
  FOR EACH ROW
  EXECUTE FUNCTION update_indexing_state_updated_at();
