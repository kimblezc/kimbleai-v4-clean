-- Drive Intelligence Agent - Edit Approval Workflow Schema
-- Tracks proposed edits before they're applied to Google Drive files

-- Table: drive_edit_proposals
-- Stores edit proposals that require user approval
CREATE TABLE IF NOT EXISTS drive_edit_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,

  -- Edit details
  edit_type TEXT NOT NULL CHECK (edit_type IN ('content_replace', 'content_append', 'content_prepend', 'rename', 'move', 'delete')),
  proposed_by TEXT NOT NULL DEFAULT 'drive-intelligence-agent',

  -- Content changes (for content edits)
  original_content TEXT,
  new_content TEXT,
  content_diff TEXT,

  -- Metadata changes
  new_name TEXT,
  new_folder_id TEXT,

  -- Reasoning
  reason TEXT,
  ai_confidence DECIMAL(3,2),
  expected_outcome TEXT,

  -- Approval state
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'failed')),
  reviewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_drive_edit_proposals_user_id ON drive_edit_proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_drive_edit_proposals_status ON drive_edit_proposals(status);
CREATE INDEX IF NOT EXISTS idx_drive_edit_proposals_file_id ON drive_edit_proposals(file_id);
CREATE INDEX IF NOT EXISTS idx_drive_edit_proposals_created_at ON drive_edit_proposals(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_drive_edit_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_drive_edit_proposals_updated_at
  BEFORE UPDATE ON drive_edit_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_drive_edit_proposals_updated_at();

-- Table: drive_edit_history
-- Tracks all applied edits for audit trail
CREATE TABLE IF NOT EXISTS drive_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES drive_edit_proposals(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,

  edit_type TEXT NOT NULL,
  action_taken TEXT,

  -- Before/after snapshots
  before_state JSONB,
  after_state JSONB,

  -- Metadata
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied_by TEXT DEFAULT 'system',

  CONSTRAINT fk_user_history FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for history
CREATE INDEX IF NOT EXISTS idx_drive_edit_history_user_id ON drive_edit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_drive_edit_history_file_id ON drive_edit_history(file_id);
CREATE INDEX IF NOT EXISTS idx_drive_edit_history_applied_at ON drive_edit_history(applied_at DESC);

-- Comments
COMMENT ON TABLE drive_edit_proposals IS 'Stores proposed Drive file edits awaiting user approval';
COMMENT ON TABLE drive_edit_history IS 'Audit trail of all applied Drive file edits';
COMMENT ON COLUMN drive_edit_proposals.edit_type IS 'Type of edit: content_replace, content_append, content_prepend, rename, move, delete';
COMMENT ON COLUMN drive_edit_proposals.status IS 'Approval status: pending, approved, rejected, applied, failed';
COMMENT ON COLUMN drive_edit_proposals.ai_confidence IS 'AI confidence score (0.00-1.00) for the proposed edit';
