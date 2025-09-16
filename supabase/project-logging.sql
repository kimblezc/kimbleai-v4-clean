-- Add project logging table to Supabase
CREATE TABLE IF NOT EXISTS project_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  endpoint TEXT,
  success BOOLEAN,
  details JSONB,
  state_snapshot JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_project_logs_timestamp ON project_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_project_logs_endpoint ON project_logs(endpoint);

-- Create a view for latest status
CREATE OR REPLACE VIEW project_status AS
SELECT 
  COUNT(CASE WHEN endpoint = '/api/chat' AND success = true THEN 1 END) as successful_chats,
  COUNT(CASE WHEN endpoint = '/api/chat' AND success = false THEN 1 END) as failed_chats,
  COUNT(CASE WHEN endpoint LIKE '%zapier%' THEN 1 END) as zapier_triggers,
  MAX(CASE WHEN endpoint LIKE '%zapier%' THEN timestamp END) as last_zapier_trigger,
  (
    SELECT COUNT(DISTINCT conversation_id) 
    FROM messages 
    WHERE created_at > NOW() - INTERVAL '24 hours'
  ) as conversations_today,
  (
    SELECT COUNT(*) 
    FROM memory_chunks
  ) as total_memories,
  (
    SELECT jsonb_agg(DISTINCT project_id)
    FROM conversations
    WHERE project_id IS NOT NULL
  ) as active_projects,
  NOW() as status_checked_at;

-- Function to get project drift report
CREATE OR REPLACE FUNCTION get_project_drift_report()
RETURNS TABLE (
  feature TEXT,
  status TEXT,
  last_working TIMESTAMP,
  details JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH feature_status AS (
    SELECT DISTINCT ON (details->>'feature')
      details->>'feature' as feature,
      CASE 
        WHEN success THEN 'working'
        ELSE 'broken'
      END as status,
      timestamp,
      details
    FROM project_logs
    WHERE details ? 'feature'
    ORDER BY details->>'feature', timestamp DESC
  )
  SELECT * FROM feature_status
  ORDER BY status, feature;
END;
$$ LANGUAGE plpgsql;