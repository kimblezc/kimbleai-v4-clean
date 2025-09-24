import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { BackgroundIndexer } from '@/lib/background-indexer';
import { AutoReferenceButler } from '@/lib/auto-reference-butler';
import { ModelSelector, TaskContext } from '@/lib/model-selector';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation error:', error);
    return null;
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'OK',
    service: 'KimbleAI Chat API',
    version: '4.0',
    features: {
      rag: true,
      vectorSearch: true,
      knowledgeBase: true,
      fileUpload: true,
      crossConversationMemory: 'FIXED'
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    let requestData;
    try {
      requestData = await request.json();
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      return NextResponse.json({
        error: 'Invalid JSON in request body',
        details: 'Request body must be valid JSON'
      }, { status: 400 });
    }

    const { messages, userId = 'zach', conversationId = 'default' } = requestData;
    
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    const userMessage = lastMessage.content;

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (userError || !userData) {
      console.error('User fetch error:', userError);
      return NextResponse.json({ 
        error: 'User not found',
        details: userError?.message 
      }, { status: 404 });
    }

    // 🤖 AUTO-REFERENCE BUTLER: Automatically gather ALL relevant context
    console.log(`🤖 Digital Butler gathering context for user ${userData.id}...`);
    const butler = AutoReferenceButler.getInstance();
    const autoContext = await butler.gatherRelevantContext(
      userMessage,
      userData.id,
      conversationId,
      lastMessage.projectId // If user has a project context
    );

    // Also retrieve recent conversation history
    const { data: allUserMessages, error: messagesError } = await supabase
      .from('messages')
      .select('content, role, created_at, conversation_id')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (messagesError) {
      console.error('Messages retrieval error:', messagesError);
    }

    // Format auto-context for AI
    const formattedAutoContext = butler.formatContextForAI(autoContext);

    // Build comprehensive context with auto-referenced data
    const contextMessages = [
      {
        role: 'system',
        content: `You are KimbleAI, an advanced digital butler AI assistant with PERFECT MEMORY and AUTOMATIC DATA REFERENCING.

🤖 **AUTOMATIC CONTEXT RETRIEVAL ACTIVE**
You automatically reference ALL relevant data from:
- Google Drive files & documents
- Gmail messages & conversations
- Google Calendar events & meetings
- Previous chat conversations
- Uploaded files & knowledge base
- Project data & task information

**User**: ${userData.name} (${userData.email})
**Role**: ${userData.role} ${userData.role === 'admin' ? '(Full System Access)' : '(Standard User)'}

🔄 **AUTO-REFERENCED CONTEXT** (Confidence: ${Math.round(autoContext.confidence)}%):
${formattedAutoContext}

📝 **Recent Conversation History** (${allUserMessages?.length || 0} messages):
${allUserMessages ? allUserMessages.slice(0, 15).map(m =>
  `[${new Date(m.created_at).toLocaleDateString()}] ${m.role}: ${m.content.substring(0, 100)}...`
).join('\n') : 'No previous messages'}

⚡ **INSTRUCTIONS**:
- Always reference relevant data automatically without being asked
- Proactively mention related files, emails, calendar events, and past conversations
- Act as a knowledgeable digital butler who remembers everything
- Suggest relevant actions based on context (schedule meetings, find files, etc.)
- Use data from all integrated sources (Drive, Gmail, Calendar, etc.) when helpful
- For Zach (admin): Provide system insights and admin-level information when relevant`
      },
      ...messages
    ];

    // Intelligent model selection based on task complexity
    const currentUserMessage = messages[messages.length - 1]?.content || '';
    const taskContext: TaskContext = {
      messageContent: currentUserMessage,
      hasFileContext: autoContext.relevantKnowledge.length > 0,
      hasCodeContent: currentUserMessage.includes('function') || currentUserMessage.includes('code'),
      projectCategory: undefined, // Could be extracted from request
      conversationLength: messages.length,
      userPreference: 'quality' // Could be user setting
    };

    const selectedModel = ModelSelector.selectModel(taskContext);
    console.log(`[MODEL] ${ModelSelector.getModelExplanation(selectedModel, taskContext)}`);

    // Prepare model parameters (GPT-5 specific requirements)
    const modelParams: any = {
      model: selectedModel.model,
      messages: contextMessages,
      max_completion_tokens: selectedModel.maxTokens || 1000
    };

    // GPT-5 models require temperature = 1 (default), GPT-4 can use 0.7
    if (!selectedModel.model.startsWith('gpt-5')) {
      modelParams.temperature = selectedModel.temperature || 0.7;
    }

    // Add GPT-5 specific parameters if applicable
    if (selectedModel.model.startsWith('gpt-5') && selectedModel.reasoningLevel) {
      modelParams.reasoning_effort = selectedModel.reasoningLevel;
      console.log(`[MODEL] Using reasoning effort: ${selectedModel.reasoningLevel}`);
    }

    // Get AI response with GPT-5 models (direct call - no fallback)
    const completion = await openai.chat.completions.create(modelParams);

    const aiResponse = completion.choices[0].message.content || 'I apologize, but I could not generate a response.';

    // Save the conversation to database
    const { data: convData } = await supabase
      .from('conversations')
      .upsert({
        id: conversationId,
        user_id: userData.id,
        title: userMessage.substring(0, 50),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    // Save user message
    const userEmbedding = await generateEmbedding(userMessage);
    const { data: userMessageData } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      user_id: userData.id,
      role: 'user',
      content: userMessage,
      embedding: userEmbedding
    }).select().single();

    // Save AI response
    const aiEmbedding = await generateEmbedding(aiResponse);
    const { data: aiMessageData } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      user_id: userData.id,
      role: 'assistant',
      content: aiResponse,
      embedding: aiEmbedding
    }).select().single();

    // 🚀 AUTOMATIC BACKGROUND INDEXING - This runs without blocking the response
    const backgroundIndexer = BackgroundIndexer.getInstance();

    // Index user message in background
    if (userMessageData) {
      backgroundIndexer.indexMessage(
        userMessageData.id,
        conversationId,
        userData.id,
        'user',
        userMessage
      ).catch(error => {
        console.error('Background indexing failed for user message:', error);
      });
    }

    // Index AI response in background
    if (aiMessageData) {
      backgroundIndexer.indexMessage(
        aiMessageData.id,
        conversationId,
        userData.id,
        'assistant',
        aiResponse
      ).catch(error => {
        console.error('Background indexing failed for AI message:', error);
      });
    }

    // Extract and save knowledge
    const facts = extractFacts(userMessage, aiResponse);
    if (facts.length > 0) {
      for (const fact of facts) {
        const factEmbedding = await generateEmbedding(fact.content);
        await supabase.from('knowledge_base').insert({
          user_id: userData.id,
          source_type: 'conversation',
          category: fact.category,
          title: fact.title,
          content: fact.content,
          embedding: factEmbedding,
          importance: fact.importance,
          tags: fact.tags,
          metadata: { conversation_id: conversationId }
        });
      }
      console.log(`Extracted ${facts.length} facts to knowledge base`);
    }

    return NextResponse.json({
      response: aiResponse,
      saved: true,
      memoryActive: true,
      knowledgeItemsFound: autoContext.relevantKnowledge.length,
      allMessagesRetrieved: allUserMessages?.length || 0,
      factsExtracted: facts.length,
      modelUsed: {
        model: selectedModel.model,
        reasoningLevel: selectedModel.reasoningLevel || 'none',
        costMultiplier: selectedModel.costMultiplier,
        explanation: ModelSelector.getModelExplanation(selectedModel, taskContext)
      }
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({
      error: 'Chat processing failed',
      details: error.message
    }, { status: 500 });
  }
}

function extractFacts(userMessage: string, aiResponse: string): any[] {
  const facts = [];
  
  // Extract location mentions
  const locationPattern = /(?:live in|from|located in|based in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  const locations = [...userMessage.matchAll(locationPattern), ...aiResponse.matchAll(locationPattern)];
  locations.forEach(match => {
    facts.push({
      category: 'location',
      title: 'User Location',
      content: `User is located in ${match[1]}`,
      importance: 0.8,
      tags: ['location', match[1].toLowerCase()]
    });
  });

  // Extract names
  const namePattern = /(?:my|named?|call(?:ed)?)\s+([A-Z][a-z]+)/g;
  const names = [...userMessage.matchAll(namePattern)];
  names.forEach(match => {
    facts.push({
      category: 'personal',
      title: 'Name Reference',
      content: match[0],
      importance: 0.7,
      tags: ['name', 'personal']
    });
  });

  // Extract dates and deadlines
  const datePattern = /(?:deadline|due|scheduled|on)\s+([A-Za-z]+ \d+(?:st|nd|rd|th)?(?:,? \d{4})?)/g;
  const dates = [...userMessage.matchAll(datePattern)];
  dates.forEach(match => {
    facts.push({
      category: 'task',
      title: 'Important Date',
      content: match[0],
      importance: 0.9,
      tags: ['deadline', 'date', 'task']
    });
  });

  // Extract project names
  const projectPattern = /(?:project|working on|building)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  const projects = [...userMessage.matchAll(projectPattern)];
  projects.forEach(match => {
    facts.push({
      category: 'project',
      title: `Project: ${match[1]}`,
      content: match[0],
      importance: 0.8,
      tags: ['project', match[1].toLowerCase()]
    });
  });

  // General fact extraction for statements starting with "I"
  if (userMessage.match(/^I\s+(am|have|like|work|live|need|want)/i)) {
    facts.push({
      category: 'personal',
      title: 'Personal Information',
      content: userMessage.substring(0, 200),
      importance: 0.6,
      tags: ['personal', 'preference']
    });
  }

  return facts;
}
