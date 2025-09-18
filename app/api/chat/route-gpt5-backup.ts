import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ProjectStateLogger } from '@/lib/project-logger';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// GPT-5 Model Selection Intelligence
function selectOptimalModel(messages: any[]): { 
  model: string; 
  reasoning: string;
  verbosity: 'low' | 'medium' | 'high';
  reasoning_effort: 'minimal' | 'medium' | 'high';
} {
  const lastMessage = messages[messages.length - 1]?.content || '';
  const messageLength = lastMessage.length;
  const conversationLength = messages.length;
  
  // For now, default to GPT-4o-mini until we verify GPT-5 access
  // This ensures the app works immediately
  return { 
    model: 'gpt-4o-mini', 
    reasoning: 'Using stable fallback model',
    verbosity: 'medium',
    reasoning_effort: 'minimal'
  };
}

// Generate embedding for semantic search
async function generateEmbedding(text: string): Promise<number[] | null> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000)
      })
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  console.log('Chat API called');
  console.log('API Key exists:', !!OPENAI_KEY);
  console.log('API Key starts with:', OPENAI_KEY?.substring(0, 20));
  
  // LOG API CALL
  await ProjectStateLogger.logApiCall('/api/chat', !!OPENAI_KEY, {
    hasSupabase: !!supabase,
    timestamp: new Date().toISOString()
  });
  
  if (!OPENAI_KEY) {
    console.error('No OpenAI API key configured');
    return NextResponse.json({
      response: "OpenAI API key not configured. Please check your environment variables.",
      error: true
    });
  }
  
  try {
    const body = await request.json();
    const { 
      messages = [], 
      userId = 'default', 
      conversationId = 'conv_' + Date.now(),
      projectId = '',
      tags = []
    } = body;
    
    console.log('Request received:', {
      messageCount: messages.length,
      userId,
      conversationId
    });
    
    if (messages.length === 0) {
      return NextResponse.json({
        response: "Hello! I'm KimbleAI. How can I assist you today?",
        conversationId
      });
    }
    
    const userMessage = messages[messages.length - 1];
    
    // Build system prompt
    const systemPrompt = `You are KimbleAI, a helpful assistant with persistent memory for the Kimble family.
Remember and build upon previous conversations.
Current user: ${userId}`;
    
    // Build context messages
    const contextMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];
    
    // For now, use GPT-4o-mini which we know works
    const model = 'gpt-4o-mini';
    
    console.log(`Using model: ${model}`);
    
    // Call OpenAI with simple, working parameters
    let assistantResponse = '';
    
    try {
      const requestBody = {
        model: model,
        messages: contextMessages,
        max_tokens: 1000,
        temperature: 0.7
      };
      
      console.log('Calling OpenAI API...');
      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('OpenAI Response Status:', openaiResponse.status);
      console.log('OpenAI Response OK:', openaiResponse.ok);
      
      const responseText = await openaiResponse.text();
      console.log('Raw response:', responseText.substring(0, 500));
      
      if (!openaiResponse.ok) {
        console.error(`OpenAI API Error: ${openaiResponse.status}`);
        console.error('Error response:', responseText);
        throw new Error(`OpenAI API failed: ${openaiResponse.status} - ${responseText}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError);
        console.error('Response text:', responseText);
        throw new Error('Invalid JSON response from OpenAI');
      }
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Unexpected response structure:', data);
        throw new Error('Invalid response structure from OpenAI');
      }
      
      assistantResponse = data.choices[0].message.content;
      console.log('Assistant response received:', assistantResponse.substring(0, 100));
      
    } catch (apiError: any) {
      console.error('OpenAI API call failed:', apiError);
      console.error('Error details:', {
        message: apiError.message,
        stack: apiError.stack
      });
      
      // Return a user-friendly error message
      return NextResponse.json({
        response: "I'm having trouble connecting to the AI service. Please try again in a moment.",
        error: true,
        details: apiError.message
      });
    }
    
    // Save to Supabase if available
    if (supabase && assistantResponse) {
      try {
        console.log('Saving to Supabase...');
        // Save logic here (simplified for now)
      } catch (dbError) {
        console.log('Supabase save failed (non-critical):', dbError);
      }
    }
    
    console.log('Returning successful response');
    
    return NextResponse.json({
      response: assistantResponse,
      conversationId,
      model: model
    });
    
  } catch (error: any) {
    console.error('Chat API error:', error);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json({
      response: "Sorry, I encountered an error. Please check the console for details.",
      error: true,
      details: error.message
    });
  }
}

// GET endpoint for testing
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'ready',
    apiKeyConfigured: !!process.env.OPENAI_API_KEY,
    apiKeyStart: process.env.OPENAI_API_KEY?.substring(0, 20),
    supabaseConfigured: !!supabase,
    timestamp: new Date().toISOString()
  });
}