-- Create table for storing user Google tokens
CREATE TABLE IF NOT EXISTS user_tokens (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_user_tokens_user_id ON user_tokens(user_id);

-- Add RLS policy for security
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to only access their own tokens
CREATE POLICY "Users can access their own tokens" ON user_tokens
  FOR ALL
  USING (auth.uid()::text = user_id OR user_id IN ('zach', 'rebecca'));