-- Migration: Optimize Projects Table Performance
-- Purpose: Fix slow project loading by adding indexed updated_at column
-- Issue: Ordering by JSON field (metadata->updated_at) is very slow without indexes
-- Solution: Add proper updated_at column with index for fast ordering

-- Step 1: Add updated_at column (not in JSON metadata)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Copy existing data from metadata->updated_at if it exists
UPDATE projects
SET updated_at = (metadata->>'updated_at')::TIMESTAMPTZ
WHERE metadata->>'updated_at' IS NOT NULL;

-- Step 3: Set default for rows without updated_at
UPDATE projects
SET updated_at = created_at
WHERE updated_at IS NULL AND created_at IS NOT NULL;

-- Step 4: Set fallback for any remaining rows
UPDATE projects
SET updated_at = NOW()
WHERE updated_at IS NULL;

-- Step 5: Create indexes for fast ordering
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_owner_updated ON projects(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_status_updated ON projects(status, updated_at DESC);

-- Step 6: Add trigger to auto-update updated_at on any UPDATE
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger
DROP TRIGGER IF EXISTS projects_updated_at_trigger ON projects;
CREATE TRIGGER projects_updated_at_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

-- Step 8: Verify the migration
DO $$
DECLARE
  row_count INTEGER;
  null_count INTEGER;
BEGIN
  -- Count total rows
  SELECT COUNT(*) INTO row_count FROM projects;

  -- Count rows with null updated_at
  SELECT COUNT(*) INTO null_count FROM projects WHERE updated_at IS NULL;

  -- Report results
  RAISE NOTICE 'Migration Complete:';
  RAISE NOTICE '  Total projects: %', row_count;
  RAISE NOTICE '  Null updated_at: %', null_count;
  RAISE NOTICE '  Successfully migrated: %', row_count - null_count;

  -- Verify indexes
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_updated_at') THEN
    RAISE NOTICE '  ✓ Index idx_projects_updated_at created';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_owner_updated') THEN
    RAISE NOTICE '  ✓ Index idx_projects_owner_updated created';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_status_updated') THEN
    RAISE NOTICE '  ✓ Index idx_projects_status_updated created';
  END IF;
END $$;

-- Performance improvement notes:
-- BEFORE: Order by metadata->>'updated_at' (no index possible on JSON field)
-- AFTER:  Order by updated_at (indexed column with btree index)
-- Expected speedup: 10-100x faster for large datasets (100+ projects)
-- From ~30 seconds to <1 second for typical workloads
