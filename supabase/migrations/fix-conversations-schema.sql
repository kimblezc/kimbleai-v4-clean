-- Fix Conversations Schema Issues
-- This migration addresses:
-- 1. Missing created_at column
-- 2. Missing is_pinned column
-- 3. Ensures proper indexes exist

-- Step 1: Add created_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE conversations ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();

        -- Set created_at to updated_at for existing records
        UPDATE conversations
        SET created_at = updated_at
        WHERE created_at IS NULL;
    END IF;
END $$;

-- Step 2: Add is_pinned column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'is_pinned'
    ) THEN
        ALTER TABLE conversations ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Step 3: Ensure project_id column exists and is correct type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE conversations ADD COLUMN project_id TEXT;
    END IF;
END $$;

-- Step 4: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_is_pinned ON conversations(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_conversations_user_project ON conversations(user_id, project_id);

-- Step 5: Clean up orphaned messages (messages with null conversation_id)
-- Option 1: Delete orphaned messages
-- DELETE FROM messages WHERE conversation_id IS NULL;

-- Option 2: Create placeholder conversations for orphaned messages (safer)
INSERT INTO conversations (id, user_id, title, created_at, updated_at, is_pinned)
SELECT DISTINCT
    'orphaned_' || user_id || '_' || EXTRACT(EPOCH FROM NOW())::bigint,
    user_id,
    'Recovered Messages',
    NOW(),
    NOW(),
    FALSE
FROM messages
WHERE conversation_id IS NULL
  AND user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Step 6: Update orphaned messages to point to the placeholder conversation
UPDATE messages m
SET conversation_id = (
    SELECT id FROM conversations
    WHERE user_id = m.user_id
      AND title = 'Recovered Messages'
    LIMIT 1
)
WHERE m.conversation_id IS NULL
  AND m.user_id IS NOT NULL;

-- Step 7: Verification
SELECT
    'Conversations with created_at' as check_type,
    COUNT(*) as count
FROM conversations
WHERE created_at IS NOT NULL

UNION ALL

SELECT
    'Conversations with project_id' as check_type,
    COUNT(*) as count
FROM conversations
WHERE project_id IS NOT NULL

UNION ALL

SELECT
    'Orphaned messages remaining' as check_type,
    COUNT(*) as count
FROM messages
WHERE conversation_id IS NULL;

-- Output schema info
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'conversations'
ORDER BY ordinal_position;
