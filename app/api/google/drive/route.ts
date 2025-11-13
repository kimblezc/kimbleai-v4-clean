import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { getValidAccessToken } from '@/lib/google-token-refresh';

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

    // Get valid access token (with automatic refresh if needed)
    const accessToken = await getValidAccessToken(userId);

    if (!accessToken) {
      return NextResponse.json({
        error: 'User not authenticated with Google. Please sign in again.',
        needsAuth: true
      }, { status: 401 });
    }

    // Get refresh token for OAuth client
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('refresh_token')
      .eq('user_id', userId)
      .single();

    // Initialize Google Drive client with refreshed token
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: tokenData?.refresh_token
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
        return await uploadFile(drive, userId, fileData, projectId);

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const userId = searchParams.get('userId') || 'zach';
    const query = searchParams.get('q') || '';
    const fileId = searchParams.get('fileId');
    const folderId = searchParams.get('folderId');
    const pageToken = searchParams.get('pageToken');

    console.log(`[DRIVE-API] GET request - action: ${action}, userId: ${userId}, folderId: ${folderId}`);

    // Get valid access token (with automatic refresh if needed)
    const accessToken = await getValidAccessToken(userId);

    if (!accessToken) {
      console.error('[DRIVE-API] No valid access token for user:', userId);
      return NextResponse.json({
        error: 'User not authenticated with Google. Please sign in again.',
        needsAuth: true
      }, { status: 401 });
    }

    // Get refresh token for OAuth client
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('refresh_token')
      .eq('user_id', userId)
      .single();

    // Initialize Google Drive client with refreshed token
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: tokenData?.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    switch (action) {
      case 'list':
        return await listFiles(drive, folderId, pageToken);

      case 'get':
        if (!fileId) {
          return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
        }
        return await getFileDetails(drive, fileId);

      case 'download':
        if (!fileId) {
          return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
        }
        return await downloadFile(drive, fileId);

      case 'search':
        return await searchDriveFiles(drive, query);

      case 'folders':
        return await listFolders(drive);

      default:
        return NextResponse.json({
          service: 'Google Drive API',
          endpoints: {
            'GET ?action=list': 'List files in Drive',
            'GET ?action=list&folderId=xxx': 'List files in specific folder',
            'GET ?action=get&fileId=xxx': 'Get file details',
            'GET ?action=download&fileId=xxx': 'Download file content',
            'GET ?action=search&q=xxx': 'Search Drive files',
            'GET ?action=folders': 'List all folders',
            'POST': 'Import file to knowledge base or upload file'
          }
        });
    }

  } catch (error: any) {
    console.error('Drive GET error:', error);
    return NextResponse.json({
      error: 'Failed to access Drive',
      details: error.message
    }, { status: 500 });
  }
}

async function listFiles(drive: any, folderId?: string | null, pageToken?: string | null) {
  const query = folderId
    ? `'${folderId}' in parents and trashed=false`
    : `'root' in parents and trashed=false`;

  const params: any = {
    q: query,
    fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, createdTime, iconLink, thumbnailLink, webViewLink, parents, owners)',
    pageSize: 50,
    orderBy: 'modifiedTime desc'
  };

  if (pageToken) {
    params.pageToken = pageToken;
  }

  const response = await drive.files.list(params);

  const files = (response.data.files || []).map((file: any) => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    modifiedTime: file.modifiedTime,
    size: file.size,
    iconLink: file.iconLink,
    thumbnailLink: file.thumbnailLink,
    webViewLink: file.webViewLink,
    isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    parents: file.parents,
    owner: file.owners?.[0]?.displayName || 'Unknown'
  }));

  return NextResponse.json({
    success: true,
    files,
    nextPageToken: response.data.nextPageToken,
    total: files.length
  });
}

async function getFileDetails(drive: any, fileId: string) {
  const response = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, description, size, createdTime, modifiedTime, webViewLink, iconLink, thumbnailLink, parents, owners, sharingUser, shared, permissions'
  });

  const file = response.data;

  return NextResponse.json({
    success: true,
    file: {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      description: file.description,
      size: file.size,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      iconLink: file.iconLink,
      thumbnailLink: file.thumbnailLink,
      parents: file.parents,
      owner: file.owners?.[0]?.displayName || 'Unknown',
      shared: file.shared,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder'
    }
  });
}

async function downloadFile(drive: any, fileId: string) {
  const metadata = await drive.files.get({
    fileId,
    fields: 'mimeType, name'
  });

  const mimeType = metadata.data.mimeType;
  let content = '';

  try {
    if (mimeType === 'application/vnd.google-apps.document') {
      const response = await drive.files.export({
        fileId,
        mimeType: 'text/plain'
      });
      content = response.data as string;
    } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      const response = await drive.files.export({
        fileId,
        mimeType: 'text/csv'
      });
      content = response.data as string;
    } else if (mimeType === 'application/vnd.google-apps.presentation') {
      const response = await drive.files.export({
        fileId,
        mimeType: 'text/plain'
      });
      content = response.data as string;
    } else if (mimeType?.startsWith('text/') || mimeType === 'application/json') {
      const response = await drive.files.get({
        fileId,
        alt: 'media'
      });
      content = response.data as string;
    } else {
      return NextResponse.json({
        error: 'File type not supported for download',
        mimeType
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      content,
      fileName: metadata.data.name,
      mimeType
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to download file',
      details: error.message
    }, { status: 500 });
  }
}

async function searchDriveFiles(drive: any, query: string) {
  const escapedQuery = query ? query.replace(/'/g, "\\'") : '';
  const searchQuery = escapedQuery
    ? `name contains '${escapedQuery}' or fullText contains '${escapedQuery}'`
    : '';

  const response = await drive.files.list({
    q: searchQuery + (searchQuery ? ' and ' : '') + 'trashed=false',
    fields: 'files(id, name, mimeType, modifiedTime, size, iconLink, thumbnailLink, webViewLink)',
    pageSize: 30,
    orderBy: 'modifiedTime desc'
  });

  const files = (response.data.files || []).map((file: any) => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    modifiedTime: file.modifiedTime,
    size: file.size,
    iconLink: file.iconLink,
    thumbnailLink: file.thumbnailLink,
    webViewLink: file.webViewLink,
    isFolder: file.mimeType === 'application/vnd.google-apps.folder'
  }));

  return NextResponse.json({
    success: true,
    files,
    query,
    total: files.length
  });
}

async function listFolders(drive: any) {
  const response = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id, name, parents, modifiedTime)',
    pageSize: 100,
    orderBy: 'name'
  });

  const folders = (response.data.files || []).map((folder: any) => ({
    id: folder.id,
    name: folder.name,
    parents: folder.parents,
    modifiedTime: folder.modifiedTime
  }));

  return NextResponse.json({
    success: true,
    folders,
    total: folders.length
  });
}

async function searchFiles(drive: any, query: string, userId: string, projectId?: string) {
  // Enhanced search with better file type support
  // SECURITY FIX: Escape single quotes to prevent injection attacks
  const escapedQuery = query ? query.replace(/'/g, "\\'") : '';
  const searchQuery = escapedQuery ? `fullText contains '${escapedQuery}' or name contains '${escapedQuery}'` : '';

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
      // OPT-IN SYNC with size limits and user control - DISABLED
      const enableSync = false; // Disabled pending opt-in implementation
      const maxContentLength = 5000; // 5KB limit per file

      if (enableSync && content && content.length > 10 && content.length <= maxContentLength) {
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
  // SECURITY FIX: Escape single quotes to prevent injection attacks
  const escapedProjectId = projectId.replace(/'/g, "\\'");
  const projectQuery = `name contains '${escapedProjectId}' or fullText contains '${escapedProjectId}'`;

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

async function uploadFile(drive: any, userId: string, fileData: any, projectId?: string) {
  const { name, content, type, mimeType, parentFolderId } = fileData;

  const fileMetadata: any = {
    name: name
  };

  if (parentFolderId) {
    fileMetadata.parents = [parentFolderId];
  }

  const media = {
    mimeType: mimeType || 'application/octet-stream',
    body: content
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media: media,
    uploadType: 'multipart',
    fields: 'id, name, webViewLink, size'
  });

  const uploadedFile = response.data;

  // Add to knowledge base for text files only
  // TEMPORARILY DISABLED - CAUSING DATABASE OVERFLOW
  if (false && typeof content === 'string' && content.length > 10) {
    const embedding = await generateEmbedding(content);

    await supabase.from('knowledge_base').insert({
      user_id: userId,
      source_type: 'drive',
      source_id: uploadedFile.id,
      category: 'upload',
      title: uploadedFile.name,
      content: content.substring(0, 2000),
      embedding: embedding,
      importance: 0.8,
      tags: projectId ? ['google-drive', projectId, 'uploaded'] : ['google-drive', 'uploaded'],
      metadata: {
        fileId: uploadedFile.id,
        project_id: projectId,
        webViewLink: uploadedFile.webViewLink,
        uploaded_by: 'kimbleai'
      }
    });
  }

  return NextResponse.json({
    success: true,
    file: {
      id: uploadedFile.id,
      name: uploadedFile.name,
      webLink: uploadedFile.webViewLink,
      size: uploadedFile.size
    }
  });
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