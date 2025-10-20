/**
 * CHATGPT IMPORT SYSTEM
 *
 * Complete system for importing ChatGPT exports:
 * 1. Upload conversations.json to Google Drive
 * 2. Parse and store in database
 * 3. Generate embeddings for semantic search
 * 4. Enable RAG-powered search across ChatGPT history
 */

import { createClient } from '@supabase/supabase-js';
import { drive_v3, google } from 'googleapis';
import {
  parseChatGPTExportFile,
  chunkConversation,
  ChatGPTParsedConversation,
  ChatGPTExportData
} from './chatgpt-export-parser';
import { generateEmbedding, generateEmbeddings } from './embeddings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// GOOGLE DRIVE INTEGRATION
// ============================================================================

/**
 * Upload ChatGPT export file to Google Drive
 * Stores in a dedicated "ChatGPT Exports" folder
 */
export async function uploadChatGPTExportToDrive(
  auth: any,
  fileBuffer: Buffer,
  filename: string,
  userId: string
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = google.drive({ version: 'v3', auth });

  try {
    console.log('[ChatGPT Import] Uploading to Google Drive:', filename);

    // Find or create "ChatGPT Exports" folder
    const folderName = 'ChatGPT Exports';
    let folderId: string | undefined;

    const folderSearch = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (folderSearch.data.files && folderSearch.data.files.length > 0) {
      folderId = folderSearch.data.files[0].id!;
    } else {
      // Create folder
      const folder = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      });
      folderId = folder.data.id!;
    }

    // Upload file to folder
    const file = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
        description: `ChatGPT export uploaded by ${userId} on ${new Date().toISOString()}`
      },
      media: {
        mimeType: 'application/json',
        body: Buffer.from(fileBuffer)
      },
      fields: 'id, webViewLink, name, size'
    });

    console.log('[ChatGPT Import] File uploaded successfully:', file.data.id);

    return {
      fileId: file.data.id!,
      webViewLink: file.data.webViewLink!
    };

  } catch (error: any) {
    console.error('[ChatGPT Import] Drive upload failed:', error.message);
    throw new Error(`Failed to upload to Google Drive: ${error.message}`);
  }
}

// ============================================================================
// DATABASE STORAGE
// ============================================================================

/**
 * Store parsed ChatGPT conversation in database
 */
export async function storeChatGPTConversation(
  conversation: ChatGPTParsedConversation,
  userId: string,
  driveFileId?: string
): Promise<void> {
  try {
    // Insert conversation
    const { error: convError } = await supabase
      .from('chatgpt_conversations')
      .insert({
        id: conversation.id,
        user_id: userId,
        title: conversation.title,
        create_time: conversation.createTime,
        update_time: conversation.updateTime,
        message_count: conversation.messageCount,
        full_text: conversation.fullText,
        drive_file_id: driveFileId,
        metadata: {
          original_message_count: conversation.messages.length,
          import_date: new Date().toISOString()
        }
      });

    if (convError) {
      // If conversation already exists, skip
      if (convError.code === '23505') {
        console.log(`[ChatGPT Import] Conversation ${conversation.id} already exists, skipping`);
        return;
      }
      throw convError;
    }

    // Insert messages
    const messages = conversation.messages.map((msg, index) => ({
      id: msg.id,
      conversation_id: conversation.id,
      user_id: userId,
      role: msg.role,
      content: msg.content,
      create_time: msg.createTime,
      parent_id: msg.parent || null,
      position: index,
      metadata: {
        children: msg.children
      }
    }));

    const { error: msgError } = await supabase
      .from('chatgpt_messages')
      .insert(messages);

    if (msgError && msgError.code !== '23505') {
      throw msgError;
    }

    console.log(`[ChatGPT Import] Stored conversation ${conversation.id} with ${messages.length} messages`);

  } catch (error: any) {
    console.error('[ChatGPT Import] Database storage failed:', error.message);
    throw new Error(`Failed to store conversation: ${error.message}`);
  }
}

/**
 * Log import job to database
 */
export async function logChatGPTImport(
  userId: string,
  filename: string,
  driveFileId: string | undefined,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  stats?: Partial<ChatGPTExportData>,
  errorMessage?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('chatgpt_import_logs')
    .insert({
      user_id: userId,
      filename,
      drive_file_id: driveFileId,
      total_conversations: stats?.totalConversations || 0,
      total_messages: stats?.totalMessages || 0,
      import_status: status,
      error_message: errorMessage,
      import_stats: stats ? {
        date_range: stats.dateRange,
        total_conversations: stats.totalConversations,
        total_messages: stats.totalMessages
      } : null,
      completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null
    })
    .select('id')
    .single();

  if (error) {
    console.error('[ChatGPT Import] Failed to log import:', error);
    throw error;
  }

  return data.id;
}

// ============================================================================
// EMBEDDING PIPELINE
// ============================================================================

/**
 * Generate embeddings for a ChatGPT conversation
 * Creates embeddings for the full conversation and individual chunks
 */
export async function embedChatGPTConversation(
  conversation: ChatGPTParsedConversation,
  userId: string
): Promise<void> {
  try {
    console.log(`[ChatGPT Import] Embedding conversation: ${conversation.title}`);

    // 1. Generate embedding for full conversation
    const fullEmbedding = await generateEmbedding(conversation.fullText);

    // Update conversation with embedding
    const { error: updateError } = await supabase
      .from('chatgpt_conversations')
      .update({ embedding: fullEmbedding })
      .eq('id', conversation.id);

    if (updateError) throw updateError;

    // 2. Generate embeddings for chunks
    const chunks = chunkConversation(conversation);
    const chunkTexts = chunks.map(c => c.text);
    const chunkEmbeddings = await generateEmbeddings(chunkTexts);

    const chunkRecords = chunks.map((chunk, index) => ({
      conversation_id: conversation.id,
      user_id: userId,
      chunk_index: index,
      content: chunk.text,
      message_ids: chunk.messageIds,
      embedding: chunkEmbeddings[index],
      metadata: {
        message_count: chunk.messageIds.length
      }
    }));

    const { error: chunkError } = await supabase
      .from('chatgpt_chunks')
      .insert(chunkRecords);

    if (chunkError) throw chunkError;

    // 3. Generate embeddings for individual messages (optional, for granular search)
    // Only embed if there aren't too many messages
    if (conversation.messages.length <= 100) {
      const messageTexts = conversation.messages.map(m => `[${m.role}]: ${m.content}`);
      const messageEmbeddings = await generateEmbeddings(messageTexts);

      for (let i = 0; i < conversation.messages.length; i++) {
        await supabase
          .from('chatgpt_messages')
          .update({ embedding: messageEmbeddings[i] })
          .eq('id', conversation.messages[i].id);
      }
    }

    console.log(`[ChatGPT Import] Embedded conversation ${conversation.id} with ${chunks.length} chunks`);

  } catch (error: any) {
    console.error('[ChatGPT Import] Embedding failed:', error.message);
    throw new Error(`Failed to embed conversation: ${error.message}`);
  }
}

/**
 * Batch embed all conversations from an import
 */
export async function embedChatGPTExport(
  exportData: ChatGPTExportData,
  userId: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  console.log(`[ChatGPT Import] Embedding ${exportData.totalConversations} conversations...`);

  for (let i = 0; i < exportData.conversations.length; i++) {
    const conversation = exportData.conversations[i];

    try {
      await embedChatGPTConversation(conversation, userId);

      if (onProgress) {
        onProgress(i + 1, exportData.totalConversations);
      }

    } catch (error: any) {
      console.error(`[ChatGPT Import] Failed to embed conversation ${conversation.id}:`, error.message);
      // Continue with next conversation
    }
  }

  console.log('[ChatGPT Import] Embedding complete!');
}

// ============================================================================
// COMPLETE IMPORT WORKFLOW
// ============================================================================

export interface ChatGPTImportOptions {
  userId: string;
  auth: any; // Google auth
  uploadToDrive?: boolean;
  generateEmbeddings?: boolean;
  onProgress?: (stage: string, current?: number, total?: number) => void;
}

/**
 * Complete workflow to import ChatGPT export
 * 1. Parse file
 * 2. Upload to Google Drive (optional)
 * 3. Store in database
 * 4. Generate embeddings (optional)
 */
export async function importChatGPTExport(
  fileBuffer: Buffer,
  filename: string,
  options: ChatGPTImportOptions
): Promise<{
  success: boolean;
  importId: string;
  stats: ChatGPTExportData;
  driveFileId?: string;
  error?: string;
}> {
  const startTime = Date.now();
  let importId: string;
  let driveFileId: string | undefined;

  try {
    // Log import start
    importId = await logChatGPTImport(options.userId, filename, undefined, 'processing');

    // 1. Parse export file
    options.onProgress?.('Parsing ChatGPT export...');
    const exportData = await parseChatGPTExportFile(fileBuffer);

    console.log(`[ChatGPT Import] Parsed ${exportData.totalConversations} conversations with ${exportData.totalMessages} messages`);

    // 2. Upload to Google Drive (optional)
    if (options.uploadToDrive && options.auth) {
      options.onProgress?.('Uploading to Google Drive...');
      const driveResult = await uploadChatGPTExportToDrive(
        options.auth,
        fileBuffer,
        filename,
        options.userId
      );
      driveFileId = driveResult.fileId;
      console.log('[ChatGPT Import] Uploaded to Drive:', driveFileId);
    }

    // 3. Store in database
    options.onProgress?.('Storing in database...', 0, exportData.totalConversations);
    for (let i = 0; i < exportData.conversations.length; i++) {
      await storeChatGPTConversation(
        exportData.conversations[i],
        options.userId,
        driveFileId
      );
      options.onProgress?.('Storing in database...', i + 1, exportData.totalConversations);
    }

    // 4. Generate embeddings (optional)
    if (options.generateEmbeddings) {
      options.onProgress?.('Generating embeddings...');
      await embedChatGPTExport(exportData, options.userId, (current, total) => {
        options.onProgress?.('Generating embeddings...', current, total);
      });
    }

    // Update import log
    const processingTime = Date.now() - startTime;
    await supabase
      .from('chatgpt_import_logs')
      .update({
        import_status: 'completed',
        completed_at: new Date().toISOString(),
        processing_time_ms: processingTime,
        drive_file_id: driveFileId,
        total_conversations: exportData.totalConversations,
        total_messages: exportData.totalMessages
      })
      .eq('id', importId);

    console.log(`[ChatGPT Import] Import completed in ${processingTime}ms`);

    return {
      success: true,
      importId,
      stats: exportData,
      driveFileId
    };

  } catch (error: any) {
    console.error('[ChatGPT Import] Import failed:', error.message);

    // Update import log with error
    if (importId!) {
      await supabase
        .from('chatgpt_import_logs')
        .update({
          import_status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message
        })
        .eq('id', importId);
    }

    return {
      success: false,
      importId: importId!,
      stats: { conversations: [], totalConversations: 0, totalMessages: 0, dateRange: { earliest: 0, latest: 0 } },
      error: error.message
    };
  }
}

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

/**
 * Search ChatGPT conversations semantically
 */
export async function searchChatGPTConversations(
  query: string,
  userId: string,
  options: {
    similarityThreshold?: number;
    limit?: number;
    startDate?: number;
    endDate?: number;
  } = {}
) {
  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Search using database function
    const { data, error } = await supabase.rpc('search_chatgpt_conversations', {
      query_embedding: queryEmbedding,
      p_user_id: userId,
      similarity_threshold: options.similarityThreshold || 0.7,
      match_count: options.limit || 10,
      start_date: options.startDate || null,
      end_date: options.endDate || null
    });

    if (error) throw error;

    return data;

  } catch (error: any) {
    console.error('[ChatGPT Search] Search failed:', error.message);
    throw new Error(`ChatGPT search failed: ${error.message}`);
  }
}

/**
 * Search ChatGPT chunks for granular results
 */
export async function searchChatGPTChunks(
  query: string,
  userId: string,
  options: {
    similarityThreshold?: number;
    limit?: number;
  } = {}
) {
  try {
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc('search_chatgpt_chunks', {
      query_embedding: queryEmbedding,
      p_user_id: userId,
      similarity_threshold: options.similarityThreshold || 0.7,
      match_count: options.limit || 20
    });

    if (error) throw error;

    return data;

  } catch (error: any) {
    console.error('[ChatGPT Search] Chunk search failed:', error.message);
    throw new Error(`ChatGPT chunk search failed: ${error.message}`);
  }
}

/**
 * Get ChatGPT import statistics
 */
export async function getChatGPTStats(userId: string) {
  try {
    const { data, error } = await supabase.rpc('get_chatgpt_stats', {
      p_user_id: userId
    });

    if (error) throw error;

    return data;

  } catch (error: any) {
    console.error('[ChatGPT Stats] Failed to get stats:', error.message);
    throw new Error(`Failed to get ChatGPT stats: ${error.message}`);
  }
}
