import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Runtime configuration for Vercel
export const runtime = 'nodejs';

// Initialize Supabase if credentials exist
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function POST(request: NextRequest) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_KEY) {
    return NextResponse.json({
      response: "OpenAI API key not configured. Please add it in Vercel environment variables.",
      error: true
    });
  }
  
  try {
    const body = await request.json();
    const { messages = [], userId = 'default', conversationId = 'conv_' + Date.now() } = body;
    
    if (messages.length === 0) {
      return NextResponse.json({
        response: "Hello! I'm KimbleAI. How can I assist you today?",
        conversationId
      });
    }
    
    const userMessage = messages[messages.length - 1];
    
    // Save to Supabase if available
    if (supabase) {
      try {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: userMessage.role,
          content: userMessage.content,
          created_at: new Date().toISOString()
        });
      } catch (dbError) {
        console.log('Database save skipped:', dbError);
      }
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
            content: 'You are KimbleAI, a helpful assistant. Be concise and accurate.'
          },
          ...messages.slice(-5) // Last 5 messages for context
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });
    
    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }
    
    const data = await openaiResponse.json();
    const assistantResponse = data.choices[0].message.content;
    
    // Save assistant response to Supabase
    if (supabase) {
      try {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: assistantResponse,
          created_at: new Date().toISOString()
        });
      } catch (dbError) {
        console.log('Database save skipped:', dbError);
      }
    }
    
    return NextResponse.json({
      response: assistantResponse,
      conversationId,
      saved: !!supabase
    });
    
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({
      response: "Sorry, I encountered an error. Please try again.",
      error: true
    });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Chat API is running',
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasSupabase: !!supabase,
    timestamp: new Date().toISOString()
  });
}