-- ================================================================================================
-- BACKUPS TABLE MIGRATION
-- ================================================================================================
-- Purpose: Create backups table for tracking automated backups
-- Date: 2025-01-13
-- ================================================================================================

-- Create backups table
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  data_counts JSONB DEFAULT '{}',
  backup_size_bytes BIGINT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  drive_file_id TEXT,
  drive_file_url TEXT,
  error_message TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_backups_user ON backups(user_id);
CREATE INDEX IF NOT EXISTS idx_backups_created ON backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_user_created ON backups(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own backups" ON backups;
CREATE POLICY "Users can view own backups"
  ON backups FOR SELECT
  USING (user_id IN (
    SELECT id FROM users
    WHERE email IN ('zach.kimble@gmail.com', 'becky.aza.kimble@gmail.com')
  ));

DROP POLICY IF EXISTS "System can insert backups" ON backups;
CREATE POLICY "System can insert backups"
  ON backups FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can update backups" ON backups;
CREATE POLICY "System can update backups"
  ON backups FOR UPDATE
  USING (true);

-- Comments
COMMENT ON TABLE backups IS 'Automated backup tracking with Google Drive integration';
COMMENT ON COLUMN backups.data_counts IS 'JSON object with counts of backed up items';
COMMENT ON COLUMN backups.drive_file_id IS 'Google Drive file ID where backup is stored';

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE '✅ Backups table migration complete!';
END $$;
