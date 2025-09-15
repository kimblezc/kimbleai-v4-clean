/**
 * ULTRA-SIMPLE Chat API - No dependencies
 * Emergency version to get basic functionality working
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Just echo back for now to confirm API is working
    if (!body.messages || body.messages.length === 0) {
      return NextResponse.json({
        response: "Hello! I'm KimbleAI. Send me a message to get started.",
        conversationId: "test-" + Date.now()
      });
    }
    
    const lastMessage = body.messages[body.messages.length - 1];
    
    // Check if OpenAI key exists
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        response: "I'm currently offline. The OpenAI API key is not configured in Vercel environment variables. Please add it in Vercel settings.",
        conversationId: body.conversationId || "test-" + Date.now()
      });
    }
    
    // Try basic OpenAI call
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are KimbleAI, a helpful assistant.' },
            { role: 'user', content: lastMessage.content }
          ],
          max_tokens: 150
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json({
          response: `OpenAI API error: ${response.status}. This usually means the API key is invalid or you've exceeded your quota.`,
          conversationId: body.conversationId || "test-" + Date.now(),
          error: error.substring(0, 200)
        });
      }
      
      const data = await response.json();
      
      return NextResponse.json({
        response: data.choices[0].message.content,
        conversationId: body.conversationId || "test-" + Date.now()
      });
      
    } catch (error: any) {
      return NextResponse.json({
        response: `Error calling OpenAI: ${error.message}`,
        conversationId: body.conversationId || "test-" + Date.now()
      });
    }
    
  } catch (error: any) {
    return NextResponse.json({
      response: `Server error: ${error.message}`,
      conversationId: "error-" + Date.now()
    });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Chat API is running',
    timestamp: new Date().toISOString(),
    hasOpenAIKey: !!process.env.OPENAI_API_KEY
  });
}