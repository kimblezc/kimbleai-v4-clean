-- ================================================================
-- FIX: Change projects.id from UUID to TEXT
-- ================================================================
-- Problem: Code generates string IDs like "proj_name_timestamp"
--          but database expects UUID format
-- Solution: Change id column to TEXT type
-- ================================================================

-- Step 1: Check current type
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'id';

-- Step 2: Drop foreign key constraint from conversations table (if exists)
ALTER TABLE conversations
DROP CONSTRAINT IF EXISTS conversations_project_id_fkey;

-- Step 3: Change conversations.project_id to TEXT FIRST
ALTER TABLE conversations
ALTER COLUMN project_id TYPE TEXT;

-- Step 4: Change projects.id from UUID to TEXT
ALTER TABLE projects
ALTER COLUMN id TYPE TEXT;

-- Step 5: Change parent_project_id from UUID to TEXT (for consistency)
ALTER TABLE projects
ALTER COLUMN parent_project_id TYPE TEXT;

-- Step 6: Recreate foreign key constraint with TEXT type
ALTER TABLE conversations
ADD CONSTRAINT conversations_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE SET NULL;

-- Verification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name IN ('id', 'parent_project_id');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'conversations' AND column_name = 'project_id';

SELECT 'Projects ID type changed from UUID to TEXT successfully!' as result;
