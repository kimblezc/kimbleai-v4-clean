import { NextRequest, NextResponse } from 'next/server';

// GET endpoint to check status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "ready",
    apiKeyConfigured: !!process.env.OPENAI_API_KEY,
    apiKeyStart: process.env.OPENAI_API_KEY?.substring(0, 20),
    supabaseConfigured: false,
    timestamp: new Date().toISOString()
  });
}

// POST endpoint for chat
export async function POST(request: NextRequest) {
  try {
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_KEY) {
      return NextResponse.json({
        response: "API key not configured",
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
    
    const { messages = [], userId = 'default' } = body;
    
    // Return greeting if no messages
    if (messages.length === 0) {
      return NextResponse.json({
        response: "Hello! I'm KimbleAI. How can I help you today?"
      });
    }
    
    // Build messages for OpenAI
    const apiMessages = [
      { 
        role: 'system', 
        content: 'You are KimbleAI, a helpful assistant.'
      },
      ...messages
    ];
    
    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: apiMessages,
        max_tokens: 500,
        temperature: 0.7
      })
    });
    
    // Check if OpenAI request was successful
    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', openaiResponse.status);
      return NextResponse.json({
        response: "Sorry, the AI service is currently unavailable. Please try again.",
        error: true
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
    
    // Return successful response
    return NextResponse.json({
      response: aiMessage
    });
    
  } catch (error: any) {
    console.error('Chat API error:', error.message);
    return NextResponse.json({
      response: "An error occurred. Please try again.",
      error: true
    });
  }
}