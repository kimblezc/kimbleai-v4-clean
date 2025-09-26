-- Create user_tokens table for storing Google OAuth tokens
-- This enables Gmail, Drive, and Calendar API access

CREATE TABLE IF NOT EXISTS public.user_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    expires_at BIGINT,
    scope TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one token record per user
    UNIQUE(user_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON public.user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_email ON public.user_tokens(email);

-- Enable Row Level Security
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (needed for NextAuth)
CREATE POLICY "Service role can manage all tokens"
ON public.user_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON public.user_tokens TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Insert comment for documentation
COMMENT ON TABLE public.user_tokens IS 'Stores Google OAuth tokens for Gmail, Drive, and Calendar API access';
COMMENT ON COLUMN public.user_tokens.user_id IS 'Simple user identifier (zach, rebecca)';
COMMENT ON COLUMN public.user_tokens.access_token IS 'Google OAuth access token for API calls';
COMMENT ON COLUMN public.user_tokens.refresh_token IS 'Google OAuth refresh token for token renewal';
COMMENT ON COLUMN public.user_tokens.scope IS 'OAuth scopes granted (gmail, drive, calendar)';