-- FIXED Migration: Optimize Projects Table Performance
-- Purpose: Fix slow project loading by adding indexed updated_at column
-- Issue: Ordering by JSON field is slow, need indexed column
-- Solution: Add updated_at column with index for fast ordering

-- Step 1: Add updated_at column if it doesn't exist
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Step 2: Set updated_at from created_at for existing rows
UPDATE projects
SET updated_at = created_at
WHERE updated_at IS NULL AND created_at IS NOT NULL;

-- Step 3: Set default for any remaining rows without updated_at
UPDATE projects
SET updated_at = NOW()
WHERE updated_at IS NULL;

-- Step 4: Create indexes for fast ordering
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_owner_updated ON projects(owner_id, updated_at DESC);

-- Step 5: Add trigger to auto-update updated_at on any UPDATE
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger
DROP TRIGGER IF EXISTS projects_updated_at_trigger ON projects;
CREATE TRIGGER projects_updated_at_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

-- Step 7: Verify the migration
DO $$
DECLARE
  row_count INTEGER;
  null_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Count total rows
  SELECT COUNT(*) INTO row_count FROM projects;

  -- Count rows with null updated_at
  SELECT COUNT(*) INTO null_count FROM projects WHERE updated_at IS NULL;

  -- Count indexes created
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'projects'
  AND indexname LIKE 'idx_projects_%';

  -- Report results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total projects: %', row_count;
  RAISE NOTICE 'Null updated_at: %', null_count;
  RAISE NOTICE 'Successfully migrated: %', row_count - null_count;
  RAISE NOTICE 'Indexes created: %', index_count;
  RAISE NOTICE '========================================';

  -- Verify indexes
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_updated_at') THEN
    RAISE NOTICE '✓ Index idx_projects_updated_at created';
  ELSE
    RAISE WARNING '✗ Index idx_projects_updated_at NOT created';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_owner_updated') THEN
    RAISE NOTICE '✓ Index idx_projects_owner_updated created';
  ELSE
    RAISE WARNING '✗ Index idx_projects_owner_updated NOT created';
  END IF;

  -- Verify trigger
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'projects_updated_at_trigger') THEN
    RAISE NOTICE '✓ Trigger projects_updated_at_trigger created';
  ELSE
    RAISE WARNING '✗ Trigger projects_updated_at_trigger NOT created';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Performance improvement expected:';
  RAISE NOTICE '  Before: 30+ seconds for project list';
  RAISE NOTICE '  After:  <1 second for project list';
  RAISE NOTICE '========================================';
END $$;
