/**
 * KimbleAI V4 Chat API - Maximum Efficacy Implementation
 * Opus-level code generation with comprehensive auto-logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConversationLogger } from '@/lib/conversation-logger';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize OpenAI with maximum efficacy configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
  maxRetries: 3,
  timeout: 60000 // Extended timeout for complex requests
});

// Initialize Supabase with enhanced configuration
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  userId: string;
  conversationId?: string;
  projectId?: string;
  context?: {
    platform?: string;
    userAgent?: string;
    sessionId?: string;
    efficacyLevel?: 'standard' | 'high' | 'maximum';
  };
}

interface ChatResponse {
  response: string;
  conversationId: string;
  projectId?: string;
  memoryCount: number;
  metadata: {
    model: string;
    tokensUsed: number;
    processingTime: number;
    efficacyScore: number;
    autoActionsTriggered: string[];
  };
}

export async function POST(req: NextRequest): Promise<NextResponse<ChatResponse | { error: string }>> {
  const startTime = Date.now();
  let conversationId: string | undefined;
  let userMessage = '';
  let assistantResponse = '';
  
  try {
    const requestData: ChatRequest = await req.json();
    const { messages, userId, conversationId: existingConversationId, projectId, context = {} } = requestData;
    
    // Validate required fields
    if (!messages || !userId) {
      await ConversationLogger.logSystemEvent('INVALID_REQUEST', {
        error: 'Missing required fields: messages or userId',
        request_data: { has_messages: !!messages, has_userId: !!userId }
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Extract user message for logging
    userMessage = messages[messages.length - 1]?.content || '';
    
    // Enhanced context with maximum efficacy settings
    const enhancedContext = {
      ...context,
      efficacyLevel: 'maximum',
      apiVersion: '4.0',
      processingStart: startTime,
      userAgent: req.headers.get('user-agent') || 'unknown',
      platform: context.platform || 'web'
    };
    
    // Load or create conversation with enhanced metadata
    conversationId = existingConversationId || await createConversation(userId, projectId, enhancedContext);
    
    // Load conversation history with intelligent context windowing
    const conversationHistory = await loadConversationHistory(conversationId, messages);
    
    // Load relevant memories with vector similarity search
    const relevantMemories = await loadRelevantMemories(userId, userMessage, 10);
    
    // Generate dynamic system prompt with maximum efficacy instructions
    const systemPrompt = generateMaximumEfficacySystemPrompt(relevantMemories, enhancedContext, userMessage);
    
    // Prepare messages for OpenAI with intelligent context management
    const openaiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory,
      ...messages.slice(-3) // Include last 3 messages for immediate context
    ];
    
    // Log conversation initiation
    await ConversationLogger.logSystemEvent('CHAT_INITIATION', {
      user_id: userId,
      conversation_id: conversationId,
      project_id: projectId,
      message_length: userMessage.length,
      memories_loaded: relevantMemories.length,
      history_length: conversationHistory.length,
      efficacy_level: 'maximum'
    });
    
    // Generate response with maximum efficacy model selection
    const completion = await openai.chat.completions.create({
      model: selectOptimalModel(userMessage, enhancedContext),
      messages: openaiMessages,
      temperature: calculateOptimalTemperature(userMessage),
      max_tokens: calculateOptimalMaxTokens(userMessage),
      top_p: 0.95,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
      stream: false
    });
    
    assistantResponse = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;
    
    if (!assistantResponse) {
      throw new Error('Empty response from OpenAI');
    }
    
    // Store messages with enhanced metadata
    await Promise.all([
      storeMessage(conversationId, 'user', userMessage, {
        context: enhancedContext,
        metadata: {
          length: userMessage.length,
          intent: analyzeUserIntent(userMessage),
          complexity: calculateMessageComplexity(userMessage)
        }
      }),
      storeMessage(conversationId, 'assistant', assistantResponse, {
        context: enhancedContext,
        metadata: {
          length: assistantResponse.length,
          tokens_used: tokensUsed,
          model: completion.model,
          processing_time: Date.now() - startTime,
          auto_actions: analyzeResponseForActions(assistantResponse)
        }
      })
    ]);
    
    // Auto-extract memories for future conversations
    const newMemories = await extractAndStoreMemories(userId, conversationId, userMessage, assistantResponse);
    
    // Auto-update or create project based on conversation
    const autoProjectId = projectId || await autoManageProject(userId, conversationId, userMessage, assistantResponse);
    
    // Calculate efficacy score
    const efficacyScore = calculateEfficacyScore(userMessage, assistantResponse, tokensUsed, Date.now() - startTime);
    
    // Determine auto-actions triggered
    const autoActionsTriggered = [];
    if (assistantResponse.includes('```')) autoActionsTriggered.push('code_generation');
    if (assistantResponse.toLowerCase().includes('deploy')) autoActionsTriggered.push('deployment_trigger');
    if (newMemories.length > 0) autoActionsTriggered.push('memory_extraction');
    if (autoProjectId !== projectId) autoActionsTriggered.push('project_auto_management');
    
    // Comprehensive conversation logging with maximum efficacy
    await ConversationLogger.logExchange(userMessage, assistantResponse, {
      ...enhancedContext,
      conversationId,
      projectId: autoProjectId,
      userId,
      memoryCount: relevantMemories.length + newMemories.length,
      tokensUsed,
      processingTime: Date.now() - startTime,
      efficacyScore,
      autoActionsTriggered,
      modelUsed: completion.model
    });
    
    // Log successful completion
    await ConversationLogger.logSystemEvent('CHAT_COMPLETION', {
      conversation_id: conversationId,
      project_id: autoProjectId,
      tokens_used: tokensUsed,
      processing_time: Date.now() - startTime,
      efficacy_score: efficacyScore,
      auto_actions: autoActionsTriggered,
      memories_extracted: newMemories.length
    });
    
    const response: ChatResponse = {
      response: assistantResponse,
      conversationId,
      projectId: autoProjectId,
      memoryCount: relevantMemories.length + newMemories.length,
      metadata: {
        model: completion.model,
        tokensUsed,
        processingTime: Date.now() - startTime,
        efficacyScore,
        autoActionsTriggered
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    // Comprehensive error logging
    await ConversationLogger.logSystemEvent('CHAT_ERROR', {
      error_message: error.message,
      error_type: error.constructor.name,
      processing_time: processingTime,
      conversation_id: conversationId,
      user_message_length: userMessage.length,
      assistant_response_length: assistantResponse.length,
      stack_trace: error.stack?.substring(0, 500)
    });
    
    console.error('Chat API error:', {
      message: error.message,
      type: error.constructor.name,
      conversationId,
      processingTime
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        metadata: {
          processingTime,
          errorType: error.constructor.name
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Advanced model selection based on request complexity
 */
function selectOptimalModel(userMessage: string, context: any): string {
  const messageLength = userMessage.length;
  const hasCodeRequest = /\b(code|program|function|class|api|database|deploy)\b/i.test(userMessage);
  const isComplexQuery = messageLength > 200 || hasCodeRequest;
  
  // Use most capable model for complex requests requiring maximum efficacy
  if (isComplexQuery || context.efficacyLevel === 'maximum') {
    return 'gpt-4-turbo-preview'; // Most capable model for complex coding tasks
  }
  
  return 'gpt-4'; // Standard high-quality model
}

/**
 * Calculate optimal temperature based on request type
 */
function calculateOptimalTemperature(userMessage: string): number {
  const hasCodeRequest = /\b(code|program|function|class|debug|fix)\b/i.test(userMessage);
  const isCreativeRequest = /\b(creative|story|brainstorm|idea|design)\b/i.test(userMessage);
  
  if (hasCodeRequest) return 0.1; // Very low temperature for precise code generation
  if (isCreativeRequest) return 0.8; // Higher temperature for creative tasks
  return 0.3; // Balanced temperature for general tasks
}

/**
 * Calculate optimal max tokens based on request complexity
 */
function calculateOptimalMaxTokens(userMessage: string): number {
  const hasCodeRequest = /\b(code|program|function|class|api|database)\b/i.test(userMessage);
  const isLongFormRequest = /\b(explain|detailed|comprehensive|guide|tutorial)\b/i.test(userMessage);
  
  if (hasCodeRequest) return 4000; // Large token limit for code generation
  if (isLongFormRequest) return 3000; // Extended limit for detailed explanations
  return 2000; // Standard limit for general responses
}

/**
 * Generate system prompt optimized for maximum efficacy
 */
function generateMaximumEfficacySystemPrompt(memories: any[], context: any, userMessage: string): string {
  const memoryContext = memories.length > 0 
    ? `\n\nRelevant memories from past conversations:\n${memories.map(m => `- ${m.content}`).join('\n')}`
    : '';
    
  const hasCodeRequest = /\b(code|program|function|class|api|database|deploy)\b/i.test(userMessage);
  
  const basePrompt = `You are KimbleAI V4, an advanced AI assistant with perfect memory and maximum coding efficacy. 

Key capabilities:
- Perfect memory of all past conversations via vector similarity search
- Maximum efficacy code generation with Opus-level quality
- Automatic project management and organization
- Real-time logging of all interactions for continuity
- Advanced context awareness and intelligent responses

Current context:
- Project: KimbleAI V4 (kimbleai-v4 folder)
- Platform: ${context.platform || 'web'}
- Efficacy Level: MAXIMUM
- Auto-logging: ENABLED
- Memory system: ACTIVE (${memories.length} relevant memories loaded)

${memoryContext}`;

  if (hasCodeRequest) {
    return basePrompt + `

CODING INSTRUCTIONS - MAXIMUM EFFICACY MODE:
- Write production-ready, well-documented code
- Include comprehensive error handling
- Use TypeScript with strict typing
- Follow modern best practices and patterns
- Optimize for performance and maintainability
- Include auto-logging integration where appropriate
- Provide clear file paths and folder structure
- Add deployment automation when relevant
- Consider mobile compatibility and cross-platform support
- Implement maximum security practices`;
  }
  
  return basePrompt + `

Remember everything the user tells you and reference past conversations naturally. Provide comprehensive, accurate responses with maximum helpfulness.`;
}

/**
 * Additional utility functions for maximum efficacy
 */

async function createConversation(userId: string, projectId?: string, context?: any): Promise<string> {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      project_id: projectId,
      title: generateConversationTitle(context),
      metadata: {
        created_at: new Date().toISOString(),
        efficacy_level: 'maximum',
        platform: context?.platform || 'web',
        session_id: context?.sessionId
      }
    })
    .select('id')
    .single();
    
  if (error) throw error;
  return data.id;
}

async function loadConversationHistory(conversationId: string, currentMessages: any[]): Promise<any[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('role, content, metadata')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(20); // Intelligent context windowing
    
  if (error) throw error;
  return data || [];
}

async function loadRelevantMemories(userId: string, query: string, limit: number = 10): Promise<any[]> {
  // Vector similarity search for relevant memories
  const { data, error } = await supabase
    .rpc('search_memories', {
      user_id: userId,
      query_text: query,
      limit_count: limit,
      similarity_threshold: 0.7
    });
    
  if (error) {
    console.warn('Memory search failed:', error);
    return [];
  }
  
  return data || [];
}

async function storeMessage(conversationId: string, role: string, content: string, metadata?: any): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      metadata: {
        ...metadata,
        stored_at: new Date().toISOString(),
        efficacy_level: 'maximum'
      }
    });
    
  if (error) throw error;
}

async function extractAndStoreMemories(userId: string, conversationId: string, userMessage: string, assistantResponse: string): Promise<any[]> {
  // Extract factual information and store as memories
  const memories = [];
  
  // Simple extraction logic - in production, use more sophisticated NLP
  const facts = extractFactsFromText(userMessage + ' ' + assistantResponse);
  
  for (const fact of facts) {
    try {
      const { data, error } = await supabase
        .from('memories')
        .insert({
          user_id: userId,
          conversation_id: conversationId,
          content: fact,
          metadata: {
            extracted_at: new Date().toISOString(),
            source: 'auto_extraction',
            efficacy_level: 'maximum'
          }
        })
        .select()
        .single();
        
      if (!error && data) {
        memories.push(data);
      }
    } catch (error) {
      console.warn('Memory storage failed:', error);
    }
  }
  
  return memories;
}

function extractFactsFromText(text: string): string[] {
  const facts = [];
  
  // Extract patterns that look like facts
  const patterns = [
    /I (?:am|work|live|study|have|like|prefer|need|want) [^.!?]+[.!?]/gi,
    /My [^.!?]+ (?:is|are|was|were) [^.!?]+[.!?]/gi,
    /(?:We|They|The team|The company) [^.!?]+[.!?]/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      facts.push(...matches.map(m => m.trim()));
    }
  });
  
  return facts.slice(0, 5); // Limit to prevent spam
}

async function autoManageProject(userId: string, conversationId: string, userMessage: string, assistantResponse: string): Promise<string | undefined> {
  // Auto-create or update project based on conversation content
  const projectKeywords = extractProjectKeywords(userMessage + ' ' + assistantResponse);
  
  if (projectKeywords.length > 0) {
    // Check if project already exists
    const { data: existingProject } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', `%${projectKeywords[0]}%`)
      .single();
      
    if (existingProject) {
      return existingProject.id;
    }
    
    // Create new project
    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: generateProjectName(projectKeywords),
        description: `Auto-generated project from conversation`,
        metadata: {
          auto_created: true,
          keywords: projectKeywords,
          source_conversation: conversationId
        }
      })
      .select('id')
      .single();
      
    if (!error && newProject) {
      await ConversationLogger.logSystemEvent('PROJECT_AUTO_CREATED', {
        project_id: newProject.id,
        conversation_id: conversationId,
        keywords: projectKeywords
      });
      
      return newProject.id;
    }
  }
  
  return undefined;
}

function extractProjectKeywords(text: string): string[] {
  const projectWords = text.toLowerCase().match(/\b(?:project|app|application|website|system|platform|tool|service|api|database|dashboard)\b/g);
  return Array.from(new Set(projectWords || []));
}

function generateProjectName(keywords: string[]): string {
  const primaryKeyword = keywords[0] || 'project';
  const timestamp = new Date().toISOString().split('T')[0];
  return `${primaryKeyword} ${timestamp}`;
}

function generateConversationTitle(context?: any): string {
  const timestamp = new Date().toLocaleString();
  const platform = context?.platform || 'web';
  return `${platform} conversation ${timestamp}`;
}

function analyzeUserIntent(message: string): string {
  const lower = message.toLowerCase();
  if (/\b(create|build|make|generate|code|program)\b/.test(lower)) return 'creation';
  if (/\b(fix|debug|error|issue|problem|help)\b/.test(lower)) return 'troubleshooting';
  if (/\b(deploy|launch|publish|release)\b/.test(lower)) return 'deployment';
  if (/\b(explain|how|what|why|tell|describe)\b/.test(lower)) return 'information';
  if (/\b(test|check|verify|validate)\b/.test(lower)) return 'validation';
  return 'general';
}

function calculateMessageComplexity(message: string): number {
  let complexity = 0;
  complexity += message.length / 1000; // Length factor
  complexity += (message.match(/\b(?:code|api|database|deploy|function|class)\b/gi) || []).length * 0.1; // Technical terms
  complexity += (message.match(/\?/g) || []).length * 0.05; // Questions
  return Math.min(complexity, 1.0);
}

function analyzeResponseForActions(response: string): string[] {
  const actions = [];
  if (response.includes('```')) actions.push('code_generated');
  if (/\b(deploy|build|npm|yarn|git)\b/i.test(response)) actions.push('deployment_instructions');
  if (/\b(create|file|folder|directory)\b/i.test(response)) actions.push('file_operations');
  if (/\b(test|verify|check)\b/i.test(response)) actions.push('testing_required');
  return actions;
}

function calculateEfficacyScore(userMessage: string, assistantResponse: string, tokensUsed: number, processingTime: number): number {
  let score = 0.5; // Base score
  
  // Response quality factors
  if (assistantResponse.length > userMessage.length) score += 0.1; // Comprehensive response
  if (assistantResponse.includes('```')) score += 0.2; // Code generation
  if (tokensUsed > 1000) score += 0.1; // Detailed response
  
  // Efficiency factors
  if (processingTime < 5000) score += 0.1; // Fast response
  if (processingTime < 2000) score += 0.1; // Very fast response
  
  return Math.min(score, 1.0);
}