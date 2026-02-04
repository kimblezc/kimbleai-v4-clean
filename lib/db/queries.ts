/**
 * Database Queries - Type-safe database operations
 *
 * All queries use Supabase client with proper error handling
 */

import { supabase, supabaseAdmin } from './client';
import { v4 as uuidv4 } from 'uuid';

/**
 * User Operations
 */
export const userQueries = {
  /**
   * Get user by ID
   */
  async getById(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw new Error(`Failed to get user: ${error.message}`);
    return data;
  },

  /**
   * Get user by email
   */
  async getByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found (expected for new users)
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data;
  },

  /**
   * Create new user
   */
  async create(params: {
    id: string;
    email: string;
    name?: string;
    googleTokens?: any;
  }) {
    // Generate a proper UUID instead of using Google's numeric ID
    const userId = uuidv4();

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: params.email,
        name: params.name,
        // Store Google ID in metadata if we have a column for it
        // google_tokens: params.googleTokens,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return data;
  },

  /**
   * Update user
   */
  async update(userId: string, updates: Partial<{
    name: string;
    settings: any;
  }>) {
    // Remove non-existent columns
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update user: ${error.message}`);
    return data;
  },
};

/**
 * Project Operations
 */
export const projectQueries = {
  /**
   * Get all projects for user
   */
  async getAll(userId: string, params?: {
    status?: 'active' | 'archived' | 'completed';
    sortBy?: 'recent' | 'alpha' | 'priority' | 'deadline';
  }) {
    let query = supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId);

    // Filter by status
    if (params?.status) {
      query = query.eq('status', params.status);
    }

    // Sort
    switch (params?.sortBy) {
      case 'alpha':
        query = query.order('name', { ascending: true });
        break;
      case 'priority':
        query = query.order('priority', { ascending: false });
        break;
      case 'deadline':
        // deadline column doesn't exist - use updated_at instead
        query = query.order('updated_at', { ascending: false });
        break;
      case 'recent':
      default:
        // last_activity_at doesn't exist - use updated_at
        query = query.order('updated_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get projects: ${error.message}`);
    return data;
  },

  /**
   * Get project by ID
   */
  async getById(projectId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) throw new Error(`Failed to get project: ${error.message}`);
    return data;
  },

  /**
   * Create project
   */
  async create(userId: string, params: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        ...params,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create project: ${error.message}`);
    return data;
  },

  /**
   * Update project
   */
  async update(projectId: string, updates: Partial<{
    name: string;
    description: string;
    color: string;
    icon: string;
    status: 'active' | 'archived' | 'completed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    deadline: string;
  }>) {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update project: ${error.message}`);
    return data;
  },

  /**
   * Delete project
   */
  async delete(projectId: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw new Error(`Failed to delete project: ${error.message}`);
  },
};

/**
 * Conversation Operations
 */
export const conversationQueries = {
  /**
   * Get all conversations for user
   */
  async getAll(userId: string, params?: {
    projectId?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (params?.projectId) {
      query = query.eq('project_id', params.projectId);
    }

    if (params?.limit) {
      const start = params.offset || 0;
      const end = start + params.limit - 1;
      query = query.range(start, end);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get conversations: ${error.message}`);
    return data;
  },

  /**
   * Get conversation by ID with messages
   */
  async getById(conversationId: string) {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        messages (*)
      `)
      .eq('id', conversationId)
      .single();

    if (error) throw new Error(`Failed to get conversation: ${error.message}`);
    return data;
  },

  /**
   * Create conversation
   */
  async create(userId: string, params: {
    title?: string;
    model?: string;
    projectId?: string;
  }) {
    // Remove model from params - column doesn't exist in database
    const { model, ...dbParams } = params;

    // Generate UUID for conversation
    const conversationId = uuidv4();

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        id: conversationId,
        user_id: userId,
        ...dbParams,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create conversation: ${error.message}`);
    return data;
  },

  /**
   * Update conversation
   */
  async update(conversationId: string, updates: Partial<{
    title: string;
    projectId: string;
    isPinned: boolean;
  }>) {
    // Map camelCase to snake_case for database
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
    if (updates.isPinned !== undefined) dbUpdates.is_pinned = updates.isPinned;

    const { data, error } = await supabase
      .from('conversations')
      .update(dbUpdates)
      .eq('id', conversationId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update conversation: ${error.message}`);
    return data;
  },

  /**
   * Delete conversation
   */
  async delete(conversationId: string) {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) throw new Error(`Failed to delete conversation: ${error.message}`);
  },
};

/**
 * Message Operations
 */
export const messageQueries = {
  /**
   * Get messages for conversation
   */
  async getByConversation(conversationId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to get messages: ${error.message}`);
    return data;
  },

  /**
   * Create message
   * Note: model, tokens_used, cost_usd columns don't exist in v5 schema
   * Cost tracking is handled separately in api_cost_tracking table
   */
  async create(params: {
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    model?: string;
    tokensUsed?: number;
    costUsd?: number;
    attachments?: any[];
    embedding?: number[];
  }) {
    // Generate UUID for message
    const messageId = uuidv4();

    const { data, error } = await supabase
      .from('messages')
      .insert({
        id: messageId,
        conversation_id: params.conversationId,
        role: params.role,
        content: params.content,
        // Note: model, tokens_used, cost_usd, attachments columns don't exist in v5
        // Cost data is tracked in api_cost_tracking table instead
        embedding: params.embedding,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create message: ${error.message}`);
    return data;
  },

  /**
   * Update message (for editing)
   * Note: edited_at column doesn't exist in v5 schema
   */
  async update(messageId: string, content: string) {
    const { data, error } = await supabase
      .from('messages')
      .update({
        content,
        // edited_at column doesn't exist in v5 schema
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update message: ${error.message}`);
    return data;
  },

  /**
   * Delete message
   */
  async delete(messageId: string) {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) throw new Error(`Failed to delete message: ${error.message}`);
  },
};

/**
 * File Operations
 */
export const fileQueries = {
  /**
   * Get all files for user
   */
  async getAll(userId: string, params?: {
    projectId?: string;
    limit?: number;
  }) {
    let query = supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (params?.projectId) {
      query = query.eq('project_id', params.projectId);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get files: ${error.message}`);
    return data;
  },

  /**
   * Get file by ID
   */
  async getById(fileId: string) {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error) throw new Error(`Failed to get file: ${error.message}`);
    return data;
  },

  /**
   * Create file record
   */
  async create(userId: string, params: {
    name: string;
    sizeBytes: number;
    mimeType: string;
    storagePath: string;
    projectId?: string;
    sourcePlatform?: string;
    sourceFileId?: string;
    extractedText?: string;
    summary?: string;
    embedding?: number[];
  }) {
    const { data, error } = await supabase
      .from('files')
      .insert({
        user_id: userId,
        name: params.name,
        size_bytes: params.sizeBytes,
        mime_type: params.mimeType,
        storage_path: params.storagePath,
        project_id: params.projectId,
        source_platform: params.sourcePlatform,
        source_file_id: params.sourceFileId,
        extracted_text: params.extractedText,
        summary: params.summary,
        embedding: params.embedding,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create file: ${error.message}`);
    return data;
  },

  /**
   * Update file (after processing)
   */
  async update(fileId: string, updates: Partial<{
    extractedText: string;
    summary: string;
    embedding: number[];
    processedAt: string;
  }>) {
    const { data, error } = await supabase
      .from('files')
      .update({
        extracted_text: updates.extractedText,
        summary: updates.summary,
        embedding: updates.embedding,
        processed_at: updates.processedAt,
      })
      .eq('id', fileId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update file: ${error.message}`);
    return data;
  },

  /**
   * Delete file
   */
  async delete(fileId: string) {
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    if (error) throw new Error(`Failed to delete file: ${error.message}`);
  },
};
