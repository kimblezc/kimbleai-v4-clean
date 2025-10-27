/**
 * CLAUDE PROJECTS PARSER
 *
 * Parses Claude Projects export files and converts them to KimbleAI format.
 * Handles:
 * - Projects with artifacts
 * - Conversations and messages
 * - Code blocks and attachments
 * - Timestamps and metadata
 */

export interface ClaudeProject {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  conversations: ClaudeConversation[];
  artifacts?: ClaudeArtifact[];
}

export interface ClaudeConversation {
  id: string;
  project_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ClaudeMessage[];
}

export interface ClaudeMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  attachments?: any[];
}

export interface ClaudeArtifact {
  id: string;
  type: 'code' | 'document' | 'image';
  title: string;
  content: string;
  language?: string;
  created_at: string;
}

export interface ParsedClaudeData {
  projects: ClaudeProject[];
  totalConversations: number;
  totalMessages: number;
  totalArtifacts: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
}

/**
 * Parse Claude Projects export file
 */
export async function parseClaudeExport(fileContent: string): Promise<ParsedClaudeData> {
  try {
    const data = JSON.parse(fileContent);

    // Handle different export formats
    let projects: ClaudeProject[] = [];

    if (Array.isArray(data)) {
      // Array of projects
      projects = data;
    } else if (data.projects) {
      // Wrapped in projects key
      projects = data.projects;
    } else if (data.id && data.name) {
      // Single project
      projects = [data];
    } else {
      throw new Error('Unrecognized Claude export format');
    }

    let totalConversations = 0;
    let totalMessages = 0;
    let totalArtifacts = 0;
    let earliestDate: Date | null = null;
    let latestDate: Date | null = null;

    for (const project of projects) {
      if (project.conversations) {
        totalConversations += project.conversations.length;

        for (const conversation of project.conversations) {
          if (conversation.messages) {
            totalMessages += conversation.messages.length;
          }

          // Track dates
          const convDate = new Date(conversation.created_at);
          if (!earliestDate || convDate < earliestDate) {
            earliestDate = convDate;
          }
          if (!latestDate || convDate > latestDate) {
            latestDate = convDate;
          }
        }
      }

      if (project.artifacts) {
        totalArtifacts += project.artifacts.length;
      }
    }

    return {
      projects,
      totalConversations,
      totalMessages,
      totalArtifacts,
      dateRange: {
        earliest: earliestDate?.toISOString() || new Date().toISOString(),
        latest: latestDate?.toISOString() || new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse Claude export: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert Claude conversation to KimbleAI format
 */
export function convertClaudeToKimbleAI(conversation: ClaudeConversation) {
  return {
    title: conversation.title,
    messages: conversation.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.created_at,
    })),
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    source: 'claude',
    source_id: conversation.id,
    metadata: {
      project_id: conversation.project_id,
    },
  };
}

/**
 * Extract code blocks from Claude artifacts
 */
export function extractArtifactCode(artifact: ClaudeArtifact) {
  return {
    title: artifact.title,
    language: artifact.language || 'text',
    code: artifact.content,
    type: artifact.type,
    created_at: artifact.created_at,
  };
}

/**
 * Generate summary from Claude conversation
 */
export function generateClaudeSummary(conversation: ClaudeConversation): string {
  const messageCount = conversation.messages.length;
  const userMessages = conversation.messages.filter((m) => m.role === 'user');
  const firstMessage = userMessages[0]?.content || '';

  return `${conversation.title} - ${messageCount} messages. ${firstMessage.substring(0, 200)}${firstMessage.length > 200 ? '...' : ''}`;
}

/**
 * Calculate deduplication hash for Claude conversation
 */
export function calculateClaudeHash(conversation: ClaudeConversation): string {
  const content = `${conversation.title}:${conversation.messages.map((m) => m.content).join('|')}`;
  return hashString(content);
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
