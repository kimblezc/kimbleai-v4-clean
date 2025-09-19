import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// GET endpoint to check status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "ready",
    apiKeyConfigured: !!process.env.OPENAI_API_KEY,
    supabaseConfigured: !!supabase,
    timestamp: new Date().toISOString()
  });
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

// POST endpoint for chat with memory
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
    
    const { 
      messages = [], 
      userId = 'zach',
      conversationId = 'conv_' + Date.now()
    } = body;
    
    // Return greeting if no messages
    if (messages.length === 0) {
      return NextResponse.json({
        response: "Hello! I'm KimbleAI. How can I help you today?",
        conversationId
      });
    }
    
    // Get the last user message
    const userMessage = messages[messages.length - 1];
    
    // SEARCH FOR RELEVANT MEMORIES
    let memoryContext = '';
    let memoryWorking = false;
    
    if (supabase && userMessage.content) {
      try {
        console.log('Searching for memories...');
        
        // Generate embedding for the user's message
        const searchEmbedding = await generateEmbedding(userMessage.content);
        
        if (searchEmbedding) {
          // Get user ID from database
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
            .single();
          
          if (userData) {
            // Search for similar messages using the RPC function
            const { data: memories, error } = await supabase.rpc('search_similar_messages', {
              query_embedding: searchEmbedding,
              match_threshold: 0.7,
              match_count: 5,
              user_id: userData.id
            });
            
            if (!error && memories && memories.length > 0) {
              memoryContext = '\n\nRelevant memories from past conversations:\n';
              memories.forEach((mem: any) => {
                memoryContext += `- ${mem.content}\n`;
              });
              memoryWorking = true;
              console.log(`Found ${memories.length} relevant memories`);
            }
          }
        }
      } catch (memError) {
        console.error('Memory search error:', memError);
        // Continue without memories if search fails
      }
    }
    
    // Build system prompt with memories
    const systemPrompt = `You are KimbleAI, a helpful assistant with persistent memory for the Kimble family.
    
${memoryWorking ? 'You have access to these memories from past conversations:' + memoryContext : ''}

Current user: ${userId === 'rebecca' ? 'Rebecca' : 'Zach'}
Remember and reference past conversations when relevant.`;
    
    // Build messages for OpenAI
    const apiMessages = [
      { 
        role: 'system', 
        content: systemPrompt
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
    
    // SAVE CONVERSATION TO DATABASE
    if (supabase) {
      try {
        // Get or create user
        let dbUserId = null;
        const userName = userId === 'rebecca' ? 'Rebecca' : 'Zach';
        
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('name', userName)
          .single();
        
        if (existingUser) {
          dbUserId = existingUser.id;
        } else {
          // Create user if doesn't exist
          const { data: newUser } = await supabase
            .from('users')
            .insert({ name: userName, email: `${userName.toLowerCase()}@kimbleai.com` })
            .select('id')
            .single();
          
          dbUserId = newUser?.id;
        }
        
        if (dbUserId) {
          // Save conversation
          await supabase.from('conversations').upsert({
            id: conversationId,
            user_id: dbUserId,
            title: userMessage.content.substring(0, 50),
            updated_at: new Date().toISOString()
          });
          
          // Save user message with embedding
          const userEmbedding = await generateEmbedding(userMessage.content);
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            user_id: dbUserId,
            role: 'user',
            content: userMessage.content,
            embedding: userEmbedding,
            created_at: new Date().toISOString()
          });
          
          // Save assistant response with embedding
          const assistantEmbedding = await generateEmbedding(aiMessage);
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            user_id: dbUserId,
            role: 'assistant',
            content: aiMessage,
            embedding: assistantEmbedding,
            created_at: new Date().toISOString()
          });
          
          console.log('Conversation saved to database');
        }
      } catch (dbError) {
        console.error('Database save error:', dbError);
        // Continue even if save fails
      }
    }
    
    // Return successful response with memory status
    return NextResponse.json({
      response: aiMessage,
      conversationId,
      saved: !!supabase,
      memoryActive: memoryWorking,
      memoriesFound: memoryWorking ? memoryContext.split('\n').length - 3 : 0
    });
    
  } catch (error: any) {
    console.error('Chat API error:', error.message);
    return NextResponse.json({
      response: "An error occurred. Please try again.",
      error: true
    });
  }
}