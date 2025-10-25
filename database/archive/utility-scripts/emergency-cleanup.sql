-- EMERGENCY SUPABASE CLEANUP SCRIPT
-- WARNING: This will delete data. Use carefully!

-- 1. Check current table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 2. Check row counts
SELECT 'knowledge_base' as table_name, count(*) as rows FROM knowledge_base
UNION ALL
SELECT 'messages' as table_name, count(*) as rows FROM messages
UNION ALL
SELECT 'conversations' as table_name, count(*) as rows FROM conversations;

-- 3. EMERGENCY CLEANUP - DELETE OLD/LARGE DATA
-- Delete old knowledge base entries (keep last 30 days)
DELETE FROM knowledge_base
WHERE created_at < NOW() - INTERVAL '30 days'
  AND importance < 0.7;  -- Keep only high importance items

-- Delete old conversation messages (keep last 7 days for recent, older for important)
DELETE FROM messages
WHERE created_at < NOW() - INTERVAL '7 days'
  AND conversation_id NOT IN (
    SELECT id FROM conversations
    WHERE updated_at > NOW() - INTERVAL '30 days'
    OR metadata->>'importance' = 'high'
  );

-- Delete orphaned conversations
DELETE FROM conversations
WHERE id NOT IN (SELECT DISTINCT conversation_id FROM messages WHERE conversation_id IS NOT NULL);

-- 4. EMERGENCY INDEX CLEANUP
-- Drop expensive vector indexes temporarily to save space
DROP INDEX IF EXISTS idx_knowledge_embedding;
DROP INDEX IF EXISTS idx_messages_embedding;
DROP INDEX IF EXISTS idx_knowledge_base_content_fts;
DROP INDEX IF EXISTS idx_messages_content_fts;

-- 5. VACUUM to reclaim space
VACUUM FULL knowledge_base;
VACUUM FULL messages;
VACUUM FULL conversations;

-- 6. Check new sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;