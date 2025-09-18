import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!process.env.OPENAI_API_KEY,
    apiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 15) + '...',
    endpoint: '/api/test'
  });
}

export async function POST(request: NextRequest) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_KEY) {
    return NextResponse.json({
      error: 'API key not configured',
      status: 'error'
    }, { status: 500 });
  }
  
  // Test OpenAI connection with minimal request
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a test assistant.' },
          { role: 'user', content: 'Say "test successful"' }
        ],
        max_tokens: 10,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({
        error: 'OpenAI API error',
        details: error,
        status: response.status
      }, { status: 500 });
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      status: 'success',
      response: data.choices[0].message.content,
      model: data.model
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: 'Connection failed',
      details: error.message
    }, { status: 500 });
  }
}