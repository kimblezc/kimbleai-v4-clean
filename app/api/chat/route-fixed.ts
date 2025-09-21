import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000),
        dimensions: 1536
      })
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    return null;
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    supabase: !!supabase,
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    const { messages = [], userId = 'zach', conversationId = null } = await request.json();
    
    if (!messages.length) {
      return NextResponse.json({
        response: "Hi! I'm KimbleAI with full memory. How can I help?"
      });
    }
    
    const lastMessage = messages[messages.length - 1];
    
    // Get or create user
    const userName = userId === 'rebecca' ? 'Rebecca' : 'Zach';
    let { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userName)
      .single();
    
    if (!userData) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ 
          name: userName,
          email: `${userName.toLowerCase()}@kimbleai.com`
        })
        .select()
        .single();
      userData = newUser;
    }
    
    // Get relevant context - IMPROVED MEMORY RETRIEVAL
    let context = '';
    let memoryFound = false;
    
    // First, always check recent messages (last 30)
    if (userData) {
      const { data: recent, error: recentError } = await supabase
        .from('messages')
        .select('content, role, created_at')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(30);
      
      console.log('Recent messages found:', recent?.length || 0);
      
      if (recent && recent.length > 0) {
        context = 'Your conversation history:\n';
        recent.reverse().forEach(m => {
          const timeAgo = getTimeAgo(new Date(m.created_at));
          context += `${m.role === 'user' ? userName : 'Assistant'} (${timeAgo}): ${m.content}\n`;
        });
        memoryFound = true;
      }
    }
    
    // Then try vector search if we have embeddings
    const queryEmbedding = await generateEmbedding(lastMessage.content);
    
    if (queryEmbedding && userData && !memoryFound) {
      const { data: memories, error: vectorError } = await supabase
        .rpc('search_messages_simple', {
          query_embedding: queryEmbedding,
          user_id_param: userData.id,
          limit_count: 15
        });
      
      console.log('Vector search results:', memories?.length || 0);
      
      if (memories && memories.length > 0) {
        context = 'Relevant past conversations:\n';
        memories.forEach((m: any) => {
          context += `${m.role === 'user' ? userName : 'Assistant'}: ${m.content}\n`;
        });
        memoryFound = true;
      }
    }
    
    // Build system prompt with context
    const systemPrompt = `You are KimbleAI, a helpful family AI assistant with persistent memory.
Current user: ${userName}
Time: ${new Date().toLocaleString()}

${context}

Instructions: ${context ? 'Use the conversation history above to provide personalized, contextual responses. Reference specific details from past conversations when relevant.' : 'This is the start of your conversation with ' + userName + '. Remember everything they tell you for future conversations.'}`;
    
    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!openaiResponse.ok) {
      throw new Error('OpenAI API error');
    }
    
    const aiData = await openaiResponse.json();
    const response = aiData.choices[0].message.content;
    
    // Save conversation - Use existing or create new
    const convId = conversationId || `conv_${Date.now()}`;
    
    if (userData) {
      // Create conversation if new
      if (!conversationId) {
        await supabase.from('conversations').insert({
          id: convId,
          user_id: userData.id,
          title: lastMessage.content.substring(0, 100)
        });
      }
      
      // Save messages with embeddings
      const userEmbedding = await generateEmbedding(lastMessage.content);
      await supabase.from('messages').insert({
        conversation_id: convId,
        user_id: userData.id,
        role: 'user',
        content: lastMessage.content,
        embedding: userEmbedding
      });
      
      const assistantEmbedding = await generateEmbedding(response);
      await supabase.from('messages').insert({
        conversation_id: convId,
        user_id: userData.id,
        role: 'assistant',
        content: response,
        embedding: assistantEmbedding
      });
    }
    
    // Trigger Zapier if configured
    if (process.env.ZAPIER_WEBHOOK_URL) {
      fetch(process.env.ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: lastMessage.content,
          response: response,
          userId: userName,
          timestamp: new Date().toISOString(),
          memoryActive: memoryFound
        })
      }).catch(console.error);
    }
    
    return NextResponse.json({
      response,
      saved: true,
      memoryActive: memoryFound,
      contextsFound: context ? context.split('\n').length - 1 : 0,
      conversationId: convId,
      userId: userData?.id
    });
    
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({
      response: 'Sorry, an error occurred. Please try again.',
      error: true,
      details: error.message
    });
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
