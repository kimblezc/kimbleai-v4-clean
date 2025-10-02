-- File Monitor Agent Schema
-- Real-time file system monitoring and auto-action execution

-- File watches configuration
CREATE TABLE IF NOT EXISTS file_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  path TEXT NOT NULL,
  recursive BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),

  -- Filters
  extensions TEXT[],
  min_size BIGINT,
  max_size BIGINT,
  patterns TEXT[],
  ignore_patterns TEXT[],

  -- Actions on file events
  on_created JSONB DEFAULT '[]'::jsonb,
  on_modified JSONB DEFAULT '[]'::jsonb,
  on_deleted JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_scan_at TIMESTAMP WITH TIME ZONE,

  -- Statistics
  total_files_scanned INTEGER DEFAULT 0,
  total_changes_detected INTEGER DEFAULT 0,
  total_actions_executed INTEGER DEFAULT 0,

  -- Indexing for performance
  CONSTRAINT unique_user_path UNIQUE (user_id, path)
);

-- File changes detected by monitors
CREATE TABLE IF NOT EXISTS file_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_id UUID REFERENCES file_watches(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- File information
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash TEXT,
  mime_type TEXT,

  -- Change details
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'modified', 'deleted')),
  previous_hash TEXT,
  previous_size BIGINT,

  -- Auto-actions executed
  actions_executed JSONB DEFAULT '[]'::jsonb,
  actions_status TEXT DEFAULT 'pending' CHECK (actions_status IN ('pending', 'processing', 'completed', 'failed')),
  actions_error TEXT,

  -- Timestamps
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Watch statistics aggregated view
CREATE TABLE IF NOT EXISTS watch_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_id UUID REFERENCES file_watches(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Time period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Statistics
  files_created INTEGER DEFAULT 0,
  files_modified INTEGER DEFAULT 0,
  files_deleted INTEGER DEFAULT 0,
  total_size_processed BIGINT DEFAULT 0,
  actions_executed INTEGER DEFAULT 0,
  actions_failed INTEGER DEFAULT 0,

  -- Performance
  avg_scan_time_ms INTEGER,
  avg_action_time_ms INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-action execution log
CREATE TABLE IF NOT EXISTS action_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id UUID REFERENCES file_changes(id) ON DELETE CASCADE,
  watch_id UUID REFERENCES file_watches(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN ('transcribe', 'analyze', 'backup', 'notify', 'tag', 'compress', 'webhook')),
  action_config JSONB NOT NULL,

  -- Execution
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Results
  result JSONB,
  error TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_watches_user ON file_watches(user_id);
CREATE INDEX IF NOT EXISTS idx_file_watches_status ON file_watches(status);
CREATE INDEX IF NOT EXISTS idx_file_changes_watch ON file_changes(watch_id);
CREATE INDEX IF NOT EXISTS idx_file_changes_user ON file_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_file_changes_type ON file_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_file_changes_detected ON file_changes(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_stats_watch ON watch_statistics(watch_id);
CREATE INDEX IF NOT EXISTS idx_watch_stats_period ON watch_statistics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_action_log_change ON action_execution_log(change_id);
CREATE INDEX IF NOT EXISTS idx_action_log_status ON action_execution_log(status);

-- Trigger to update watch statistics
CREATE OR REPLACE FUNCTION update_watch_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE file_watches
  SET
    total_changes_detected = total_changes_detected + 1,
    updated_at = NOW()
  WHERE id = NEW.watch_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_watch_stats
AFTER INSERT ON file_changes
FOR EACH ROW
EXECUTE FUNCTION update_watch_stats();

-- Trigger to update action execution count
CREATE OR REPLACE FUNCTION update_action_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE file_watches
    SET
      total_actions_executed = total_actions_executed + 1,
      updated_at = NOW()
    WHERE id = NEW.watch_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_action_count
AFTER UPDATE ON action_execution_log
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
EXECUTE FUNCTION update_action_count();
