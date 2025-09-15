import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Security check for required environment variables
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
}

// Initialize Supabase with security checks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase configuration incomplete');
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Secure embedding generation
async function generateEmbedding(text: string): Promise<number[] | null> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_KEY) {
    console.error('OpenAI API key missing for embeddings');
    return null;
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000) // Limit input size
      })
    });
    
    if (!response.ok) {
      console.error('Embedding generation failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    return null;
  }
}

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const limit = requestCounts.get(identifier);
  
  if (!limit || now > limit.resetTime) {
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + 60000 // 1 minute window
    });
    return true;
  }
  
  if (limit.count >= 10) { // 10 requests per minute
    return false;
  }
  
  limit.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Security: Check for API key
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_KEY) {
    return NextResponse.json({
      response: "Service temporarily unavailable. Configuration error.",
      error: true
    }, { status: 503 });
  }
  
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json({
      response: "Rate limit exceeded. Please wait before sending more messages.",
      error: true
    }, { status: 429 });
  }
  
  try {
    const body = await req.json();
    
    // Input validation
    if (!body || typeof body !== 'object') {
      return NextResponse.json({
        response: "Invalid request format",
        error: true
      }, { status: 400 });
    }
    
    const { 
      messages = [], 
      userId = 'default',
      conversationId = 'conv_' + Date.now(),
      projectId = '',
      tags = []
    } = body;
    
    // Validate message format
    if (!Array.isArray(messages)) {
      return NextResponse.json({
        response: "Invalid message format",
        error: true
      }, { status: 400 });
    }
    
    if (messages.length === 0) {
      return NextResponse.json({
        response: "Hello! I'm KimbleAI. How can I assist you today?",
        conversationId
      });
    }
    
    const userMessage = messages[messages.length - 1];
    
    // Sanitize input
    const sanitizedContent = userMessage.content.substring(0, 4000);
    
    // Database operations with error handling
    let dbUserId = null;
    let embedding = null;
    let similarMessages = null;
    
    if (supabase) {
      try {
        // Get user from database
        if (userId !== 'default') {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('email', userId)
            .single();
          
          dbUserId = userData?.id;
        }
        
        // Generate embedding
        embedding = await generateEmbedding(sanitizedContent);
        
        // Save user message
        if (embedding) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            user_id: dbUserId,
            role: userMessage.role,
            content: sanitizedContent,
            project: projectId,
            tags: tags,
            embedding: embedding,
            created_at: new Date().toISOString()
          });
          
          // Search for similar messages
          const { data } = await supabase.rpc('search_similar_messages', {
            query_embedding: embedding,
            match_threshold: 0.78,
            match_count: 3
          });
          similarMessages = data;
        }
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
        // Continue without database features
      }
    }
    
    // Build context from similar messages
    let contextPrompt = '';
    if (similarMessages && similarMessages.length > 0) {
      contextPrompt = '\n\nBased on our previous conversations:\n';
      similarMessages.forEach((msg: any) => {
        contextPrompt += `- ${msg.content.substring(0, 100)}...\n`;
      });
    }
    
    // Call OpenAI with error handling
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Using 3.5 for cost efficiency
        messages: [
          { 
            role: 'system', 
            content: `You are KimbleAI, a helpful family assistant. 
            Be helpful, accurate, and concise.
            Never make assumptions about users.${contextPrompt}`
          },
          ...messages.slice(-10) // Limit context to last 10 messages
        ],
        max_tokens: 800,
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorText);
      
      if (openaiResponse.status === 401) {
        // Don't expose that API key is invalid
        return NextResponse.json({
          response: "Service temporarily unavailable.",
          error: true
        }, { status: 503 });
      }
      
      return NextResponse.json({
        response: "I'm having trouble processing your request. Please try again.",
        error: true
      }, { status: 500 });
    }
    
    const data = await openaiResponse.json();
    const assistantResponse = data.choices[0]?.message?.content || 'No response generated';
    
    // Save assistant response to database
    if (supabase && embedding) {
      try {
        const responseEmbedding = await generateEmbedding(assistantResponse);
        
        if (responseEmbedding) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            user_id: dbUserId,
            role: 'assistant',
            content: assistantResponse,
            project: projectId,
            tags: tags,
            embedding: responseEmbedding,
            created_at: new Date().toISOString()
          });
          
          // Update conversation
          await supabase.from('conversations').upsert({
            id: conversationId,
            user_id: dbUserId,
            title: messages[0]?.content?.substring(0, 50) || 'New Chat',
            project: projectId,
            tags: tags,
            last_message: assistantResponse.substring(0, 100),
            updated_at: new Date().toISOString()
          });
        }
      } catch (dbError) {
        console.error('Failed to save response:', dbError);
        // Continue without saving
      }
    }
    
    return NextResponse.json({
      response: assistantResponse,
      conversationId,
      saved: !!supabase
    });
    
  } catch (error: any) {
    console.error('Chat API error:', error);
    
    // Never expose internal errors to client
    return NextResponse.json({
      response: "An error occurred. Please try again.",
      error: true
    }, { status: 500 });
  }
}

// GET endpoint with security
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json({
      error: "Rate limit exceeded"
    }, { status: 429 });
  }
  
  if (!supabase) {
    return NextResponse.json({
      error: "Database not configured"
    }, { status: 503 });
  }
  
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');
  
  try {
    if (!conversationId) {
      // Load recent conversations
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('id, title, project, tags, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      return NextResponse.json({ conversations });
    }
    
    // Validate conversation ID format
    if (!/^conv_\d+/.test(conversationId)) {
      return NextResponse.json({
        error: "Invalid conversation ID"
      }, { status: 400 });
    }
    
    // Load specific conversation messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(50);
    
    if (error) throw error;
    
    return NextResponse.json({ messages });
    
  } catch (error) {
    console.error('GET endpoint error:', error);
    return NextResponse.json({
      error: "Failed to load data"
    }, { status: 500 });
  }
}