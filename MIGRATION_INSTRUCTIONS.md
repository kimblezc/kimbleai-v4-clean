# Database Migration Instructions

## Issue Diagnosed

The production database has a **simplified schema** that doesn't match what the API code expects:

### Current Production Schema (SIMPLE):
```sql
projects:
  - id (UUID)
  - name (TEXT)
  - color (TEXT)
  - description (TEXT)
  - user_id (TEXT)
  - created_at, updated_at

users:
  - id (TEXT)
  - name, email
  - (NO role or permissions columns)
```

### Expected Schema (FULL):
```sql
projects:
  - All of the above PLUS:
  - status, priority, owner_id, collaborators[], tags[]
  - metadata (JSONB), stats (JSONB)
  - parent_project_id

users:
  - All of the above PLUS:
  - role (admin/user/viewer)
  - permissions (JSONB)
  - metadata (JSONB)
```

## Root Cause of 500 Error

When creating a project, the API tries to:
1. Check user permission `can_create_projects` → **FAILS** (column doesn't exist)
2. Insert with `collaborators`, `tags`, `status`, `priority` → **FAILS** (columns don't exist)

## Solution

Apply the migration SQL to upgrade the database schema.

### Step 1: Open Supabase SQL Editor

1. Go to: https://gbmefnaqsxtoseufjixp.supabase.co
2. Navigate to: **SQL Editor** (left sidebar)
3. Click: **New Query**

### Step 2: Run the Migration

Copy the entire contents of: `database/UPGRADE_PROJECTS_SCHEMA.sql`

Paste into the SQL Editor and click **Run**.

### Step 3: Verify Migration

Run this verification query:

```sql
-- Check projects columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- Check users columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check user zach permissions
SELECT id, name, role, permissions
FROM users
WHERE id = 'zach';

-- Check existing projects
SELECT id, name, status, priority, owner_id, tags
FROM projects;
```

Expected results:
- ✅ projects table has: status, priority, owner_id, collaborators, tags, metadata, stats
- ✅ users table has: role, permissions, metadata
- ✅ user 'zach' has role='admin' and can_create_projects=true
- ✅ project_tasks and project_collaborators tables exist

### Step 4: Test Project Creation

After migration, test in production:

1. Go to: https://www.kimbleai.com/projects
2. Click: "Create New Project"
3. Fill in: name, description
4. Click: "Create"
5. Expected: ✅ Project created successfully (no 500 error)

## Alternative: Manual Column Addition

If the full migration fails, you can add columns one by one:

```sql
-- Add to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS collaborators TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{}';

-- Add to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{
  "can_create_projects": true,
  "can_delete_projects": false
}';

-- Update user zach to admin
UPDATE users SET
  role = 'admin',
  permissions = '{"can_create_projects": true, "can_delete_projects": true}'::jsonb
WHERE id = 'zach';
```

## Troubleshooting

### If migration fails:

1. **Check error message** - may indicate constraint violations
2. **Run statements individually** - isolate which statement fails
3. **Check existing data** - ensure no conflicts with constraints
4. **Backup first** - Supabase has automatic backups, but verify

### If you need to rollback:

The migration is **additive only** - it doesn't drop columns. You can safely keep the new columns even if unused.

## After Migration

Once migration is complete:

1. ✅ Project creation will work
2. ✅ User permissions will be enforced
3. ✅ All project features (tags, priority, status) will function
4. ✅ Project tasks and collaborators can be added

## Next Steps

After successful migration:
1. Test all project CRUD operations
2. Test conversation-project assignment
3. Verify frontend displays correctly
4. Check analytics and stats collection
