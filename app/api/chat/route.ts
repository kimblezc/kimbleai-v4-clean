/**
 * KimbleAI V4 Chat API - FULL FEATURED VERSION
 * Complete implementation with all systems integrated
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConversationLogger } from '@/lib/conversation-logger';
import { MessageReferenceSystem } from '@/lib/message-reference-system';
import { SessionContinuitySystem } from '@/lib/session-continuity-system';
import { createClient } from '@supabase/supabase-js';

// Initialize services
const messageSystem = MessageReferenceSystem.getInstance();
const continuitySystem = SessionContinuitySystem.getInstance();

// Supabase client (optional - fallback to basic if not configured)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Types
interface ChatRequest {
  messages: Array<{role: string, content: string}>;
  userId?: string;
  conversationId?: string;
  projectId?: string;
  context?: any;
}

interface ChatResponse {
  response: string;
  conversationId: string;
  projectId?: string;
  metadata?: any;
  references?: string[];
  debug?: any;
}

// API Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || '1000');

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userMessage = '';
  let assistantResponse = '';
  let conversationId: string | undefined;
  
  try {
    // 1. Parse request
    const body: ChatRequest = await req.json();
    const { messages = [], userId = 'default', conversationId: existingConvId, projectId, context = {} } = body;
    
    conversationId = existingConvId || `conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // 2. Validate API key
    if (!OPENAI_API_KEY) {
      return NextResponse.json({
        response: "OpenAI API key is not configured. Add OPENAI_API_KEY to your environment variables.",
        conversationId,
        debug: { hasKey: false, error: 'missing_key' }
      } as ChatResponse);
    }
    
    // 3. Get the user's message
    if (messages.length === 0) {
      return NextResponse.json({
        response: "Hello! I'm KimbleAI V4. How can I help you today?",
        conversationId,
        metadata: { version: '4.0', features: ['memory', 'references', 'continuity'] }
      } as ChatResponse);
    }
    
    const lastMessage = messages[messages.length - 1];
    userMessage = lastMessage.content;
    
    // 4. Check for message references (@msg:xxx)
    const references = extractMessageReferences(userMessage);
    let contextMessages: any[] = [];
    
    if (references.length > 0) {
      // Load referenced messages for context
      for (const ref of references) {
        const refMessage = await messageSystem.getMessage(ref);
        if (refMessage) {
          contextMessages.push({
            role: 'system',
            content: `[Referenced message ${ref}]: ${refMessage.content}`
          });
        }
      }
    }
    
    // 5. Load conversation history from Supabase if available
    let conversationHistory: any[] = [];
    if (supabase && conversationId && existingConvId) {
      try {
        const { data: history } = await supabase
          .from('messages')
          .select('role, content')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(10);
        
        if (history) {
          conversationHistory = history;
        }
      } catch (error) {
        console.warn('Could not load history:', error);
      }
    }
    
    // 6. Build complete message context
    const systemPrompt = {
      role: 'system',
      content: `You are KimbleAI V4, an advanced AI assistant with perfect memory and context awareness.
      
Key capabilities:
- You have access to all previous conversations through the message reference system
- You can reference specific messages using @msg:ID format
- You maintain continuity across sessions
- You track code generation, decisions, and action items
- You work for Zach and Rebecca's family

Current context:
- User: ${userId}
- Conversation: ${conversationId}
- Project: ${projectId || 'general'}
- Session: ${context.sessionId || 'current'}

Be helpful, concise, and reference previous context when relevant.`
    };
    
    const fullMessages = [
      systemPrompt,
      ...contextMessages,
      ...conversationHistory.slice(-5), // Last 5 messages for context
      ...messages
    ];
    
    // 7. Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: fullMessages,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    });
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      
      if (openaiResponse.status === 401) {
        return NextResponse.json({
          response: "Invalid OpenAI API key. Please check your configuration.",
          conversationId,
          debug: { error: 'invalid_key', status: 401 }
        } as ChatResponse);
      } else if (openaiResponse.status === 429) {
        return NextResponse.json({
          response: "OpenAI rate limit exceeded. Please try again later.",
          conversationId,
          debug: { error: 'rate_limit', status: 429 }
        } as ChatResponse);
      } else {
        return NextResponse.json({
          response: `OpenAI API error (${openaiResponse.status}). Please try again.`,
          conversationId,
          debug: { error: 'api_error', status: openaiResponse.status }
        } as ChatResponse);
      }
    }
    
    const data = await openaiResponse.json();
    assistantResponse = data.choices[0]?.message?.content || 'No response generated';
    const tokensUsed = data.usage?.total_tokens || 0;
    
    // 8. Store message in reference system
    try {
      await messageSystem.storeMessage(
        conversationId,
        userId,
        'user',
        userMessage,
        { references },
        projectId
      );
      
      await messageSystem.storeMessage(
        conversationId,
        userId,
        'assistant',
        assistantResponse,
        { 
          model: MODEL,
          tokens: tokensUsed
        },
        projectId
      );
    } catch (error) {
      console.warn('Could not store in reference system:', error);
    }
    
    // 9. Save to Supabase if available
    if (supabase) {
      try {
        await supabase.from('messages').insert([
          {
            conversation_id: conversationId,
            user_id: userId,
            role: 'user',
            content: userMessage,
            created_at: new Date().toISOString()
          },
          {
            conversation_id: conversationId,
            user_id: userId,
            role: 'assistant',
            content: assistantResponse,
            created_at: new Date().toISOString()
          }
        ]);
      } catch (error) {
        console.warn('Could not save to Supabase:', error);
      }
    }
    
    // 10. Log exchange for continuity
    try {
      await ConversationLogger.logExchange(userMessage, assistantResponse, {
        conversationId,
        userId,
        projectId,
        tokensUsed,
        modelUsed: MODEL,
        references,
        ...context
      });
    } catch (error) {
      console.warn('Could not log exchange:', error);
    }
    
    // 11. Monitor for session continuity
    try {
      await continuitySystem.monitorTokenUsage(conversationId, userId, tokensUsed);
    } catch (error) {
      console.warn('Could not monitor continuity:', error);
    }
    
    // 12. Prepare response
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      response: assistantResponse,
      conversationId,
      projectId,
      metadata: {
        model: MODEL,
        tokens: tokensUsed,
        processingTime,
        references,
        timestamp: new Date().toISOString()
      }
    } as ChatResponse);
    
  } catch (error: any) {
    console.error('Chat API error:', error);
    
    // Log error for debugging
    await ConversationLogger.logSystemEvent('CHAT_ERROR', {
      error: error.message,
      stack: error.stack,
      conversationId,
      userId: 'unknown'
    });
    
    return NextResponse.json({
      response: `An error occurred: ${error.message}. Please try again.`,
      conversationId: conversationId || 'error_' + Date.now(),
      debug: { error: error.message }
    } as ChatResponse);
  }
}

// GET endpoint for status checking
export async function GET() {
  const hasOpenAI = !!OPENAI_API_KEY;
  const hasSupabase = !!supabase;
  
  return NextResponse.json({
    status: 'KimbleAI V4 Chat API',
    version: '4.0',
    timestamp: new Date().toISOString(),
    configuration: {
      openai: {
        configured: hasOpenAI,
        model: MODEL,
        maxTokens: MAX_TOKENS
      },
      supabase: {
        configured: hasSupabase,
        url: supabaseUrl ? 'configured' : 'missing'
      },
      features: {
        messageReferences: true,
        conversationLogging: true,
        sessionContinuity: true,
        persistentMemory: hasSupabase
      }
    },
    health: hasOpenAI ? 'operational' : 'configuration_needed'
  });
}

// Helper function to extract message references
function extractMessageReferences(content: string): string[] {
  const pattern = /@msg:([a-zA-Z0-9_-]+)/g;
  const matches = content.matchAll(pattern);
  return Array.from(matches, m => m[1]);
}