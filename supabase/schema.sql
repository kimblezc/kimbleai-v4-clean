-- KIMBLEAI SUPABASE SCHEMA
-- Simple, effective persistence for 2-person family use

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (just 2 people)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert your family members
INSERT INTO users (email, name) VALUES 
  ('zach@kimbleai.com', 'Zach'),
  ('rebecca@kimbleai.com', 'Rebecca')
ON CONFLICT (email) DO NOTHING;

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT,
  project TEXT,
  tags TEXT[],
  last_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages table - EVERY message saved here
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  project TEXT,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Simple policies - both users can see everything (it's a family)
CREATE POLICY "Family members can see all data" ON users
  FOR ALL USING (true);

CREATE POLICY "Family members can manage conversations" ON conversations
  FOR ALL USING (true);

CREATE POLICY "Family members can manage messages" ON messages
  FOR ALL USING (true);

-- Function to search messages across all conversations
CREATE OR REPLACE FUNCTION search_messages(search_query TEXT)
RETURNS TABLE (
  message_id UUID,
  conversation_id TEXT,
  content TEXT,
  role TEXT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    messages.conversation_id,
    messages.content,
    messages.role,
    messages.created_at
  FROM messages
  WHERE content ILIKE '%' || search_query || '%'
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;