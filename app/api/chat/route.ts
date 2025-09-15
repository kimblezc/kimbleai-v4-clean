/**
 * Chat API with full diagnostics and error handling
 */

import { NextRequest, NextResponse } from 'next/server';

// Test the environment variables
function checkEnvironment() {
  const checks = {
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    openAIKeyLength: process.env.OPENAI_API_KEY?.length || 0,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };
  
  return checks;
}

export async function POST(req: NextRequest) {
  console.log('Chat API called at:', new Date().toISOString());
  
  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body).substring(0, 200));
    
    // Check environment first
    const env = checkEnvironment();
    console.log('Environment check:', env);
    
    if (!env.hasOpenAIKey) {
      return NextResponse.json({
        response: "⚠️ OpenAI API key is missing from environment variables. Please check Vercel dashboard.",
        conversationId: body.conversationId || "test-" + Date.now(),
        debug: env
      });
    }
    
    // Get the messages
    const messages = body.messages || [];
    if (messages.length === 0) {
      return NextResponse.json({
        response: "Send me a message to get started!",
        conversationId: "test-" + Date.now(),
        debug: env
      });
    }
    
    const lastMessage = messages[messages.length - 1];
    console.log('Processing message:', lastMessage.content);
    
    // Try OpenAI API
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      
      // Validate API key format
      if (!apiKey.startsWith('sk-')) {
        return NextResponse.json({
          response: "⚠️ OpenAI API key format is invalid. It should start with 'sk-'. Please check your environment variables.",
          conversationId: body.conversationId || "test-" + Date.now(),
          debug: { keyStart: apiKey.substring(0, 3), keyLength: apiKey.length }
        });
      }
      
      console.log('Calling OpenAI API...');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { 
              role: 'system', 
              content: 'You are KimbleAI V4, a helpful AI assistant. Keep responses concise and helpful.' 
            },
            { 
              role: 'user', 
              content: lastMessage.content 
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });
      
      console.log('OpenAI Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        
        // Parse specific error types
        if (response.status === 401) {
          return NextResponse.json({
            response: "❌ OpenAI API key is invalid. Please check your API key in Vercel environment variables.",
            conversationId: body.conversationId || "test-" + Date.now(),
            error: "Invalid API key"
          });
        } else if (response.status === 429) {
          return NextResponse.json({
            response: "⚠️ OpenAI rate limit exceeded or quota exhausted. Please check your OpenAI account.",
            conversationId: body.conversationId || "test-" + Date.now(),
            error: "Rate limit"
          });
        } else {
          return NextResponse.json({
            response: `OpenAI API error (${response.status}). Please check the console for details.`,
            conversationId: body.conversationId || "test-" + Date.now(),
            error: errorText.substring(0, 200)
          });
        }
      }
      
      const data = await response.json();
      console.log('OpenAI response received');
      
      if (!data.choices || data.choices.length === 0) {
        return NextResponse.json({
          response: "No response from OpenAI. Please try again.",
          conversationId: body.conversationId || "test-" + Date.now()
        });
      }
      
      // Success!
      return NextResponse.json({
        response: data.choices[0].message.content,
        conversationId: body.conversationId || "conv-" + Date.now(),
        projectId: body.projectId,
        metadata: {
          model: data.model,
          usage: data.usage,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error: any) {
      console.error('OpenAI call error:', error);
      return NextResponse.json({
        response: `Error connecting to OpenAI: ${error.message}. Please check your internet connection and API key.`,
        conversationId: body.conversationId || "test-" + Date.now(),
        error: error.message
      });
    }
    
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json({
      response: `Server error: ${error.message}. Please try again.`,
      conversationId: "error-" + Date.now(),
      error: error.message
    });
  }
}

// GET endpoint for testing
export async function GET() {
  const env = checkEnvironment();
  
  return NextResponse.json({
    status: '🟢 Chat API is running',
    environment: env,
    message: env.hasOpenAIKey 
      ? '✅ OpenAI key is configured' 
      : '❌ OpenAI key is missing',
    instructions: !env.hasOpenAIKey 
      ? 'Add OPENAI_API_KEY to Vercel environment variables'
      : 'API is ready to use'
  });
}