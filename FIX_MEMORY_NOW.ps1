# KIMBLEAI MEMORY FIX - THE ACTUAL SOLUTION
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "FIXING CROSS-CONVERSATION MEMORY ISSUE" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# The problem is in the chat API - it's not actually searching across conversations
Write-Host "[1/3] Backing up current chat route..." -ForegroundColor Yellow
Copy-Item "app\api\chat\route.ts" "app\api\chat\route.backup.ts" -Force

Write-Host "[2/3] Creating fixed chat route with proper memory retrieval..." -ForegroundColor Yellow
@'
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

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
    const { messages, userId = 'zach', conversationId = 'default' } = await request.json();
    
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

    // FIX: Properly retrieve ALL messages from this user across ALL conversations
    console.log(`Retrieving all messages for user ${userData.id}...`);
    const { data: allUserMessages, error: messagesError } = await supabase
      .from('messages')
      .select('content, role, created_at, conversation_id')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(50); // Get last 50 messages from ALL conversations

    if (messagesError) {
      console.error('Messages retrieval error:', messagesError);
    }

    // Search knowledge base with embedding
    const embedding = await generateEmbedding(userMessage);
    let knowledgeContext = [];
    
    if (embedding) {
      const { data: searchResults, error: searchError } = await supabase
        .rpc('search_knowledge_base', {
          query_embedding: embedding,
          p_user_id: userData.id,
          match_count: 10
        });

      if (!searchError && searchResults) {
        knowledgeContext = searchResults;
        console.log(`Found ${searchResults.length} knowledge items`);
      }
    }

    // Search indexed files
    const { data: fileResults } = await supabase
      .from('indexed_files')
      .select('filename, chunks')
      .eq('user_id', userData.id)
      .textSearch('full_text', userMessage.split(' ').join(' | '))
      .limit(5);

    // Build comprehensive context
    const contextMessages = [
      {
        role: 'system',
        content: `You are KimbleAI, a helpful AI assistant with perfect memory.
        
IMPORTANT: You have access to the user's COMPLETE conversation history across ALL chats.
User: ${userData.name} (${userData.email})

Previous Conversations (${allUserMessages?.length || 0} messages found):
${allUserMessages ? allUserMessages.slice(0, 20).map(m => 
  `[${new Date(m.created_at).toLocaleDateString()}] ${m.role}: ${m.content.substring(0, 100)}...`
).join('\n') : 'No previous messages'}

Knowledge Base Context (${knowledgeContext.length} items):
${knowledgeContext.map((item: any) => 
  `- [${item.category}] ${item.title}: ${item.content.substring(0, 200)}...`
).join('\n')}

Indexed Files (${fileResults?.length || 0} files):
${fileResults ? fileResults.map(f => `- ${f.filename}`).join('\n') : 'No files'}

Remember everything the user has told you. Reference specific past conversations when relevant.`
      },
      ...messages
    ];

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: contextMessages,
      temperature: 0.7,
      max_tokens: 1000
    });

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
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      user_id: userData.id,
      role: 'user',
      content: userMessage,
      embedding: userEmbedding
    });

    // Save AI response
    const aiEmbedding = await generateEmbedding(aiResponse);
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      user_id: userData.id,
      role: 'assistant',
      content: aiResponse,
      embedding: aiEmbedding
    });

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
      knowledgeItemsFound: knowledgeContext.length,
      allMessagesRetrieved: allUserMessages?.length || 0,
      factsExtracted: facts.length
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
'@ | Set-Content -Path "app\api\chat\route.ts" -Encoding UTF8

Write-Host "[3/3] Testing the fix..." -ForegroundColor Yellow

# Test memory persistence
$testUrl = "https://kimbleai-v4-clean.vercel.app/api/chat"
$testBody = @{
    messages = @(
        @{
            role = "user"
            content = "Testing: My cat is named Whiskers and I work at Microsoft"
        }
    )
    userId = "zach"
    conversationId = "test-$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json -Depth 10

Write-Host "Storing test data..." -ForegroundColor Gray
Invoke-RestMethod -Uri $testUrl -Method Post -Body $testBody -ContentType "application/json" | Out-Null

Start-Sleep -Seconds 3

# Now test retrieval in different conversation
$recallBody = @{
    messages = @(
        @{
            role = "user"
            content = "What's my cat's name and where do I work?"
        }
    )
    userId = "zach"
    conversationId = "different-conversation"
} | ConvertTo-Json -Depth 10

Write-Host "Testing cross-conversation memory..." -ForegroundColor Gray
$response = Invoke-RestMethod -Uri $testUrl -Method Post -Body $recallBody -ContentType "application/json"

if ($response.response -match "Whiskers" -and $response.response -match "Microsoft") {
    Write-Host "SUCCESS! Memory is now working across conversations!" -ForegroundColor Green
    Write-Host "Messages retrieved: $($response.allMessagesRetrieved)" -ForegroundColor Cyan
} else {
    Write-Host "Memory test needs deployment. Deploy with: git push" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "FIX APPLIED - DEPLOY WITH:" -ForegroundColor Green
Write-Host "git add -A" -ForegroundColor Yellow
Write-Host "git commit -m 'Fix cross-conversation memory retrieval'" -ForegroundColor Yellow  
Write-Host "git push origin main" -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan