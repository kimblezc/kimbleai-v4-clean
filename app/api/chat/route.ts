import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

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
  
  if (!OPENAI_KEY) {
    return NextResponse.json({
      response: "OpenAI API key not configured.",
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
    
    if (messages.length === 0) {
      return NextResponse.json({
        response: "Hello! I'm KimbleAI. How can I assist you today?",
        conversationId
      });
    }
    
    const userMessage = messages[messages.length - 1];
    
    // SEARCH PERSISTENT MEMORY
    let memoryContext = '';
    if (supabase && userMessage.content) {
      // Generate embedding for the user's message
      const searchEmbedding = await generateEmbedding(userMessage.content);
      
      if (searchEmbedding) {
        // Search for relevant memories
        const { data: memories } = await supabase.rpc('search_similar_messages', {
          query_embedding: searchEmbedding,
          match_threshold: 0.7,
          match_count: 5,
          user_id: userId === 'zach' ? 
            (await supabase.from('users').select('id').eq('name', 'Zach').single()).data?.id :
            (await supabase.from('users').select('id').eq('name', 'Rebecca').single()).data?.id
        });
        
        if (memories && memories.length > 0) {
          memoryContext = '\n\nRelevant memories from past conversations:\n';
          memories.forEach((mem: any) => {
            memoryContext += `- ${mem.content} (${mem.content_type})\n`;
          });
        }
      }
    }
    
    // Build system prompt with memory context
    const systemPrompt = `You are KimbleAI, a helpful assistant with persistent memory for the Kimble family.
    
IMPORTANT: You have access to the user's conversation history and stored memories.
${memoryContext}

When asked "what do you know about me" or similar questions, reference the memories above.
Remember and build upon previous conversations.

Current user: ${userId}
Current project: ${projectId || 'None'}
Current tags: ${tags.join(', ') || 'None'}`;
    
    // Build context messages
    const contextMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];
    
    // Save user message to Supabase
    if (supabase) {
      try {
        // Get user ID from database
        let dbUserId = null;
        if (userId !== 'default') {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('name', userId === 'zach' ? 'Zach' : 'Rebecca')
            .single();
          
          dbUserId = userData?.id;
        }
        
        // Save conversation if new
        if (conversationId) {
          await supabase.from('conversations').upsert({
            id: conversationId,
            user_id: dbUserId,
            project_id: projectId || null,
            tags: tags,
            title: messages[0]?.content?.substring(0, 50) || 'New Chat',
            updated_at: new Date().toISOString()
          });
        }
        
        // Save message with embedding
        const messageEmbedding = await generateEmbedding(userMessage.content);
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          user_id: dbUserId,
          role: userMessage.role,
          content: userMessage.content,
          embedding: messageEmbedding,
          created_at: new Date().toISOString()
        });
        
        // TRIGGER ZAPIER MEMORY EXTRACTION
        if (process.env.ZAPIER_MEMORY_WEBHOOK_URL) {
          fetch(process.env.ZAPIER_MEMORY_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId,
              userId: dbUserId,
              messages: messages.slice(-5), // Last 5 messages for context
              timestamp: new Date().toISOString()
            })
          }).catch(console.error); // Fire and forget
        }
        
        // TRIGGER ZAPIER AUTO-ORGANIZATION (if 3+ messages)
        if (messages.length >= 3 && process.env.ZAPIER_ORGANIZE_WEBHOOK_URL) {
          fetch(process.env.ZAPIER_ORGANIZE_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId,
              userId: dbUserId,
              messageCount: messages.length,
              conversationSummary: messages.map((m: any) => m.content).join(' ').substring(0, 500)
            })
          }).catch(console.error); // Fire and forget
        }
      } catch (dbError) {
        console.log('Database operation failed:', dbError);
      }
    }
    
    // Call OpenAI with memory context
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: contextMessages,
        max_tokens: 800,
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
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('name', userId === 'zach' ? 'Zach' : 'Rebecca')
          .single();
        
        const responseEmbedding = await generateEmbedding(assistantResponse);
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          user_id: userData?.id,
          role: 'assistant',
          content: assistantResponse,
          embedding: responseEmbedding,
          created_at: new Date().toISOString()
        });
      } catch (dbError) {
        console.log('Failed to save assistant response:', dbError);
      }
    }
    
    return NextResponse.json({
      response: assistantResponse,
      conversationId,
      saved: !!supabase,
      memoryActive: !!memoryContext,
      zapierTriggered: !!(process.env.ZAPIER_MEMORY_WEBHOOK_URL)
    });
    
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({
      response: "Sorry, I encountered an error. Please try again.",
      error: true
    });
  }
}

// GET endpoint to load conversations with projects and tags
export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({
      error: "Database not configured"
    }, { status: 503 });
  }
  
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');
  const userId = searchParams.get('userId');
  
  try {
    if (!conversationId) {
      // Load all conversations with projects and tags
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
        .single();
      
      const { data: conversations } = await supabase
        .from('conversations')
        .select(`
          *,
          projects (
            name,
            color,
            icon
          )
        `)
        .eq('user_id', userData?.id)
        .order('updated_at', { ascending: false })
        .limit(20);
      
      return NextResponse.json({ conversations });
    }
    
    // Load specific conversation messages
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    return NextResponse.json({ messages });
    
  } catch (error) {
    console.error('GET endpoint error:', error);
    return NextResponse.json({
      error: "Failed to load data"
    }, { status: 500 });
  }
}