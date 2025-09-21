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

export async function POST(request: NextRequest) {
  try {
    const { messages = [], userId = 'zach', conversationId = null } = await request.json();
    
    if (!messages.length) {
      return NextResponse.json({
        response: "Hi! I'm KimbleAI with comprehensive memory. I remember everything from our conversations, your files, and documents."
      });
    }
    
    const lastMessage = messages[messages.length - 1];
    const userName = userId === 'rebecca' ? 'Rebecca' : 'Zach';
    
    // Get or create user - FIXED: use let instead of const
    let userData: any = null;
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, name')
      .eq('name', userName)
      .single();
    
    if (!existingUser) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ name: userName, email: `${userName.toLowerCase()}@kimbleai.com` })
        .select('id, name')
        .single();
      userData = newUser;
    } else {
      userData = existingUser;
    }
    
    // COMPREHENSIVE RAG RETRIEVAL
    const queryEmbedding = await generateEmbedding(lastMessage.content);
    let fullContext = '';
    let knowledgeItems: any[] = [];
    
    if (queryEmbedding && userData) {
      // Search ENTIRE knowledge base
      const { data: knowledgeResults } = await supabase
        .rpc('search_knowledge_base', {
          query_embedding: queryEmbedding,
          user_id_param: userData.id,
          limit_count: 30
        });
      
      if (knowledgeResults && knowledgeResults.length > 0) {
        // Group by source type
        const grouped = knowledgeResults.reduce((acc: any, item: any) => {
          if (!acc[item.source_type]) acc[item.source_type] = [];
          acc[item.source_type].push(item);
          return acc;
        }, {});
        
        // Build context from all sources
        if (grouped.conversation) {
          fullContext += '\n## Previous Conversations:\n';
          grouped.conversation.forEach((item: any) => {
            fullContext += `- ${item.content}\n`;
          });
        }
        
        if (grouped.file) {
          fullContext += '\n## From Your Files:\n';
          grouped.file.forEach((item: any) => {
            fullContext += `- [${item.title}]: ${item.content}\n`;
          });
        }
        
        if (grouped.manual) {
          fullContext += '\n## Your Notes:\n';
          grouped.manual.forEach((item: any) => {
            fullContext += `- ${item.title}: ${item.content}\n`;
          });
        }
        
        knowledgeItems = knowledgeResults;
      }
      
      // Get recent conversation
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('content, role')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (recentMessages && recentMessages.length > 0) {
        fullContext = '\n## Current Conversation:\n' + 
          recentMessages.reverse().map(m => 
            `${m.role === 'user' ? userName : 'AI'}: ${m.content}`
          ).join('\n') + fullContext;
      }
    }
    
    // Build system prompt
    const systemPrompt = `You are KimbleAI with COMPREHENSIVE MEMORY.
    
Current user: ${userName}
Current time: ${new Date().toLocaleString()}

YOUR KNOWLEDGE BASE:
${fullContext || 'No previous context found yet.'}

CAPABILITIES:
- You remember EVERYTHING from conversations, files, and documents
- You can reference specific documents by name
- You know user preferences, facts, appointments, and decisions
- You maintain context across all interactions

INSTRUCTIONS:
- Reference specific information from the knowledge base when relevant
- When asked "what do you know", provide specific examples
- Extract and remember all new information from this conversation`;
    
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
        max_tokens: 2000
      })
    });
    
    if (!openaiResponse.ok) throw new Error('OpenAI API error');
    
    const aiData = await openaiResponse.json();
    const response = aiData.choices[0].message.content;
    
    // Save conversation
    const convId = conversationId || `conv_${Date.now()}`;
    
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
    
    // Extract knowledge from conversation (simplified inline version)
    try {
      // Extract important facts/dates/preferences
      const extractPrompt = `Extract facts, preferences, and important information from:
User: ${lastMessage.content}
Assistant: ${response}

Return only the most important items as simple statements.`;
      
      const extractResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Extract facts and important information.' },
            { role: 'user', content: extractPrompt }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });
      
      if (extractResponse.ok) {
        const extractData = await extractResponse.json();
        const extracted = extractData.choices[0].message.content;
        
        // Store extracted knowledge
        if (extracted && extracted.length > 10) {
          const extractedEmbedding = await generateEmbedding(extracted);
          await supabase.from('knowledge_base').insert({
            user_id: userData.id,
            source_type: 'extracted',
            category: 'fact',
            title: 'Extracted from conversation',
            content: extracted,
            embedding: extractedEmbedding,
            importance: 0.7,
            tags: ['conversation', 'extracted']
          });
        }
      }
    } catch (extractError) {
      console.error('Knowledge extraction error:', extractError);
    }
    
    // Log to Zapier
    if (process.env.ZAPIER_WEBHOOK_URL) {
      fetch(process.env.ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'CONVERSATION_WITH_KNOWLEDGE',
          message: lastMessage.content,
          response: response,
          userId: userName,
          timestamp: new Date().toISOString(),
          knowledgeItemsFound: knowledgeItems.length,
          sourcesUsed: [...new Set(knowledgeItems.map((k: any) => k.source_type))]
        })
      }).catch(console.error);
    }
    
    return NextResponse.json({
      response,
      saved: true,
      memoryActive: true,
      knowledgeBase: {
        itemsFound: knowledgeItems.length,
        sources: [...new Set(knowledgeItems.map((k: any) => k.source_type))],
        categories: [...new Set(knowledgeItems.map((k: any) => k.category))]
      },
      conversationId: convId,
      userId: userData.id
    });
    
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({
      response: 'Error occurred. Please try again.',
      error: true,
      details: error.message
    });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    capabilities: [
      'conversation_memory',
      'file_indexing',
      'document_search',
      'knowledge_extraction',
      'comprehensive_rag'
    ],
    timestamp: new Date().toISOString()
  });
}