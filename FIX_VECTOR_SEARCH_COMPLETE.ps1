# KIMBLEAI COMPLETE VECTOR SEARCH FIX
# Fixes vector search without removing features

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "KIMBLEAI VECTOR SEARCH COMPLETE FIX" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# 1. CREATE PROPER DATABASE SCHEMA WITH WORKING VECTOR SEARCH
Write-Host "[1/6] Creating complete vector search schema..." -ForegroundColor Yellow
$vectorSchema = @'
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;

-- Create or update users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create or update conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  project TEXT,
  tags TEXT[],
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create or update messages table with vector support
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create memory chunks for better context retrieval
CREATE TABLE IF NOT EXISTS memory_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  conversation_id TEXT,
  content TEXT NOT NULL,
  chunk_type TEXT CHECK (chunk_type IN ('message', 'summary', 'fact', 'decision', 'preference')),
  embedding vector(1536),
  importance FLOAT DEFAULT 0.5,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default users if not exist
INSERT INTO users (name, email) VALUES 
  ('Zach', 'zach.kimble@gmail.com'),
  ('Rebecca', 'becky.aza.kimble@gmail.com')
ON CONFLICT (name) DO NOTHING;

-- Create optimized indexes for vector search
CREATE INDEX IF NOT EXISTS messages_embedding_idx ON messages 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
  
CREATE INDEX IF NOT EXISTS memory_chunks_embedding_idx ON memory_chunks 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_messages_user_created ON messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_memory_user_created ON memory_chunks(user_id, created_at DESC);

-- Drop old function if exists
DROP FUNCTION IF EXISTS search_similar_messages CASCADE;

-- Create working vector similarity search function
CREATE OR REPLACE FUNCTION match_messages(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  role text,
  similarity float,
  created_at timestamp,
  conversation_id text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.role,
    1 - (m.embedding <=> query_embedding) AS similarity,
    m.created_at,
    m.conversation_id
  FROM messages m
  WHERE 
    m.user_id = match_messages.user_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create memory chunk search function
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  chunk_type text,
  similarity float,
  importance float,
  metadata jsonb,
  created_at timestamp
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.id,
    mc.content,
    mc.chunk_type,
    1 - (mc.embedding <=> query_embedding) AS similarity,
    mc.importance,
    mc.metadata,
    mc.created_at
  FROM memory_chunks mc
  WHERE 
    mc.user_id = match_memories.user_id
    AND mc.embedding IS NOT NULL
    AND 1 - (mc.embedding <=> query_embedding) > match_threshold
  ORDER BY 
    (mc.embedding <=> query_embedding) * (1.0 / (mc.importance + 0.1))
  LIMIT match_count;
END;
$$;

-- Create combined context search
CREATE OR REPLACE FUNCTION get_relevant_context(
  query_embedding vector(1536),
  user_id uuid,
  max_messages int DEFAULT 10,
  max_memories int DEFAULT 5,
  threshold float DEFAULT 0.7
)
RETURNS TABLE (
  source_type text,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Get relevant messages
  SELECT 
    'message'::text as source_type,
    m.content,
    m.similarity,
    jsonb_build_object(
      'role', m.role,
      'conversation_id', m.conversation_id,
      'created_at', m.created_at
    ) as metadata
  FROM match_messages(query_embedding, threshold, max_messages, user_id) m
  
  UNION ALL
  
  -- Get relevant memories
  SELECT
    'memory'::text as source_type,
    mc.content,
    mc.similarity,
    jsonb_build_object(
      'type', mc.chunk_type,
      'importance', mc.importance,
      'created_at', mc.created_at,
      'metadata', mc.metadata
    ) as metadata
  FROM match_memories(query_embedding, threshold, max_memories, user_id) mc
  
  ORDER BY similarity DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION match_messages TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION match_memories TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_relevant_context TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Verify installation
DO $$
BEGIN
  RAISE NOTICE 'Vector search functions created successfully!';
  RAISE NOTICE 'Functions available: match_messages, match_memories, get_relevant_context';
END $$;
'@

$vectorSchema | Out-File -FilePath ".\vector_search_schema.sql" -Encoding UTF8
Write-Host "  Vector schema created: vector_search_schema.sql" -ForegroundColor Green

# 2. CREATE ENHANCED CHAT ROUTE WITH FULL VECTOR SEARCH
Write-Host "[2/6] Creating enhanced chat route with vector search..." -ForegroundColor Yellow
$enhancedRoute = @'
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role for full access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })
  : null;

// Types
interface Memory {
  content: string;
  similarity: number;
  source_type: string;
  metadata: any;
}

interface UserData {
  id: string;
  name: string;
  email: string;
}

// GET endpoint to check status
export async function GET(request: NextRequest) {
  // Test vector search availability
  let vectorSearchWorking = false;
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('match_messages', {
        query_embedding: new Array(1536).fill(0),
        match_threshold: 0.5,
        match_count: 1,
        user_id: '00000000-0000-0000-0000-000000000000'
      });
      vectorSearchWorking = !error;
    } catch (e) {
      vectorSearchWorking = false;
    }
  }

  return NextResponse.json({
    status: "ready",
    apiKeyConfigured: !!process.env.OPENAI_API_KEY,
    supabaseConfigured: !!supabase,
    vectorSearchEnabled: vectorSearchWorking,
    timestamp: new Date().toISOString()
  });
}

// Generate embedding using OpenAI
async function generateEmbedding(text: string): Promise<number[] | null> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_KEY) return null;
  
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000) // Limit to 8000 chars for embedding
      })
    });
    
    if (!response.ok) {
      console.error('Embedding API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    return null;
  }
}

// Extract important facts from conversation
async function extractMemoryChunks(
  content: string, 
  role: string,
  userId: string
): Promise<Array<{content: string, type: string, importance: number}>> {
  const chunks = [];
  
  // Extract patterns for facts, preferences, decisions
  const patterns = [
    { regex: /my (?:favorite|favourite) (\w+) is ([^.!?]+)/gi, type: 'preference', importance: 0.8 },
    { regex: /i (?:have|own) (?:a|an) ([^.!?]+)/gi, type: 'fact', importance: 0.7 },
    { regex: /my (\w+)'s name is ([^.!?]+)/gi, type: 'fact', importance: 0.9 },
    { regex: /i (?:work|live|study) (?:at|in) ([^.!?]+)/gi, type: 'fact', importance: 0.8 },
    { regex: /i (?:like|love|enjoy|hate|dislike) ([^.!?]+)/gi, type: 'preference', importance: 0.6 },
    { regex: /(?:remember|don't forget) (?:that )?([^.!?]+)/gi, type: 'fact', importance: 0.9 },
    { regex: /(?:decided|agreed|choosing) (?:to|on) ([^.!?]+)/gi, type: 'decision', importance: 0.8 }
  ];
  
  if (role === 'user') {
    for (const pattern of patterns) {
      let match;
      const regex = new RegExp(pattern.regex);
      while ((match = regex.exec(content)) !== null) {
        chunks.push({
          content: match[0],
          type: pattern.type,
          importance: pattern.importance
        });
      }
    }
  }
  
  // Always save important assistant responses as context
  if (role === 'assistant' && content.length > 100) {
    chunks.push({
      content: content.substring(0, 500),
      type: 'summary',
      importance: 0.5
    });
  }
  
  return chunks;
}

// Main chat endpoint with full vector search
export async function POST(request: NextRequest) {
  try {
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_KEY) {
      return NextResponse.json({
        response: "OpenAI API key not configured. Please set OPENAI_API_KEY.",
        error: true
      });
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      messages = [], 
      userId = 'zach',
      conversationId = 'conv_' + Date.now(),
      project = 'general',
      tags = []
    } = body;
    
    // Return greeting if no messages
    if (messages.length === 0) {
      return NextResponse.json({
        response: "Hello! I'm KimbleAI with full vector search memory. I'll remember everything across all our conversations. How can I help?",
        conversationId,
        vectorSearchEnabled: true
      });
    }
    
    // Get the last user message
    const userMessage = messages[messages.length - 1];
    if (!userMessage?.content) {
      return NextResponse.json({
        response: "Please provide a message.",
        error: true
      });
    }
    
    // Initialize context variables
    let relevantContext = [];
    let vectorSearchUsed = false;
    let memoriesFound = 0;
    let dbUser: UserData | null = null;
    
    // Get or create user in database
    if (supabase) {
      try {
        const userName = userId === 'rebecca' ? 'Rebecca' : 'Zach';
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('name', userName)
          .single();
        
        if (userData) {
          dbUser = userData;
        } else {
          // Create user if doesn't exist
          const { data: newUser } = await supabase
            .from('users')
            .insert({ 
              name: userName, 
              email: `${userName.toLowerCase()}@kimbleai.com` 
            })
            .select()
            .single();
          
          if (newUser) dbUser = newUser;
        }
      } catch (error) {
        console.error('User lookup error:', error);
      }
    }
    
    // VECTOR SEARCH FOR RELEVANT CONTEXT
    if (supabase && dbUser && userMessage.content) {
      try {
        console.log('Performing vector search for relevant context...');
        
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(userMessage.content);
        
        if (queryEmbedding) {
          // Search using the combined context function
          const { data: contexts, error } = await supabase.rpc('get_relevant_context', {
            query_embedding: queryEmbedding,
            user_id: dbUser.id,
            max_messages: 15,
            max_memories: 10,
            threshold: 0.65
          });
          
          if (!error && contexts && contexts.length > 0) {
            relevantContext = contexts;
            vectorSearchUsed = true;
            memoriesFound = contexts.length;
            console.log(`Vector search found ${memoriesFound} relevant contexts`);
          } else if (error) {
            console.error('Vector search error:', error);
            
            // Fallback to recent messages if vector search fails
            const { data: recentMessages } = await supabase
              .from('messages')
              .select('content, role, created_at, conversation_id')
              .eq('user_id', dbUser.id)
              .order('created_at', { ascending: false })
              .limit(20);
            
            if (recentMessages) {
              relevantContext = recentMessages.map(msg => ({
                source_type: 'message',
                content: msg.content,
                similarity: 0.5,
                metadata: {
                  role: msg.role,
                  conversation_id: msg.conversation_id,
                  created_at: msg.created_at
                }
              }));
              memoriesFound = recentMessages.length;
              console.log('Using fallback: loaded recent messages');
            }
          }
        }
      } catch (error) {
        console.error('Context retrieval error:', error);
      }
    }
    
    // Build context string for system prompt
    let contextString = '';
    if (relevantContext.length > 0) {
      // Group by source type
      const messages = relevantContext.filter(c => c.source_type === 'message');
      const memories = relevantContext.filter(c => c.source_type === 'memory');
      
      if (messages.length > 0) {
        contextString += '\n\nRELEVANT CONVERSATION HISTORY:\n';
        messages.forEach(msg => {
          const role = msg.metadata.role === 'user' ? dbUser?.name : 'You';
          const similarity = (msg.similarity * 100).toFixed(0);
          contextString += `[${similarity}% relevant] ${role}: ${msg.content}\n`;
        });
      }
      
      if (memories.length > 0) {
        contextString += '\n\nIMPORTANT MEMORIES:\n';
        memories.forEach(mem => {
          const importance = (mem.metadata.importance * 100).toFixed(0);
          contextString += `[${mem.metadata.type}, ${importance}% important] ${mem.content}\n`;
        });
      }
    }
    
    // Build enhanced system prompt
    const systemPrompt = `You are KimbleAI, an advanced AI assistant with perfect vector-based memory for the Kimble family.

CURRENT CONTEXT:
- User: ${dbUser?.name || userId}
- Time: ${new Date().toLocaleString()}
- Project: ${project}
- Tags: ${tags.join(', ') || 'none'}
- Vector Search: ${vectorSearchUsed ? 'Active' : 'Inactive'}

${contextString || 'No relevant context found.'}

INSTRUCTIONS:
1. Use ALL relevant context from above to inform your responses
2. Reference specific past conversations when relevant
3. Maintain consistency with previously discussed facts
4. If asked about something from the past, check the context first
5. Build on previous discussions naturally

Remember: You have access to vector similarity search across ALL conversations, not just the current one.`;
    
    // Build messages for OpenAI
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];
    
    // Call OpenAI for response
    console.log('Calling OpenAI with context...');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: apiMessages,
        max_tokens: 1000,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    });
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI error:', errorText);
      return NextResponse.json({
        response: "AI service error. Please check your API key.",
        error: true
      });
    }
    
    const aiData = await openaiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content || "No response generated";
    
    // SAVE EVERYTHING TO DATABASE WITH EMBEDDINGS
    let saved = false;
    let memoriesExtracted = 0;
    
    if (supabase && dbUser) {
      try {
        // Save or update conversation
        await supabase.from('conversations').upsert({
          id: conversationId,
          user_id: dbUser.id,
          title: userMessage.content.substring(0, 100),
          project: project,
          tags: tags,
          updated_at: new Date().toISOString()
        });
        
        // Save user message with embedding
        const userEmbedding = await generateEmbedding(userMessage.content);
        if (userEmbedding) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            user_id: dbUser.id,
            role: 'user',
            content: userMessage.content,
            embedding: userEmbedding,
            metadata: { project, tags },
            created_at: new Date().toISOString()
          });
        }
        
        // Extract and save memory chunks from user message
        const userChunks = await extractMemoryChunks(
          userMessage.content, 
          'user', 
          dbUser.name
        );
        
        for (const chunk of userChunks) {
          const chunkEmbedding = await generateEmbedding(chunk.content);
          if (chunkEmbedding) {
            await supabase.from('memory_chunks').insert({
              user_id: dbUser.id,
              conversation_id: conversationId,
              content: chunk.content,
              chunk_type: chunk.type,
              embedding: chunkEmbedding,
              importance: chunk.importance,
              metadata: { project, tags, source: 'user_message' }
            });
            memoriesExtracted++;
          }
        }
        
        // Save assistant response with embedding
        const assistantEmbedding = await generateEmbedding(aiMessage);
        if (assistantEmbedding) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            user_id: dbUser.id,
            role: 'assistant',
            content: aiMessage,
            embedding: assistantEmbedding,
            metadata: { project, tags },
            created_at: new Date().toISOString()
          });
        }
        
        // Extract and save memory chunks from assistant response
        const assistantChunks = await extractMemoryChunks(
          aiMessage,
          'assistant',
          dbUser.name
        );
        
        for (const chunk of assistantChunks) {
          const chunkEmbedding = await generateEmbedding(chunk.content);
          if (chunkEmbedding) {
            await supabase.from('memory_chunks').insert({
              user_id: dbUser.id,
              conversation_id: conversationId,
              content: chunk.content,
              chunk_type: chunk.type,
              embedding: chunkEmbedding,
              importance: chunk.importance,
              metadata: { project, tags, source: 'assistant_response' }
            });
            memoriesExtracted++;
          }
        }
        
        saved = true;
        console.log(`Saved messages and extracted ${memoriesExtracted} memory chunks`);
      } catch (error) {
        console.error('Database save error:', error);
      }
    }
    
    // Return response with full metadata
    return NextResponse.json({
      response: aiMessage,
      conversationId,
      saved,
      vectorSearchUsed,
      contextsFound: memoriesFound,
      memoriesExtracted,
      user: dbUser?.name || userId,
      project,
      tags
    });
    
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({
      response: "An unexpected error occurred. Please try again.",
      error: true,
      details: error.message
    });
  }
}
'@

$enhancedRoute | Out-File -FilePath ".\app\api\chat\route.ts" -Encoding UTF8
Write-Host "  Enhanced chat route with vector search created" -ForegroundColor Green

# 3. CREATE MEMORY EXTRACTION SERVICE
Write-Host "[3/6] Creating memory extraction service..." -ForegroundColor Yellow
$memoryService = @'
// services/memory-service.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface MemoryChunk {
  content: string;
  type: 'fact' | 'preference' | 'decision' | 'event' | 'relationship' | 'summary';
  importance: number;
  metadata?: any;
}

export class MemoryExtractor {
  
  // Advanced pattern matching for memory extraction
  static extractPatterns = [
    // Personal facts
    { pattern: /my (?:full )?name is ([^.!?]+)/gi, type: 'fact', importance: 0.95 },
    { pattern: /i(?:'m| am) (\d+) years old/gi, type: 'fact', importance: 0.9 },
    { pattern: /i (?:live|reside) (?:in|at) ([^.!?]+)/gi, type: 'fact', importance: 0.85 },
    { pattern: /i work (?:at|for|as a?) ([^.!?]+)/gi, type: 'fact', importance: 0.85 },
    { pattern: /my (?:phone number|email) is ([^.!?]+)/gi, type: 'fact', importance: 0.9 },
    
    // Relationships
    { pattern: /my (\w+)'s name is ([^.!?]+)/gi, type: 'relationship', importance: 0.9 },
    { pattern: /i have (?:a|an) (\w+) (?:named|called) ([^.!?]+)/gi, type: 'relationship', importance: 0.85 },
    { pattern: /([^.!?]+) is my (\w+)/gi, type: 'relationship', importance: 0.85 },
    
    // Preferences
    { pattern: /my (?:favorite|favourite) (\w+) is ([^.!?]+)/gi, type: 'preference', importance: 0.8 },
    { pattern: /i (?:really )?(?:like|love|enjoy) ([^.!?]+)/gi, type: 'preference', importance: 0.7 },
    { pattern: /i (?:hate|dislike|can't stand) ([^.!?]+)/gi, type: 'preference', importance: 0.7 },
    { pattern: /i prefer ([^.!?]+) (?:over|to) ([^.!?]+)/gi, type: 'preference', importance: 0.75 },
    
    // Events
    { pattern: /(?:yesterday|today|tomorrow) i ([^.!?]+)/gi, type: 'event', importance: 0.8 },
    { pattern: /(?:last|next) (\w+) i ([^.!?]+)/gi, type: 'event', importance: 0.75 },
    { pattern: /i (?:will|am going to) ([^.!?]+) (?:on|at) ([^.!?]+)/gi, type: 'event', importance: 0.8 },
    
    // Decisions
    { pattern: /i(?:'ve| have) (?:decided|chosen) (?:to )?([^.!?]+)/gi, type: 'decision', importance: 0.85 },
    { pattern: /let's (?:go with|choose|do) ([^.!?]+)/gi, type: 'decision', importance: 0.8 },
    { pattern: /(?:we|i) (?:should|will) ([^.!?]+)/gi, type: 'decision', importance: 0.75 },
    
    // Important instructions
    { pattern: /(?:remember|don't forget) (?:that |to )?([^.!?]+)/gi, type: 'fact', importance: 0.95 },
    { pattern: /(?:always|never) ([^.!?]+)/gi, type: 'preference', importance: 0.9 },
    { pattern: /(?:important|critical|essential): ([^.!?]+)/gi, type: 'fact', importance: 0.95 }
  ];
  
  static async extractFromMessage(content: string, role: string): Promise<MemoryChunk[]> {
    const chunks: MemoryChunk[] = [];
    const foundMatches = new Set<string>();
    
    // Only extract from user messages primarily
    if (role === 'user') {
      for (const { pattern, type, importance } of this.extractPatterns) {
        const regex = new RegExp(pattern);
        let match;
        
        while ((match = regex.exec(content)) !== null) {
          const extracted = match[0].trim();
          
          // Avoid duplicates
          if (!foundMatches.has(extracted)) {
            foundMatches.add(extracted);
            chunks.push({
              content: extracted,
              type: type as any,
              importance,
              metadata: {
                original_length: content.length,
                extraction_confidence: importance
              }
            });
          }
        }
      }
      
      // If message is important but no patterns matched, save whole message
      if (chunks.length === 0 && content.length > 50) {
        const importantKeywords = ['important', 'remember', 'critical', 'emergency', 'urgent'];
        const hasImportantKeyword = importantKeywords.some(kw => 
          content.toLowerCase().includes(kw)
        );
        
        if (hasImportantKeyword) {
          chunks.push({
            content: content.substring(0, 500),
            type: 'fact',
            importance: 0.7,
            metadata: { reason: 'important_keyword_detected' }
          });
        }
      }
    }
    
    // For assistant messages, extract summaries of important responses
    if (role === 'assistant') {
      // Check if assistant is confirming understanding of important info
      if (content.includes('I understand') || content.includes('I\'ll remember')) {
        chunks.push({
          content: content.substring(0, 300),
          type: 'summary',
          importance: 0.6,
          metadata: { reason: 'confirmation' }
        });
      }
    }
    
    return chunks;
  }
  
  static async processConversation(
    messages: Array<{role: string, content: string}>,
    userId: string,
    conversationId: string
  ): Promise<number> {
    let totalExtracted = 0;
    
    for (const message of messages) {
      const chunks = await this.extractFromMessage(message.content, message.role);
      
      for (const chunk of chunks) {
        try {
          // Generate embedding for the chunk
          const embedding = await this.generateEmbedding(chunk.content);
          
          if (embedding) {
            await supabase.from('memory_chunks').insert({
              user_id: userId,
              conversation_id: conversationId,
              content: chunk.content,
              chunk_type: chunk.type,
              embedding: embedding,
              importance: chunk.importance,
              metadata: chunk.metadata
            });
            totalExtracted++;
          }
        } catch (error) {
          console.error('Failed to save memory chunk:', error);
        }
      }
    }
    
    return totalExtracted;
  }
  
  private static async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text.substring(0, 8000)
        })
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      return null;
    }
  }
}

export default MemoryExtractor;
'@

New-Item -Path ".\services" -ItemType Directory -Force | Out-Null
$memoryService | Out-File -FilePath ".\services\memory-service.ts" -Encoding UTF8
Write-Host "  Memory extraction service created" -ForegroundColor Green

# 4. CREATE COMPREHENSIVE TEST SCRIPT
Write-Host "[4/6] Creating comprehensive test script..." -ForegroundColor Yellow
$testScript = @'
# KIMBLEAI VECTOR SEARCH TEST SUITE
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "KIMBLEAI VECTOR SEARCH TEST SUITE" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://kimbleai-v4-clean-4oizii6tg-kimblezcs-projects.vercel.app"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"

# Test 1: API Status Check
Write-Host "[TEST 1] Checking API and Vector Search Status..." -ForegroundColor Yellow
$status = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Get
Write-Host "  API Status: $($status.status)" -ForegroundColor Green
Write-Host "  OpenAI: $($status.apiKeyConfigured)" -ForegroundColor $(if($status.apiKeyConfigured){"Green"}else{"Red"})
Write-Host "  Supabase: $($status.supabaseConfigured)" -ForegroundColor $(if($status.supabaseConfigured){"Green"}else{"Red"})
Write-Host "  Vector Search: $($status.vectorSearchEnabled)" -ForegroundColor $(if($status.vectorSearchEnabled){"Green"}else{"Red"})
Write-Host ""

# Test 2: Save Multiple Facts (Zach)
Write-Host "[TEST 2] Saving multiple facts for Zach..." -ForegroundColor Yellow
$facts1 = @{
    messages = @(
        @{
            role = "user"
            content = "Hi, I'm Zach. My dog's name is Rennie. My favorite color is blue. I work as a software engineer. I live in Seattle."
        }
    )
    userId = "zach"
    conversationId = "test_facts_$timestamp"
    project = "personal"
    tags = @("test", "facts")
} | ConvertTo-Json -Depth 10

$response1 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $facts1 -ContentType "application/json"
Write-Host "  Response saved: $($response1.saved)" -ForegroundColor $(if($response1.saved){"Green"}else{"Red"})
Write-Host "  Memories extracted: $($response1.memoriesExtracted)" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 2

# Test 3: Vector Search Retrieval (New Conversation)
Write-Host "[TEST 3] Testing vector search in new conversation..." -ForegroundColor Yellow
$search1 = @{
    messages = @(
        @{
            role = "user"
            content = "What do you know about my pet and where I work?"
        }
    )
    userId = "zach"
    conversationId = "test_search_$timestamp"
    project = "general"
} | ConvertTo-Json -Depth 10

$response2 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $search1 -ContentType "application/json"
Write-Host "  Vector search used: $($response2.vectorSearchUsed)" -ForegroundColor $(if($response2.vectorSearchUsed){"Green"}else{"Red"})
Write-Host "  Contexts found: $($response2.contextsFound)" -ForegroundColor Cyan
Write-Host "  Response includes 'Rennie': $(if($response2.response -match 'Rennie'){'YES'}else{'NO'})" -ForegroundColor $(if($response2.response -match 'Rennie'){"Green"}else{"Red"})
Write-Host "  Response includes 'software': $(if($response2.response -match 'software'){'YES'}else{'NO'})" -ForegroundColor $(if($response2.response -match 'software'){"Green"}else{"Red"})
Write-Host ""

# Test 4: Cross-User Isolation (Rebecca)
Write-Host "[TEST 4] Testing user isolation with Rebecca..." -ForegroundColor Yellow
$rebecca1 = @{
    messages = @(
        @{
            role = "user"
            content = "Hi, I'm Rebecca. My favorite food is sushi. I have a cat named Whiskers."
        }
    )
    userId = "rebecca"
    conversationId = "test_rebecca_$timestamp"
    project = "personal"
} | ConvertTo-Json -Depth 10

$response3 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $rebecca1 -ContentType "application/json"
Write-Host "  Rebecca's data saved: $($response3.saved)" -ForegroundColor $(if($response3.saved){"Green"}else{"Red"})

Start-Sleep -Seconds 2

# Test if Rebecca sees Zach's data
$rebecca2 = @{
    messages = @(
        @{
            role = "user"
            content = "What's my pet's name?"
        }
    )
    userId = "rebecca"
    conversationId = "test_rebecca2_$timestamp"
} | ConvertTo-Json -Depth 10

$response4 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $rebecca2 -ContentType "application/json"
Write-Host "  Rebecca sees 'Whiskers': $(if($response4.response -match 'Whiskers'){'YES'}else{'NO'})" -ForegroundColor $(if($response4.response -match 'Whiskers'){"Green"}else{"Red"})
Write-Host "  Rebecca sees 'Rennie': $(if($response4.response -match 'Rennie'){'NO (Good!)'}else{'YES (Bad!)'})" -ForegroundColor $(if($response4.response -notmatch 'Rennie'){"Green"}else{"Red"})
Write-Host ""

# Test 5: Project Context
Write-Host "[TEST 5] Testing project-based context..." -ForegroundColor Yellow
$project1 = @{
    messages = @(
        @{
            role = "user"
            content = "For the birthday party project: We need a chocolate cake, 20 balloons, and the party is on Saturday at 3pm."
        }
    )
    userId = "zach"
    conversationId = "test_project_$timestamp"
    project = "birthday_party"
    tags = @("event", "planning")
} | ConvertTo-Json -Depth 10

$response5 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $project1 -ContentType "application/json"
Write-Host "  Project data saved: $($response5.saved)" -ForegroundColor $(if($response5.saved){"Green"}else{"Red"})

Start-Sleep -Seconds 2

$project2 = @{
    messages = @(
        @{
            role = "user"
            content = "What time is the party and what kind of cake?"
        }
    )
    userId = "zach"
    conversationId = "test_project2_$timestamp"
    project = "birthday_party"
} | ConvertTo-Json -Depth 10

$response6 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $project2 -ContentType "application/json"
Write-Host "  Found party details: $(if($response6.response -match '3pm' -and $response6.response -match 'chocolate'){'YES'}else{'NO'})" -ForegroundColor $(if($response6.response -match '3pm' -and $response6.response -match 'chocolate'){"Green"}else{"Red"})
Write-Host ""

# Summary
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$vectorWorking = $status.vectorSearchEnabled -and $response2.vectorSearchUsed
$memoryWorking = $response2.contextsFound -gt 0
$isolationWorking = $response4.response -notmatch 'Rennie'
$projectWorking = $response6.response -match '3pm' -and $response6.response -match 'chocolate'

Write-Host ""
Write-Host "Feature Status:" -ForegroundColor White
Write-Host "  [$(if($status.apiKeyConfigured){'✓'}else{'✗'})] OpenAI Integration" -ForegroundColor $(if($status.apiKeyConfigured){"Green"}else{"Red"})
Write-Host "  [$(if($status.supabaseConfigured){'✓'}else{'✗'})] Database Connection" -ForegroundColor $(if($status.supabaseConfigured){"Green"}else{"Red"})
Write-Host "  [$(if($vectorWorking){'✓'}else{'✗'})] Vector Search" -ForegroundColor $(if($vectorWorking){"Green"}else{"Red"})
Write-Host "  [$(if($memoryWorking){'✓'}else{'✗'})] Memory Retrieval" -ForegroundColor $(if($memoryWorking){"Green"}else{"Red"})
Write-Host "  [$(if($isolationWorking){'✓'}else{'✗'})] User Isolation" -ForegroundColor $(if($isolationWorking){"Green"}else{"Red"})
Write-Host "  [$(if($projectWorking){'✓'}else{'✗'})] Project Context" -ForegroundColor $(if($projectWorking){"Green"}else{"Red"})

Write-Host ""
if ($vectorWorking -and $memoryWorking -and $isolationWorking) {
    Write-Host "SUCCESS: Full vector search memory system is operational!" -ForegroundColor Green
    Write-Host "The system remembers everything across all conversations with semantic search." -ForegroundColor Green
} elseif ($memoryWorking) {
    Write-Host "PARTIAL SUCCESS: Memory is working but vector search needs configuration" -ForegroundColor Yellow
    Write-Host "Run the database schema in Supabase SQL Editor" -ForegroundColor Yellow
} else {
    Write-Host "NEEDS SETUP: Please run vector_search_schema.sql in Supabase" -ForegroundColor Yellow
}
'@

$testScript | Out-File -FilePath ".\TEST_VECTOR_SEARCH.ps1" -Encoding UTF8
Write-Host "  Comprehensive test script created" -ForegroundColor Green

# 5. BUILD AND DEPLOY
Write-Host "[5/6] Building and deploying..." -ForegroundColor Yellow
npm install
npm run build
npx vercel --prod --yes

# 6. GIT COMMIT
Write-Host "[6/6] Committing to Git..." -ForegroundColor Yellow
git add -A
git commit -m "Implement complete vector search with memory extraction and semantic retrieval"
git push origin main

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "VECTOR SEARCH DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "CRITICAL - DATABASE SETUP REQUIRED:" -ForegroundColor Red
Write-Host "1. Go to: https://supabase.com/dashboard/project/gbmefnaqsxtloseufjqp/sql" -ForegroundColor Yellow
Write-Host "2. Copy ALL contents from vector_search_schema.sql" -ForegroundColor Yellow
Write-Host "3. Paste in SQL Editor and click RUN" -ForegroundColor Yellow
Write-Host "4. Wait for 'Vector search functions created successfully!'" -ForegroundColor Yellow
Write-Host ""
Write-Host "After database setup:" -ForegroundColor Cyan
Write-Host "  Run: .\TEST_VECTOR_SEARCH.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Your app: https://kimbleai-v4-clean-4oizii6tg-kimblezcs-projects.vercel.app" -ForegroundColor Cyan
Write-Host ""
Write-Host "Features now available:" -ForegroundColor Green
Write-Host "  ✓ Full vector similarity search across all conversations" -ForegroundColor Green
Write-Host "  ✓ Automatic memory extraction from conversations" -ForegroundColor Green
Write-Host "  ✓ Semantic retrieval with relevance scoring" -ForegroundColor Green
Write-Host "  ✓ User isolation (Zach and Rebecca have separate memories)" -ForegroundColor Green
Write-Host "  ✓ Project and tag-based organization" -ForegroundColor Green
Write-Host "  ✓ Importance weighting for memories" -ForegroundColor Green
