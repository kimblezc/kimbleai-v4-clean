-- Add unique constraint to knowledge_base.source_id for Drive Intelligence
-- This allows upsert operations to prevent duplicate Drive files
-- Run this in Supabase SQL Editor

-- Create unique constraint on source_id (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'knowledge_base_source_id_key'
  ) THEN
    ALTER TABLE knowledge_base
    ADD CONSTRAINT knowledge_base_source_id_key UNIQUE (source_id);

    RAISE NOTICE '✅ Added unique constraint to knowledge_base.source_id';
  ELSE
    RAISE NOTICE '⚠️  Unique constraint knowledge_base_source_id_key already exists';
  END IF;
END $$;

-- Create index on source_id for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source_id ON knowledge_base(source_id);

-- Create index on source_type for filtering (if not exists)
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source_type ON knowledge_base(source_type);

-- Create composite index for Drive Intelligence queries
CREATE INDEX IF NOT EXISTS idx_knowledge_base_drive_lookup
ON knowledge_base(source_type, user_id)
WHERE source_type = 'google_drive';

RAISE NOTICE '✅ Knowledge base indexes created successfully';
RAISE NOTICE '📁 Drive Intelligence can now prevent duplicate file indexing';
