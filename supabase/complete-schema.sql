-- KIMBLEAI COMPLETE SUPABASE SCHEMA WITH VECTOR SEARCH
-- For 2-person family with full reference capabilities

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

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

-- Messages table with vector embeddings
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  project TEXT,
  tags TEXT[],
  embedding vector(1536), -- For OpenAI embeddings
  created_at TIMESTAMP DEFAULT NOW()
);

-- Message references table (from your existing system)
CREATE TABLE IF NOT EXISTS message_references (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  project_id TEXT,
  user_id UUID,
  role TEXT,
  content TEXT,
  timestamp TIMESTAMP,
  metadata JSONB,
  context JSONB,
  embedding vector(1536)
);

-- Code blocks extracted from messages
CREATE TABLE IF NOT EXISTS code_blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id TEXT REFERENCES message_references(id),
  language TEXT,
  content TEXT,
  filename TEXT,
  purpose TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Decisions made in conversations
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  message_id TEXT REFERENCES message_references(id),
  description TEXT,
  options_considered TEXT[],
  choice_made TEXT,
  reasoning TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Action items from conversations
CREATE TABLE IF NOT EXISTS action_items (
  id TEXT PRIMARY KEY,
  message_id TEXT REFERENCES message_references(id),
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to TEXT,
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  related_messages TEXT[]
);

-- Indexes for performance
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_embedding ON messages USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_message_refs_conversation ON message_references(conversation_id);
CREATE INDEX idx_message_refs_embedding ON message_references USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_code_blocks_message ON code_blocks(message_id);
CREATE INDEX idx_decisions_message ON decisions(message_id);
CREATE INDEX idx_action_items_status ON action_items(status);

-- Function for semantic search using vectors
CREATE OR REPLACE FUNCTION search_similar_messages(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.78,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  message_id TEXT,
  content TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    message_references.content,
    1 - (message_references.embedding <=> query_embedding) as similarity
  FROM message_references
  WHERE 1 - (message_references.embedding <=> query_embedding) > match_threshold
  ORDER BY message_references.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

-- Simple policy: family members can see everything
CREATE POLICY "Family access" ON users FOR ALL USING (true);
CREATE POLICY "Family access" ON conversations FOR ALL USING (true);
CREATE POLICY "Family access" ON messages FOR ALL USING (true);
CREATE POLICY "Family access" ON message_references FOR ALL USING (true);
CREATE POLICY "Family access" ON code_blocks FOR ALL USING (true);
CREATE POLICY "Family access" ON decisions FOR ALL USING (true);
CREATE POLICY "Family access" ON action_items FOR ALL USING (true);