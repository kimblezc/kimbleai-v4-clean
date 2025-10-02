-- Project Context Agent Database Schema Extensions
-- Run this SQL in your Supabase SQL Editor to add project context tracking capabilities

-- ================================
-- PROJECT CONTEXT TABLES
-- ================================

-- Project Learning Patterns for AI improvement
CREATE TABLE IF NOT EXISTS project_learning_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  correction_type TEXT NOT NULL CHECK (correction_type IN ('project_assignment', 'tag_correction', 'priority_adjustment', 'classification_correction')),
  original_prediction JSONB NOT NULL,
  user_correction JSONB NOT NULL,
  content_context TEXT NOT NULL,
  pattern_strength FLOAT DEFAULT 1.0 CHECK (pattern_strength >= 0 AND pattern_strength <= 10),
  reinforcement_count INTEGER DEFAULT 1,
  last_reinforced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Project Classifications for tracking AI decisions
CREATE TABLE IF NOT EXISTS project_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('conversation', 'message', 'file', 'email', 'calendar', 'text')),
  content_id TEXT,
  content_preview TEXT NOT NULL,
  classification_result JSONB NOT NULL,
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  assigned_project_id TEXT,
  user_feedback TEXT CHECK (user_feedback IN ('correct', 'incorrect', 'partially_correct')),
  feedback_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Project Context Insights for tracking patterns and trends
CREATE TABLE IF NOT EXISTS project_context_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  project_id TEXT,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('trend', 'opportunity', 'risk', 'optimization', 'pattern', 'anomaly')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed', 'archived')),
  metadata JSONB DEFAULT '{}',
  action_taken JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Project Activity Timeline for comprehensive tracking
CREATE TABLE IF NOT EXISTS project_activity_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'conversation_created', 'conversation_assigned', 'task_created', 'task_completed',
    'task_updated', 'file_uploaded', 'milestone_reached', 'collaboration_added',
    'classification_applied', 'insight_generated', 'project_updated'
  )),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  significance FLOAT DEFAULT 0.5 CHECK (significance >= 0 AND significance <= 1),
  related_entity_type TEXT CHECK (related_entity_type IN ('conversation', 'task', 'file', 'user', 'insight')),
  related_entity_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Project Collaborators extended table (enhancing existing)
CREATE TABLE IF NOT EXISTS project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'contributor')),
  permissions JSONB DEFAULT '{
    "can_edit_project": false,
    "can_add_tasks": true,
    "can_assign_tasks": false,
    "can_view_analytics": false,
    "can_manage_collaborators": false,
    "can_delete_content": false
  }',
  added_by TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive', 'removed')),
  last_activity TIMESTAMPTZ,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(project_id, user_id)
);

-- Project Cross References for relationship tracking
CREATE TABLE IF NOT EXISTS project_cross_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_project_id TEXT NOT NULL,
  target_project_id TEXT NOT NULL,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('mention', 'dependency', 'resource_sharing', 'similar_topic', 'collaboration')),
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  context TEXT NOT NULL,
  frequency INTEGER DEFAULT 1,
  first_detected TIMESTAMPTZ DEFAULT NOW(),
  last_detected TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'verified', 'dismissed')),
  FOREIGN KEY (source_project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (target_project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CHECK (source_project_id != target_project_id),
  UNIQUE(source_project_id, target_project_id, reference_type)
);

-- Project Health Metrics for monitoring
CREATE TABLE IF NOT EXISTS project_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  health_score FLOAT NOT NULL CHECK (health_score >= 0 AND health_score <= 1),
  activity_score FLOAT NOT NULL CHECK (activity_score >= 0 AND activity_score <= 1),
  collaboration_score FLOAT NOT NULL CHECK (collaboration_score >= 0 AND collaboration_score <= 1),
  completion_score FLOAT NOT NULL CHECK (completion_score >= 0 AND completion_score <= 1),
  risk_score FLOAT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  metrics JSONB NOT NULL DEFAULT '{
    "message_velocity": 0,
    "task_completion_rate": 0,
    "collaboration_index": 0,
    "content_diversity": 0,
    "days_since_activity": 0,
    "overdue_tasks": 0,
    "blocked_tasks": 0
  }',
  factors JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Project Content Themes for topic modeling
CREATE TABLE IF NOT EXISTS project_content_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  theme_name TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  strength FLOAT NOT NULL CHECK (strength >= 0 AND strength <= 1),
  content_examples JSONB DEFAULT '[]',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, theme_name)
);

-- Enhanced semantic content table for better search integration
CREATE TABLE IF NOT EXISTS semantic_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  project_id TEXT,
  content_type TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- Project Learning Patterns indexes
CREATE INDEX IF NOT EXISTS idx_learning_patterns_user_id ON project_learning_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_type ON project_learning_patterns(correction_type);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_strength ON project_learning_patterns(pattern_strength DESC);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_created ON project_learning_patterns(created_at DESC);

-- Project Classifications indexes
CREATE INDEX IF NOT EXISTS idx_classifications_user_id ON project_classifications(user_id);
CREATE INDEX IF NOT EXISTS idx_classifications_content_type ON project_classifications(content_type);
CREATE INDEX IF NOT EXISTS idx_classifications_confidence ON project_classifications(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_classifications_project ON project_classifications(assigned_project_id);
CREATE INDEX IF NOT EXISTS idx_classifications_feedback ON project_classifications(user_feedback);

-- Project Context Insights indexes
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON project_context_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_project_id ON project_context_insights(project_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON project_context_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_priority ON project_context_insights(priority);
CREATE INDEX IF NOT EXISTS idx_insights_status ON project_context_insights(status);
CREATE INDEX IF NOT EXISTS idx_insights_created ON project_context_insights(created_at DESC);

-- Project Activity Timeline indexes
CREATE INDEX IF NOT EXISTS idx_timeline_project_id ON project_activity_timeline(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_user_id ON project_activity_timeline(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_activity_type ON project_activity_timeline(activity_type);
CREATE INDEX IF NOT EXISTS idx_timeline_created ON project_activity_timeline(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_significance ON project_activity_timeline(significance DESC);

-- Project Collaborators indexes
CREATE INDEX IF NOT EXISTS idx_collaborators_project_id ON project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON project_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_role ON project_collaborators(role);
CREATE INDEX IF NOT EXISTS idx_collaborators_status ON project_collaborators(status);

-- Project Cross References indexes
CREATE INDEX IF NOT EXISTS idx_cross_refs_source ON project_cross_references(source_project_id);
CREATE INDEX IF NOT EXISTS idx_cross_refs_target ON project_cross_references(target_project_id);
CREATE INDEX IF NOT EXISTS idx_cross_refs_type ON project_cross_references(reference_type);
CREATE INDEX IF NOT EXISTS idx_cross_refs_confidence ON project_cross_references(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_cross_refs_frequency ON project_cross_references(frequency DESC);

-- Project Health Metrics indexes
CREATE INDEX IF NOT EXISTS idx_health_metrics_project ON project_health_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_measured ON project_health_metrics(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_metrics_score ON project_health_metrics(health_score DESC);

-- Semantic Content indexes
CREATE INDEX IF NOT EXISTS idx_semantic_content_user ON semantic_content(user_id);
CREATE INDEX IF NOT EXISTS idx_semantic_content_project ON semantic_content(project_id);
CREATE INDEX IF NOT EXISTS idx_semantic_content_type ON semantic_content(content_type);
CREATE INDEX IF NOT EXISTS idx_semantic_content_created ON semantic_content(created_at DESC);

-- Vector similarity indexes
CREATE INDEX IF NOT EXISTS idx_semantic_content_embedding ON semantic_content
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_semantic_content_fts ON semantic_content
USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || content));

-- JSONB indexes for metadata queries
CREATE INDEX IF NOT EXISTS idx_classifications_result_gin ON project_classifications USING gin(classification_result);
CREATE INDEX IF NOT EXISTS idx_insights_metadata_gin ON project_context_insights USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_timeline_metadata_gin ON project_activity_timeline USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_health_metrics_gin ON project_health_metrics USING gin(metrics);

-- ================================
-- ENHANCED SEARCH FUNCTIONS
-- ================================

-- Search all content with project context awareness
CREATE OR REPLACE FUNCTION search_all_content(
  query_embedding vector(1536),
  similarity_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 20,
  user_id_filter TEXT DEFAULT NULL,
  project_id_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  content_type TEXT,
  project_id TEXT,
  similarity FLOAT,
  metadata JSONB,
  tags TEXT[],
  created_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    sc.id,
    sc.title,
    sc.content,
    sc.content_type,
    sc.project_id,
    1 - (sc.embedding <=> query_embedding) AS similarity,
    sc.metadata,
    sc.tags,
    sc.created_at
  FROM semantic_content sc
  WHERE 1 - (sc.embedding <=> query_embedding) > similarity_threshold
    AND (user_id_filter IS NULL OR sc.user_id = user_id_filter)
    AND (project_id_filter IS NULL OR sc.project_id = project_id_filter)
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Get project context for content classification
CREATE OR REPLACE FUNCTION get_project_classification_context(
  content_embedding vector(1536),
  p_user_id TEXT,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  project_id TEXT,
  project_name TEXT,
  similarity FLOAT,
  content_count INTEGER,
  avg_confidence FLOAT,
  common_tags TEXT[]
)
LANGUAGE SQL STABLE
AS $$
  WITH similar_content AS (
    SELECT
      sc.project_id,
      1 - (sc.embedding <=> content_embedding) AS similarity,
      sc.tags
    FROM semantic_content sc
    WHERE sc.user_id = p_user_id
      AND sc.project_id IS NOT NULL
      AND 1 - (sc.embedding <=> content_embedding) > 0.5
    ORDER BY sc.embedding <=> content_embedding
    LIMIT match_count * 3
  ),
  project_matches AS (
    SELECT
      sc.project_id,
      AVG(sc.similarity) as avg_similarity,
      COUNT(*) as content_count,
      array_agg(DISTINCT tag) FILTER (WHERE tag IS NOT NULL) as all_tags
    FROM similar_content sc, unnest(sc.tags) as tag
    WHERE sc.project_id IS NOT NULL
    GROUP BY sc.project_id
    HAVING COUNT(*) >= 2
  )
  SELECT
    pm.project_id,
    p.name as project_name,
    pm.avg_similarity as similarity,
    pm.content_count,
    COALESCE(
      (SELECT AVG(confidence)
       FROM project_classifications pc
       WHERE pc.assigned_project_id = pm.project_id
         AND pc.user_feedback != 'incorrect'),
      0.5
    ) as avg_confidence,
    pm.all_tags[1:10] as common_tags
  FROM project_matches pm
  JOIN projects p ON p.id = pm.project_id
  ORDER BY pm.avg_similarity DESC, pm.content_count DESC
  LIMIT match_count;
$$;

-- Get search statistics for monitoring
CREATE OR REPLACE FUNCTION get_search_stats()
RETURNS TABLE (
  total_documents INTEGER,
  total_chunks INTEGER,
  content_types JSONB,
  index_health TEXT,
  last_indexed TIMESTAMPTZ
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    COUNT(*)::INTEGER as total_documents,
    0 as total_chunks,
    jsonb_object_agg(content_type, type_count) as content_types,
    'good' as index_health,
    MAX(created_at) as last_indexed
  FROM (
    SELECT
      content_type,
      COUNT(*) as type_count
    FROM semantic_content
    GROUP BY content_type
  ) type_counts;
$$;

-- Function to analyze project health
CREATE OR REPLACE FUNCTION analyze_project_health(
  p_project_id TEXT,
  p_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
  project_stats JSONB;
  health_score FLOAT;
  activity_days INTEGER;
  task_completion FLOAT;
  message_velocity FLOAT;
BEGIN
  -- Get basic project statistics
  SELECT jsonb_build_object(
    'total_conversations', COALESCE(stats->>'total_conversations', '0')::INTEGER,
    'total_messages', COALESCE(stats->>'total_messages', '0')::INTEGER,
    'active_tasks', COALESCE(stats->>'active_tasks', '0')::INTEGER,
    'completed_tasks', COALESCE(stats->>'completed_tasks', '0')::INTEGER,
    'last_activity', stats->>'last_activity'
  ) INTO project_stats
  FROM projects
  WHERE id = p_project_id;

  -- Calculate days since last activity
  SELECT COALESCE(
    EXTRACT(DAYS FROM NOW() - (project_stats->>'last_activity')::TIMESTAMPTZ),
    999
  ) INTO activity_days;

  -- Calculate task completion rate
  SELECT CASE
    WHEN (project_stats->>'active_tasks')::INTEGER + (project_stats->>'completed_tasks')::INTEGER = 0 THEN 0.5
    ELSE (project_stats->>'completed_tasks')::INTEGER::FLOAT /
         ((project_stats->>'active_tasks')::INTEGER + (project_stats->>'completed_tasks')::INTEGER)
  END INTO task_completion;

  -- Calculate message velocity (messages per week)
  SELECT COALESCE(
    (SELECT COUNT(*)
     FROM project_activity_timeline
     WHERE project_id = p_project_id
       AND activity_type IN ('conversation_created', 'conversation_assigned')
       AND created_at > NOW() - INTERVAL '7 days'),
    0
  ) INTO message_velocity;

  -- Calculate overall health score
  health_score := LEAST(1.0, GREATEST(0.0,
    (1.0 - LEAST(activity_days / 30.0, 1.0)) * 0.4 +  -- Activity weight
    task_completion * 0.3 +                            -- Task completion weight
    LEAST(message_velocity / 10.0, 1.0) * 0.3          -- Message velocity weight
  ));

  -- Build result
  result := jsonb_build_object(
    'health_score', health_score,
    'activity_days', activity_days,
    'task_completion_rate', task_completion,
    'message_velocity', message_velocity,
    'status', CASE
      WHEN health_score >= 0.8 THEN 'healthy'
      WHEN health_score >= 0.6 THEN 'at_risk'
      WHEN activity_days > 30 THEN 'dormant'
      ELSE 'critical'
    END,
    'recommendations', CASE
      WHEN activity_days > 14 THEN '["Increase project activity", "Schedule team check-in"]'::JSONB
      WHEN task_completion < 0.5 THEN '["Review task priorities", "Address blockers"]'::JSONB
      WHEN message_velocity < 2 THEN '["Improve team communication"]'::JSONB
      ELSE '["Maintain current momentum"]'::JSONB
    END
  );

  RETURN result;
END;
$$;

-- ================================
-- TRIGGERS AND AUTOMATION
-- ================================

-- Auto-update project stats when activities change
CREATE OR REPLACE FUNCTION update_project_activity_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update project stats when activity is added
  IF TG_OP = 'INSERT' THEN
    UPDATE projects
    SET stats = jsonb_set(
      COALESCE(stats, '{}'),
      '{last_activity}',
      to_jsonb(NEW.created_at)
    )
    WHERE id = NEW.project_id;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_activity
  AFTER INSERT ON project_activity_timeline
  FOR EACH ROW EXECUTE FUNCTION update_project_activity_stats();

-- Auto-create timeline entries for project changes
CREATE OR REPLACE FUNCTION create_project_timeline_entry()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Project created
    INSERT INTO project_activity_timeline (
      project_id, user_id, activity_type, title, description, significance
    ) VALUES (
      NEW.id, NEW.owner_id, 'project_updated',
      'Project Created', 'New project: ' || NEW.name, 0.8
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Project status changed
    IF OLD.status != NEW.status THEN
      INSERT INTO project_activity_timeline (
        project_id, user_id, activity_type, title, description, significance
      ) VALUES (
        NEW.id, NEW.owner_id, 'project_updated',
        'Status Changed', 'Status changed from ' || OLD.status || ' to ' || NEW.status, 0.7
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_project_timeline
  AFTER INSERT OR UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION create_project_timeline_entry();

-- Auto-reinforce learning patterns
CREATE OR REPLACE FUNCTION reinforce_learning_pattern()
RETURNS TRIGGER AS $$
BEGIN
  -- When user provides positive feedback, reinforce similar patterns
  IF NEW.user_feedback = 'correct' AND (OLD.user_feedback IS NULL OR OLD.user_feedback != 'correct') THEN
    UPDATE project_learning_patterns
    SET
      reinforcement_count = reinforcement_count + 1,
      pattern_strength = LEAST(pattern_strength + 0.1, 10.0),
      last_reinforced = NOW()
    WHERE user_id = NEW.user_id
      AND correction_type = 'classification_correction'
      AND content_context ILIKE '%' || substring(NEW.content_preview, 1, 50) || '%';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reinforce_patterns
  AFTER UPDATE ON project_classifications
  FOR EACH ROW EXECUTE FUNCTION reinforce_learning_pattern();

-- ================================
-- ROW LEVEL SECURITY
-- ================================

-- Enable RLS on new tables
ALTER TABLE project_learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_context_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_activity_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_cross_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_content_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables

-- Project Learning Patterns: Users can access their own patterns
CREATE POLICY "Users can access own learning patterns" ON project_learning_patterns
  FOR ALL USING (user_id = current_setting('app.current_user_id', true));

-- Project Classifications: Users can access their own classifications
CREATE POLICY "Users can access own classifications" ON project_classifications
  FOR ALL USING (user_id = current_setting('app.current_user_id', true));

-- Project Context Insights: Users can access insights for their projects
CREATE POLICY "Users can access project insights" ON project_context_insights
  FOR ALL USING (
    user_id = current_setting('app.current_user_id', true) OR
    project_id IN (
      SELECT id FROM projects
      WHERE owner_id = current_setting('app.current_user_id', true)
         OR current_setting('app.current_user_id', true) = ANY(collaborators)
    )
  );

-- Project Activity Timeline: Users can access timeline for their projects
CREATE POLICY "Users can access project timeline" ON project_activity_timeline
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects
      WHERE owner_id = current_setting('app.current_user_id', true)
         OR current_setting('app.current_user_id', true) = ANY(collaborators)
    )
  );

-- Project Collaborators: Users can access collaborations they're part of
CREATE POLICY "Users can access project collaborations" ON project_collaborators
  FOR ALL USING (
    user_id = current_setting('app.current_user_id', true) OR
    project_id IN (
      SELECT id FROM projects
      WHERE owner_id = current_setting('app.current_user_id', true)
    )
  );

-- Project Cross References: Users can access references for their projects
CREATE POLICY "Users can access project references" ON project_cross_references
  FOR ALL USING (
    source_project_id IN (
      SELECT id FROM projects
      WHERE owner_id = current_setting('app.current_user_id', true)
         OR current_setting('app.current_user_id', true) = ANY(collaborators)
    ) OR
    target_project_id IN (
      SELECT id FROM projects
      WHERE owner_id = current_setting('app.current_user_id', true)
         OR current_setting('app.current_user_id', true) = ANY(collaborators)
    )
  );

-- Semantic Content: Users can access their own content
CREATE POLICY "Users can access own semantic content" ON semantic_content
  FOR ALL USING (user_id = current_setting('app.current_user_id', true));

-- ================================
-- GRANTS AND PERMISSIONS
-- ================================

-- Grant permissions on new tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ================================
-- COMMENTS AND DOCUMENTATION
-- ================================

COMMENT ON TABLE project_learning_patterns IS 'Stores user correction patterns to improve AI classification';
COMMENT ON TABLE project_classifications IS 'Tracks AI classification results and user feedback for learning';
COMMENT ON TABLE project_context_insights IS 'AI-generated insights about project patterns and trends';
COMMENT ON TABLE project_activity_timeline IS 'Comprehensive timeline of all project activities';
COMMENT ON TABLE project_collaborators IS 'Enhanced collaboration management with detailed permissions';
COMMENT ON TABLE project_cross_references IS 'Tracks relationships and references between projects';
COMMENT ON TABLE project_health_metrics IS 'Historical project health scores and metrics';
COMMENT ON TABLE project_content_themes IS 'AI-extracted themes and topics from project content';
COMMENT ON TABLE semantic_content IS 'Unified semantic search index for all content types';

COMMENT ON FUNCTION search_all_content IS 'Enhanced semantic search with project context awareness';
COMMENT ON FUNCTION get_project_classification_context IS 'Get project context for content classification';
COMMENT ON FUNCTION analyze_project_health IS 'Comprehensive project health analysis';

-- Create initial indexes for better performance
VACUUM ANALYZE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Project Context Agent schema extensions installed successfully!';
  RAISE NOTICE 'Tables created: 9';
  RAISE NOTICE 'Functions created: 3';
  RAISE NOTICE 'Triggers created: 3';
  RAISE NOTICE 'Indexes created: 25+';
END $$;