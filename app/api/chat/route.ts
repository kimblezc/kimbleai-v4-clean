import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_KEY) {
    return NextResponse.json({
      response: "OpenAI API key is not configured.",
      error: true
    });
  }
  
  try {
    const body = await req.json();
    const { 
      messages = [], 
      userId = 'default',
      conversationId = 'conv_' + Date.now(),
      projectId = '',
      tags = []
    } = body;
    
    if (messages.length === 0) {
      return NextResponse.json({
        response: "Hello! How can I assist you today?",
        conversationId
      });
    }
    
    const userMessage = messages[messages.length - 1];
    
    // SAVE USER MESSAGE TO SUPABASE IMMEDIATELY
    if (supabase) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: userId,
        role: userMessage.role,
        content: userMessage.content,
        project: projectId,
        tags: tags,
        created_at: new Date().toISOString()
      });
    }
    
    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: 'You are KimbleAI, a helpful assistant. Be accurate and concise.'
          },
          ...messages
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });
    
    if (!openaiResponse.ok) {
      return NextResponse.json({
        response: `API error: ${openaiResponse.status}`,
        error: true
      });
    }
    
    const data = await openaiResponse.json();
    const assistantResponse = data.choices[0].message.content;
    
    // SAVE ASSISTANT RESPONSE TO SUPABASE IMMEDIATELY
    if (supabase) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: userId,
        role: 'assistant',
        content: assistantResponse,
        project: projectId,
        tags: tags,
        created_at: new Date().toISOString()
      });
      
      // Update or create conversation record
      await supabase.from('conversations').upsert({
        id: conversationId,
        user_id: userId,
        title: messages[0]?.content?.substring(0, 50) || 'New Chat',
        project: projectId,
        tags: tags,
        last_message: assistantResponse.substring(0, 100),
        updated_at: new Date().toISOString()
      });
    }
    
    return NextResponse.json({
      response: assistantResponse,
      conversationId,
      saved: true
    });
    
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({
      response: `Error: ${error.message}`,
      error: true
    });
  }
}

// GET endpoint to load conversation history
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');
  const userId = searchParams.get('userId');
  
  if (!conversationId) {
    // Load all conversations for user
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId || 'default')
      .order('updated_at', { ascending: false });
    
    return NextResponse.json({ conversations });
  }
  
  // Load specific conversation messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  
  return NextResponse.json({ messages });
}