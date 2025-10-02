-- Cross-Device Continuity Agent Database Schema
-- Run these commands in your Supabase SQL editor

-- Device states table for storing current device state
CREATE TABLE IF NOT EXISTS device_states (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    state_data JSONB NOT NULL,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    connection_id VARCHAR(255),
    transferred BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_id, user_id)
);

-- Device notifications for real-time communication
CREATE TABLE IF NOT EXISTS device_notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    target_device VARCHAR(255),
    source_device VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    delivered BOOLEAN DEFAULT FALSE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_device_states_user_device
    ON device_states(user_id, device_id);

CREATE INDEX IF NOT EXISTS idx_device_states_updated
    ON device_states(updated_at);

CREATE INDEX IF NOT EXISTS idx_device_states_last_seen
    ON device_states(last_seen);

CREATE INDEX IF NOT EXISTS idx_notifications_user_delivered
    ON device_notifications(user_id, delivered);

CREATE INDEX IF NOT EXISTS idx_notifications_created
    ON device_notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_target_device
    ON device_notifications(target_device);

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_device_states_updated_at
    BEFORE UPDATE ON device_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up stale device states
CREATE OR REPLACE FUNCTION cleanup_stale_device_states(
    stale_days INTEGER DEFAULT 7
) RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM device_states
    WHERE updated_at < NOW() - INTERVAL '1 day' * stale_days;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications(
    retention_days INTEGER DEFAULT 3
) RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM device_notifications
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get active devices for a user
CREATE OR REPLACE FUNCTION get_active_devices(
    p_user_id VARCHAR(255),
    active_threshold_minutes INTEGER DEFAULT 30
) RETURNS TABLE (
    device_id VARCHAR(255),
    state_data JSONB,
    last_seen TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ds.device_id,
        ds.state_data,
        ds.last_seen,
        (ds.last_seen > NOW() - INTERVAL '1 minute' * active_threshold_minutes) as is_active
    FROM device_states ds
    WHERE ds.user_id = p_user_id
        AND ds.transferred = FALSE
    ORDER BY ds.last_seen DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending notifications for a device
CREATE OR REPLACE FUNCTION get_pending_notifications(
    p_user_id VARCHAR(255),
    p_device_id VARCHAR(255),
    p_since TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS TABLE (
    id INTEGER,
    event_type VARCHAR(100),
    event_data JSONB,
    source_device VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dn.id,
        dn.event_type,
        dn.event_data,
        dn.source_device,
        dn.created_at
    FROM device_notifications dn
    WHERE dn.user_id = p_user_id
        AND (dn.target_device IS NULL OR dn.target_device = p_device_id)
        AND dn.source_device != p_device_id
        AND dn.delivered = FALSE
        AND (p_since IS NULL OR dn.created_at > p_since)
    ORDER BY dn.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE device_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own device states
CREATE POLICY device_states_user_policy
    ON device_states
    FOR ALL
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy: Users can only access their own notifications
CREATE POLICY device_notifications_user_policy
    ON device_notifications
    FOR ALL
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Grant permissions to authenticated users
GRANT ALL ON device_states TO authenticated;
GRANT ALL ON device_notifications TO authenticated;
GRANT USAGE ON SEQUENCE device_states_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE device_notifications_id_seq TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION cleanup_stale_device_states TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_devices TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_notifications TO authenticated;

-- Schedule automatic cleanup (run weekly)
-- Note: This requires the pg_cron extension in Supabase
-- You may need to enable it in your Supabase project settings
/*
SELECT cron.schedule(
    'cleanup-stale-device-states',
    '0 2 * * 0', -- Every Sunday at 2 AM
    'SELECT cleanup_stale_device_states(7);'
);

SELECT cron.schedule(
    'cleanup-old-notifications',
    '0 3 * * 0', -- Every Sunday at 3 AM
    'SELECT cleanup_old_notifications(3);'
);
*/

-- Sample queries for testing

-- Insert a test device state
/*
INSERT INTO device_states (device_id, user_id, state_data) VALUES
('test-device-123', 'test-user', '{
    "deviceId": "test-device-123",
    "userId": "test-user",
    "timestamp": 1703123456789,
    "activeProject": "test-project",
    "deviceInfo": {
        "platform": "Windows",
        "userAgent": "Chrome/120.0"
    }
}'::jsonb);
*/

-- Insert a test notification
/*
INSERT INTO device_notifications (user_id, target_device, source_device, event_type, event_data) VALUES
('test-user', 'test-device-456', 'test-device-123', 'state_updated', '{
    "message": "Device state has been updated",
    "timestamp": 1703123456789
}'::jsonb);
*/

-- Query active devices
/*
SELECT * FROM get_active_devices('test-user', 30);
*/

-- Query pending notifications
/*
SELECT * FROM get_pending_notifications('test-user', 'test-device-456');
*/

COMMENT ON TABLE device_states IS 'Stores current state for each device per user';
COMMENT ON TABLE device_notifications IS 'Real-time notifications between devices';
COMMENT ON FUNCTION cleanup_stale_device_states IS 'Removes device states older than specified days';
COMMENT ON FUNCTION cleanup_old_notifications IS 'Removes notifications older than specified days';
COMMENT ON FUNCTION get_active_devices IS 'Returns active devices for a user with activity status';
COMMENT ON FUNCTION get_pending_notifications IS 'Returns undelivered notifications for a device';