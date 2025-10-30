-- Cleanup Old and Orphaned Conversations
-- This script removes:
-- 1. Test conversations (IDs containing 'test')
-- 2. Conversations with no messages
-- 3. Conversations older than 90 days with no recent activity
-- 4. Conversations with invalid/short IDs (less than 10 characters)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 1: Delete test conversations
DELETE FROM conversations
WHERE id LIKE '%test%' OR id LIKE '%TEST%'
  OR title LIKE '%test%' OR title LIKE '%TEST%';

-- Step 2: Delete conversations with no messages (orphaned)
DELETE FROM conversations c
WHERE NOT EXISTS (
  SELECT 1 FROM messages m
  WHERE m.conversation_id = c.id
);

-- Step 3: Delete old conversations (older than 90 days with no recent updates)
-- Skip this for now - user may want to keep old conversations
-- DELETE FROM conversations
-- WHERE updated_at < NOW() - INTERVAL '90 days'
--   AND created_at < NOW() - INTERVAL '90 days';

-- Step 4: Delete conversations with invalid IDs (too short)
DELETE FROM conversations
WHERE LENGTH(id) < 10;

-- Step 5: Delete DELETED_PROJECT_MARKER conversations
DELETE FROM conversations
WHERE title LIKE 'DELETED_PROJECT_MARKER_%';

-- Output cleanup summary
SELECT
  (SELECT COUNT(*) FROM conversations) as remaining_conversations,
  (SELECT COUNT(*) FROM messages) as total_messages,
  (SELECT COUNT(DISTINCT conversation_id) FROM messages) as conversations_with_messages;
