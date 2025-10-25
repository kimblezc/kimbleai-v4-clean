-- Add missing parent_project_id column
-- This column is needed for hierarchical project organization

ALTER TABLE projects ADD COLUMN IF NOT EXISTS parent_project_id UUID;

-- Add index for parent lookup
CREATE INDEX IF NOT EXISTS idx_projects_parent_id ON projects(parent_project_id);

-- Verification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'parent_project_id';

SELECT 'parent_project_id column added successfully!' as result;
