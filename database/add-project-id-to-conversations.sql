-- Add project_id column to conversations table
-- Run this migration to enable full project assignment functionality

-- Step 1: Add project_id column (nullable, allows existing conversations to remain unassigned)
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS project_id TEXT;

-- Step 2: Add foreign key constraint to projects table (optional, enables referential integrity)
ALTER TABLE conversations
ADD CONSTRAINT conversations_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE SET NULL;  -- If project deleted, conversations become unassigned

-- Step 3: Create index for faster project-based queries
CREATE INDEX IF NOT EXISTS idx_conversations_project_id
ON conversations(project_id);

-- Step 4: Create index for user+project queries (for filtering conversations by project)
CREATE INDEX IF NOT EXISTS idx_conversations_user_project
ON conversations(user_id, project_id);

-- Verification: Check if column was added successfully
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'conversations'
  AND column_name = 'project_id';

-- Should return:
--  column_name | data_type | is_nullable
-- -------------+-----------+-------------
--  project_id  | text      | YES
