-- Device Continuity Agent Database Schema
-- Enables seamless transitions between PC, Laptop, Mobile, and Web

-- Device Sessions: Track active devices and their current state
CREATE TABLE IF NOT EXISTS device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  device_id text NOT NULL UNIQUE,
  device_type text NOT NULL CHECK (device_type IN ('pc', 'laptop', 'mobile', 'web')),
  device_name text,
  browser_info jsonb,
  last_heartbeat timestamptz DEFAULT now(),
  current_context jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Context Snapshots: Store work state for restoration
CREATE TABLE IF NOT EXISTS context_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  device_id text NOT NULL,
  session_id uuid REFERENCES device_sessions(id) ON DELETE CASCADE,
  snapshot_type text NOT NULL CHECK (snapshot_type IN ('file_edit', 'search', 'project', 'conversation', 'full_state')),
  context_data jsonb NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Sync Queue: Manage cross-device synchronization
CREATE TABLE IF NOT EXISTS sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  from_device_id text NOT NULL,
  to_device_id text,
  sync_type text NOT NULL CHECK (sync_type IN ('context', 'file', 'search', 'project', 'notification')),
  payload jsonb NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed', 'expired')),
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  synced_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '1 hour')
);

-- Device Preferences: Store per-device settings
CREATE TABLE IF NOT EXISTS device_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  device_id text NOT NULL,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, device_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_sessions_user_active ON device_sessions(user_id, is_active, last_heartbeat DESC);
CREATE INDEX IF NOT EXISTS idx_device_sessions_heartbeat ON device_sessions(last_heartbeat DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_context_snapshots_user_recent ON context_snapshots(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_queue_pending ON sync_queue(to_device_id, status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON sync_queue(user_id, created_at DESC);

-- Function: Get active devices for user
CREATE OR REPLACE FUNCTION get_active_devices(p_user_id text)
RETURNS TABLE (
  device_id text,
  device_type text,
  device_name text,
  last_heartbeat timestamptz,
  current_context jsonb,
  seconds_since_heartbeat integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ds.device_id,
    ds.device_type,
    ds.device_name,
    ds.last_heartbeat,
    ds.current_context,
    EXTRACT(EPOCH FROM (now() - ds.last_heartbeat))::integer as seconds_since_heartbeat
  FROM device_sessions ds
  WHERE ds.user_id = p_user_id
    AND ds.is_active = true
    AND ds.last_heartbeat > now() - interval '5 minutes'
  ORDER BY ds.last_heartbeat DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get most recent context snapshot
CREATE OR REPLACE FUNCTION get_latest_context(p_user_id text, p_device_id text DEFAULT NULL)
RETURNS TABLE (
  snapshot_id uuid,
  device_id text,
  snapshot_type text,
  context_data jsonb,
  created_at timestamptz,
  device_type text,
  device_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id as snapshot_id,
    cs.device_id,
    cs.snapshot_type,
    cs.context_data,
    cs.created_at,
    ds.device_type,
    ds.device_name
  FROM context_snapshots cs
  JOIN device_sessions ds ON cs.device_id = ds.device_id
  WHERE cs.user_id = p_user_id
    AND (p_device_id IS NULL OR cs.device_id != p_device_id)
    AND cs.created_at > now() - interval '1 hour'
  ORDER BY cs.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Mark device as inactive after timeout
CREATE OR REPLACE FUNCTION cleanup_inactive_devices()
RETURNS void AS $$
BEGIN
  UPDATE device_sessions
  SET is_active = false
  WHERE last_heartbeat < now() - interval '10 minutes'
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function: Expire old sync queue items
CREATE OR REPLACE FUNCTION cleanup_expired_sync_queue()
RETURNS void AS $$
BEGIN
  UPDATE sync_queue
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();

  -- Delete old synced/expired items
  DELETE FROM sync_queue
  WHERE status IN ('synced', 'expired', 'failed')
    AND created_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_device_sessions_updated_at
  BEFORE UPDATE ON device_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_preferences_updated_at
  BEFORE UPDATE ON device_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE device_sessions IS 'Tracks active devices and their current state for seamless continuity';
COMMENT ON TABLE context_snapshots IS 'Stores work context snapshots for restoration across devices';
COMMENT ON TABLE sync_queue IS 'Manages asynchronous synchronization between devices';
COMMENT ON FUNCTION get_active_devices IS 'Returns all currently active devices for a user within last 5 minutes';
COMMENT ON FUNCTION get_latest_context IS 'Gets the most recent context snapshot from another device';
