-- ================================================================
-- QUICK FIX: Minimum changes to make project creation work
-- ================================================================
-- Run this in Supabase SQL Editor: https://gbmefnaqsxtoseufjixp.supabase.co
-- ================================================================

-- 1. Add essential columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS collaborators TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{}';

-- 2. Migrate existing user_id to owner_id
UPDATE projects SET owner_id = user_id WHERE owner_id IS NULL;

-- 3. Add essential columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"can_create_projects": true}';

-- 4. Make user 'zach' an admin with full permissions
UPDATE users
SET
  role = 'admin',
  permissions = '{
    "can_create_projects": true,
    "can_delete_projects": true,
    "can_manage_users": true,
    "can_access_analytics": true,
    "can_export_data": true,
    "can_configure_integrations": true,
    "can_view_all_conversations": true,
    "max_projects": -1,
    "max_collaborators_per_project": -1
  }'::jsonb
WHERE id = 'zach';

-- 5. Add constraints (non-critical, can fail if already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_status_check'
  ) THEN
    ALTER TABLE projects ADD CONSTRAINT projects_status_check
      CHECK (status IN ('active', 'completed', 'paused', 'archived'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_priority_check'
  ) THEN
    ALTER TABLE projects ADD CONSTRAINT projects_priority_check
      CHECK (priority IN ('low', 'medium', 'high', 'critical'));
  END IF;
END $$;

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);

-- 7. Create project_tasks table
CREATE TABLE IF NOT EXISTS project_tasks (
  id TEXT PRIMARY KEY,
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  assigned_to TEXT,
  due_date TIMESTAMPTZ,
  created_by TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 8. Create project_collaborators table
CREATE TABLE IF NOT EXISTS project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  permissions JSONB DEFAULT '{}',
  added_by TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- VERIFICATION (run these after to check it worked)
-- ================================================================

-- Should see: status, priority, owner_id, collaborators, tags, metadata, stats
SELECT column_name FROM information_schema.columns WHERE table_name = 'projects';

-- Should see: role, permissions
SELECT column_name FROM information_schema.columns WHERE table_name = 'users';

-- Should see: role='admin', can_create_projects=true
SELECT id, name, role, permissions->'can_create_projects' as can_create FROM users WHERE id = 'zach';

-- Success message
SELECT 'Migration complete! Try creating a project now.' as result;
