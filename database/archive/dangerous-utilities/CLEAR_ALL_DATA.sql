-- ⚠️ DANGEROUS: This clears ALL data from the database
-- Only run this if you want to start completely fresh!

-- Clear all conversations
DELETE FROM conversations;

-- Clear all projects
DELETE FROM projects;

-- Clear all transcriptions
DELETE FROM transcriptions;

-- Clear all search indices
DELETE FROM search_index;

-- Clear all google drive attachments
DELETE FROM google_drive_attachments;

-- Verify everything is clean
SELECT
  'conversations' as table_name,
  COUNT(*) as remaining_rows
FROM conversations
UNION ALL
SELECT
  'projects' as table_name,
  COUNT(*) as remaining_rows
FROM projects
UNION ALL
SELECT
  'transcriptions' as table_name,
  COUNT(*) as remaining_rows
FROM transcriptions
UNION ALL
SELECT
  'search_index' as table_name,
  COUNT(*) as remaining_rows
FROM search_index
UNION ALL
SELECT
  'google_drive_attachments' as table_name,
  COUNT(*) as remaining_rows
FROM google_drive_attachments;

-- Show confirmation
SELECT '✅ All test data cleared! Database is now fresh.' as status;
