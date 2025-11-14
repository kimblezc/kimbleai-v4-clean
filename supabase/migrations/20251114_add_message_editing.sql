-- Add edited_at column to messages table for message editing feature
-- This enables tracking when messages are edited and displaying "Edited" badge

-- Add edited_at column (nullable, since not all messages will be edited)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Add index for performance when filtering edited messages
CREATE INDEX IF NOT EXISTS idx_messages_edited_at
ON messages(edited_at)
WHERE edited_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN messages.edited_at IS 'Timestamp when the message was last edited. NULL if never edited.';
