/**
 * File Tools - File operations for KimbleAI
 */

import type { Tool, ToolContext, ToolResult } from './index';

/**
 * List user's uploaded files
 */
const listFiles: Tool = {
  name: 'list_files',
  description: 'List files uploaded by the user. Can filter by project.',
  category: 'files',
  requiresConfirmation: false,
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'Filter by project ID (optional)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of files to return (default: 20)',
      },
    },
  },
  execute: async (args: { projectId?: string; limit?: number }, context: ToolContext): Promise<ToolResult> => {
    const { projectId, limit = 20 } = args;
    const { userId, supabaseClient } = context;

    if (!supabaseClient) {
      return { success: false, error: 'Database connection not available' };
    }

    try {
      let query = supabaseClient
        .from('files')
        .select('id, name, size, type, created_at, summary')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const files = (data || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        size: formatFileSize(f.size),
        type: f.type,
        createdAt: f.created_at,
        summary: f.summary?.substring(0, 100),
      }));

      return {
        success: true,
        data: files,
        display: {
          type: 'table',
          content: files,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list files',
      };
    }
  },
};

/**
 * Get file content
 */
const getFileContent: Tool = {
  name: 'get_file_content',
  description: 'Get the extracted text content of an uploaded file.',
  category: 'files',
  requiresConfirmation: false,
  inputSchema: {
    type: 'object',
    properties: {
      fileId: {
        type: 'string',
        description: 'The ID of the file to read',
      },
    },
    required: ['fileId'],
  },
  execute: async (args: { fileId: string }, context: ToolContext): Promise<ToolResult> => {
    const { fileId } = args;
    const { userId, supabaseClient } = context;

    if (!supabaseClient) {
      return { success: false, error: 'Database connection not available' };
    }

    try {
      const { data, error } = await supabaseClient
        .from('files')
        .select('name, extracted_text, summary, type')
        .eq('id', fileId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (!data) {
        return { success: false, error: 'File not found' };
      }

      return {
        success: true,
        data: {
          name: data.name,
          type: data.type,
          summary: data.summary,
          content: data.extracted_text || 'No text content available',
        },
        display: {
          type: 'text',
          content: data.extracted_text || data.summary || 'No content',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get file',
      };
    }
  },
};

/**
 * Search files by content
 */
const searchFiles: Tool = {
  name: 'search_files',
  description: 'Search through uploaded files using semantic search.',
  category: 'files',
  requiresConfirmation: false,
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      limit: {
        type: 'number',
        description: 'Maximum results (default: 5)',
      },
    },
    required: ['query'],
  },
  execute: async (args: { query: string; limit?: number }, context: ToolContext): Promise<ToolResult> => {
    const { query, limit = 5 } = args;
    const { userId, supabaseClient } = context;

    if (!supabaseClient) {
      return { success: false, error: 'Database connection not available' };
    }

    try {
      // Use text search as fallback (semantic search requires embedding)
      const { data, error } = await supabaseClient
        .from('files')
        .select('id, name, type, summary')
        .eq('user_id', userId)
        .or(`name.ilike.%${query}%,summary.ilike.%${query}%,extracted_text.ilike.%${query}%`)
        .limit(limit);

      if (error) throw error;

      const results = (data || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        summary: f.summary?.substring(0, 150),
      }));

      return {
        success: true,
        data: results,
        display: {
          type: 'json',
          content: results,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  },
};

/**
 * Get recent conversations
 */
const listConversations: Tool = {
  name: 'list_conversations',
  description: 'List recent chat conversations.',
  category: 'files',
  requiresConfirmation: false,
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'Filter by project ID (optional)',
      },
      limit: {
        type: 'number',
        description: 'Maximum conversations to return (default: 10)',
      },
    },
  },
  execute: async (args: { projectId?: string; limit?: number }, context: ToolContext): Promise<ToolResult> => {
    const { projectId, limit = 10 } = args;
    const { userId, supabaseClient } = context;

    if (!supabaseClient) {
      return { success: false, error: 'Database connection not available' };
    }

    try {
      let query = supabaseClient
        .from('conversations')
        .select('id, title, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const conversations = (data || []).map((c: any) => ({
        id: c.id,
        title: c.title || 'Untitled',
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));

      return {
        success: true,
        data: conversations,
        display: {
          type: 'table',
          content: conversations,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list conversations',
      };
    }
  },
};

// Helper function
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const fileTools: Tool[] = [listFiles, getFileContent, searchFiles, listConversations];
