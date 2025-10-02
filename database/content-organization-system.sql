-- Content Organization System for KimbleAI
-- Adds category management for D&D and Military Transition content
-- Version: 1.0
-- Date: 2025-10-01

-- ================================
-- CONTENT CATEGORIES TABLE
-- ================================

CREATE TABLE IF NOT EXISTS content_categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT, -- emoji or icon name
  color TEXT DEFAULT '#6366f1',
  parent_category_id TEXT,
  keywords TEXT[] DEFAULT '{}', -- Keywords for auto-detection
  metadata JSONB DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_category_id) REFERENCES content_categories(id) ON DELETE SET NULL
);

-- Create indexes for content categories
CREATE INDEX IF NOT EXISTS idx_content_categories_name ON content_categories(name);
CREATE INDEX IF NOT EXISTS idx_content_categories_parent ON content_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_content_categories_created_by ON content_categories(created_by);

-- ================================
-- UPDATE EXISTING TABLES
-- ================================

-- Add category_id to audio_transcriptions
ALTER TABLE audio_transcriptions
  ADD COLUMN IF NOT EXISTS category_id TEXT,
  ADD COLUMN IF NOT EXISTS auto_categorized BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS category_confidence FLOAT DEFAULT 0,
  ADD CONSTRAINT fk_audio_category FOREIGN KEY (category_id)
    REFERENCES content_categories(id) ON DELETE SET NULL;

-- Add category_id to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS category_id TEXT,
  ADD CONSTRAINT fk_project_category FOREIGN KEY (category_id)
    REFERENCES content_categories(id) ON DELETE SET NULL;

-- Add category_id to conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS category_id TEXT,
  ADD CONSTRAINT fk_conversation_category FOREIGN KEY (category_id)
    REFERENCES content_categories(id) ON DELETE SET NULL;

-- Add category_id to knowledge_base
ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS category_id TEXT,
  ADD CONSTRAINT fk_knowledge_category FOREIGN KEY (category_id)
    REFERENCES content_categories(id) ON DELETE SET NULL;

-- Create indexes for category foreign keys
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_category ON audio_transcriptions(category_id);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category_id);
CREATE INDEX IF NOT EXISTS idx_conversations_category ON conversations(category_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category_id ON knowledge_base(category_id);

-- ================================
-- CATEGORY STATISTICS VIEW
-- ================================

CREATE OR REPLACE VIEW category_stats AS
SELECT
  cc.id as category_id,
  cc.name as category_name,
  cc.icon,
  cc.color,
  COUNT(DISTINCT at.id) as transcription_count,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT c.id) as conversation_count,
  COUNT(DISTINCT kb.id) as knowledge_count,
  SUM(at.file_size) as total_audio_size,
  SUM(at.duration) as total_audio_duration,
  MAX(GREATEST(
    at.created_at,
    p.created_at,
    c.created_at,
    kb.created_at
  )) as last_activity
FROM content_categories cc
LEFT JOIN audio_transcriptions at ON at.category_id = cc.id
LEFT JOIN projects p ON p.category_id = cc.id
LEFT JOIN conversations c ON c.category_id = cc.id
LEFT JOIN knowledge_base kb ON kb.category_id = cc.id
GROUP BY cc.id, cc.name, cc.icon, cc.color;

-- ================================
-- FUNCTIONS FOR CATEGORY MANAGEMENT
-- ================================

-- Function to get all content by category
CREATE OR REPLACE FUNCTION get_category_content(
  p_category_id TEXT,
  p_user_id TEXT,
  p_content_type TEXT DEFAULT 'all', -- 'all', 'audio', 'projects', 'conversations', 'knowledge'
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  content_type TEXT,
  content_id TEXT,
  title TEXT,
  created_at TIMESTAMPTZ,
  metadata JSONB
)
LANGUAGE SQL STABLE
AS $$
  -- Audio transcriptions
  SELECT
    'audio'::TEXT as content_type,
    id::TEXT as content_id,
    filename as title,
    created_at,
    json_build_object(
      'duration', duration,
      'file_size', file_size,
      'tags', metadata->'auto_tags',
      'importance', metadata->'importance_score'
    ) as metadata
  FROM audio_transcriptions
  WHERE category_id = p_category_id
    AND user_id = p_user_id
    AND (p_content_type = 'all' OR p_content_type = 'audio')

  UNION ALL

  -- Projects
  SELECT
    'project'::TEXT as content_type,
    id::TEXT as content_id,
    name as title,
    created_at,
    json_build_object(
      'status', status,
      'priority', priority,
      'tags', tags
    ) as metadata
  FROM projects
  WHERE category_id = p_category_id
    AND owner_id = p_user_id
    AND (p_content_type = 'all' OR p_content_type = 'projects')

  UNION ALL

  -- Conversations
  SELECT
    'conversation'::TEXT as content_type,
    id::TEXT as content_id,
    title,
    created_at,
    json_build_object(
      'message_count', message_count,
      'status', status,
      'tags', tags
    ) as metadata
  FROM conversations
  WHERE category_id = p_category_id
    AND user_id = p_user_id
    AND (p_content_type = 'all' OR p_content_type = 'conversations')

  UNION ALL

  -- Knowledge base
  SELECT
    'knowledge'::TEXT as content_type,
    id::TEXT as content_id,
    title,
    created_at,
    json_build_object(
      'source_type', source_type,
      'importance', importance,
      'tags', tags
    ) as metadata
  FROM knowledge_base
  WHERE category_id = p_category_id
    AND user_id = p_user_id
    AND (p_content_type = 'all' OR p_content_type = 'knowledge')

  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Function to auto-categorize content based on keywords
CREATE OR REPLACE FUNCTION auto_categorize_content(
  p_text TEXT,
  p_user_id TEXT
)
RETURNS TABLE (
  category_id TEXT,
  category_name TEXT,
  confidence FLOAT,
  matched_keywords TEXT[]
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_category RECORD;
  v_keyword TEXT;
  v_match_count INTEGER;
  v_total_keywords INTEGER;
  v_matched_keywords TEXT[];
BEGIN
  FOR v_category IN
    SELECT id, name, keywords
    FROM content_categories
    WHERE created_by = p_user_id OR created_by = 'system'
    ORDER BY created_at
  LOOP
    v_match_count := 0;
    v_total_keywords := array_length(v_category.keywords, 1);
    v_matched_keywords := ARRAY[]::TEXT[];

    IF v_total_keywords > 0 THEN
      FOREACH v_keyword IN ARRAY v_category.keywords
      LOOP
        IF p_text ~* ('\m' || v_keyword || '\M') THEN
          v_match_count := v_match_count + 1;
          v_matched_keywords := array_append(v_matched_keywords, v_keyword);
        END IF;
      END LOOP;

      IF v_match_count > 0 THEN
        category_id := v_category.id;
        category_name := v_category.name;
        confidence := v_match_count::FLOAT / v_total_keywords::FLOAT;
        matched_keywords := v_matched_keywords;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

-- Function to search within a category
CREATE OR REPLACE FUNCTION search_category_content(
  query_embedding vector(1536),
  p_category_id TEXT,
  p_user_id TEXT,
  match_count INT DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  content_type TEXT,
  id UUID,
  title TEXT,
  content TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ,
  metadata JSONB
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    'knowledge'::TEXT as content_type,
    kb.id,
    kb.title,
    kb.content,
    1 - (kb.embedding <=> query_embedding) AS similarity,
    kb.created_at,
    kb.metadata
  FROM knowledge_base kb
  WHERE kb.user_id = p_user_id
    AND kb.category_id = p_category_id
    AND kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) > similarity_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ================================
-- TRIGGERS
-- ================================

-- Update timestamp trigger for content_categories
CREATE TRIGGER update_content_categories_updated_at
  BEFORE UPDATE ON content_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- ROW LEVEL SECURITY
-- ================================

ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;

-- Users can view their own categories and system categories
CREATE POLICY "Users can view own and system categories" ON content_categories
  FOR SELECT
  USING (
    created_by = current_setting('app.current_user_id', true) OR
    created_by = 'system'
  );

-- Users can create their own categories
CREATE POLICY "Users can create categories" ON content_categories
  FOR INSERT
  WITH CHECK (created_by = current_setting('app.current_user_id', true));

-- Users can update their own categories
CREATE POLICY "Users can update own categories" ON content_categories
  FOR UPDATE
  USING (created_by = current_setting('app.current_user_id', true));

-- Users can delete their own categories
CREATE POLICY "Users can delete own categories" ON content_categories
  FOR DELETE
  USING (created_by = current_setting('app.current_user_id', true));

-- ================================
-- DEFAULT CATEGORIES
-- ================================

-- Insert system-level categories
INSERT INTO content_categories (id, name, description, icon, color, keywords, created_by, metadata) VALUES
-- D&D Category
(
  'category-dnd',
  'D&D',
  'Dungeons & Dragons campaigns, sessions, and character development',
  '🎲',
  '#8b5cf6',
  ARRAY[
    'game', 'campaign', 'character', 'dice', 'dungeon', 'dragon', 'd&d', 'rpg',
    'quest', 'adventure', 'roll', 'initiative', 'damage', 'spell', 'npc',
    'combat', 'encounter', 'session', 'player', 'dm', 'dungeon master',
    'wizard', 'fighter', 'rogue', 'cleric', 'barbarian', 'ranger', 'paladin',
    'bard', 'druid', 'monk', 'sorcerer', 'warlock', 'artificer',
    'hit points', 'armor class', 'saving throw', 'ability check', 'skill check',
    'long rest', 'short rest', 'inspiration', 'advantage', 'disadvantage'
  ],
  'system',
  '{
    "subcategories": ["sessions", "characters", "combat", "story"],
    "auto_detect": true,
    "priority": 1
  }'
),

-- Military Transition Category
(
  'category-military',
  'Military Transition',
  'Military career transition, interviews, and professional development',
  '🎖️',
  '#10b981',
  ARRAY[
    'military', 'transition', 'veteran', 'resume', 'deployment', 'rank', 'mos',
    'benefits', 'va', 'service', 'army', 'navy', 'air force', 'marines', 'coast guard',
    'civilian', 'interview', 'job search', 'career', 'taps', 'gi bill',
    'security clearance', 'leadership', 'training', 'skills translation',
    'networking', 'linkedin', 'job application', 'cover letter',
    'disability rating', 'post 9/11', 'vocational rehab', 'skillbridge'
  ],
  'system',
  '{
    "subcategories": ["interviews", "training", "career_planning", "networking"],
    "auto_detect": true,
    "priority": 1
  }'
),

-- Development/Technical Category
(
  'category-development',
  'Development',
  'Software development, coding, and technical projects',
  '💻',
  '#3b82f6',
  ARRAY[
    'code', 'api', 'function', 'database', 'server', 'deploy', 'bug', 'feature',
    'react', 'typescript', 'python', 'javascript', 'node', 'nextjs',
    'git', 'github', 'commit', 'pull request', 'merge', 'branch',
    'docker', 'kubernetes', 'aws', 'azure', 'cloud', 'supabase',
    'frontend', 'backend', 'full stack', 'ui', 'ux', 'design'
  ],
  'system',
  '{
    "subcategories": ["frontend", "backend", "devops", "architecture"],
    "auto_detect": true,
    "priority": 2
  }'
),

-- Business Category
(
  'category-business',
  'Business',
  'Business meetings, strategy, and client work',
  '💼',
  '#f59e0b',
  ARRAY[
    'meeting', 'client', 'project', 'deadline', 'budget', 'revenue', 'strategy',
    'proposal', 'contract', 'sales', 'marketing', 'customer', 'product',
    'roadmap', 'milestone', 'stakeholder', 'presentation', 'pitch'
  ],
  'system',
  '{
    "subcategories": ["meetings", "strategy", "client_work", "planning"],
    "auto_detect": true,
    "priority": 2
  }'
),

-- Personal Category
(
  'category-personal',
  'Personal',
  'Personal notes, reminders, and life management',
  '🏠',
  '#ec4899',
  ARRAY[
    'grocery', 'recipe', 'family', 'personal', 'health', 'workout', 'vacation',
    'appointment', 'reminder', 'note', 'todo', 'shopping', 'errand'
  ],
  'system',
  '{
    "subcategories": ["health", "family", "shopping", "errands"],
    "auto_detect": true,
    "priority": 3
  }'
),

-- General/Uncategorized
(
  'category-general',
  'General',
  'Uncategorized content and miscellaneous items',
  '📁',
  '#6b7280',
  ARRAY[],
  'system',
  '{
    "is_default": true,
    "auto_detect": false,
    "priority": 99
  }'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  keywords = EXCLUDED.keywords,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- ================================
-- GRANTS
-- ================================

GRANT SELECT ON category_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_content TO authenticated;
GRANT EXECUTE ON FUNCTION auto_categorize_content TO authenticated;
GRANT EXECUTE ON FUNCTION search_category_content TO authenticated;

-- ================================
-- COMMENTS
-- ================================

COMMENT ON TABLE content_categories IS 'Hierarchical content categorization system for organizing transcriptions, projects, and knowledge';
COMMENT ON FUNCTION get_category_content IS 'Retrieves all content items for a specific category';
COMMENT ON FUNCTION auto_categorize_content IS 'Automatically categorizes content based on keyword matching';
COMMENT ON FUNCTION search_category_content IS 'Vector similarity search within a specific category';
COMMENT ON VIEW category_stats IS 'Aggregated statistics for each content category';
