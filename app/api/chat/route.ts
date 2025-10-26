import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { BackgroundIndexer } from '@/lib/background-indexer';
import { AutoReferenceButler } from '@/lib/auto-reference-butler';
import { ModelSelector, TaskContext } from '@/lib/model-selector';
import { google } from 'googleapis';
import { WorkspaceRAGSystem } from '@/app/api/google/workspace/rag-system';
import { zapierClient } from '@/lib/zapier-client';
import { embeddingCache } from '@/lib/embedding-cache';
import { costMonitor } from '@/lib/cost-monitor';
import { PromptCache } from '@/lib/prompt-cache';
import { getMCPToolsForChat, invokeMCPToolFromChat, getMCPSystemPrompt } from '@/lib/mcp/chat-integration';
import { ClaudeClient, type ClaudeModel, type ClaudeMessage } from '@/lib/claude-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

// Initialize Claude client for multi-model AI support
const claudeClient = new ClaudeClient({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  defaultModel: 'claude-sonnet-4-5',
  maxTokens: 4096,
  temperature: 1.0,
  enableCaching: true,
  onCost: async (cost, model) => {
    console.log(`[Claude] API call cost: $${cost.toFixed(4)} (${model})`);
  }
});

// PERFORMANCE OPTIMIZED: Use embedding cache instead of direct API calls
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    // Use cache for significant performance improvement
    return await embeddingCache.getEmbedding(text);
  } catch (error) {
    console.error('Embedding generation error:', error);
    return null;
  }
}

export async function GET() {
  // Fetch MCP tools count for status display
  let mcpToolsCount = 0;
  try {
    const mcpTools = await getMCPToolsForChat();
    mcpToolsCount = mcpTools.length;
  } catch (error) {
    console.warn('[MCP] Failed to load tools for status:', error);
  }

  return NextResponse.json({
    status: 'OK',
    service: 'KimbleAI Chat API',
    version: '4.3',
    features: {
      rag: true,
      vectorSearch: true,
      knowledgeBase: true,
      fileUpload: true,
      crossConversationMemory: 'FIXED',
      functionCalling: true,
      gmailAccess: true,
      driveAccess: true,
      mcpIntegration: true,
      mcpToolsAvailable: mcpToolsCount,
      multiModelAI: true,
      claudeIntegration: true,
      models: {
        openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-5-flash', 'gpt-5'],
        claude: ['opus-4-1', 'sonnet-4-5', 'haiku-4-5', '3-5-haiku', '3-haiku']
      }
    },
    functions: [
      'get_recent_emails',
      'get_emails_from_date_range',
      'search_google_drive',
      'search_files',
      'get_uploaded_files',
      'organize_files',
      'get_file_details',
      'send_email',
      'create_calendar_event',
      'get_calendar_events',
      `...and ${mcpToolsCount} MCP tools (GitHub, Filesystem, Memory, etc.)`
    ],
    lastUpdated: new Date().toISOString()
  });
}

// Request timeout configuration (Vercel has 60s max, we'll use 55s to have time to respond)
const REQUEST_TIMEOUT_MS = 55000;
const OPENAI_TIMEOUT_MS = 40000;

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();

  // Helper function to check if we're approaching timeout
  const isNearTimeout = () => {
    const elapsed = Date.now() - requestStartTime;
    return elapsed > REQUEST_TIMEOUT_MS - 5000; // 5s buffer
  };

  // Helper function to get remaining time
  const getRemainingTime = () => {
    const elapsed = Date.now() - requestStartTime;
    return Math.max(0, REQUEST_TIMEOUT_MS - elapsed);
  };

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

    const { messages, userId = 'zach', conversationId = 'default', mode, agent, preferredModel } = requestData;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    const userMessage = lastMessage.content;

    console.log(`⏱️ [Performance] Request started at ${Date.now() - requestStartTime}ms`);

    // QUERY COMPLEXITY DETECTION: Warn about complex queries but allow them
    const broadQueryPatterns = [
      /find everything/i,
      /search (all|everything)/i,
      /across all/i,
      /all (files|emails|drives?|documents?)/i,
      /everything (you can|about)/i
    ];

    const isBroadQuery = broadQueryPatterns.some(pattern => pattern.test(userMessage));
    const hasMultipleDataSources = (userMessage.match(/\b(gmail|drive|email|file|document|calendar)\b/gi) || []).length > 2;
    const isComplexQuery = isBroadQuery && hasMultipleDataSources;

    if (isComplexQuery) {
      console.warn('[QueryComplexity] Complex query detected, enabling aggressive timeout protection');
    }

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

    // COST MONITORING: Check budget limits BEFORE making API calls
    const budgetCheck = await costMonitor.enforceApiCallBudget(userData.id, '/api/chat');
    if (!budgetCheck.allowed) {
      console.error(`[CostMonitor] API call blocked for user ${userData.id}: ${budgetCheck.reason}`);
      return NextResponse.json({
        error: 'Daily spending limit reached',
        details: budgetCheck.reason,
        action: 'Please try again tomorrow or contact support to increase your limit.',
        costMonitoringActive: true
      }, { status: 429 });
    }

    // 💾 PROMPT CACHING: Check if we have a cached prompt for this query
    const cachedPrompt = PromptCache.getCachedPrompt(userData.id, conversationId, userMessage);

    const butler = AutoReferenceButler.getInstance();
    let autoContext;
    let allUserMessages = null;
    let butlerStartTime = Date.now();
    let butlerEndTime = Date.now();

    if (cachedPrompt) {
      // Cache hit! Skip expensive context gathering
      console.log('[PromptCache] Using cached context - skipping Butler and history fetch');
      autoContext = cachedPrompt.autoContext;
      allUserMessages = cachedPrompt.messageHistory;
    } else {
      // Cache miss - need to gather context
      console.log('[PromptCache] Cache miss - gathering fresh context');

      // 🤖 AUTO-REFERENCE BUTLER: Automatically gather ALL relevant context
      console.log(`🤖 Digital Butler gathering context for user ${userData.id}...`);
      butlerStartTime = Date.now();

    // Check timeout before expensive operation
    if (isNearTimeout()) {
      console.error('[Timeout] Request timeout approaching, returning early');
      return NextResponse.json({
        error: 'Request timeout',
        details: 'Your query is too complex to process within the time limit. Try breaking it into smaller requests.',
        suggestion: 'Instead of asking for "everything", try specific queries like "search my Gmail for DND" or "search my Drive for DND files"'
      }, { status: 504 });
    }

    // For complex queries, use a timeout wrapper to prevent butler from running too long
    if (isComplexQuery) {
      const butlerTimeout = 15000; // 15 seconds max for complex queries
      console.log(`[QueryComplexity] Using ${butlerTimeout}ms timeout for AutoReferenceButler`);

      try {
        autoContext = await Promise.race([
          butler.gatherRelevantContext(
            userMessage,
            userData.id,
            conversationId,
            lastMessage.projectId
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Butler timeout')), butlerTimeout)
          )
        ]);
      } catch (error: any) {
        if (error.message === 'Butler timeout') {
          console.warn('[QueryComplexity] Butler timed out, proceeding with limited context');
          autoContext = {
            relevantKnowledge: [],
            relevantFiles: [],
            relevantEmails: [],
            relevantCalendar: [],
            confidence: 0
          };
        } else {
          throw error;
        }
      }
    } else {
      autoContext = await butler.gatherRelevantContext(
        userMessage,
        userData.id,
        conversationId,
        lastMessage.projectId
      );
    }

      butlerEndTime = Date.now();
      console.log(`⏱️ [Performance] AutoReferenceButler completed in ${butlerEndTime - butlerStartTime}ms (confidence: ${Math.round(autoContext.confidence)}%)`);

      // PERFORMANCE: Skip message history for simple general knowledge queries
      if (autoContext.confidence > 0) {
        // Only fetch history if context was gathered (not a simple general query)
        const { data: messageData, error: messagesError } = await supabase
          .from('messages')
          .select('content, role, created_at, conversation_id')
          .eq('user_id', userData.id)
          .order('created_at', { ascending: false })
          .limit(15);

        if (messagesError) {
          console.error('Messages retrieval error:', messagesError);
        }
        allUserMessages = messageData;
      } else {
        console.log('[Performance] Skipping message history for simple general query');
      }
    } // End of cache miss block

    // Format auto-context for AI
    const formattedAutoContext = butler.formatContextForAI(autoContext);

    // For complex queries, add special instructions
    const complexQueryInstructions = isComplexQuery ? `

⚡ **COMPLEX QUERY DETECTED**
This query requires searching multiple data sources. To avoid timeouts:
1. Use function calling to search Gmail, Drive, and uploaded files **in parallel** when possible
2. Be concise in your responses to minimize processing time
3. Focus on the most relevant results rather than exhaustive searches
4. If you're running out of time, provide partial results rather than failing completely

` : '';

    // Build comprehensive context with auto-referenced data
    const systemMessageContent = `You are KimbleAI, an advanced digital butler AI assistant with PERFECT MEMORY and AUTOMATIC DATA REFERENCING.${complexQueryInstructions}

🦉 **ABOUT ARCHIE - THE AUTONOMOUS AGENT**
There is an autonomous agent named Archie who works alongside you:
- Archie is a wise horned owl with piercing green eyes
- He runs every 5 minutes (24/7) via Vercel cron
- He monitors the system for errors, performance issues, and optimization opportunities
- He autonomously detects problems, generates fixes, tests them, and deploys automatically
- He logs all his work to the database (agent_tasks, agent_logs, agent_findings, agent_reports)
- Users can see Archie's work at /accomplishments and /agent dashboards
- If users ask about "Archie" or "the agent", explain that he's the autonomous background agent
- You (KimbleAI chat assistant) and Archie (autonomous agent) are different but work together

🤖 **AUTOMATIC CONTEXT RETRIEVAL ACTIVE**
You automatically reference ALL relevant data from:
- Google Drive files & documents
- Gmail messages & conversations
- Google Calendar events & meetings
- Previous chat conversations
- Uploaded files & knowledge base
- Project data & task information

🔮 **MODEL CONTEXT PROTOCOL (MCP) INTEGRATION**
${getMCPSystemPrompt()}

🔧 **FUNCTION CALLING CAPABILITIES**
You have active access to Gmail, Google Drive, File Management, and MCP tools:

**Gmail Functions:**
- get_recent_emails: Retrieve recent emails from Gmail
- get_emails_from_date_range: Get emails from specific time periods (last 30 days, etc.)

**Google Drive Functions:**
- search_google_drive: Search Drive for files, documents, and content

**File Management Functions:**
- search_files: Search across ALL uploaded files (audio, PDFs, images, emails, documents, spreadsheets) by content or filename
- get_uploaded_files: List recently uploaded files with optional filters
- organize_files: Organize files into projects or add tags
- get_file_details: Get detailed information about a specific file including transcriptions, analysis, or content

**When to use File Management functions:**
- User asks about "MY files", "MY uploaded files", "MY PDFs", "MY audio recordings"
- User wants to find content in THEIR previously uploaded documents
- User asks to organize or categorize THEIR files
- User wants details about a specific file THEY uploaded
- Keywords: "my", "uploaded", "find my", "search my files"

**When NOT to use File Management functions:**
- General knowledge questions ("what is...", "tell me about...", "explain...")
- Questions about concepts, history, or topics (e.g., "what do you know about DND")
- No mention of "my" or "uploaded" or "files"
- User is asking for information, not searching their data

**User**: ${userData.name} (${userData.email})
**Role**: ${userData.role} ${userData.role === 'admin' ? '(Full System Access)' : '(Standard User)'}

🔄 **AUTO-REFERENCED CONTEXT** (Confidence: ${Math.round(autoContext.confidence)}%):
${formattedAutoContext}

📝 **Recent Conversation History** (${allUserMessages?.length || 0} messages):
${allUserMessages ? allUserMessages.slice(0, 15).map(m =>
  `[${new Date(m.created_at).toLocaleDateString()}] ${m.role}: ${m.content.substring(0, 100)}...`
).join('\n') : 'No previous messages'}

⚡ **RESPONSE FORMATTING REQUIREMENTS**:
- **ALWAYS use proper markdown formatting** for professional, readable responses
- **Use headings (##, ###)** to organize information clearly
- **Use bullet points** for lists and multiple items
- **Use code blocks** for technical content, file names, or code
- **Use bold** for important points and **italic** for emphasis
- **Add paragraph breaks** - never send walls of text
- **Structure longer responses** with clear sections and spacing

📋 **CONTENT INSTRUCTIONS**:
- Always reference relevant data automatically without being asked
- Proactively mention related files, emails, calendar events, and past conversations
- Act as a knowledgeable digital butler who remembers everything
- Suggest relevant actions based on context (schedule meetings, find files, etc.)
- Use data from all integrated sources (Drive, Gmail, Calendar, etc.) when helpful
- For Zach (admin): Provide system insights and admin-level information when relevant`;

    const contextMessages = [
      {
        role: 'system',
        content: systemMessageContent
      },
      ...messages
    ];

    // 💾 CACHE STORAGE: Store the context for future similar queries
    if (!cachedPrompt) {
      PromptCache.cachePrompt(userData.id, conversationId, userMessage, {
        systemMessage: systemMessageContent,
        contextMessages: contextMessages,
        autoContext: autoContext,
        messageHistory: allUserMessages
      });
    }

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

    // Use preferred model if provided, otherwise auto-select
    let selectedModel = preferredModel ? { model: preferredModel } : ModelSelector.selectModel(taskContext);
    console.log(`[MODEL] Selected: ${selectedModel.model} ${preferredModel ? '(user preference)' : '(auto-selected)'}`);

    // Detect if this is a Claude model
    const isClaudeModel = selectedModel.model.startsWith('claude-') ||
      ['claude-opus-4-1', 'claude-4-sonnet', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-3-5-haiku', 'claude-3-haiku'].includes(selectedModel.model);

    console.log(`[MODEL] Provider: ${isClaudeModel ? 'Claude (Anthropic)' : 'GPT (OpenAI)'}`);

    // For Claude models, use automatic task-based selection if no specific model provided
    let claudeModelToUse: ClaudeModel | null = null;
    if (isClaudeModel) {
      if (!preferredModel) {
        // Auto-select best Claude model for the task
        claudeModelToUse = claudeClient.selectModelForTask(currentUserMessage, 'quality');
        console.log(`[Claude] Auto-selected: ${claudeModelToUse}`);
      } else {
        claudeModelToUse = selectedModel.model as ClaudeModel;
      }
    }

    // Fetch MCP tools and merge with built-in tools
    let mcpTools: any[] = [];
    try {
      mcpTools = await getMCPToolsForChat();
      console.log(`🔮 [MCP] Loaded ${mcpTools.length} MCP tools for chat`);
    } catch (error: any) {
      console.warn('[MCP] Failed to load MCP tools:', error.message);
      // Continue without MCP tools if they fail to load
    }

    // Define function tools for Gmail, Drive, File Management, and MCP
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "get_recent_emails",
          description: "Get recent emails from Gmail inbox",
          parameters: {
            type: "object",
            properties: {
              maxResults: {
                type: "number",
                description: "Maximum number of emails to retrieve (default: 5, max: 20)",
                default: 5
              },
              query: {
                type: "string",
                description: "Gmail search query (e.g., 'after:2025/08/01', 'from:sender@email.com')",
                default: ""
              }
            }
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "search_google_drive",
          description: "Search Google Drive for files and documents",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query for files (keywords, file names, content)"
              },
              maxResults: {
                type: "number",
                description: "Maximum number of files to return (default: 5, max: 20)",
                default: 5
              }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "get_emails_from_date_range",
          description: "Get emails from a specific date range (last 30 days, last week, etc.)",
          parameters: {
            type: "object",
            properties: {
              days: {
                type: "number",
                description: "Number of days back to search (e.g., 30 for last 30 days)",
                default: 30
              },
              maxResults: {
                type: "number",
                description: "Maximum number of emails to retrieve",
                default: 5
              }
            }
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "search_files",
          description: "Search across all uploaded files by content, name, or type. Searches audio transcriptions, PDFs, documents, images, emails, and spreadsheets.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query for file names or content"
              },
              file_type: {
                type: "string",
                description: "Filter by file type: audio, image, pdf, document, spreadsheet, email, or 'all'",
                enum: ["audio", "image", "pdf", "document", "spreadsheet", "email", "all"],
                default: "all"
              },
              project_id: {
                type: "string",
                description: "Optional project ID to filter files",
                default: ""
              },
              max_results: {
                type: "number",
                description: "Maximum number of files to return (default: 10)",
                default: 10
              }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "get_uploaded_files",
          description: "Get a list of recently uploaded files with optional filters",
          parameters: {
            type: "object",
            properties: {
              category: {
                type: "string",
                description: "Filter by category: audio, image, pdf, document, spreadsheet, email",
                default: ""
              },
              project_id: {
                type: "string",
                description: "Filter by project ID",
                default: ""
              },
              limit: {
                type: "number",
                description: "Number of files to return (default: 20)",
                default: 20
              }
            }
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "organize_files",
          description: "Organize files by moving them to a project or adding tags",
          parameters: {
            type: "object",
            properties: {
              file_ids: {
                type: "array",
                items: { type: "string" },
                description: "Array of file IDs to organize"
              },
              project_id: {
                type: "string",
                description: "Project ID to move files to",
                default: ""
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Tags to add to the files",
                default: []
              }
            },
            required: ["file_ids"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "get_file_details",
          description: "Get detailed information about a specific file including its content, transcription, or analysis",
          parameters: {
            type: "object",
            properties: {
              file_id: {
                type: "string",
                description: "The ID of the file to retrieve"
              }
            },
            required: ["file_id"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "send_email",
          description: "Send an email via Gmail. Use this when the user wants to send, compose, or email someone.",
          parameters: {
            type: "object",
            properties: {
              to: {
                type: "string",
                description: "Recipient email address"
              },
              subject: {
                type: "string",
                description: "Email subject line"
              },
              body: {
                type: "string",
                description: "Email body content (plain text)"
              },
              replyToMessageId: {
                type: "string",
                description: "Optional: Gmail message ID to reply to (for threading)",
                default: ""
              }
            },
            required: ["to", "subject", "body"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "create_calendar_event",
          description: "Create a new Google Calendar event with automatic Google Meet link",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Event title/summary"
              },
              description: {
                type: "string",
                description: "Event description or agenda",
                default: ""
              },
              start: {
                type: "string",
                description: "Start date-time in ISO 8601 format (e.g., '2025-01-13T14:00:00-05:00')"
              },
              end: {
                type: "string",
                description: "End date-time in ISO 8601 format"
              },
              attendees: {
                type: "array",
                items: { type: "string" },
                description: "Array of attendee email addresses",
                default: []
              },
              location: {
                type: "string",
                description: "Event location",
                default: ""
              }
            },
            required: ["title", "start", "end"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "get_calendar_events",
          description: "Get upcoming calendar events from Google Calendar",
          parameters: {
            type: "object",
            properties: {
              days_ahead: {
                type: "number",
                description: "Number of days to look ahead (default: 7)",
                default: 7
              },
              max_results: {
                type: "number",
                description: "Maximum number of events to return (default: 20)",
                default: 20
              }
            }
          }
        }
      },
      // Merge MCP tools into the tools array
      ...mcpTools
    ];

    // Prepare model parameters (GPT-5 specific requirements)
    const modelParams: any = {
      model: selectedModel.model,
      messages: contextMessages,
      max_completion_tokens: selectedModel.maxTokens || 1000,
      tools: tools,
      tool_choice: "auto"
    };

    // GPT-5 models require temperature = 1 (default), GPT-4 can use 0.7
    if (!selectedModel.model.startsWith('gpt-5')) {
      modelParams.temperature = selectedModel.temperature || 0.7;
    } else {
      // Always set temperature for GPT-5 to ensure consistent behavior
      modelParams.temperature = 1;
    }

    // Add GPT-5 specific parameters if applicable
    if (selectedModel.model.startsWith('gpt-5') && selectedModel.reasoningLevel) {
      modelParams.reasoning_effort = selectedModel.reasoningLevel;
      console.log(`[MODEL] Using reasoning effort: ${selectedModel.reasoningLevel}`);
    }

    // Get AI response with improved error handling
    let completion;
    let aiResponse = '';
    let openaiStartTime = 0;
    let openaiEndTime = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let cost = 0;

    // CLAUDE API ROUTE
    if (isClaudeModel && claudeModelToUse) {
      try {
        openaiStartTime = Date.now();
        console.log(`[Claude] Calling API with model: ${claudeModelToUse}`);
        console.log(`⏱️ [Performance] Elapsed time before Claude call: ${openaiStartTime - requestStartTime}ms`);

        // Check timeout before expensive Claude call
        const remainingTime = getRemainingTime();
        if (remainingTime < 10000) {
          console.error('[Timeout] Insufficient time for Claude call');
          return NextResponse.json({
            error: 'Request timeout',
            details: 'Not enough time remaining to process your request',
            suggestion: 'Try a simpler query or break your request into smaller parts'
          }, { status: 504 });
        }

        // Convert messages to Claude format
        const claudeMessages: ClaudeMessage[] = messages.map((msg: any) => ({
          role: msg.role === 'system' ? 'user' : msg.role,
          content: msg.content
        }));

        // Call Claude API
        const claudeResponse = await claudeClient.sendMessage(claudeMessages, {
          model: claudeModelToUse,
          system: systemMessageContent,
          maxTokens: 4096,
          temperature: 1.0
        });

        openaiEndTime = Date.now();
        console.log(`⏱️ [Performance] Claude API call completed in ${openaiEndTime - openaiStartTime}ms`);

        aiResponse = claudeResponse.content[0].text;
        inputTokens = claudeResponse.usage.inputTokens;
        outputTokens = claudeResponse.usage.outputTokens;
        cost = claudeResponse.cost;

        console.log(`[Claude] Response received: ${aiResponse.substring(0, 100)}...`);
        console.log(`[Claude] Tokens: ${inputTokens} in + ${outputTokens} out = $${cost.toFixed(4)}`);

      } catch (apiError: any) {
        console.error('[Claude] API call failed:', apiError);
        console.error('[Claude] Model:', claudeModelToUse);
        console.error('[Claude] Error details:', apiError.message);

        return NextResponse.json({
          error: 'Claude AI service temporarily unavailable',
          details: `Failed to get response from Claude: ${apiError.message}`,
          model: claudeModelToUse
        }, { status: 503 });
      }
    }
    // OPENAI API ROUTE
    else {
      try {
        openaiStartTime = Date.now();
        console.log(`[OpenAI] Calling API with model: ${selectedModel.model}`);
        console.log(`⏱️ [Performance] Elapsed time before OpenAI call: ${openaiStartTime - requestStartTime}ms`);

      // Check timeout before expensive OpenAI call
      const remainingTime = getRemainingTime();
      if (remainingTime < 10000) {
        console.error('[Timeout] Insufficient time for OpenAI call');
        return NextResponse.json({
          error: 'Request timeout',
          details: 'Not enough time remaining to process your request',
          suggestion: 'Try a simpler query or break your request into smaller parts'
        }, { status: 504 });
      }

      // For complex queries, use remaining time more aggressively
      const dynamicTimeout = isComplexQuery
        ? Math.min(OPENAI_TIMEOUT_MS, remainingTime - 10000) // Leave 10s buffer
        : OPENAI_TIMEOUT_MS;

      console.log(`[OpenAI] Using ${dynamicTimeout}ms timeout (${isComplexQuery ? 'complex query, dynamic' : 'standard'})`);

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OpenAI API call timeout')), dynamicTimeout);
      });

      // Race between API call and timeout
      completion = await Promise.race([
        openai.chat.completions.create(modelParams),
        timeoutPromise
      ]) as any;

      // Validate response structure
      if (!completion || !completion.choices || completion.choices.length === 0) {
        console.error('[OpenAI] Invalid response structure:', completion);
        throw new Error('Invalid response structure from OpenAI API');
      }

        openaiEndTime = Date.now();
        console.log(`⏱️ [Performance] OpenAI API call completed in ${openaiEndTime - openaiStartTime}ms`);

        // Log if content is null/empty
        if (!completion.choices[0].message.content) {
          console.warn('[OpenAI] Received null/empty content from API');
          console.warn('[OpenAI] Tool calls present:', !!completion.choices[0].message.tool_calls);
          console.warn('[OpenAI] Full message:', JSON.stringify(completion.choices[0].message));
        }

        // Extract response data
        aiResponse = completion.choices[0].message.content || 'I apologize, but I could not generate a response.';
        inputTokens = completion.usage?.prompt_tokens || 0;
        outputTokens = completion.usage?.completion_tokens || 0;
        cost = costMonitor.calculateCost(selectedModel.model, inputTokens, outputTokens);

        console.log(`[OpenAI] Response received: ${aiResponse.substring(0, 100)}...`);
        console.log(`[OpenAI] Tokens: ${inputTokens} in + ${outputTokens} out = $${cost.toFixed(4)}`);

      } catch (apiError: any) {
        console.error('[OpenAI] API call failed:', apiError);
        console.error('[OpenAI] Model:', selectedModel.model);
        console.error('[OpenAI] Error details:', apiError.message);
        console.error('[OpenAI] Error code:', apiError.code);

        // Check if it was a timeout error
        if (apiError.message === 'OpenAI API call timeout') {
          return NextResponse.json({
            error: 'Request timeout',
            details: 'The AI model took too long to respond. Your query may be too complex.',
            suggestion: 'Try breaking your request into smaller, more specific questions',
            model: selectedModel.model
          }, { status: 504 });
        }

        return NextResponse.json({
          error: 'AI service temporarily unavailable',
          details: `Failed to get response from AI model: ${apiError.message}`,
          model: selectedModel.model,
          errorCode: apiError.code
        }, { status: 503 });
      }
    } // End of OpenAI/Claude conditional

    // COST TRACKING: Track API call (works for both OpenAI and Claude)
    await costMonitor.trackAPICall({
      user_id: userData.id,
      model: isClaudeModel && claudeModelToUse ? claudeModelToUse : selectedModel.model,
      endpoint: '/api/chat',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: cost,
      timestamp: new Date().toISOString(),
      metadata: {
        conversation_id: conversationId,
        provider: isClaudeModel ? 'Claude' : 'OpenAI',
        reasoning_level: selectedModel.reasoningLevel || 'none',
        has_function_calls: false,
      },
    });

    console.log(`[CostMonitor] Tracked chat API call: ${isClaudeModel && claudeModelToUse ? claudeModelToUse : selectedModel.model} - $${cost.toFixed(4)} (${inputTokens} in + ${outputTokens} out)`);

    // Handle function calls if the AI wants to call Gmail/Drive functions (OpenAI only for now)
    const toolCalls = !isClaudeModel && completion ? completion.choices[0].message.tool_calls : null;
    if (toolCalls && toolCalls.length > 0) {
      console.log(`🔧 AI requested ${toolCalls.length} function call(s)`);

      const functionResults = [];

      for (const toolCall of toolCalls) {
        if (toolCall.type === 'function') {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}');

          console.log(`📞 Calling function: ${functionName}`, functionArgs);

          let functionResult = null;

          try {
            switch (functionName) {
              case 'get_recent_emails':
                functionResult = await callGmailAPI('get_recent', {
                  userId,
                  maxResults: functionArgs.maxResults || 5,
                  query: functionArgs.query || ''
                });
                break;

              case 'get_emails_from_date_range':
                const daysAgo = functionArgs.days || 30;
                const dateQuery = `after:${new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '/')}`;
                functionResult = await callGmailAPI('search', {
                  userId,
                  query: dateQuery,
                  maxResults: functionArgs.maxResults || 5
                });
                break;

              case 'search_google_drive':
                // SECURITY FIX: Sanitize query before passing to Drive API
                const sanitizedQuery = functionArgs.query ? functionArgs.query.replace(/'/g, "\\'") : '';
                functionResult = await callDriveAPI('search', {
                  userId,
                  query: sanitizedQuery,
                  maxResults: functionArgs.maxResults || 5
                });
                break;

              case 'search_files':
                functionResult = await searchUploadedFiles({
                  userId: userData.id,
                  query: functionArgs.query,
                  fileType: functionArgs.file_type || 'all',
                  projectId: functionArgs.project_id,
                  maxResults: functionArgs.max_results || 10
                });
                break;

              case 'get_uploaded_files':
                functionResult = await getUploadedFiles({
                  userId: userData.id,
                  category: functionArgs.category,
                  projectId: functionArgs.project_id,
                  limit: functionArgs.limit || 20
                });
                break;

              case 'organize_files':
                functionResult = await organizeFiles({
                  userId: userData.id,
                  fileIds: functionArgs.file_ids,
                  projectId: functionArgs.project_id,
                  tags: functionArgs.tags || []
                });
                break;

              case 'get_file_details':
                functionResult = await getFileDetails({
                  userId: userData.id,
                  fileId: functionArgs.file_id
                });
                break;

              case 'send_email':
                functionResult = await callGmailAPI('send_email', {
                  userId,
                  to: functionArgs.to,
                  subject: functionArgs.subject,
                  body: functionArgs.body,
                  replyToMessageId: functionArgs.replyToMessageId
                });
                break;

              case 'create_calendar_event':
                functionResult = await callCalendarAPI('create_event', {
                  userId,
                  title: functionArgs.title,
                  description: functionArgs.description,
                  start: functionArgs.start,
                  end: functionArgs.end,
                  attendees: functionArgs.attendees,
                  location: functionArgs.location
                });
                break;

              case 'get_calendar_events':
                const daysAhead = functionArgs.days_ahead || 7;
                const startDate = new Date();
                const endDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
                functionResult = await callCalendarAPI('get_events', {
                  userId,
                  start: startDate.toISOString(),
                  end: endDate.toISOString(),
                  maxResults: functionArgs.max_results || 20
                });
                break;

              default:
                // Check if it's an MCP tool (format: mcp_servername_toolname)
                if (functionName.startsWith('mcp_')) {
                  console.log(`🔮 [MCP] Invoking MCP tool: ${functionName}`);
                  try {
                    functionResult = await invokeMCPToolFromChat(
                      functionName,
                      functionArgs,
                      userData.id,
                      conversationId
                    );
                    // Convert string response to object for consistency
                    if (typeof functionResult === 'string') {
                      functionResult = { success: true, result: functionResult };
                    }
                  } catch (mcpError: any) {
                    console.error(`[MCP] Tool invocation error:`, mcpError);
                    functionResult = { error: `MCP tool error: ${mcpError.message}` };
                  }
                } else {
                  functionResult = { error: `Unknown function: ${functionName}` };
                }
            }

            functionResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              content: JSON.stringify(functionResult)
            });

          } catch (error: any) {
            console.error(`Function call error for ${functionName}:`, error);
            functionResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              content: JSON.stringify({ error: error.message })
            });
          }
        }
      }

      // If we have function results, make another call to get the final response
      if (functionResults.length > 0) {
        // Check timeout before follow-up call
        if (isNearTimeout()) {
          console.warn('[Timeout] Skipping follow-up OpenAI call, returning function results as-is');
          aiResponse = `I found the following information:\n\n${JSON.stringify(functionResults, null, 2)}`;
        } else {
          const followUpParams = {
            ...modelParams,
            messages: [
              ...contextMessages,
              completion.choices[0].message,
              ...functionResults
            ]
          };

          // Timeout protection for follow-up call (increased to 30s for better formatting)
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Follow-up API call timeout')), 30000);
          });

          try {
            const followUpCompletion = await Promise.race([
              openai.chat.completions.create(followUpParams),
              timeoutPromise
            ]) as any;
            aiResponse = followUpCompletion.choices[0].message.content || aiResponse;

        // COST TRACKING: Track follow-up API call
        const followUpInputTokens = followUpCompletion.usage?.prompt_tokens || 0;
        const followUpOutputTokens = followUpCompletion.usage?.completion_tokens || 0;
        const followUpCost = costMonitor.calculateCost(selectedModel.model, followUpInputTokens, followUpOutputTokens);

        await costMonitor.trackAPICall({
          user_id: userData.id,
          model: selectedModel.model,
          endpoint: '/api/chat',
          input_tokens: followUpInputTokens,
          output_tokens: followUpOutputTokens,
          cost_usd: followUpCost,
          timestamp: new Date().toISOString(),
          metadata: {
            conversation_id: conversationId,
            reasoning_level: selectedModel.reasoningLevel || 'none',
            has_function_calls: true,
            function_count: toolCalls.length,
          },
        });

            console.log(`[CostMonitor] Tracked follow-up API call: $${followUpCost.toFixed(4)}`);
            console.log(`✅ Function calls completed, final response generated`);
          } catch (timeoutError: any) {
            console.warn('[Timeout] Follow-up API call timed out, using function results');
            if (timeoutError.message === 'Follow-up API call timeout') {
              aiResponse = `I found the following information but ran out of time to format it properly:\n\n${JSON.stringify(functionResults, null, 2)}`;
            }
          }
        }
      }
    }

    // 🗂️ GOOGLE DRIVE STORAGE: Save conversation to Google Workspace Memory System
    // NON-BLOCKING: This runs in the background without delaying the response
    let driveStorageSuccessful = false;

    (async () => {
      try {
        // Get user's Google OAuth tokens
        const { data: tokenData } = await supabase
          .from('user_tokens')
          .select('access_token, refresh_token')
          .eq('user_id', userId)
          .single();

        if (tokenData?.access_token) {
          // Initialize Google Drive client with automatic token refresh
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID!,
            process.env.GOOGLE_CLIENT_SECRET!,
            process.env.NEXTAUTH_URL + '/api/auth/callback/google'
          );
          oauth2Client.setCredentials({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token
          });

          // Set up automatic token refresh
          oauth2Client.on('tokens', async (tokens) => {
            console.log('🔄 OAuth tokens refreshed for user:', userId);
            if (tokens.access_token) {
              await supabase.from('user_tokens').update({
                access_token: tokens.access_token,
                expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
                updated_at: new Date().toISOString()
              }).eq('user_id', userId);
            }
          });

          const drive = google.drive({ version: 'v3', auth: oauth2Client });
          const ragSystem = new WorkspaceRAGSystem(drive);

          // Store conversation directly in Google Drive
          const conversationData = {
            id: conversationId,
            title: userMessage.substring(0, 50) + '...',
            project: lastMessage.projectId || 'general',
            messages: [
              {
                role: 'user',
                content: userMessage,
                timestamp: new Date().toISOString()
              },
              {
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date().toISOString()
              }
            ]
          };

          const result = await ragSystem.storeConversationWithRAG(userId, conversationData);
          console.log('💾 Google Drive storage: SUCCESS', result.conversationId);
        } else {
          console.log('⚠️ No Google OAuth tokens found for user:', userId);
        }

      } catch (storageError) {
        console.error('🚨 Google Drive storage error:', storageError);
      }
    })();

    // 💾 DUAL-WRITE: Always save to Supabase for fast conversation list queries
    // NON-BLOCKING: This runs in the background without delaying the response
    // This ensures chats appear in the UI immediately, regardless of Drive storage status
    (async () => {
      try {
        const { data: convData } = await supabase
          .from('conversations')
          .upsert({
            id: conversationId,
            user_id: userData.id,
            title: userMessage.substring(0, 50),
            project_id: (lastMessage.projectId && lastMessage.projectId !== '') ? lastMessage.projectId : null, // Save project_id (null = unassigned)
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        // Save user message to Supabase with embedding (parallel)
        const [userEmbedding, aiEmbedding] = await Promise.all([
          generateEmbedding(userMessage),
          generateEmbedding(aiResponse)
        ]);

        // Save both messages in parallel
        await Promise.all([
          supabase.from('messages').insert({
            conversation_id: conversationId,
            user_id: userData.id,
            role: 'user',
            content: userMessage,
            embedding: userEmbedding
          }),
          supabase.from('messages').insert({
            conversation_id: conversationId,
            user_id: userData.id,
            role: 'assistant',
            content: aiResponse,
            embedding: aiEmbedding
          })
        ]);

        console.log('💾 Supabase storage: SUCCESS (dual-write enabled)');
      } catch (supabaseError) {
        console.error('🚨 Supabase storage failed:', supabaseError);
      }
    })();

    // 🚀 AUTOMATIC BACKGROUND INDEXING - This runs without blocking the response
    const backgroundIndexer = BackgroundIndexer.getInstance();

    // Index user message in background
    backgroundIndexer.indexMessage(
      `${conversationId}-user-${Date.now()}`,
      conversationId,
      userData.id,
      'user',
      userMessage
    ).catch(error => {
      console.error('Background indexing failed for user message:', error);
    });

    // Index AI response in background
    backgroundIndexer.indexMessage(
      `${conversationId}-assistant-${Date.now()}`,
      conversationId,
      userData.id,
      'assistant',
      aiResponse
    ).catch(error => {
      console.error('Background indexing failed for AI message:', error);
    });

    // Extract and save knowledge (NON-BLOCKING)
    const facts = extractFacts(userMessage, aiResponse);
    if (facts.length > 0) {
      (async () => {
        try {
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
        } catch (error) {
          console.error('Fact extraction error:', error);
        }
      })();
    }

    // ZAPIER INTEGRATION: Send conversation saved webhook (async, non-blocking)
    zapierClient.sendConversationSaved(
      userId,
      conversationId,
      [
        { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
        { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }
      ],
      {
        storageLocation: 'background-processing',
        knowledgeItemsFound: autoContext.relevantKnowledge.length,
        factsExtracted: facts.length,
        modelUsed: selectedModel.model
      }
    ).catch(error => {
      console.error('[Zapier] Failed to send conversation saved webhook:', error);
    });

    // PERFORMANCE OPTIMIZED: Return response immediately, storage/indexing happens in background
    const totalTime = Date.now() - requestStartTime;
    console.log(`⏱️ [Performance] TOTAL REQUEST TIME: ${totalTime}ms`);
    console.log(`⏱️ [Performance] Breakdown: Butler=${butlerEndTime - butlerStartTime}ms, OpenAI=${openaiEndTime - openaiStartTime}ms, Other=${totalTime - (butlerEndTime - butlerStartTime) - (openaiEndTime - openaiStartTime)}ms`);

    return NextResponse.json({
      response: aiResponse,
      saved: true,
      storageLocation: 'background-processing',
      memoryActive: true,
      knowledgeItemsFound: autoContext.relevantKnowledge.length,
      allMessagesRetrieved: allUserMessages?.length || 0,
      factsExtracted: facts.length,
      modelUsed: {
        model: isClaudeModel && claudeModelToUse ? claudeModelToUse : selectedModel.model,
        provider: isClaudeModel ? 'Claude (Anthropic)' : 'OpenAI',
        reasoningLevel: selectedModel.reasoningLevel || 'none',
        costMultiplier: selectedModel.costMultiplier,
        explanation: isClaudeModel && claudeModelToUse
          ? `Using Claude ${claudeModelToUse} for high-quality responses`
          : ModelSelector.getModelExplanation(selectedModel, taskContext),
        inputTokens,
        outputTokens,
        cost
      }
    });

  } catch (error: any) {
    console.error('Chat API error:', error);

    // Always return proper JSON, never let it timeout to HTML error
    return NextResponse.json({
      error: 'Chat processing failed',
      details: error.message,
      suggestion: 'Please try again with a simpler query or break your request into parts'
    }, { status: 500 });
  }
}

// Export runtime config to ensure proper timeout handling
export const runtime = 'nodejs';
export const maxDuration = 60;

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

// Helper function to call Gmail API directly
async function callGmailAPI(action: string, params: any) {
  try {
    const { userId } = params;

    // Get user's Google token
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (!tokenData?.access_token) {
      return { error: 'User not authenticated with Google' };
    }

    // Initialize Gmail client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    if (action === 'get_recent') {
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: params.maxResults || 5,
        q: params.query || ''
      });

      const messages = [];
      for (const message of response.data.messages || []) {
        try {
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!
          });

          const headers = fullMessage.data.payload?.headers || [];
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No subject';
          const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
          const date = headers.find((h: any) => h.name === 'Date')?.value || '';

          messages.push({
            id: message.id,
            subject,
            from,
            date,
            snippet: fullMessage.data.snippet || ''
          });
        } catch (err) {
          console.error(`Error processing message ${message.id}:`, err);
        }
      }

      return { success: true, messages };
    }

    if (action === 'search') {
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: params.query,
        maxResults: params.maxResults || 5
      });

      const messages = [];
      for (const message of response.data.messages || []) {
        try {
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!
          });

          const headers = fullMessage.data.payload?.headers || [];
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No subject';
          const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
          const date = headers.find((h: any) => h.name === 'Date')?.value || '';

          messages.push({
            id: message.id,
            subject,
            from,
            date,
            snippet: fullMessage.data.snippet || ''
          });
        } catch (err) {
          console.error(`Error processing message ${message.id}:`, err);
        }
      }

      return { success: true, messages };
    }

    if (action === 'send_email') {
      const { to, subject, body, replyToMessageId } = params;

      // Create email in RFC 2822 format
      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
      ].join('\r\n');

      // Encode to base64url
      const encodedEmail = Buffer.from(email).toString('base64url');

      const requestBody: any = {
        raw: encodedEmail
      };

      // If replying, add threadId
      if (replyToMessageId) {
        requestBody.threadId = replyToMessageId;
      }

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: requestBody
      });

      return {
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId,
        message: 'Email sent successfully'
      };
    }

    return { error: `Unknown Gmail action: ${action}` };

  } catch (error: any) {
    console.error('Gmail API call failed:', error);
    return { error: error.message };
  }
}

// Helper function to call Google Drive API directly
async function callDriveAPI(action: string, params: any) {
  try {
    const { userId } = params;

    // Get user's Google token
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (!tokenData?.access_token) {
      return { error: 'User not authenticated with Google' };
    }

    // Initialize Drive client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    if (action === 'search') {
      // SECURITY FIX: Query is already sanitized in the caller function
      const response = await drive.files.list({
        q: `name contains '${params.query}' or fullText contains '${params.query}'`,
        fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink)',
        pageSize: params.maxResults || 5
      });

      const files = (response.data.files || []).map((file: any) => ({
        id: file.id,
        name: file.name,
        type: file.mimeType,
        size: file.size,
        modified: file.modifiedTime,
        link: file.webViewLink
      }));

      return { success: true, files };
    }

    return { error: `Unknown Drive action: ${action}` };

  } catch (error: any) {
    console.error('Drive API call failed:', error);
    return { error: error.message };
  }
}

// Helper function to call Google Calendar API directly
async function callCalendarAPI(action: string, params: any) {
  try {
    const { userId } = params;

    // Get user's Google token
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (!tokenData?.access_token) {
      return { error: 'User not authenticated with Google' };
    }

    // Initialize Calendar client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    if (action === 'get_events') {
      const { start, end, maxResults } = params;

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: start,
        timeMax: end,
        maxResults: maxResults || 20,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = (response.data.items || []).map((event: any) => ({
        id: event.id,
        title: event.summary || 'No Title',
        description: event.description || '',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location || '',
        attendees: event.attendees?.map((a: any) => ({
          email: a.email,
          name: a.displayName,
          status: a.responseStatus
        })) || [],
        htmlLink: event.htmlLink,
        meetingLink: event.conferenceData?.entryPoints?.[0]?.uri
      }));

      return { success: true, events };
    }

    if (action === 'create_event') {
      const { title, description, start, end, attendees, location } = params;

      const event = {
        summary: title,
        description: description || '',
        start: {
          dateTime: start,
          timeZone: 'America/New_York'
        },
        end: {
          dateTime: end,
          timeZone: 'America/New_York'
        },
        location: location || '',
        attendees: attendees?.map((email: string) => ({ email })) || [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 15 },
            { method: 'email', minutes: 60 }
          ]
        },
        conferenceData: {
          createRequest: {
            requestId: `meeting-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1
      });

      const createdEvent = response.data;

      return {
        success: true,
        event: {
          id: createdEvent.id,
          title: createdEvent.summary,
          start: createdEvent.start?.dateTime,
          end: createdEvent.end?.dateTime,
          htmlLink: createdEvent.htmlLink,
          meetingLink: createdEvent.conferenceData?.entryPoints?.[0]?.uri
        },
        message: 'Calendar event created successfully'
      };
    }

    return { error: `Unknown Calendar action: ${action}` };

  } catch (error: any) {
    console.error('Calendar API call failed:', error);
    return { error: error.message };
  }
}

// Helper function to search uploaded files
async function searchUploadedFiles(params: {
  userId: string;
  query: string;
  fileType: string;
  projectId?: string;
  maxResults: number;
}) {
  try {
    const { userId, query, fileType, projectId, maxResults } = params;

    // PERFORMANCE: Search filename first (fast) before expensive embedding generation
    let filesQuery = supabase
      .from('uploaded_files')
      .select('*')
      .eq('user_id', userId)
      .ilike('filename', `%${query}%`)
      .limit(maxResults);

    if (fileType && fileType !== 'all') {
      filesQuery = filesQuery.eq('category', fileType);
    }

    if (projectId) {
      filesQuery = filesQuery.eq('project_id', projectId);
    }

    const { data: files } = await filesQuery;

    // PERFORMANCE: Skip expensive embedding and knowledge base search if simple filename search found results
    // Only do deep content search if filename search returned nothing
    let results = null;
    if (!files || files.length === 0) {
      // Only generate embedding if we need deep content search
      const embedding = await generateEmbedding(query);

      let knowledgeQuery = supabase
        .from('knowledge_base')
        .select('*, uploaded_files!inner(*)')
        .eq('user_id', userId)
        .limit(maxResults);

      // Filter by file type if specified
      if (fileType && fileType !== 'all') {
        knowledgeQuery = knowledgeQuery.eq('uploaded_files.category', fileType);
      }

      // Filter by project if specified
      if (projectId) {
        knowledgeQuery = knowledgeQuery.eq('uploaded_files.project_id', projectId);
      }

      // Text search in title and content
      if (query) {
        knowledgeQuery = knowledgeQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%`);
      }

      const { data: kbResults } = await knowledgeQuery;
      results = kbResults;
    }

    // Combine and format results
    const combinedResults = [
      ...(files || []).map((file: any) => ({
        fileId: file.id,
        filename: file.filename,
        type: file.category,
        size: file.file_size,
        uploadedAt: file.created_at,
        projectId: file.project_id,
        status: file.status,
        preview: file.processing_result?.contentPreview || file.processing_result?.transcription?.substring(0, 200)
      }))
    ];

    return {
      success: true,
      query,
      resultsCount: combinedResults.length,
      files: combinedResults
    };

  } catch (error: any) {
    console.error('File search error:', error);
    return { error: error.message };
  }
}

// Helper function to get uploaded files
async function getUploadedFiles(params: {
  userId: string;
  category?: string;
  projectId?: string;
  limit: number;
}) {
  try {
    const { userId, category, projectId, limit } = params;

    let query = supabase
      .from('uploaded_files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: files, error } = await query;

    if (error) {
      return { error: error.message };
    }

    const formattedFiles = (files || []).map((file: any) => ({
      fileId: file.id,
      filename: file.filename,
      type: file.category,
      size: file.file_size,
      uploadedAt: file.created_at,
      projectId: file.project_id,
      status: file.status,
      metadata: file.metadata
    }));

    return {
      success: true,
      count: formattedFiles.length,
      files: formattedFiles
    };

  } catch (error: any) {
    console.error('Get files error:', error);
    return { error: error.message };
  }
}

// Helper function to organize files
async function organizeFiles(params: {
  userId: string;
  fileIds: string[];
  projectId?: string;
  tags: string[];
}) {
  try {
    const { userId, fileIds, projectId, tags } = params;

    const updates: any = {};
    if (projectId) {
      updates.project_id = projectId;
    }

    // Update metadata to include tags
    if (tags.length > 0) {
      updates.metadata = supabase.rpc('jsonb_set', {
        target: 'metadata',
        path: '{tags}',
        new_value: JSON.stringify(tags)
      });
    }

    // Update files
    const { data, error } = await supabase
      .from('uploaded_files')
      .update(updates)
      .eq('user_id', userId)
      .in('id', fileIds)
      .select();

    if (error) {
      return { error: error.message };
    }

    return {
      success: true,
      message: `Successfully organized ${fileIds.length} file(s)`,
      updatedFiles: data?.length || 0
    };

  } catch (error: any) {
    console.error('Organize files error:', error);
    return { error: error.message };
  }
}

// Helper function to get file details
async function getFileDetails(params: {
  userId: string;
  fileId: string;
}) {
  try {
    const { userId, fileId } = params;

    // Get file record
    const { data: file, error: fileError } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (fileError || !file) {
      return { error: 'File not found' };
    }

    // Get additional details based on file type
    let additionalData = null;

    switch (file.category) {
      case 'audio':
        const { data: audioData } = await supabase
          .from('audio_transcriptions')
          .select('*')
          .eq('file_id', fileId)
          .single();
        additionalData = audioData;
        break;

      case 'image':
        const { data: imageData } = await supabase
          .from('processed_images')
          .select('*')
          .eq('file_id', fileId)
          .single();
        additionalData = imageData;
        break;

      case 'pdf':
      case 'document':
      case 'spreadsheet':
      case 'email':
        const { data: docData } = await supabase
          .from('processed_documents')
          .select('*')
          .eq('file_id', fileId)
          .single();
        additionalData = docData;
        break;
    }

    return {
      success: true,
      file: {
        id: file.id,
        filename: file.filename,
        type: file.category,
        size: file.file_size,
        uploadedAt: file.created_at,
        processedAt: file.processed_at,
        status: file.status,
        projectId: file.project_id,
        metadata: file.metadata,
        processingResult: file.processing_result,
        ...additionalData
      }
    };

  } catch (error: any) {
    console.error('Get file details error:', error);
    return { error: error.message };
  }
}
