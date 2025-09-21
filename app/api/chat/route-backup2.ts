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
    const { messages = [], userId = 'zach' } = await request.json();
    
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
    
    // Get relevant context with RAG
    let context = '';
    const queryEmbedding = await generateEmbedding(lastMessage.content);
    
    if (queryEmbedding && userData) {
      // Vector search
      const { data: memories } = await supabase
        .rpc('search_messages_simple', {
          query_embedding: queryEmbedding,
          user_id_param: userData.id,
          limit_count: 15
        });
      
      if (memories && memories.length > 0) {
        context = 'Relevant past conversations:\n';
        memories.forEach((m: any) => {
          context += `${m.role === 'user' ? userName : 'Assistant'}: ${m.content}\n`;
        });
      }
    }
    
    // Fallback to recent messages
    if (!context && userData) {
      const { data: recent } = await supabase
        .from('messages')
        .select('content, role')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (recent && recent.length > 0) {
        context = 'Recent conversations:\n';
        recent.reverse().forEach(m => {
          context += `${m.role === 'user' ? userName : 'Assistant'}: ${m.content}\n`;
        });
      }
    }
    
    // Build system prompt with RAG context
    const systemPrompt = `You are KimbleAI, a helpful family AI assistant with persistent memory.
Current user: ${userName}
Time: ${new Date().toLocaleString()}

${context}

Instructions: Use the conversation history above to provide personalized, contextual responses. Remember details about the family.`;
    
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
    
    // Save conversation
    const conversationId = `conv_${Date.now()}`;
    
    if (userData) {
      // Create conversation
      await supabase.from('conversations').insert({
        id: conversationId,
        user_id: userData.id,
        title: lastMessage.content.substring(0, 100)
      });
      
      // Save messages with embeddings
      const userEmbedding = await generateEmbedding(lastMessage.content);
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: userData.id,
        role: 'user',
        content: lastMessage.content,
        embedding: userEmbedding
      });
      
      const assistantEmbedding = await generateEmbedding(response);
      await supabase.from('messages').insert({
        conversation_id: conversationId,
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
        body: JSON.stringify({
          message: lastMessage.content,
          response: response,
          userId: userName,
          timestamp: new Date().toISOString()
        })
      }).catch(console.error);
    }
    
    return NextResponse.json({
      response,
      saved: true,
      memoryActive: !!context,
      contextsFound: context ? context.split('\n').length - 1 : 0
    });
    
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({
      response: 'Sorry, an error occurred. Please try again.',
      error: true
    });
  }
}
