-- ================================================================
-- UPGRADE PROJECTS SCHEMA TO FULL SYSTEM
-- ================================================================
-- This migration upgrades the simplified projects table to the
-- full-featured schema expected by the application code
-- ================================================================

-- 1. Add missing columns to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS owner_id TEXT,
  ADD COLUMN IF NOT EXISTS collaborators TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS parent_project_id UUID,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{
    "created_at": null,
    "updated_at": null,
    "deadline": null,
    "budget": null,
    "progress_percentage": 0,
    "client": null,
    "tech_stack": [],
    "repository_url": null,
    "deployment_url": null
  }',
  ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{
    "total_conversations": 0,
    "total_messages": 0,
    "active_tasks": 0,
    "completed_tasks": 0,
    "last_activity": null
  }';

-- 2. Migrate existing data from user_id to owner_id
UPDATE projects
SET owner_id = user_id
WHERE owner_id IS NULL;

-- 3. Drop the old user_id column (after data is migrated)
-- Note: Keeping it for now to maintain backward compatibility
-- ALTER TABLE projects DROP COLUMN IF EXISTS user_id;

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_parent_project_id ON projects(parent_project_id);
CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_projects_collaborators ON projects USING gin(collaborators);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);

-- 5. Add foreign key constraints
ALTER TABLE projects
  ADD CONSTRAINT fk_projects_parent
    FOREIGN KEY (parent_project_id)
    REFERENCES projects(id)
    ON DELETE SET NULL;

-- 6. Ensure users table has required columns for permissions
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{
    "can_create_projects": true,
    "can_delete_projects": false,
    "can_manage_users": false,
    "can_access_analytics": false,
    "can_export_data": false,
    "can_configure_integrations": false,
    "can_view_all_conversations": false,
    "max_projects": 10,
    "max_collaborators_per_project": 5
  }',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{
    "created_at": null,
    "last_login": null,
    "total_conversations": 0,
    "total_messages": 0,
    "favorite_projects": [],
    "google_connected": false,
    "calendar_sync_enabled": false,
    "drive_sync_enabled": false,
    "gmail_sync_enabled": false
  }';

-- 7. Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 8. Update existing user 'zach' to be admin with full permissions
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

-- 9. Create project_tasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS project_tasks (
  id TEXT PRIMARY KEY,
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'review', 'completed', 'blocked')) DEFAULT 'todo',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  assigned_to TEXT,
  due_date TIMESTAMPTZ,
  estimated_hours INTEGER,
  actual_hours INTEGER,
  tags TEXT[] DEFAULT '{}',
  conversation_refs TEXT[] DEFAULT '{}',
  dependencies TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 10. Create project_collaborators table if it doesn't exist
CREATE TABLE IF NOT EXISTS project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  added_by TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, user_id)
);

-- 11. Create indexes for project_tasks
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to ON project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_priority ON project_tasks(priority);

-- 12. Create indexes for project_collaborators
CREATE INDEX IF NOT EXISTS idx_project_collaborators_project_id ON project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user_id ON project_collaborators(user_id);

-- 13. Update function to handle updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_tasks_updated_at ON project_tasks;
CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 15. Add comments for documentation
COMMENT ON TABLE projects IS 'Enhanced project management with full metadata, collaboration, and hierarchy support';
COMMENT ON TABLE project_tasks IS 'Tasks and action items within projects';
COMMENT ON TABLE project_collaborators IS 'Project team members and their roles';

-- ================================================================
-- Verification queries (run these to check the migration)
-- ================================================================

-- Check projects structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'projects'
-- ORDER BY ordinal_position;

-- Check users structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- ORDER BY ordinal_position;

-- Check existing projects
-- SELECT id, name, status, priority, owner_id FROM projects;

-- Check user permissions
-- SELECT id, name, role, permissions FROM users;
