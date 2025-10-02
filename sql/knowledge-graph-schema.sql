-- Knowledge Graph Database Schema

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Entity types enum
CREATE TYPE entity_type AS ENUM (
  'person',
  'project',
  'document',
  'conversation',
  'email',
  'file',
  'concept',
  'location',
  'organization',
  'event',
  'task',
  'topic',
  'technology',
  'meeting'
);

-- Relationship types enum
CREATE TYPE relationship_type AS ENUM (
  'mentions',
  'works_on',
  'collaborates_with',
  'contains',
  'relates_to',
  'depends_on',
  'created_by',
  'modified_by',
  'part_of',
  'similar_to',
  'references',
  'follows',
  'precedes',
  'located_in',
  'assigned_to'
);

-- Entities table
CREATE TABLE IF NOT EXISTS kg_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type entity_type NOT NULL,
  name TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL,
  confidence_score FLOAT DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  source_id TEXT,
  source_type TEXT
);

-- Relationships table
CREATE TABLE IF NOT EXISTS kg_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_entity_id UUID REFERENCES kg_entities(id) ON DELETE CASCADE,
  to_entity_id UUID REFERENCES kg_entities(id) ON DELETE CASCADE,
  relationship_type relationship_type NOT NULL,
  strength FLOAT DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL,
  confidence_score FLOAT DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  evidence TEXT[]
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kg_entities_user_id ON kg_entities(user_id);
CREATE INDEX IF NOT EXISTS idx_kg_entities_type ON kg_entities(type);
CREATE INDEX IF NOT EXISTS idx_kg_entities_name_trgm ON kg_entities USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_kg_entities_content_trgm ON kg_entities USING gin(content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_kg_entities_confidence ON kg_entities(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_kg_entities_created_at ON kg_entities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kg_relationships_from_entity ON kg_relationships(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_kg_relationships_to_entity ON kg_relationships(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_kg_relationships_user_id ON kg_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_kg_relationships_type ON kg_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_kg_relationships_strength ON kg_relationships(strength DESC);
CREATE INDEX IF NOT EXISTS idx_kg_relationships_created_at ON kg_relationships(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_kg_entities_user_type ON kg_entities(user_id, type);
CREATE INDEX IF NOT EXISTS idx_kg_relationships_entities ON kg_relationships(from_entity_id, to_entity_id);

-- Functions for knowledge graph operations

-- Function to create entities table (for RPC call)
CREATE OR REPLACE FUNCTION create_entities_table()
RETURNS void AS $$
BEGIN
  -- Table creation is handled by the schema above
  RAISE NOTICE 'Entities table schema ready';
END;
$$ LANGUAGE plpgsql;

-- Function to create relationships table (for RPC call)
CREATE OR REPLACE FUNCTION create_relationships_table()
RETURNS void AS $$
BEGIN
  -- Table creation is handled by the schema above
  RAISE NOTICE 'Relationships table schema ready';
END;
$$ LANGUAGE plpgsql;

-- Function to create indexes (for RPC call)
CREATE OR REPLACE FUNCTION create_kg_indexes()
RETURNS void AS $$
BEGIN
  -- Indexes are created by the schema above
  RAISE NOTICE 'Knowledge graph indexes ready';
END;
$$ LANGUAGE plpgsql;

-- Function to find similar entities based on name and content similarity
CREATE OR REPLACE FUNCTION find_similar_entities(
  entity_id UUID,
  entity_type entity_type,
  entity_name TEXT,
  similarity_threshold FLOAT DEFAULT 0.7,
  user_id TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  type entity_type,
  name TEXT,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  user_id TEXT,
  confidence_score FLOAT,
  source_id TEXT,
  source_type TEXT,
  similarity_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.type,
    e.name,
    e.content,
    e.metadata,
    e.created_at,
    e.updated_at,
    e.user_id,
    e.confidence_score,
    e.source_id,
    e.source_type,
    GREATEST(
      similarity(e.name, entity_name),
      COALESCE(similarity(e.content, entity_name), 0)
    ) as similarity_score
  FROM kg_entities e
  WHERE
    e.id != entity_id
    AND e.type = find_similar_entities.entity_type
    AND (find_similar_entities.user_id IS NULL OR e.user_id = find_similar_entities.user_id)
    AND (
      similarity(e.name, entity_name) > similarity_threshold
      OR COALESCE(similarity(e.content, entity_name), 0) > similarity_threshold
    )
  ORDER BY similarity_score DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Function to get connected entities up to a certain depth
CREATE OR REPLACE FUNCTION get_connected_entities(
  start_entity_id UUID,
  max_depth INTEGER DEFAULT 2
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  entities_found UUID[];
  relationships_found UUID[];
  current_entities UUID[];
  next_entities UUID[];
  depth INTEGER := 0;
BEGIN
  -- Initialize with starting entity
  entities_found := ARRAY[start_entity_id];
  current_entities := ARRAY[start_entity_id];

  -- Traverse the graph
  WHILE depth < max_depth AND array_length(current_entities, 1) > 0 LOOP
    -- Find connected entities
    SELECT ARRAY_AGG(DISTINCT connected_entity) INTO next_entities
    FROM (
      SELECT
        CASE
          WHEN from_entity_id = ANY(current_entities) THEN to_entity_id
          ELSE from_entity_id
        END as connected_entity
      FROM kg_relationships
      WHERE
        from_entity_id = ANY(current_entities)
        OR to_entity_id = ANY(current_entities)
    ) t
    WHERE connected_entity IS NOT NULL
      AND NOT (connected_entity = ANY(entities_found));

    -- Add relationships
    SELECT ARRAY_AGG(DISTINCT id) INTO relationships_found
    FROM (
      SELECT id FROM kg_relationships
      WHERE from_entity_id = ANY(current_entities) OR to_entity_id = ANY(current_entities)
      UNION
      SELECT unnest(relationships_found) as id
    ) t;

    -- Update for next iteration
    IF next_entities IS NOT NULL THEN
      entities_found := entities_found || next_entities;
      current_entities := next_entities;
    ELSE
      current_entities := ARRAY[]::UUID[];
    END IF;

    depth := depth + 1;
  END LOOP;

  -- Build result
  SELECT jsonb_build_object(
    'entities', (
      SELECT jsonb_agg(row_to_json(e))
      FROM kg_entities e
      WHERE e.id = ANY(entities_found)
    ),
    'relationships', (
      SELECT jsonb_agg(row_to_json(r))
      FROM kg_relationships r
      WHERE r.id = ANY(relationships_found)
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get entity graph for visualization
CREATE OR REPLACE FUNCTION get_entity_graph(
  user_id TEXT,
  center_entity_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- If center entity specified, get connected subgraph
  IF center_entity_id IS NOT NULL THEN
    SELECT get_connected_entities(center_entity_id, 2) INTO result;
  ELSE
    -- Get full user graph (limited for performance)
    SELECT jsonb_build_object(
      'nodes', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', e.id,
            'type', e.type,
            'name', e.name,
            'content', e.content,
            'metadata', e.metadata,
            'created_at', e.created_at,
            'updated_at', e.updated_at,
            'user_id', e.user_id,
            'confidence_score', e.confidence_score,
            'source_id', e.source_id,
            'source_type', e.source_type,
            'connections', COALESCE(conn.connection_count, 0)
          )
        )
        FROM kg_entities e
        LEFT JOIN (
          SELECT
            entity_id,
            COUNT(*) as connection_count
          FROM (
            SELECT from_entity_id as entity_id FROM kg_relationships WHERE user_id = get_entity_graph.user_id
            UNION ALL
            SELECT to_entity_id as entity_id FROM kg_relationships WHERE user_id = get_entity_graph.user_id
          ) t
          GROUP BY entity_id
        ) conn ON e.id = conn.entity_id
        WHERE e.user_id = get_entity_graph.user_id
        ORDER BY e.confidence_score DESC, conn.connection_count DESC
        LIMIT 100
      ),
      'edges', (
        SELECT jsonb_agg(row_to_json(r))
        FROM kg_relationships r
        WHERE r.user_id = get_entity_graph.user_id
        ORDER BY r.strength DESC
        LIMIT 500
      )
    ) INTO result;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get top connected entities
CREATE OR REPLACE FUNCTION get_top_connected_entities(
  user_id TEXT,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  type entity_type,
  name TEXT,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  user_id TEXT,
  confidence_score FLOAT,
  source_id TEXT,
  source_type TEXT,
  connection_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.type,
    e.name,
    e.content,
    e.metadata,
    e.created_at,
    e.updated_at,
    e.user_id,
    e.confidence_score,
    e.source_id,
    e.source_type,
    COALESCE(conn.connection_count, 0) as connection_count
  FROM kg_entities e
  LEFT JOIN (
    SELECT
      entity_id,
      COUNT(*) as connection_count
    FROM (
      SELECT from_entity_id as entity_id FROM kg_relationships WHERE user_id = get_top_connected_entities.user_id
      UNION ALL
      SELECT to_entity_id as entity_id FROM kg_relationships WHERE user_id = get_top_connected_entities.user_id
    ) t
    GROUP BY entity_id
  ) conn ON e.id = conn.entity_id
  WHERE e.user_id = get_top_connected_entities.user_id
  ORDER BY conn.connection_count DESC, e.confidence_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kg_entities_updated_at
  BEFORE UPDATE ON kg_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kg_relationships_updated_at
  BEFORE UPDATE ON kg_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();