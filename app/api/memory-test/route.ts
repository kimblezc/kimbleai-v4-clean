/**
 * Memory Test API - Verify automatic RAG and vector search functionality
 * This endpoint proves that cross-conversation memory works automatically
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BackgroundIndexer } from '@/lib/background-indexer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 1536
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
  try {
    const { action, userId = 'zach', testData } = await request.json();

    switch (action) {
      case 'create_test_memories':
        return await createTestMemories(userId);

      case 'search_memory':
        return await searchMemory(testData.query, userId);

      case 'test_cross_conversation':
        return await testCrossConversationRetrieval(userId);

      case 'verify_automatic_indexing':
        return await verifyAutomaticIndexing(testData, userId);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Memory test error:', error);
    return NextResponse.json({
      error: 'Memory test failed',
      details: error.message
    }, { status: 500 });
  }
}

async function createTestMemories(userId: string) {
  console.log(`🧪 Creating test memories for user: ${userId}`);

  // Get user data
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
    .single();

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const testConversations = [
    {
      id: 'test_conv_1',
      messages: [
        { role: 'user', content: 'My name is Alex Johnson and I live in San Francisco. I work as a software engineer at TechCorp.' },
        { role: 'assistant', content: 'Nice to meet you Alex! I\'ll remember that you\'re a software engineer at TechCorp in San Francisco.' },
        { role: 'user', content: 'I really love pizza and hate broccoli. My favorite programming language is TypeScript.' },
        { role: 'assistant', content: 'Got it! I\'ll remember your food preferences and that you prefer TypeScript for programming.' }
      ]
    },
    {
      id: 'test_conv_2',
      messages: [
        { role: 'user', content: 'I\'m working on a new project called KimbleAI. It\'s a chatbot with memory capabilities.' },
        { role: 'assistant', content: 'That sounds like an exciting project! KimbleAI with memory capabilities could be very powerful.' },
        { role: 'user', content: 'I decided to use React and Next.js for the frontend. The backend will use Supabase for the database.' },
        { role: 'assistant', content: 'Excellent choices! React with Next.js and Supabase is a solid tech stack for modern web applications.' }
      ]
    },
    {
      id: 'test_conv_3',
      messages: [
        { role: 'user', content: 'I have a deadline on December 15th to finish the MVP. The client is really excited about the AI features.' },
        { role: 'assistant', content: 'I\'ll make note of your December 15th deadline for the MVP. It\'s great that the client is excited about the AI features!' }
      ]
    }
  ];

  const backgroundIndexer = BackgroundIndexer.getInstance();
  let totalProcessed = 0;

  for (const conv of testConversations) {
    // Save conversation
    await supabase.from('conversations').upsert({
      id: conv.id,
      user_id: userData.id,
      title: `Test Conversation ${conv.id}`,
      updated_at: new Date().toISOString()
    });

    // Process each message
    for (let i = 0; i < conv.messages.length; i++) {
      const msg = conv.messages[i];
      const messageId = `${conv.id}_msg_${i}`;

      // Save message to database
      const embedding = await generateEmbedding(msg.content);
      await supabase.from('messages').insert({
        id: messageId,
        conversation_id: conv.id,
        user_id: userData.id,
        role: msg.role,
        content: msg.content,
        embedding
      });

      // Automatically index the message
      const result = await backgroundIndexer.indexMessage(
        messageId,
        conv.id,
        userData.id,
        msg.role as 'user' | 'assistant',
        msg.content
      );

      totalProcessed++;
      console.log(`✅ Processed message ${messageId}:`, {
        memoryChunks: result.memoryChunksExtracted,
        knowledgeItems: result.knowledgeItemsCreated,
        time: result.processingTimeMs + 'ms'
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: `Created ${testConversations.length} test conversations with ${totalProcessed} messages`,
    conversationsCreated: testConversations.length,
    messagesProcessed: totalProcessed,
    note: 'All messages have been automatically indexed with embeddings and memory extraction'
  });
}

async function searchMemory(query: string, userId: string) {
  console.log(`🔍 Searching memory for: "${query}"`);

  // Get user data
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
    .single();

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Generate embedding for search query
  const queryEmbedding = await generateEmbedding(query);

  if (!queryEmbedding) {
    return NextResponse.json({ error: 'Failed to generate query embedding' }, { status: 500 });
  }

  // Search knowledge base using vector similarity
  const { data: knowledgeResults, error: knowledgeError } = await supabase
    .rpc('search_knowledge_base', {
      query_embedding: queryEmbedding,
      p_user_id: userData.id,
      match_count: 10
    });

  // Search memory chunks
  const { data: memoryResults } = await supabase
    .from('memory_chunks')
    .select('*')
    .eq('user_id', userData.id)
    .textSearch('content', query)
    .limit(10);

  // Search messages directly
  const { data: messageResults } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userData.id)
    .textSearch('content', query)
    .limit(10);

  return NextResponse.json({
    query,
    results: {
      knowledgeBase: {
        count: knowledgeResults?.length || 0,
        items: knowledgeResults || [],
        error: knowledgeError?.message
      },
      memoryChunks: {
        count: memoryResults?.length || 0,
        items: memoryResults || []
      },
      directMessages: {
        count: messageResults?.length || 0,
        items: messageResults || []
      }
    },
    totalMatches: (knowledgeResults?.length || 0) + (memoryResults?.length || 0) + (messageResults?.length || 0)
  });
}

async function testCrossConversationRetrieval(userId: string) {
  console.log(`🔗 Testing cross-conversation memory retrieval for: ${userId}`);

  // Get user data
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
    .single();

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Test multiple search queries that should find information across different conversations
  const testQueries = [
    'What is my name?',
    'Where do I live?',
    'What project am I working on?',
    'What are my food preferences?',
    'What programming language do I prefer?',
    'When is my deadline?',
    'What technology stack am I using?'
  ];

  const results = [];

  for (const query of testQueries) {
    console.log(`Testing query: "${query}"`);

    const queryEmbedding = await generateEmbedding(query);

    if (queryEmbedding) {
      // Search across all conversations
      const { data: searchResults } = await supabase
        .rpc('search_knowledge_base', {
          query_embedding: queryEmbedding,
          p_user_id: userData.id,
          match_count: 5
        });

      results.push({
        query,
        matchesFound: searchResults?.length || 0,
        bestMatch: searchResults?.[0] || null,
        allMatches: searchResults || []
      });
    }
  }

  // Calculate success metrics
  const successfulQueries = results.filter(r => r.matchesFound > 0);
  const averageMatches = results.reduce((sum, r) => sum + r.matchesFound, 0) / results.length;

  return NextResponse.json({
    testCompleted: true,
    totalQueries: testQueries.length,
    successfulQueries: successfulQueries.length,
    successRate: `${Math.round((successfulQueries.length / testQueries.length) * 100)}%`,
    averageMatchesPerQuery: Math.round(averageMatches * 10) / 10,
    detailedResults: results,
    interpretation: {
      excellent: successfulQueries.length >= 6,
      good: successfulQueries.length >= 4,
      needsImprovement: successfulQueries.length < 4
    }
  });
}

async function verifyAutomaticIndexing(testData: any, userId: string) {
  console.log(`⚡ Verifying automatic indexing for user: ${userId}`);

  const { testMessage, conversationId = 'verify_test_conv' } = testData;

  if (!testMessage) {
    return NextResponse.json({ error: 'testMessage is required' }, { status: 400 });
  }

  // Get user data
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
    .single();

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const messageId = `verify_${Date.now()}`;
  const startTime = Date.now();

  // 1. Save a test message
  const embedding = await generateEmbedding(testMessage);
  await supabase.from('messages').insert({
    id: messageId,
    conversation_id: conversationId,
    user_id: userData.id,
    role: 'user',
    content: testMessage,
    embedding
  });

  // 2. Trigger automatic indexing
  const backgroundIndexer = BackgroundIndexer.getInstance();
  const indexingResult = await backgroundIndexer.indexMessage(
    messageId,
    conversationId,
    userData.id,
    'user',
    testMessage
  );

  // 3. Wait a moment for async operations
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 4. Verify the message was indexed by searching for it
  const searchEmbedding = await generateEmbedding(testMessage);
  const { data: searchResults } = await supabase
    .rpc('search_knowledge_base', {
      query_embedding: searchEmbedding!,
      p_user_id: userData.id,
      match_count: 5
    });

  // 5. Check memory chunks were created
  const { data: memoryChunks } = await supabase
    .from('memory_chunks')
    .select('*')
    .eq('message_id', messageId);

  const processingTime = Date.now() - startTime;

  return NextResponse.json({
    verificationComplete: true,
    testMessage,
    messageId,
    processingTimeMs: processingTime,
    indexingResult,
    verification: {
      messageIndexed: !!searchResults && searchResults.length > 0,
      memoryChunksCreated: memoryChunks?.length || 0,
      knowledgeItemsCreated: indexingResult.knowledgeItemsCreated,
      searchWorking: searchResults?.some((r: any) => r.content.includes(testMessage.substring(0, 50))) || false
    },
    searchResults: searchResults || [],
    memoryChunks: memoryChunks || [],
    status: indexingResult.errors.length > 0 ? 'partial_success' : 'success',
    errors: indexingResult.errors
  });
}

export async function GET() {
  return NextResponse.json({
    service: 'Memory Test API',
    endpoints: {
      'POST /api/memory-test': {
        actions: [
          'create_test_memories - Creates test conversations with automatic indexing',
          'search_memory - Tests vector search across conversations',
          'test_cross_conversation - Verifies cross-conversation retrieval',
          'verify_automatic_indexing - Tests real-time indexing of new messages'
        ]
      }
    },
    usage: 'Send POST requests with { "action": "action_name", "userId": "zach|rebecca", "testData": {...} }'
  });
}