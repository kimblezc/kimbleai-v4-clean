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
  
  // Complex coding tasks - need full GPT-5 with high reasoning
  if (
    lastMessage.match(/\b(debug|fix|implement|refactor|optimize|analyze code|write code|create app|build|deploy)\b/i) ||
    lastMessage.includes('```') || // Code blocks
    lastMessage.match(/\b(function|class|const|let|var|def|import|export)\b/) // Programming keywords
  ) {
    return { 
      model: 'gpt-5', 
      reasoning: 'Complex coding task detected',
      verbosity: 'high', // Comprehensive code with comments
      reasoning_effort: 'high' // Deep reasoning for code logic
    };
  }
  
  // Complex analysis - need full GPT-5 with medium verbosity
  if (
    lastMessage.match(/\b(analyze|compare|evaluate|assess|investigate|research|deep dive|comprehensive|detailed analysis)\b/i) ||
    lastMessage.match(/\b(explain in detail|walk me through|step by step|how does.*work)\b/i) ||
    messageLength > 500 // Long, complex queries
  ) {
    return { 
      model: 'gpt-5', 
      reasoning: 'Complex reasoning required',
      verbosity: 'medium', // Balanced detail
      reasoning_effort: 'medium' // Standard reasoning depth
    };
  }
  
  // Health or legal questions - use full GPT-5 for accuracy
  if (
    lastMessage.match(/\b(medical|health|symptom|diagnosis|treatment|legal|lawsuit|contract|agreement)\b/i)
  ) {
    return { 
      model: 'gpt-5', 
      reasoning: 'Health/legal accuracy needed',
      verbosity: 'high', // Detailed explanations
      reasoning_effort: 'high' // Maximum accuracy
    };
  }
  
  // Simple greetings or very short queries - GPT-5-nano is sufficient
  if (
    messageLength < 50 ||
    lastMessage.match(/^(hi|hello|hey|thanks|thank you|bye|goodbye|yes|no|ok|okay)\.?$/i) ||
    lastMessage.match(/^(what time|what date|what day|how are you)/i)
  ) {
    return { 
      model: 'gpt-5-nano', 
      reasoning: 'Simple query - nano model sufficient',
      verbosity: 'low', // Concise response
      reasoning_effort: 'minimal' // Fast response
    };
  }
  
  // Memory queries - GPT-5-mini with medium settings
  if (
    lastMessage.match(/\b(what do you know about me|remember|recall|my preferences|what did i)\b/i)
  ) {
    return { 
      model: 'gpt-5-mini', 
      reasoning: 'Memory recall - mini model sufficient',
      verbosity: 'medium', // Standard detail
      reasoning_effort: 'minimal' // Quick recall
    };
  }
  
  // User wants quick response
  if (
    lastMessage.match(/\b(quick|brief|short|summarize|tldr|tl;dr)\b/i)
  ) {
    return { 
      model: 'gpt-5-mini', 
      reasoning: 'User wants brevity',
      verbosity: 'low', // Short response
      reasoning_effort: 'minimal' // Fast processing
    };
  }
  
  // User wants comprehensive response
  if (
    lastMessage.match(/\b(comprehensive|detailed|thorough|elaborate|extensive)\b/i)
  ) {
    return { 
      model: 'gpt-5', 
      reasoning: 'User wants detail',
      verbosity: 'high', // Extensive response
      reasoning_effort: 'high' // Deep thinking
    };
  }
  
  // Long conversations might need more context handling
  if (conversationLength > 10) {
    return { 
      model: 'gpt-5', 
      reasoning: 'Long conversation - better context handling needed',
      verbosity: 'medium',
      reasoning_effort: 'medium'
    };
  }
  
  // Default to GPT-5-mini for general conversation
  return { 
    model: 'gpt-5-mini', 
    reasoning: 'Standard conversation - balanced model',
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
      forceModel = null, // Allow manual override if needed
      forceVerbosity = null, // Allow manual verbosity override
      forceReasoning = null // Allow manual reasoning override
    } = body;
    
    if (messages.length === 0) {
      return NextResponse.json({
        response: "Hello! I'm KimbleAI powered by GPT-5. How can I assist you today?",
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
    const systemPrompt = `You are KimbleAI, a helpful assistant powered by GPT-5 with persistent memory for the Kimble family.
    
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
    
    // SELECT OPTIMAL MODEL AND PARAMETERS
    const modelConfig = selectOptimalModel(messages);
    const { 
      model, 
      reasoning, 
      verbosity,
      reasoning_effort 
    } = {
      model: forceModel || modelConfig.model,
      reasoning: modelConfig.reasoning,
      verbosity: forceVerbosity || modelConfig.verbosity,
      reasoning_effort: forceReasoning || modelConfig.reasoning_effort
    };
    
    console.log(`GPT-5 Configuration:
      Model: ${model}
      Reason: ${reasoning}
      Verbosity: ${verbosity}
      Reasoning Effort: ${reasoning_effort}`);
    
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
    
    // Call OpenAI with GPT-5 and proper parameters
    let assistantResponse = '';
    let actualModelUsed = model;
    let tokenUsage = {};
    
    try {
      // Build request body with GPT-5 specific parameters
      const requestBody: any = {
        model: model, // gpt-5, gpt-5-mini, or gpt-5-nano
        messages: contextMessages
      };

      // Use correct parameters based on model
      if (model.startsWith('gpt-5')) {
        // GPT-5 models: use max_completion_tokens, no temperature
        requestBody.max_completion_tokens = verbosity === 'high' ? 2000 : (verbosity === 'low' ? 500 : 1000);
        requestBody.verbosity = verbosity; // low, medium, high
        requestBody.reasoning_effort = reasoning_effort; // minimal, medium, high
        // GPT-5 only supports default temperature (1)
      } else {
        // Fallback models use max_tokens and support temperature
        requestBody.max_tokens = 1000;
        requestBody.temperature = 0.7;
      }

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.text();
        console.error(`OpenAI API Error: ${openaiResponse.status} - ${errorData}`);
        throw new Error(`Model ${model} failed: ${openaiResponse.status}`);
      }
      
      const data = await openaiResponse.json();
      assistantResponse = data.choices[0].message.content;
      tokenUsage = data.usage || {};
      
      // Log successful GPT-5 usage
      console.log(`GPT-5 Success:
        Model: ${data.model}
        Tokens: ${tokenUsage.total_tokens}
        Reasoning Tokens: ${tokenUsage.reasoning_tokens || 0}`);
      
    } catch (modelError: any) {
      console.log(`${model} failed, trying fallback cascade...`);
      
      // Intelligent fallback cascade
      const fallbackConfigs = [
        { 
          model: 'gpt-5-mini', 
          max_completion_tokens: 800,
          verbosity: 'medium', 
          reasoning_effort: 'minimal' 
        },
        { 
          model: 'gpt-5-nano', 
          max_completion_tokens: 500,
          verbosity: 'low', 
          reasoning_effort: 'minimal' 
        },
        { 
          model: 'gpt-4o-mini',
          max_tokens: 800 // Use max_tokens for non-GPT-5 models
        }
      ];
      
      for (const fallback of fallbackConfigs) {
        try {
          const fallbackBody: any = {
            model: fallback.model,
            messages: contextMessages
          };

          // Use correct parameters based on model type
          if (fallback.model.startsWith('gpt-5')) {
            // GPT-5: no temperature, use max_completion_tokens
            fallbackBody.max_completion_tokens = fallback.max_completion_tokens;
            fallbackBody.verbosity = fallback.verbosity;
            fallbackBody.reasoning_effort = fallback.reasoning_effort;
          } else {
            // GPT-4: supports temperature and max_tokens
            fallbackBody.max_tokens = fallback.max_tokens;
            fallbackBody.temperature = 0.7;
          }

          const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_KEY}`
            },
            body: JSON.stringify(fallbackBody)
          });
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            assistantResponse = fallbackData.choices[0].message.content;
            actualModelUsed = fallback.model;
            tokenUsage = fallbackData.usage || {};
            console.log(`Fallback to ${fallback.model} successful`);
            break;
          } else {
            const errorText = await fallbackResponse.text();
            console.error(`Fallback ${fallback.model} failed: ${errorText}`);
          }
        } catch (fallbackError) {
          console.log(`${fallback.model} also failed:`, fallbackError);
          continue;
        }
      }
      
      if (!assistantResponse) {
        throw new Error('All models failed - check API key access');
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
          created_at: new Date().toISOString(),
          metadata: {
            model: actualModelUsed,
            verbosity: verbosity,
            reasoning_effort: reasoning_effort,
            tokens: tokenUsage
          }
        });
      } catch (dbError) {
        console.log('Failed to save assistant response:', dbError);
      }
    }
    
    // Calculate cost estimate
    const inputTokens = tokenUsage.prompt_tokens || 0;
    const outputTokens = tokenUsage.completion_tokens || 0;
    let costEstimate = 0;
    
    if (actualModelUsed === 'gpt-5') {
      costEstimate = (inputTokens * 1.25 / 1000000) + (outputTokens * 10 / 1000000);
    } else if (actualModelUsed === 'gpt-5-mini') {
      costEstimate = (inputTokens * 0.25 / 1000000) + (outputTokens * 2 / 1000000);
    } else if (actualModelUsed === 'gpt-5-nano') {
      costEstimate = (inputTokens * 0.05 / 1000000) + (outputTokens * 0.40 / 1000000);
    } else if (actualModelUsed === 'gpt-4o-mini') {
      costEstimate = (inputTokens * 0.015 / 1000000) + (outputTokens * 0.06 / 1000000);
    }
    
    // LOG SUCCESS
    await ProjectStateLogger.logApiCall('/api/chat', true, {
      conversationId,
      messagesProcessed: messages.length,
      memoryActive: memoryWorking,
      zapierTriggered: !!(process.env.ZAPIER_MEMORY_WEBHOOK_URL),
      modelSelected: model,
      modelUsed: actualModelUsed,
      modelReasoning: reasoning,
      verbosity: verbosity,
      reasoning_effort: reasoning_effort,
      tokens: tokenUsage,
      estimatedCost: `$${costEstimate.toFixed(6)}`
    });
    
    return NextResponse.json({
      response: assistantResponse,
      conversationId,
      saved: !!supabase,
      memoryActive: !!memoryContext,
      zapierTriggered: !!(process.env.ZAPIER_MEMORY_WEBHOOK_URL),
      model: actualModelUsed,
      modelReasoning: reasoning,
      parameters: {
        verbosity: verbosity,
        reasoning_effort: reasoning_effort
      },
      usage: {
        ...tokenUsage,
        estimatedCost: `$${costEstimate.toFixed(6)}`
      }
    });
    
  } catch (error: any) {
    console.error('Chat API error:', error);
    
    // LOG ERROR
    await ProjectStateLogger.logApiCall('/api/chat', false, {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json({
      response: "Sorry, I encountered an error. Please check if your API key has GPT-5 access.",
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
      .select('role, content, created_at, metadata')
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