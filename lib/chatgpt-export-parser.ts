/**
 * CHATGPT EXPORT PARSER
 *
 * Parses ChatGPT export data (conversations.json) into a structured format
 * for embedding and semantic search integration.
 *
 * ChatGPT Export Structure:
 * - conversations.json contains array of conversations
 * - Each conversation has: id, title, create_time, mapping
 * - Mapping contains message nodes with parent-child relationships
 */

export interface ChatGPTMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  createTime: number;
  parent?: string;
  children: string[];
}

export interface ChatGPTParsedConversation {
  id: string;
  title: string;
  createTime: number;
  updateTime: number;
  messages: ChatGPTMessage[];
  messageCount: number;
  fullText: string; // All messages concatenated for embedding
}

export interface ChatGPTExportData {
  conversations: ChatGPTParsedConversation[];
  totalConversations: number;
  totalMessages: number;
  dateRange: {
    earliest: number;
    latest: number;
  };
}

/**
 * Parse a single conversation from ChatGPT export format
 */
export function parseConversation(rawConversation: any): ChatGPTParsedConversation | null {
  try {
    const { id, title, create_time, update_time, mapping } = rawConversation;

    if (!id || !mapping) {
      console.warn('[ChatGPT Parser] Skipping invalid conversation:', id);
      return null;
    }

    // Extract messages from the mapping structure
    const messages: ChatGPTMessage[] = [];

    for (const [nodeId, node] of Object.entries(mapping as any)) {
      const nodeData = node as any;
      if (!nodeData || !nodeData.message) continue;

      const message = nodeData.message;
      const author = message.author?.role;
      const content = message.content;

      // Skip empty messages or system messages without content
      if (!content || !content.parts || content.parts.length === 0) {
        continue;
      }

      // Extract text from parts array
      const text = content.parts
        .filter((part: any) => typeof part === 'string')
        .join('\n')
        .trim();

      if (!text) continue;

      messages.push({
        id: nodeId,
        role: author || 'unknown',
        content: text,
        createTime: message.create_time || create_time,
        parent: nodeData.parent || undefined,
        children: nodeData.children || []
      });
    }

    // Sort messages chronologically
    messages.sort((a, b) => a.createTime - b.createTime);

    // Create full text for embedding
    const fullText = messages
      .map(m => `[${m.role}]: ${m.content}`)
      .join('\n\n');

    return {
      id,
      title: title || 'Untitled Conversation',
      createTime: create_time || 0,
      updateTime: update_time || create_time || 0,
      messages,
      messageCount: messages.length,
      fullText
    };

  } catch (error: any) {
    console.error('[ChatGPT Parser] Error parsing conversation:', error.message);
    return null;
  }
}

/**
 * Parse entire ChatGPT conversations.json export file
 */
export function parseChatGPTExport(exportData: any[]): ChatGPTExportData {
  console.log(`[ChatGPT Parser] Parsing ${exportData.length} conversations...`);

  const conversations: ChatGPTParsedConversation[] = [];
  let totalMessages = 0;
  let earliestTime = Infinity;
  let latestTime = 0;

  for (const rawConv of exportData) {
    const parsed = parseConversation(rawConv);

    if (parsed && parsed.messageCount > 0) {
      conversations.push(parsed);
      totalMessages += parsed.messageCount;

      if (parsed.createTime < earliestTime) earliestTime = parsed.createTime;
      if (parsed.updateTime > latestTime) latestTime = parsed.updateTime;
    }
  }

  console.log(`[ChatGPT Parser] Successfully parsed ${conversations.length} conversations with ${totalMessages} messages`);

  return {
    conversations,
    totalConversations: conversations.length,
    totalMessages,
    dateRange: {
      earliest: earliestTime === Infinity ? 0 : earliestTime,
      latest: latestTime
    }
  };
}

/**
 * Parse ChatGPT export from file buffer
 */
export async function parseChatGPTExportFile(fileBuffer: Buffer): Promise<ChatGPTExportData> {
  try {
    const jsonString = fileBuffer.toString('utf-8');
    const exportData = JSON.parse(jsonString);

    // Handle different export formats
    if (Array.isArray(exportData)) {
      return parseChatGPTExport(exportData);
    } else if (exportData.conversations && Array.isArray(exportData.conversations)) {
      return parseChatGPTExport(exportData.conversations);
    } else {
      throw new Error('Invalid ChatGPT export format');
    }

  } catch (error: any) {
    console.error('[ChatGPT Parser] Failed to parse export file:', error.message);
    throw new Error(`ChatGPT export parsing failed: ${error.message}`);
  }
}

/**
 * Extract searchable text from a conversation for full-text search
 */
export function extractSearchableText(conversation: ChatGPTParsedConversation): string {
  const titleText = `Title: ${conversation.title}`;
  const dateText = `Date: ${new Date(conversation.createTime * 1000).toLocaleDateString()}`;
  const contentText = conversation.messages
    .map(m => m.content)
    .join(' ');

  return `${titleText}\n${dateText}\n${contentText}`;
}

/**
 * Chunk a long conversation for embedding
 * Keeps related messages together
 */
export function chunkConversation(
  conversation: ChatGPTParsedConversation,
  maxChunkSize: number = 2000
): Array<{ text: string; messageIds: string[] }> {
  const chunks: Array<{ text: string; messageIds: string[] }> = [];
  let currentChunk = '';
  let currentMessageIds: string[] = [];

  const header = `Title: ${conversation.title}\nDate: ${new Date(conversation.createTime * 1000).toLocaleDateString()}\n\n`;

  for (const message of conversation.messages) {
    const messageText = `[${message.role}]: ${message.content}\n\n`;

    // If adding this message exceeds chunk size, save current chunk
    if (currentChunk.length + messageText.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        text: header + currentChunk,
        messageIds: [...currentMessageIds]
      });
      currentChunk = '';
      currentMessageIds = [];
    }

    currentChunk += messageText;
    currentMessageIds.push(message.id);
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push({
      text: header + currentChunk,
      messageIds: currentMessageIds
    });
  }

  return chunks;
}

/**
 * Get statistics from parsed export
 */
export function getExportStats(exportData: ChatGPTExportData) {
  const avgMessagesPerConv = exportData.totalMessages / exportData.totalConversations;
  const dateRange = {
    earliest: new Date(exportData.dateRange.earliest * 1000).toLocaleDateString(),
    latest: new Date(exportData.dateRange.latest * 1000).toLocaleDateString()
  };

  return {
    totalConversations: exportData.totalConversations,
    totalMessages: exportData.totalMessages,
    averageMessagesPerConversation: Math.round(avgMessagesPerConv * 10) / 10,
    dateRange,
    estimatedEmbeddingCost: calculateEmbeddingCost(exportData)
  };
}

/**
 * Estimate embedding cost for the export
 * Using text-embedding-3-small: $0.02 per 1M tokens
 */
function calculateEmbeddingCost(exportData: ChatGPTExportData): string {
  // Rough estimate: 1 token ≈ 4 characters
  let totalChars = 0;

  for (const conv of exportData.conversations) {
    totalChars += conv.fullText.length;
  }

  const estimatedTokens = totalChars / 4;
  const cost = (estimatedTokens / 1_000_000) * 0.02;

  return `$${cost.toFixed(4)} (${Math.round(estimatedTokens).toLocaleString()} tokens)`;
}
