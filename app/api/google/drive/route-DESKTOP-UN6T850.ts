import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000),
        dimensions: 1536
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action = 'search', query, userId = 'zach', fileData, projectId } = await request.json();

    // Get user's Google token
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json({
        error: 'User not authenticated with Google'
      }, { status: 401 });
    }

    // Initialize Google Drive client
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

    switch (action) {
      case 'search':
        return await searchFiles(drive, query, userId, projectId);

      case 'sync_project_files':
        return await syncProjectFiles(drive, userId, projectId);

      case 'create_file':
        return await createFile(drive, userId, fileData, projectId);

      case 'upload_file':
        return NextResponse.json({ error: 'Upload functionality moved to /api/google/workspace/upload' }, { status: 400 });

      case 'get_file_content':
        return await getFileContent(drive, fileData.fileId);

      case 'bulk_sync':
        return await bulkSyncFiles(drive, userId);

      default:
        return await searchFiles(drive, query, userId, projectId);
    }

  } catch (error: any) {
    console.error('Google Drive search error:', error);
    return NextResponse.json({
      error: 'Failed to access Google Drive',
      details: error.message
    }, { status: 500 });
  }
}

async function searchFiles(drive: any, query: string, userId: string, projectId?: string) {
  // Enhanced search with better file type support
  const searchQuery = query ? `fullText contains '${query}' or name contains '${query}'` : '';

  const response = await drive.files.list({
    q: searchQuery,
    fields: 'files(id, name, mimeType, modifiedTime, size, createdTime, lastModifyingUser, parents, webViewLink, thumbnailLink)',
    pageSize: 20,
    orderBy: 'modifiedTime desc'
  });

  // Get user data
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
    .single();

  // Enhanced file processing with multiple formats
  const processedFiles = [];
  const files = response.data.files || [];

  for (const file of files) {
    try {
      let content = '';
      let fileCategory = 'file';

      // Handle different file types
      if (file.mimeType === 'application/vnd.google-apps.document') {
        const exportResponse = await drive.files.export({
          fileId: file.id!,
          mimeType: 'text/plain'
        });
        content = exportResponse.data as string;
        fileCategory = 'document';
      } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
        const exportResponse = await drive.files.export({
          fileId: file.id!,
          mimeType: 'text/csv'
        });
        content = exportResponse.data as string;
        fileCategory = 'spreadsheet';
      } else if (file.mimeType === 'application/vnd.google-apps.presentation') {
        const exportResponse = await drive.files.export({
          fileId: file.id!,
          mimeType: 'text/plain'
        });
        content = exportResponse.data as string;
        fileCategory = 'presentation';
      } else if (file.mimeType?.startsWith('text/')) {
        const fileResponse = await drive.files.get({
          fileId: file.id!,
          alt: 'media'
        });
        content = fileResponse.data as string;
        fileCategory = 'text';
      }

      // Generate embedding and store in knowledge base
      // TEMPORARILY DISABLED - CAUSING DATABASE OVERFLOW
      // TODO: Add opt-in sync with size limits and user control
      if (false && content && content.length > 10) {
        const embedding = await generateEmbedding(content);

        await supabase.from('knowledge_base').upsert({
          user_id: userData?.id,
          source_type: 'drive',
          source_id: file.id,
          category: fileCategory,
          title: file.name,
          content: content.substring(0, 2000),
          embedding: embedding,
          importance: 0.7,
          tags: projectId ? ['google-drive', projectId] : ['google-drive'],
          metadata: {
            fileId: file.id,
            mimeType: file.mimeType,
            modifiedTime: file.modifiedTime,
            size: file.size,
            webViewLink: file.webViewLink,
            thumbnailLink: file.thumbnailLink,
            project_id: projectId
          }
        });
      }

      processedFiles.push({
        id: file.id,
        name: file.name,
        type: file.mimeType,
        size: file.size,
        modified: file.modifiedTime,
        webLink: file.webViewLink,
        thumbnail: file.thumbnailLink,
        category: fileCategory,
        hasContent: content.length > 10
      });

    } catch (err) {
      console.error(`Error processing file ${file.name}:`, err);
      processedFiles.push({
        id: file.id,
        name: file.name,
        type: file.mimeType,
        error: 'Failed to process'
      });
    }
  }

  return NextResponse.json({
    success: true,
    filesFound: files.length,
    filesProcessed: processedFiles.filter(f => f.hasContent).length,
    files: processedFiles,
    query: query
  });
}

async function syncProjectFiles(drive: any, userId: string, projectId: string) {
  // Search for files related to the project
  const projectQuery = `name contains '${projectId}' or fullText contains '${projectId}'`;

  const response = await drive.files.list({
    q: projectQuery,
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
    pageSize: 50
  });

  const files = response.data.files || [];
  let syncedCount = 0;

  for (const file of files) {
    try {
      await syncSingleFile(drive, file, userId, projectId);
      syncedCount++;
    } catch (error) {
      console.error(`Failed to sync file ${file.name}:`, error);
    }
  }

  return NextResponse.json({
    success: true,
    projectId,
    filesFound: files.length,
    filesSynced: syncedCount
  });
}

async function syncSingleFile(drive: any, file: any, userId: string, projectId: string) {
  // Check if already synced
  const { data: existing } = await supabase
    .from('knowledge_base')
    .select('id')
    .eq('source_type', 'drive')
    .eq('source_id', file.id)
    .single();

  if (existing) return; // Already synced

  // Get file content based on type
  let content = '';
  if (file.mimeType === 'application/vnd.google-apps.document') {
    const exportResponse = await drive.files.export({
      fileId: file.id,
      mimeType: 'text/plain'
    });
    content = exportResponse.data as string;
  }

  // TEMPORARILY DISABLED - CAUSING DATABASE OVERFLOW
  // TODO: Add opt-in sync with size limits and user control
  if (false && content.length > 10) {
    const embedding = await generateEmbedding(content);

    await supabase.from('knowledge_base').insert({
      user_id: userId,
      source_type: 'drive',
      source_id: file.id,
      category: 'document',
      title: file.name,
      content: content.substring(0, 2000),
      embedding: embedding,
      importance: 0.8,
      tags: ['google-drive', projectId, 'auto-synced'],
      metadata: {
        fileId: file.id,
        project_id: projectId,
        webViewLink: file.webViewLink,
        synced_at: new Date().toISOString()
      }
    });
  }
}

async function createFile(drive: any, userId: string, fileData: any, projectId?: string) {
  const { name, content, type = 'document', parentFolderId } = fileData;

  let mimeType = 'application/vnd.google-apps.document';
  if (type === 'spreadsheet') mimeType = 'application/vnd.google-apps.spreadsheet';
  if (type === 'presentation') mimeType = 'application/vnd.google-apps.presentation';

  const fileMetadata: any = {
    name: name
  };

  if (parentFolderId) {
    fileMetadata.parents = [parentFolderId];
  }

  const response = await drive.files.create({
    resource: fileMetadata,
    media: {
      mimeType: 'text/plain',
      body: content || `# ${name}\n\nCreated via KimbleAI`
    },
    uploadType: 'multipart',
    fields: 'id, name, webViewLink'
  });

  const createdFile = response.data;

  // Add to knowledge base
  // TEMPORARILY DISABLED - CAUSING DATABASE OVERFLOW
  // TODO: Add opt-in sync with size limits and user control
  if (false && content) {
    const embedding = await generateEmbedding(content);

    await supabase.from('knowledge_base').insert({
      user_id: userId,
      source_type: 'drive',
      source_id: createdFile.id,
      category: 'document',
      title: createdFile.name,
      content: content.substring(0, 2000),
      embedding: embedding,
      importance: 0.8,
      tags: projectId ? ['google-drive', projectId, 'created-by-ai'] : ['google-drive', 'created-by-ai'],
      metadata: {
        fileId: createdFile.id,
        project_id: projectId,
        webViewLink: createdFile.webViewLink,
        created_by: 'kimbleai'
      }
    });
  }

  return NextResponse.json({
    success: true,
    file: {
      id: createdFile.id,
      name: createdFile.name,
      webLink: createdFile.webViewLink
    }
  });
}

async function getFileContent(drive: any, fileId: string) {
  try {
    // Get file metadata
    const metadataResponse = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size, modifiedTime'
    });

    const file = metadataResponse.data;
    let content = '';

    // Get content based on file type
    if (file.mimeType === 'application/vnd.google-apps.document') {
      const exportResponse = await drive.files.export({
        fileId: fileId,
        mimeType: 'text/plain'
      });
      content = exportResponse.data as string;
    } else if (file.mimeType?.startsWith('text/')) {
      const fileResponse = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      });
      content = fileResponse.data as string;
    }

    return NextResponse.json({
      success: true,
      file: {
        id: file.id,
        name: file.name,
        type: file.mimeType,
        size: file.size,
        modified: file.modifiedTime,
        content: content
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to get file content',
      details: error.message
    }, { status: 500 });
  }
}

async function bulkSyncFiles(drive: any, userId: string) {
  // Get recent files (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const response = await drive.files.list({
    q: `modifiedTime >= '${thirtyDaysAgo}' and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.spreadsheet')`,
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
    pageSize: 100,
    orderBy: 'modifiedTime desc'
  });

  const files = response.data.files || [];
  let syncedCount = 0;

  for (const file of files) {
    try {
      await syncSingleFile(drive, file, userId, 'bulk-sync');
      syncedCount++;
    } catch (error) {
      console.error(`Failed to bulk sync file ${file.name}:`, error);
    }
  }

  return NextResponse.json({
    success: true,
    message: `Bulk sync completed`,
    filesFound: files.length,
    filesSynced: syncedCount
  });
}