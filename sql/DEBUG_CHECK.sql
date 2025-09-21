-- DEBUG: Check what's actually in the database
-- Run this in Supabase SQL Editor

-- 1. Check users
SELECT * FROM users;

-- 2. Check recent messages
SELECT 
  m.id,
  m.role,
  m.content,
  m.created_at,
  u.name as user_name,
  m.embedding IS NOT NULL as has_embedding
FROM messages m
JOIN users u ON m.user_id = u.id
ORDER BY m.created_at DESC
LIMIT 20;

-- 3. Check if embeddings are being saved
SELECT 
  COUNT(*) as total_messages,
  COUNT(embedding) as messages_with_embeddings,
  MIN(created_at) as oldest_message,
  MAX(created_at) as newest_message
FROM messages;

-- 4. Test vector search function directly
-- First get a user_id
WITH test_user AS (
  SELECT id FROM users WHERE name = 'Zach' LIMIT 1
)
SELECT 
  COUNT(*) as searchable_messages
FROM messages 
WHERE 
  user_id = (SELECT id FROM test_user)
  AND embedding IS NOT NULL;

-- 5. Check conversations
SELECT 
  c.id,
  c.title,
  u.name as user_name,
  c.updated_at,
  COUNT(m.id) as message_count
FROM conversations c
JOIN users u ON c.user_id = u.id
LEFT JOIN messages m ON m.conversation_id = c.id
GROUP BY c.id, c.title, u.name, c.updated_at
ORDER BY c.updated_at DESC
LIMIT 10;