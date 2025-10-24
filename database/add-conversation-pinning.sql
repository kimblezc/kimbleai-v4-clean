-- Add pinning support to conversations table
-- This allows users to pin favorite conversations to the top of their list

-- Add pinned column to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;

-- Add pinned_at timestamp to track when conversation was pinned
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

-- Create index for faster queries of pinned conversations
CREATE INDEX IF NOT EXISTS idx_conversations_pinned
ON conversations(user_id, pinned DESC, updated_at DESC);

-- Update existing conversations to have pinned = false
UPDATE conversations
SET pinned = FALSE
WHERE pinned IS NULL;

-- Add comment
COMMENT ON COLUMN conversations.pinned IS 'Whether this conversation is pinned to the top of the list';
COMMENT ON COLUMN conversations.pinned_at IS 'Timestamp when the conversation was pinned';

-- Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'conversations'
  AND column_name IN ('pinned', 'pinned_at');

-- Success message
SELECT 'Migration completed! Conversations table now supports pinning.' AS status;
