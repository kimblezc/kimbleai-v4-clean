import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_KEY) {
    return NextResponse.json({
      response: "OpenAI API key is not configured."
    });
  }
  
  try {
    const body = await req.json();
    const messages = body.messages || [];
    
    if (messages.length === 0) {
      return NextResponse.json({
        response: "Hello! How can I assist you today?"
      });
    }
    
    const lastMessage = messages[messages.length - 1];
    
    // Call OpenAI with strict instructions
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
            content: `You are KimbleAI, a helpful assistant. 
            
CRITICAL INSTRUCTIONS:
- NEVER make assumptions about users
- NEVER state facts about users unless they explicitly told you
- If asked about what someone likes, ask them instead of guessing
- Be helpful and accurate
- Keep responses concise
- If you don't know something, say so` 
          },
          ...messages
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI Error:', errorText);
      
      if (openaiResponse.status === 401) {
        return NextResponse.json({
          response: "Invalid OpenAI API key."
        });
      } else if (openaiResponse.status === 429) {
        return NextResponse.json({
          response: "Rate limit exceeded. Please try again later."
        });
      } else {
        return NextResponse.json({
          response: `API error: ${openaiResponse.status}`
        });
      }
    }
    
    const data = await openaiResponse.json();
    
    return NextResponse.json({
      response: data.choices[0].message.content,
      conversationId: body.conversationId
    });
    
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json({
      response: `Error: ${error.message}`
    });
  }
}