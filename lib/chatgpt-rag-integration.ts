/**
 * CHATGPT RAG INTEGRATION
 *
 * Integrates ChatGPT conversation search into the main RAG system
 * Enables kimbleai.com to search across your entire ChatGPT history
 * when providing context for conversations.
 */

import { searchChatGPTChunks } from './chatgpt-import-system';

export interface ChatGPTContextResult {
  found: boolean;
  chunks: Array<{
    conversationTitle: string;
    content: string;
    similarity: number;
    createDate: string;
  }>;
  summary: string;
}

/**
 * Search ChatGPT history for relevant context
 * Returns formatted context for inclusion in RAG prompts
 */
export async function getChatGPTContext(
  query: string,
  userId: string,
  options: {
    similarityThreshold?: number;
    maxResults?: number;
    includeInContext?: boolean;
  } = {}
): Promise<ChatGPTContextResult> {
  const {
    similarityThreshold = 0.75,
    maxResults = 5,
    includeInContext = true
  } = options;

  try {
    // Search ChatGPT chunks for relevant conversations
    const results = await searchChatGPTChunks(query, userId, {
      similarityThreshold,
      limit: maxResults
    });

    if (!results || results.length === 0) {
      return {
        found: false,
        chunks: [],
        summary: ''
      };
    }

    // Format chunks for context
    const chunks = results.map((result: any) => ({
      conversationTitle: result.conversation_title,
      content: result.content,
      similarity: result.similarity,
      createDate: new Date(result.create_time * 1000).toLocaleDateString()
    }));

    // Create summary for AI context
    const summary = formatChatGPTContextForAI(chunks, query);

    return {
      found: true,
      chunks,
      summary
    };

  } catch (error: any) {
    console.error('[ChatGPT RAG] Failed to get ChatGPT context:', error.message);
    return {
      found: false,
      chunks: [],
      summary: ''
    };
  }
}

/**
 * Format ChatGPT context for AI prompt
 */
function formatChatGPTContextForAI(
  chunks: Array<{
    conversationTitle: string;
    content: string;
    similarity: number;
    createDate: string;
  }>,
  query: string
): string {
  if (chunks.length === 0) {
    return '';
  }

  const contextParts = [
    '📚 **RELEVANT CHATGPT HISTORY**',
    `Found ${chunks.length} relevant conversation(s) from your ChatGPT history related to: "${query}"`,
    ''
  ];

  chunks.forEach((chunk, index) => {
    contextParts.push(
      `### ChatGPT Conversation ${index + 1}: ${chunk.conversationTitle}`,
      `Date: ${chunk.createDate} | Relevance: ${Math.round(chunk.similarity * 100)}%`,
      '',
      chunk.content,
      '',
      '---',
      ''
    );
  });

  contextParts.push(
    '**Note**: This context is from your previous ChatGPT conversations. You can reference these discussions when answering the current question.',
    ''
  );

  return contextParts.join('\n');
}

/**
 * Enhanced context gathering that includes ChatGPT history
 * This extends the existing AutoReferenceButler context
 */
export async function getEnhancedRAGContext(
  query: string,
  userId: string,
  existingContext: any,
  options: {
    includeChatGPT?: boolean;
    chatGPTThreshold?: number;
    chatGPTMaxResults?: number;
  } = {}
): Promise<{
  originalContext: any;
  chatGPTContext: ChatGPTContextResult | null;
  combinedContextString: string;
}> {
  const {
    includeChatGPT = true,
    chatGPTThreshold = 0.75,
    chatGPTMaxResults = 5
  } = options;

  let chatGPTContext: ChatGPTContextResult | null = null;

  // Get ChatGPT context if enabled
  if (includeChatGPT) {
    chatGPTContext = await getChatGPTContext(query, userId, {
      similarityThreshold: chatGPTThreshold,
      maxResults: chatGPTMaxResults
    });
  }

  // Combine all context into a single string
  const contextParts: string[] = [];

  // Add existing context (from AutoReferenceButler)
  if (existingContext && typeof existingContext === 'string') {
    contextParts.push(existingContext);
  }

  // Add ChatGPT context if found
  if (chatGPTContext && chatGPTContext.found) {
    contextParts.push('');
    contextParts.push(chatGPTContext.summary);
  }

  return {
    originalContext: existingContext,
    chatGPTContext,
    combinedContextString: contextParts.join('\n')
  };
}

/**
 * Check if user has ChatGPT conversations imported
 */
export async function hasChatGPTImports(userId: string): Promise<boolean> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('chatgpt_conversations')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (error) throw error;

    return (data && data.length > 0);

  } catch (error) {
    console.error('[ChatGPT RAG] Failed to check imports:', error);
    return false;
  }
}

/**
 * Get ChatGPT import status for user
 */
export async function getChatGPTImportStatus(userId: string): Promise<{
  hasImports: boolean;
  conversationCount: number;
  messageCount: number;
  embeddingCoverage: number;
}> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: stats, error } = await supabase.rpc('get_chatgpt_stats', {
      p_user_id: userId
    });

    if (error) throw error;

    return {
      hasImports: stats.total_conversations > 0,
      conversationCount: stats.total_conversations || 0,
      messageCount: stats.total_messages || 0,
      embeddingCoverage: stats.embedding_coverage_percent || 0
    };

  } catch (error) {
    console.error('[ChatGPT RAG] Failed to get import status:', error);
    return {
      hasImports: false,
      conversationCount: 0,
      messageCount: 0,
      embeddingCoverage: 0
    };
  }
}
