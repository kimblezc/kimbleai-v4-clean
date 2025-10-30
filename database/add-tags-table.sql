-- ============================================================================
-- Tags Management Schema
-- Date: 2025-10-30
-- Purpose: Centralized tag management with usage tracking and analytics
-- ============================================================================

-- Global tags table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY DEFAULT ('tag_' || lower(replace(cast(gen_random_uuid() as text), '-', '_'))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Normalized tag name (lowercase, no spaces)
  display_name TEXT, -- Optional display name (original capitalization)
  category TEXT DEFAULT 'custom' CHECK (category IN ('technical', 'business', 'client', 'priority', 'status', 'custom')),
  color TEXT DEFAULT '#6366f1', -- Hex color code
  description TEXT, -- Optional tag description
  usage_count INTEGER DEFAULT 0, -- Cached count of how many times tag is used
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one tag name per user
  UNIQUE(user_id, name)
);

-- Row Level Security
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tags" ON tags;
CREATE POLICY "Users can manage own tags" ON tags
  FOR ALL USING (user_id = current_user);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count DESC);

-- Function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_counts(p_user_id TEXT)
RETURNS void AS $$
BEGIN
  -- Count tags in knowledge_base
  WITH kb_tag_counts AS (
    SELECT
      unnest(tags) as tag_name,
      COUNT(*) as count
    FROM knowledge_base
    WHERE user_id = p_user_id
    GROUP BY unnest(tags)
  ),
  -- Count tags in files
  file_tag_counts AS (
    SELECT
      unnest(tags) as tag_name,
      COUNT(*) as count
    FROM files
    WHERE user_id = p_user_id
    GROUP BY unnest(tags)
  ),
  -- Combine counts
  all_tag_counts AS (
    SELECT
      tag_name,
      SUM(count) as total_count
    FROM (
      SELECT tag_name, count FROM kb_tag_counts
      UNION ALL
      SELECT tag_name, count FROM file_tag_counts
    ) combined
    GROUP BY tag_name
  )
  -- Update tags table
  UPDATE tags t
  SET
    usage_count = COALESCE(atc.total_count, 0),
    updated_at = NOW()
  FROM all_tag_counts atc
  WHERE t.name = atc.tag_name
    AND t.user_id = p_user_id;

  -- Set usage_count to 0 for tags not found in content
  UPDATE tags t
  SET
    usage_count = 0,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM all_tag_counts atc WHERE atc.tag_name = t.name
    );
END;
$$ LANGUAGE plpgsql;

-- Function to sync tags from existing content
CREATE OR REPLACE FUNCTION sync_tags_from_content(p_user_id TEXT)
RETURNS void AS $$
BEGIN
  -- Insert tags from knowledge_base that don't exist yet
  INSERT INTO tags (user_id, name, display_name, category, color)
  SELECT DISTINCT
    p_user_id,
    unnest(tags),
    unnest(tags), -- Use tag as display_name initially
    'custom', -- Default category, can be updated later
    '#6366f1' -- Default color
  FROM knowledge_base
  WHERE user_id = p_user_id
    AND tags IS NOT NULL
    AND array_length(tags, 1) > 0
  ON CONFLICT (user_id, name) DO NOTHING;

  -- Insert tags from files that don't exist yet
  INSERT INTO tags (user_id, name, display_name, category, color)
  SELECT DISTINCT
    p_user_id,
    unnest(tags),
    unnest(tags),
    'custom',
    '#6366f1'
  FROM files
  WHERE user_id = p_user_id
    AND tags IS NOT NULL
    AND array_length(tags, 1) > 0
  ON CONFLICT (user_id, name) DO NOTHING;

  -- Update usage counts
  PERFORM update_tag_usage_counts(p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Initial sync for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM users LOOP
    PERFORM sync_tags_from_content(user_record.id);
  END LOOP;

  RAISE NOTICE 'Tags synced from existing content for all users';
END $$;
