-- Zapier Webhook Logs Table
-- Required for tracking Zapier webhook usage, success rates, and debugging
-- Run this SQL in your Supabase SQL Editor

-- Create the zapier_webhook_logs table
CREATE TABLE IF NOT EXISTS zapier_webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  success BOOLEAN NOT NULL,
  webhook_called BOOLEAN NOT NULL,
  webhook_id TEXT,
  error TEXT,
  payload_preview TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_zapier_logs_event_type ON zapier_webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_zapier_logs_user_id ON zapier_webhook_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_zapier_logs_timestamp ON zapier_webhook_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_zapier_logs_success ON zapier_webhook_logs(success);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_zapier_logs_user_event ON zapier_webhook_logs(user_id, event_type, timestamp DESC);

-- Add comment describing the table
COMMENT ON TABLE zapier_webhook_logs IS 'Tracks all Zapier webhook calls for monitoring, debugging, and usage analytics';

-- Add column comments
COMMENT ON COLUMN zapier_webhook_logs.event_type IS 'Type of event: conversation_saved, transcription_complete, photo_uploaded, urgent_notification, daily_summary';
COMMENT ON COLUMN zapier_webhook_logs.user_id IS 'User who triggered the webhook';
COMMENT ON COLUMN zapier_webhook_logs.priority IS 'Priority level: low, medium, high, urgent';
COMMENT ON COLUMN zapier_webhook_logs.success IS 'Whether the webhook was sent successfully';
COMMENT ON COLUMN zapier_webhook_logs.webhook_called IS 'Whether the webhook call was attempted';
COMMENT ON COLUMN zapier_webhook_logs.webhook_id IS 'Unique identifier for the webhook call';
COMMENT ON COLUMN zapier_webhook_logs.error IS 'Error message if webhook failed';
COMMENT ON COLUMN zapier_webhook_logs.payload_preview IS 'Preview of webhook payload (first 500 chars)';
COMMENT ON COLUMN zapier_webhook_logs.timestamp IS 'When the webhook was sent';

-- Enable Row Level Security (RLS)
ALTER TABLE zapier_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Policy: Users can view their own webhook logs
CREATE POLICY "Users can view their own webhook logs"
  ON zapier_webhook_logs
  FOR SELECT
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- Policy: Service role can insert webhook logs
CREATE POLICY "Service role can insert webhook logs"
  ON zapier_webhook_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Service role can update webhook logs
CREATE POLICY "Service role can update webhook logs"
  ON zapier_webhook_logs
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Policy: Service role can delete old webhook logs
CREATE POLICY "Service role can delete old webhook logs"
  ON zapier_webhook_logs
  FOR DELETE
  USING (auth.role() = 'service_role');

-- Create function to automatically clean up old logs (optional)
CREATE OR REPLACE FUNCTION cleanup_old_zapier_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete logs older than 90 days
  DELETE FROM zapier_webhook_logs
  WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$;

-- Create a scheduled job to run cleanup weekly (optional, requires pg_cron extension)
-- Uncomment if you have pg_cron enabled:
-- SELECT cron.schedule('cleanup-zapier-logs', '0 0 * * 0', 'SELECT cleanup_old_zapier_logs()');

-- Verify table creation
SELECT
  'zapier_webhook_logs table created successfully' AS status,
  COUNT(*) AS current_row_count
FROM zapier_webhook_logs;

-- Show table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'zapier_webhook_logs'
ORDER BY ordinal_position;

-- Show indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'zapier_webhook_logs';
