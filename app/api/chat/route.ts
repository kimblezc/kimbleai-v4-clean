import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role for full access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })
  : null;

// Types
interface Memory {
  content: string;
  similarity: number;
  source_type: string;
  metadata: any;
}

interface UserData {
  id: string;
  name: string;
  email: string;
}

// GET endpoint to check status
export async function GET(request: NextRequest) {
  // Test vector search availability
  let vectorSearchWorking = false;
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('match_messages', {
        query_embedding: new Array(1536).fill(0),
        match_threshold: 0.5,
        match_count: 1,
        user_id: '00000000-0000-0000-0000-000000000000'
      });
      vectorSearchWorking = !error;
    } catch (e) {
      vectorSearchWorking = false;
    }
  }

  return NextResponse.json({
    status: "ready",
    apiKeyConfigured: !!process.env.OPENAI_API_KEY,
    supabaseConfigured: !!supabase,
    vectorSearchEnabled: vectorSearchWorking,
    timestamp: new Date().toISOString()
  });
}

// Generate embedding using OpenAI
async function generateEmbedding(text: string): Promise<number[] | null> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_KEY) return null;
  
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000) // Limit to 8000 chars for embedding
      })
    });
    
    if (!response.ok) {
      console.error('Embedding API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    return null;
  }
}

// Extract important facts from conversation
async function extractMemoryChunks(
  content: string, 
  role: string,
  userId: string
): Promise<Array<{content: string, type: string, importance: number}>> {
  const chunks = [];
  
  // Extract patterns for facts, preferences, decisions
  const patterns = [
    { regex: /my (?:favorite|favourite) (\w+) is ([^.!?]+)/gi, type: 'preference', importance: 0.8 },
    { regex: /i (?:have|own) (?:a|an) ([^.!?]+)/gi, type: 'fact', importance: 0.7 },
    { regex: /my (\w+)'s name is ([^.!?]+)/gi, type: 'fact', importance: 0.9 },
    { regex: /i (?:work|live|study) (?:at|in) ([^.!?]+)/gi, type: 'fact', importance: 0.8 },
    { regex: /i (?:like|love|enjoy|hate|dislike) ([^.!?]+)/gi, type: 'preference', importance: 0.6 },
    { regex: /(?:remember|don't forget) (?:that )?([^.!?]+)/gi, type: 'fact', importance: 0.9 },
    { regex: /(?:decided|agreed|choosing) (?:to|on) ([^.!?]+)/gi, type: 'decision', importance: 0.8 }
  ];
  
  if (role === 'user') {
    for (const pattern of patterns) {
      let match;
      const regex = new RegExp(pattern.regex);
      while ((match = regex.exec(content)) !== null) {
        chunks.push({
          content: match[0],
          type: pattern.type,
          importance: pattern.importance
        });
      }
    }
  }
  
  // Always save important assistant responses as context
  if (role === 'assistant' && content.length > 100) {
    chunks.push({
      content: content.substring(0, 500),
      type: 'summary',
      importance: 0.5
    });
  }
  
  return chunks;
}

// Main chat endpoint with full vector search
export async function POST(request: NextRequest) {
  try {
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_KEY) {
      return NextResponse.json({
        response: "OpenAI API key not configured. Please set OPENAI_API_KEY.",
        error: true
      });
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      messages = [], 
      userId = 'zach',
      conversationId = 'conv_' + Date.now(),
      project = 'general',
      tags = []
    } = body;
    
    // Return greeting if no messages
    if (messages.length === 0) {
      return NextResponse.json({
        response: "Hello! I'm KimbleAI with full vector search memory. I'll remember everything across all our conversations. How can I help?",
        conversationId,
        vectorSearchEnabled: true
      });
    }
    
    // Get the last user message
    const userMessage = messages[messages.length - 1];
    if (!userMessage?.content) {
      return NextResponse.json({
        response: "Please provide a message.",
        error: true
      });
    }
    
  // Initialize context variables
  let relevantContext: Memory[] = [];
    let vectorSearchUsed = false;
    let memoriesFound = 0;
    let dbUser: UserData | null = null;
    
    // Get or create user in database
    if (supabase) {
      try {
        const userName = userId === 'rebecca' ? 'Rebecca' : 'Zach';
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('name', userName)
          .single();
        
        if (userData) {
          dbUser = userData;
        } else {
          // Create user if doesn't exist
          const { data: newUser } = await supabase
            .from('users')
            .insert({ 
              name: userName, 
              email: `${userName.toLowerCase()}@kimbleai.com` 
            })
            .select()
            .single();
          
          if (newUser) dbUser = newUser;
        }
      } catch (error) {
        console.error('User lookup error:', error);
      }
    }
    
    // VECTOR SEARCH FOR RELEVANT CONTEXT
    if (supabase && dbUser && userMessage.content) {
      try {
        console.log('Performing vector search for relevant context...');
        
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(userMessage.content);
        
        if (queryEmbedding) {
          // Search using the combined context function
          const { data: contexts, error } = await supabase.rpc('get_relevant_context', {
            query_embedding: queryEmbedding,
            user_id: dbUser.id,
            max_messages: 15,
            max_memories: 10,
            threshold: 0.65
          });
          
          if (!error && contexts && contexts.length > 0) {
            relevantContext = contexts;
            vectorSearchUsed = true;
            memoriesFound = contexts.length;
            console.log(`Vector search found ${memoriesFound} relevant contexts`);
          } else if (error) {
            console.error('Vector search error:', error);
            
            // Fallback to recent messages if vector search fails
            const { data: recentMessages } = await supabase
              .from('messages')
              .select('content, role, created_at, conversation_id')
              .eq('user_id', dbUser.id)
              .order('created_at', { ascending: false })
              .limit(20);
            
            if (recentMessages) {
              relevantContext = recentMessages.map(msg => ({
                source_type: 'message',
                content: msg.content,
                similarity: 0.5,
                metadata: {
                  role: msg.role,
                  conversation_id: msg.conversation_id,
                  created_at: msg.created_at
                }
              }));
              memoriesFound = recentMessages.length;
              console.log('Using fallback: loaded recent messages');
            }
          }
        }
      } catch (error) {
        console.error('Context retrieval error:', error);
      }
    }
    
    // Build context string for system prompt
    let contextString = '';
    if (relevantContext.length > 0) {
      // Group by source type
  const messages = relevantContext.filter((c: Memory) => c.source_type === 'message');
  const memories = relevantContext.filter((c: Memory) => c.source_type === 'memory');
      
      if (messages.length > 0) {
        contextString += '\n\nRELEVANT CONVERSATION HISTORY:\n';
        messages.forEach(msg => {
          const role = msg.metadata.role === 'user' ? dbUser?.name : 'You';
          const similarity = (msg.similarity * 100).toFixed(0);
          contextString += `[${similarity}% relevant] ${role}: ${msg.content}\n`;
        });
      }
      
      if (memories.length > 0) {
        contextString += '\n\nIMPORTANT MEMORIES:\n';
        memories.forEach(mem => {
          const importance = (mem.metadata.importance * 100).toFixed(0);
          contextString += `[${mem.metadata.type}, ${importance}% important] ${mem.content}\n`;
        });
      }
    }
    
    // Build enhanced system prompt
    const systemPrompt = `You are KimbleAI, an advanced AI assistant with perfect vector-based memory for the Kimble family.

CURRENT CONTEXT:
- User: ${dbUser?.name || userId}
- Time: ${new Date().toLocaleString()}
- Project: ${project}
- Tags: ${tags.join(', ') || 'none'}
- Vector Search: ${vectorSearchUsed ? 'Active' : 'Inactive'}

${contextString || 'No relevant context found.'}

INSTRUCTIONS:
1. Use ALL relevant context from above to inform your responses
2. Reference specific past conversations when relevant
3. Maintain consistency with previously discussed facts
4. If asked about something from the past, check the context first
5. Build on previous discussions naturally

Remember: You have access to vector similarity search across ALL conversations, not just the current one.`;
    
    // Build messages for OpenAI
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];
    
    // Call OpenAI for response
    console.log('Calling OpenAI with context...');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: apiMessages,
        max_tokens: 1000,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    });
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI error:', errorText);
      return NextResponse.json({
        response: "AI service error. Please check your API key.",
        error: true
      });
    }
    
    const aiData = await openaiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content || "No response generated";
    
    // SAVE EVERYTHING TO DATABASE WITH EMBEDDINGS
    let saved = false;
    let memoriesExtracted = 0;
    
    if (supabase && dbUser) {
      try {
        // Save or update conversation
        await supabase.from('conversations').upsert({
          id: conversationId,
          user_id: dbUser.id,
          title: userMessage.content.substring(0, 100),
          project: project,
          tags: tags,
          updated_at: new Date().toISOString()
        });
        
        // Save user message with embedding
        const userEmbedding = await generateEmbedding(userMessage.content);
        if (userEmbedding) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            user_id: dbUser.id,
            role: 'user',
            content: userMessage.content,
            embedding: userEmbedding,
            metadata: { project, tags },
            created_at: new Date().toISOString()
          });
        }
        
        // Extract and save memory chunks from user message
        const userChunks = await extractMemoryChunks(
          userMessage.content, 
          'user', 
          dbUser.name
        );
        
        for (const chunk of userChunks) {
          const chunkEmbedding = await generateEmbedding(chunk.content);
          if (chunkEmbedding) {
            await supabase.from('memory_chunks').insert({
              user_id: dbUser.id,
              conversation_id: conversationId,
              content: chunk.content,
              chunk_type: chunk.type,
              embedding: chunkEmbedding,
              importance: chunk.importance,
              metadata: { project, tags, source: 'user_message' }
            });
            memoriesExtracted++;
          }
        }
        
        // Save assistant response with embedding
        const assistantEmbedding = await generateEmbedding(aiMessage);
        if (assistantEmbedding) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            user_id: dbUser.id,
            role: 'assistant',
            content: aiMessage,
            embedding: assistantEmbedding,
            metadata: { project, tags },
            created_at: new Date().toISOString()
          });
        }
        
        // Extract and save memory chunks from assistant response
        const assistantChunks = await extractMemoryChunks(
          aiMessage,
          'assistant',
          dbUser.name
        );
        
        for (const chunk of assistantChunks) {
          const chunkEmbedding = await generateEmbedding(chunk.content);
          if (chunkEmbedding) {
            await supabase.from('memory_chunks').insert({
              user_id: dbUser.id,
              conversation_id: conversationId,
              content: chunk.content,
              chunk_type: chunk.type,
              embedding: chunkEmbedding,
              importance: chunk.importance,
              metadata: { project, tags, source: 'assistant_response' }
            });
            memoriesExtracted++;
          }
        }
        
        saved = true;
        console.log(`Saved messages and extracted ${memoriesExtracted} memory chunks`);
      } catch (error) {
        console.error('Database save error:', error);
      }
    }
    
    // Return response with full metadata
    return NextResponse.json({
      response: aiMessage,
      conversationId,
      saved,
      vectorSearchUsed,
      contextsFound: memoriesFound,
      memoriesExtracted,
      user: dbUser?.name || userId,
      project,
      tags
    });
    
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({
      response: "An unexpected error occurred. Please try again.",
      error: true,
      details: error.message
    });
  }
}
