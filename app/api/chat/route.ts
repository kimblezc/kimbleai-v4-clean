/**
 * Chat API with diagnostics
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Check if OpenAI key exists
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        response: "OpenAI API key is not configured. Please add OPENAI_API_KEY to Vercel environment variables.",
        error: "missing_key"
      });
    }
    
    const messages = body.messages || [];
    if (messages.length === 0) {
      return NextResponse.json({
        response: "Hello! Send me a message to get started.",
        conversationId: "test-" + Date.now()
      });
    }
    
    const lastMessage = messages[messages.length - 1];
    
    // Call OpenAI
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
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('OpenAI error:', error);
        return NextResponse.json({
          response: `OpenAI error: ${response.status}. Check your API key and quota.`,
          error: response.status
        });
      }
      
      const data = await response.json();
      
      return NextResponse.json({
        response: data.choices[0].message.content,
        conversationId: body.conversationId || "conv-" + Date.now()
      });
      
    } catch (error: any) {
      return NextResponse.json({
        response: `Error: ${error.message}`,
        error: error.message
      });
    }
    
  } catch (error: any) {
    return NextResponse.json({
      response: `Server error: ${error.message}`,
      error: error.message
    });
  }
}