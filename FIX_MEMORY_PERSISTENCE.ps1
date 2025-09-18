# KIMBLEAI MEMORY PERSISTENCE FIX
# This script removes vector complexity and implements simple working memory

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "KIMBLEAI MEMORY PERSISTENCE FIX" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# 1. CREATE SIMPLIFIED DATABASE SCHEMA
Write-Host "[1/5] Creating simplified database schema..." -ForegroundColor Yellow
$schema = @'
-- Drop the problematic vector search function if it exists
DROP FUNCTION IF EXISTS search_similar_messages CASCADE;

-- Ensure vector extension is enabled (won't fail if already exists)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create simple tables if they don't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT REFERENCES conversations(id),
  user_id UUID REFERENCES users(id),
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default users if they don't exist
INSERT INTO users (name, email) VALUES 
  ('Zach', 'zach.kimble@gmail.com'),
  ('Rebecca', 'becky.aza.kimble@gmail.com')
ON CONFLICT (name) DO NOTHING;

-- Create simple indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
'@

$schema | Out-File -FilePath ".\simple_schema.sql" -Encoding UTF8
Write-Host "  Schema file created: simple_schema.sql" -ForegroundColor Green
Write-Host "  Copy this to Supabase SQL Editor and run it" -ForegroundColor Cyan

# 2. CREATE SIMPLIFIED CHAT API WITHOUT VECTOR SEARCH
Write-Host "[2/5] Creating simplified chat API..." -ForegroundColor Yellow
$chatRoute = @'
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// GET endpoint to check status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "ready",
    apiKeyConfigured: !!process.env.OPENAI_API_KEY,
    supabaseConfigured: !!supabase,
    timestamp: new Date().toISOString()
  });
}

// Generate embedding (keep for future use, but don't require for memory)
async function generateEmbedding(text: string): Promise<number[] | null> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
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
    console.error('Embedding generation failed (non-critical):', error);
    return null;
  }
}

// POST endpoint for chat with simple memory retrieval
export async function POST(request: NextRequest) {
  try {
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_KEY) {
      return NextResponse.json({
        response: "API key not configured. Please set OPENAI_API_KEY.",
        error: true
      });
    }
    
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({
        response: "Invalid request format",
        error: true
      });
    }
    
    const { 
      messages = [], 
      userId = 'zach',
      conversationId = 'conv_' + Date.now()
    } = body;
    
    // Return greeting if no messages
    if (messages.length === 0) {
      return NextResponse.json({
        response: "Hello! I'm KimbleAI, your family AI assistant with persistent memory. How can I help you today?",
        conversationId
      });
    }
    
    // Get the last user message
    const userMessage = messages[messages.length - 1];
    
    // SIMPLE MEMORY RETRIEVAL - No vector search needed
    let memoryContext = '';
    let memoryWorking = false;
    let memoriesLoaded = 0;
    
    if (supabase && userMessage.content) {
      try {
        console.log('Loading conversation history...');
        
        // Get user from database
        const userName = userId === 'rebecca' ? 'Rebecca' : 'Zach';
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('name', userName)
          .single();
        
        if (userData) {
          // Get recent messages from ALL conversations for this user
          const { data: recentMessages, error } = await supabase
            .from('messages')
            .select('content, role, created_at')
            .eq('user_id', userData.id)
            .order('created_at', { ascending: false })
            .limit(20);
          
          if (!error && recentMessages && recentMessages.length > 0) {
            // Build memory context from recent conversations
            memoryContext = '\n\nPrevious conversations with ' + userName + ':\n';
            
            // Reverse to show chronological order
            const chronological = recentMessages.reverse();
            
            chronological.forEach((msg: any) => {
              const role = msg.role === 'user' ? userName : 'You';
              memoryContext += `${role}: ${msg.content}\n`;
            });
            
            memoryWorking = true;
            memoriesLoaded = recentMessages.length;
            console.log(`Loaded ${memoriesLoaded} messages from history`);
          }
        }
      } catch (memError) {
        console.error('Memory retrieval error:', memError);
        // Continue without memories if retrieval fails
      }
    }
    
    // Build system prompt with memories
    const systemPrompt = `You are KimbleAI, a helpful AI assistant for the Kimble family with perfect memory.

Current user: ${userId === 'rebecca' ? 'Rebecca' : 'Zach'}
Time: ${new Date().toLocaleString()}

${memoryWorking ? 'CONVERSATION HISTORY:' + memoryContext : 'No previous conversation history available.'}

Remember all details from the conversation history above. Reference past conversations naturally when relevant.
If the user asks about something mentioned before, recall it from the history.`;
    
    // Build messages for OpenAI
    const apiMessages = [
      { 
        role: 'system', 
        content: systemPrompt
      },
      ...messages
    ];
    
    // Call OpenAI
    console.log('Calling OpenAI API...');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: apiMessages,
        max_tokens: 800,
        temperature: 0.7
      })
    });
    
    // Check if OpenAI request was successful
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorText);
      return NextResponse.json({
        response: "Sorry, the AI service encountered an error. Please check your API key.",
        error: true,
        details: errorText
      });
    }
    
    // Parse OpenAI response
    let aiData;
    try {
      aiData = await openaiResponse.json();
    } catch (e) {
      console.error('Failed to parse OpenAI response');
      return NextResponse.json({
        response: "Sorry, I received an invalid response from the AI service.",
        error: true
      });
    }
    
    // Extract the response
    const aiMessage = aiData.choices?.[0]?.message?.content || "No response generated";
    
    // SAVE CONVERSATION TO DATABASE (SIMPLIFIED)
    let saved = false;
    if (supabase) {
      try {
        // Get or create user
        const userName = userId === 'rebecca' ? 'Rebecca' : 'Zach';
        
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('name', userName)
          .single();
        
        if (userData) {
          // Save or update conversation
          await supabase.from('conversations').upsert({
            id: conversationId,
            user_id: userData.id,
            title: userMessage.content.substring(0, 100),
            updated_at: new Date().toISOString()
          });
          
          // Save user message (with optional embedding)
          const userEmbedding = await generateEmbedding(userMessage.content);
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            user_id: userData.id,
            role: 'user',
            content: userMessage.content,
            embedding: userEmbedding, // Can be null if embedding fails
            created_at: new Date().toISOString()
          });
          
          // Save assistant response (with optional embedding)
          const assistantEmbedding = await generateEmbedding(aiMessage);
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            user_id: userData.id,
            role: 'assistant',
            content: aiMessage,
            embedding: assistantEmbedding, // Can be null if embedding fails
            created_at: new Date().toISOString()
          });
          
          saved = true;
          console.log('Messages saved to database successfully');
        }
      } catch (dbError) {
        console.error('Database save error (non-critical):', dbError);
        // Continue even if save fails
      }
    }
    
    // Return successful response with status
    return NextResponse.json({
      response: aiMessage,
      conversationId,
      saved,
      memoryActive: memoryWorking,
      memoriesLoaded
    });
    
  } catch (error: any) {
    console.error('Chat API error:', error.message);
    return NextResponse.json({
      response: "An unexpected error occurred. Please try again.",
      error: true,
      details: error.message
    });
  }
}
'@

$chatRoute | Out-File -FilePath ".\app\api\chat\route.ts" -Encoding UTF8
Write-Host "  Chat route updated with simplified memory" -ForegroundColor Green

# 3. CREATE TEST SCRIPT
Write-Host "[3/5] Creating test script..." -ForegroundColor Yellow
$testScript = @'
# Test KimbleAI Memory Persistence
Write-Host "Testing KimbleAI Memory..." -ForegroundColor Cyan

$url = "https://kimbleai-v4-clean-4oizii6tg-kimblezcs-projects.vercel.app/api/chat"

# Test 1: Save a fact
$body1 = @{
    messages = @(
        @{
            role = "user"
            content = "My favorite color is blue and I have a dog named Max"
        }
    )
    userId = "zach"
    conversationId = "test_" + (Get-Date -Format "yyyyMMddHHmmss")
} | ConvertTo-Json -Depth 10

Write-Host "Sending test message 1..." -ForegroundColor Yellow
$response1 = Invoke-RestMethod -Uri $url -Method Post -Body $body1 -ContentType "application/json"
Write-Host "Response: $($response1.response)" -ForegroundColor Green
Write-Host "Saved: $($response1.saved)" -ForegroundColor Cyan
Write-Host ""

# Test 2: Retrieve the fact in a new conversation
Start-Sleep -Seconds 2

$body2 = @{
    messages = @(
        @{
            role = "user"
            content = "What is my favorite color and do I have any pets?"
        }
    )
    userId = "zach"
    conversationId = "test2_" + (Get-Date -Format "yyyyMMddHHmmss")
} | ConvertTo-Json -Depth 10

Write-Host "Sending test message 2 (different conversation)..." -ForegroundColor Yellow
$response2 = Invoke-RestMethod -Uri $url -Method Post -Body $body2 -ContentType "application/json"
Write-Host "Response: $($response2.response)" -ForegroundColor Green
Write-Host "Memories loaded: $($response2.memoriesLoaded)" -ForegroundColor Cyan
Write-Host "Memory active: $($response2.memoryActive)" -ForegroundColor Cyan

if ($response2.response -match "blue" -and $response2.response -match "Max") {
    Write-Host "SUCCESS: Memory is working!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Memory might not be working correctly" -ForegroundColor Yellow
    Write-Host "Check if the database is properly configured" -ForegroundColor Yellow
}
'@

$testScript | Out-File -FilePath ".\TEST_MEMORY.ps1" -Encoding UTF8
Write-Host "  Test script created: TEST_MEMORY.ps1" -ForegroundColor Green

# 4. BUILD AND DEPLOY
Write-Host "[4/5] Building and deploying..." -ForegroundColor Yellow
Write-Host "  Installing dependencies..." -ForegroundColor Cyan
npm install

Write-Host "  Building application..." -ForegroundColor Cyan
npm run build

Write-Host "  Deploying to Vercel..." -ForegroundColor Cyan
npx vercel --prod --yes

# 5. GIT COMMIT AND PUSH
Write-Host "[5/5] Pushing to GitHub..." -ForegroundColor Yellow
git add -A
git commit -m "Fix: Simplified memory persistence without vector search complexity"
git push origin main

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/gbmefnaqsxtloseufjqp/sql" -ForegroundColor Yellow
Write-Host "2. Copy contents of simple_schema.sql and run it" -ForegroundColor Yellow
Write-Host "3. Wait 2 minutes for deployment to complete" -ForegroundColor Yellow
Write-Host "4. Run: .\TEST_MEMORY.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Your app: https://kimbleai-v4-clean-4oizii6tg-kimblezcs-projects.vercel.app" -ForegroundColor Cyan
