-- Create user_tokens table for OAuth token storage
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.user_tokens (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  expires_at BIGINT,
  scope TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own tokens
CREATE POLICY "Users can only access their own tokens"
  ON public.user_tokens
  FOR ALL
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'user_id'
         OR user_id = 'zach'
         OR user_id = 'rebecca');

-- Grant permissions
GRANT ALL ON public.user_tokens TO anon;
GRANT ALL ON public.user_tokens TO authenticated;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_tokens_email ON public.user_tokens(email);
CREATE INDEX IF NOT EXISTS idx_user_tokens_updated_at ON public.user_tokens(updated_at);

-- Insert comment
COMMENT ON TABLE public.user_tokens IS 'Stores OAuth tokens for Google services integration';