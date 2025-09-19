-- KIMBLEAI SIMPLE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/gbmefnaqsxtloseufjqp/sql

-- Drop problematic function
DROP FUNCTION IF EXISTS search_similar_messages CASCADE;

-- Enable vector extension (safe if already exists)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create messages table with optional embedding
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT REFERENCES conversations(id),
  user_id UUID REFERENCES users(id),
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create simple memory table for important facts
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  fact TEXT NOT NULL,
  category TEXT,
  importance FLOAT DEFAULT 0.5,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default users
INSERT INTO users (name, email) VALUES 
  ('Zach', 'zach.kimble@gmail.com'),
  ('Rebecca', 'becky.aza.kimble@gmail.com')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);

-- Create simple view for recent conversations
CREATE OR REPLACE VIEW recent_conversations AS
SELECT 
  c.id,
  c.title,
  u.name as user_name,
  c.updated_at,
  COUNT(m.id) as message_count
FROM conversations c
JOIN users u ON c.user_id = u.id
LEFT JOIN messages m ON c.id = m.conversation_id
GROUP BY c.id, c.title, u.name, c.updated_at
ORDER BY c.updated_at DESC
LIMIT 50;

-- Simple function to get user's recent messages (no vector math needed)
CREATE OR REPLACE FUNCTION get_user_history(p_user_id UUID, p_limit INT DEFAULT 20)
RETURNS TABLE(
  conversation_id TEXT,
  role TEXT,
  content TEXT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.conversation_id,
    m.role,
    m.content,
    m.created_at
  FROM messages m
  WHERE m.user_id = p_user_id
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (if needed)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'KimbleAI database schema created successfully!';
  RAISE NOTICE 'Users created: Zach and Rebecca';
  RAISE NOTICE 'Tables ready: users, conversations, messages, memories';
END $$;
