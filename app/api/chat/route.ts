import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ProjectStateLogger } from '@/lib/project-logger';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Intelligently select the appropriate model based on query complexity
function selectOptimalModel(messages: any[]): { model: string; reasoning: string } {
  const lastMessage = messages[messages.length - 1]?.content || '';
  const messageLength = lastMessage.length;
  const conversationLength = messages.length;
  
  // Complex coding tasks - need full GPT-4o
  if (
    lastMessage.match(/\b(debug|fix|implement|refactor|optimize|analyze code|write code|create app|build|deploy)\b/i) ||
    lastMessage.includes('```') || // Code blocks
    lastMessage.match(/\b(function|class|const|let|var|def|import|export)\b/) // Programming keywords
  ) {
    return { 
      model: 'gpt-4o', 
      reasoning: 'Complex coding task detected' 
    };
  }
  
  // Complex reasoning or analysis - need full GPT-4o
  if (
    lastMessage.match(/\b(analyze|compare|evaluate|assess|investigate|research|deep dive|comprehensive|detailed analysis)\b/i) ||
    lastMessage.match(/\b(explain in detail|walk me through|step by step|how does.*work)\b/i) ||
    messageLength > 500 // Long, complex queries
  ) {
    return { 
      model: 'gpt-4o', 
      reasoning: 'Complex reasoning required' 
    };
  }
  
  // Health or legal questions - use full GPT-4o for accuracy
  if (
    lastMessage.match(/\b(medical|health|symptom|diagnosis|treatment|legal|lawsuit|contract|agreement)\b/i)
  ) {
    return { 
      model: 'gpt-4o', 
      reasoning: 'Health/legal accuracy needed' 
    };
  }
  
  // Simple greetings or very short queries - GPT-4o-mini is sufficient
  if (
    messageLength < 50 ||
    lastMessage.match(/^(hi|hello|hey|thanks|thank you|bye|goodbye|yes|no|ok|okay)\.?$/i) ||
    lastMessage.match(/^(what time|what date|what day|how are you)/i)
  ) {
    return { 
      model: 'gpt-4o-mini', 
      reasoning: 'Simple query - mini model sufficient' 
    };
  }
  
  // Memory queries - GPT-4o-mini is fine
  if (
    lastMessage.match(/\b(what do you know about me|remember|recall|my preferences|what did i)\b/i)
  ) {
    return { 
      model: 'gpt-4o-mini', 
      reasoning: 'Memory recall - mini model sufficient' 
    };
  }
  
  // Long conversations might need more context handling
  if (conversationLength > 10) {
    return { 
      model: 'gpt-4o', 
      reasoning: 'Long conversation - better context handling needed' 
    };
  }
  
  // Default to GPT-4o-mini for general conversation
  return { 
    model: 'gpt-4o-mini', 
    reasoning: 'Standard conversation - balanced model' 
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
  
  // LOG API CALL
  await ProjectStateLogger.logApiCall('/api/chat', !!OPENAI_KEY, {
    hasSupabase: !!supabase,
    timestamp: new Date().toISOString()
  });
  
  if (!OPENAI_KEY) {
    await ProjectStateLogger.logFeatureStatus('OpenAI Integration', 'broken', 'No API key');
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
      tags = [],
      forceModel = null // Allow manual override if needed
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
    let memoryWorking = false;
    
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
          memoryWorking = true;
        }
      }
    }
    
    // LOG MEMORY STATUS
    await ProjectStateLogger.logFeatureStatus(
      'Persistent Memory', 
      memoryWorking ? 'working' : 'pending',
      { memoriesFound: memoryWorking ? memoryContext.length : 0 }
    );
    
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
    
    // SELECT OPTIMAL MODEL
    const { model, reasoning } = forceModel 
      ? { model: forceModel, reasoning: 'Manual override' }
      : selectOptimalModel(messages);
    
    console.log(`Model selected: ${model} - Reason: ${reasoning}`);
    
    // Save conversation metadata to Supabase
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
        
        await ProjectStateLogger.logFeatureStatus('Database Storage', 'working', {
          conversationId,
          messageStored: true
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
          
          await ProjectStateLogger.logZapierTrigger('memory_extraction', {
            conversationId,
            messageCount: messages.length
          });
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
          
          await ProjectStateLogger.logZapierTrigger('auto_organization', {
            conversationId,
            triggered: true
          });
        }
      } catch (dbError) {
        console.log('Database operation failed:', dbError);
        await ProjectStateLogger.logFeatureStatus('Database Storage', 'broken', dbError);
      }
    }
    
    // Call OpenAI with selected model
    let assistantResponse = '';
    let actualModelUsed = model;
    
    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: model,  // Dynamically selected model (gpt-4o or gpt-4o-mini)
          messages: contextMessages,
          max_tokens: model === 'gpt-4o' ? 1500 : 800,  // More tokens for complex tasks
          temperature: 0.7
        })
      });
      
      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.text();
        console.error(`OpenAI API Error: ${openaiResponse.status} - ${errorData}`);
        throw new Error(`Model ${model} failed: ${openaiResponse.status}`);
      }
      
      const data = await openaiResponse.json();
      assistantResponse = data.choices[0].message.content;
      
    } catch (modelError: any) {
      console.log(`${model} failed, trying fallback...`);
      
      // Fallback cascade: try gpt-4o-mini if gpt-4o fails
      const fallbackModel = 'gpt-4o-mini';
      
      try {
        const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_KEY}`
          },
          body: JSON.stringify({
            model: fallbackModel,
            messages: contextMessages,
            max_tokens: 800,
            temperature: 0.7
          })
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          assistantResponse = fallbackData.choices[0].message.content;
          actualModelUsed = fallbackModel;
          console.log(`Fallback to ${fallbackModel} successful`);
        } else {
          const errorText = await fallbackResponse.text();
          throw new Error(`Fallback failed: ${errorText}`);
        }
      } catch (fallbackError) {
        console.error('All models failed:', fallbackError);
        throw new Error('Unable to get response from OpenAI');
      }
    }
    
    // Save assistant response to Supabase
    if (supabase && assistantResponse) {
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
    
    // LOG SUCCESS
    await ProjectStateLogger.logApiCall('/api/chat', true, {
      conversationId,
      messagesProcessed: messages.length,
      memoryActive: memoryWorking,
      zapierTriggered: !!(process.env.ZAPIER_MEMORY_WEBHOOK_URL),
      modelSelected: model,
      modelUsed: actualModelUsed,
      modelReasoning: reasoning
    });
    
    return NextResponse.json({
      response: assistantResponse,
      conversationId,
      saved: !!supabase,
      memoryActive: !!memoryContext,
      zapierTriggered: !!(process.env.ZAPIER_MEMORY_WEBHOOK_URL),
      model: actualModelUsed,
      modelReasoning: reasoning
    });
    
  } catch (error: any) {
    console.error('Chat API error:', error);
    
    // LOG ERROR
    await ProjectStateLogger.logApiCall('/api/chat', false, {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json({
      response: "Sorry, I encountered an error. Please try again.",
      error: true,
      details: error.message
    });
  }
}

// GET endpoint to load conversations with projects and tags
export async function GET(req: NextRequest) {
  await ProjectStateLogger.logApiCall('/api/chat GET', !!supabase, {
    timestamp: new Date().toISOString()
  });
  
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
    
    await ProjectStateLogger.logApiCall('/api/chat GET', false, {
      error: error
    });
    
    return NextResponse.json({
      error: "Failed to load data"
    }, { status: 500 });
  }
}