import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Chat endpoint is active",
    apiKeyConfigured: !!process.env.OPENAI_API_KEY
  });
}

export async function POST(request: NextRequest) {
  console.log('Chat endpoint called');
  
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_KEY) {
    console.error('No API key found');
    return NextResponse.json({
      response: "API key not configured",
      error: true
    });
  }
  
  try {
    const body = await request.json();
    const { messages = [], userId = 'default' } = body;
    
    console.log('Request received with', messages.length, 'messages');
    
    if (messages.length === 0) {
      return NextResponse.json({
        response: "Hello! I'm KimbleAI. How can I help you today?"
      });
    }
    
    // Simple OpenAI call
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `You are KimbleAI, a helpful assistant. Current user: ${userId}` },
          ...messages
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI error:', errorText);
      return NextResponse.json({
        response: "Sorry, I encountered an error with the AI service.",
        error: true
      });
    }
    
    const data = await openaiResponse.json();
    
    return NextResponse.json({
      response: data.choices[0].message.content
    });
    
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({
      response: "Sorry, something went wrong. Please try again.",
      error: true
    });
  }
}