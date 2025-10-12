-- Notifications Table Migration
-- Creates the notifications system for KimbleAI v4
-- Run this in your Supabase SQL editor

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('success', 'error', 'info', 'warning')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Enable Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

-- RLS Policy: Users can create their own notifications (for testing)
CREATE POLICY "Users can create their own notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

-- RLS Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

-- RLS Policy: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  toast_enabled BOOLEAN DEFAULT TRUE,
  sound_enabled BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{
    "file_upload": true,
    "file_indexed": true,
    "transcription_completed": true,
    "budget_alerts": true,
    "gmail_sync": true,
    "backup_completed": true,
    "agent_task_completed": true
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for notification preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
  ON notification_preferences
  FOR SELECT
  USING (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

-- RLS Policy: Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
  ON notification_preferences
  FOR ALL
  USING (user_id = auth.jwt() ->> 'email' OR user_id = auth.uid()::text);

-- Create trigger for notification preferences updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Insert default preferences for existing users (optional)
-- You can run this after migration to set defaults for all users
-- INSERT INTO notification_preferences (user_id, email_enabled, toast_enabled)
-- SELECT DISTINCT user_id, TRUE, TRUE
-- FROM notifications
-- ON CONFLICT (user_id) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Notifications table migration completed successfully!';
  RAISE NOTICE 'Tables created: notifications, notification_preferences';
  RAISE NOTICE 'RLS policies enabled for security';
  RAISE NOTICE 'Realtime enabled for notifications';
END $$;
