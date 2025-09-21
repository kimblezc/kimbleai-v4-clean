-- FIX USER ASSOCIATION ISSUE
-- Run this ENTIRE script in Supabase SQL Editor

-- 1. Check current users
SELECT * FROM users;

-- 2. Check if messages have user_id
SELECT 
  COUNT(*) as total_messages,
  COUNT(user_id) as messages_with_user,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as orphaned_messages
FROM messages;

-- 3. Fix orphaned messages (assign to Zach for now)
UPDATE messages 
SET user_id = (SELECT id FROM users WHERE name = 'Zach')
WHERE user_id IS NULL;

-- 4. Verify fix
SELECT 
  m.id,
  m.content,
  m.role,
  u.name as user_name,
  m.created_at
FROM messages m
LEFT JOIN users u ON m.user_id = u.id
ORDER BY m.created_at DESC
LIMIT 10;

-- 5. Test the search function with actual user_id
WITH zach_user AS (
  SELECT id FROM users WHERE name = 'Zach' LIMIT 1
)
SELECT COUNT(*) as messages_for_zach
FROM messages 
WHERE user_id = (SELECT id FROM zach_user);

-- 6. Create a simple debug function
CREATE OR REPLACE FUNCTION get_user_messages(user_name_param TEXT)
RETURNS TABLE(
  content TEXT,
  role TEXT,
  created_at TIMESTAMP
)
LANGUAGE sql
AS $$
  SELECT m.content, m.role, m.created_at
  FROM messages m
  JOIN users u ON m.user_id = u.id
  WHERE u.name = user_name_param
  ORDER BY m.created_at DESC
  LIMIT 20;
$$;

-- 7. Test the function
SELECT * FROM get_user_messages('Zach');