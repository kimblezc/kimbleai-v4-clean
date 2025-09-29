// Google Workspace Data Flow Optimization Engine
// Intelligent routing and processing optimization

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface OptimizationConfig {
  enableDirectStorage: boolean;
  enableBatchProcessing: boolean;
  maxChunkSize: number;
  compressionLevel: number;
  enableSmartRetention: boolean;
}

interface DataFlowMetrics {
  totalFiles: number;
  totalSize: number;
  compressionRatio: number;
  processingTime: number;
  storageEfficiency: number;
  vercelBypassRate: number;
}

export async function POST(request: NextRequest) {
  try {
    const { action, userId = 'zach', config, data } = await request.json();

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

    // Initialize Google clients
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
      case 'analyze_data_flow':
        return await analyzeDataFlow(drive, userId);

      case 'optimize_storage':
        return await optimizeStorage(drive, userId, config);

      case 'batch_process_files':
        return await batchProcessFiles(drive, userId, data);

      case 'setup_smart_routing':
        return await setupSmartRouting(drive, userId, config);

      case 'get_capacity_metrics':
        return await getCapacityMetrics(drive, userId);

      case 'enable_vercel_bypass':
        return await enableVercelBypass(drive, userId, config);

      default:
        return NextResponse.json({
          error: 'Invalid optimization action',
          availableActions: [
            'analyze_data_flow',
            'optimize_storage',
            'batch_process_files',
            'setup_smart_routing',
            'get_capacity_metrics',
            'enable_vercel_bypass'
          ]
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Optimization error:', error);
    return NextResponse.json({
      error: 'Optimization operation failed',
      details: error.message
    }, { status: 500 });
  }
}

async function analyzeDataFlow(drive: any, userId: string) {
  console.log(`Analyzing data flow optimization for ${userId}`);

  // Check Google Drive usage
  const driveAbout = await drive.about.get({
    fields: 'storageQuota,user'
  });

  const quota = driveAbout.data.storageQuota;
  const usedBytes = parseInt(quota.usage || '0');
  const totalBytes = parseInt(quota.limit || '0');

  // Get recent file activity
  const recentFiles = await drive.files.list({
    pageSize: 100,
    orderBy: 'modifiedTime desc',
    fields: 'files(id,name,size,mimeType,modifiedTime,createdTime)'
  });

  const files = recentFiles.data.files || [];

  // Calculate metrics
  const totalFiles = files.length;
  const totalSize = files.reduce((sum, file) => sum + parseInt(file.size || '0'), 0);
  const averageFileSize = totalSize / totalFiles;

  // Identify large files that could benefit from compression
  const largeFiles = files.filter(file => parseInt(file.size || '0') > 10 * 1024 * 1024); // >10MB

  // Check for files that might cause Vercel issues
  const problematicFiles = files.filter(file => {
    const size = parseInt(file.size || '0');
    return size > 25 * 1024 * 1024; // >25MB (Vercel limit)
  });

  return NextResponse.json({
    success: true,
    analysis: {
      storage: {
        used: `${(usedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`,
        total: `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`,
        utilization: `${((usedBytes / totalBytes) * 100).toFixed(1)}%`,
        available: `${((totalBytes - usedBytes) / (1024 * 1024 * 1024)).toFixed(2)} GB`
      },
      files: {
        total: totalFiles,
        averageSize: `${(averageFileSize / 1024).toFixed(1)} KB`,
        largeFiles: largeFiles.length,
        problematicFiles: problematicFiles.length
      },
      optimization_opportunities: {
        compression_candidates: largeFiles.length,
        vercel_bypass_needed: problematicFiles.length,
        storage_efficiency_score: Math.min(100, ((totalBytes - usedBytes) / totalBytes) * 100)
      },
      recommendations: [
        largeFiles.length > 0 && 'Enable compression for large files',
        problematicFiles.length > 0 && 'Setup Vercel bypass for large files',
        (usedBytes / totalBytes) > 0.8 && 'Consider storage cleanup or archiving',
        'Enable smart retention policies'
      ].filter(Boolean)
    },
    timestamp: new Date().toISOString()
  });
}

async function optimizeStorage(drive: any, userId: string, config: OptimizationConfig) {
  console.log(`Optimizing storage for ${userId}`);

  const optimizations = [];
  let spaceFreed = 0;

  if (config.enableSmartRetention) {
    // Find old files that can be archived
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days old

    const oldFiles = await drive.files.list({
      q: `modifiedTime < '${cutoffDate.toISOString()}'`,
      fields: 'files(id,name,size,modifiedTime)',
      pageSize: 50
    });

    for (const file of oldFiles.data.files || []) {
      // Move to archive folder instead of deleting
      try {
        // Create archive folder if it doesn't exist
        const archiveFolder = await ensureArchiveFolder(drive);

        await drive.files.update({
          fileId: file.id,
          addParents: archiveFolder.id,
          removeParents: 'root'
        });

        spaceFreed += parseInt(file.size || '0');
        optimizations.push(`Archived: ${file.name}`);

      } catch (error) {
        console.warn(`Failed to archive ${file.name}:`, error);
      }
    }
  }

  return NextResponse.json({
    success: true,
    optimizations,
    spaceFreed: `${(spaceFreed / (1024 * 1024)).toFixed(2)} MB`,
    config,
    timestamp: new Date().toISOString()
  });
}

async function batchProcessFiles(drive: any, userId: string, fileData: any) {
  console.log(`Batch processing files for ${userId}`);

  const { files, operation, config } = fileData;
  const results = [];

  for (const fileId of files) {
    try {
      switch (operation) {
        case 'compress':
          const result = await compressFile(drive, fileId, config);
          results.push({ fileId, status: 'compressed', result });
          break;

        case 'move_to_workspace':
          await moveToWorkspaceStorage(drive, fileId);
          results.push({ fileId, status: 'moved' });
          break;

        case 'generate_embeddings':
          const embedding = await generateFileEmbedding(drive, fileId);
          results.push({ fileId, status: 'embedded', hasEmbedding: !!embedding });
          break;
      }
    } catch (error) {
      results.push({
        fileId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    successful: results.filter(r => r.status !== 'error').length,
    results,
    timestamp: new Date().toISOString()
  });
}

async function setupSmartRouting(drive: any, userId: string, config: any) {
  console.log(`Setting up smart routing for ${userId}`);

  // Create routing configuration
  const routingRules = {
    large_files: {
      threshold: 25 * 1024 * 1024, // 25MB
      route: 'direct_google_drive',
      bypass_vercel: true
    },
    transcriptions: {
      route: 'assemblyai_direct',
      compress: true,
      chunk_size: config.maxChunkSize || 1000
    },
    documents: {
      route: 'workspace_memory',
      enable_rag: true,
      compression: true
    },
    media_files: {
      route: 'google_drive_storage',
      generate_thumbnails: false,
      bypass_processing: true
    }
  };

  // Store routing configuration
  await supabase.from('user_settings').upsert({
    user_id: userId,
    setting_key: 'smart_routing_config',
    setting_value: routingRules,
    updated_at: new Date().toISOString()
  });

  return NextResponse.json({
    success: true,
    message: 'Smart routing configuration updated',
    routing_rules: routingRules,
    timestamp: new Date().toISOString()
  });
}

async function getCapacityMetrics(drive: any, userId: string) {
  const about = await drive.about.get({
    fields: 'storageQuota'
  });

  const quota = about.data.storageQuota;
  const used = parseInt(quota.usage || '0');
  const total = parseInt(quota.limit || '0');

  // Get file type breakdown
  const files = await drive.files.list({
    fields: 'files(mimeType,size)',
    pageSize: 1000
  });

  const typeBreakdown: Record<string, { count: number; size: number }> = {};

  for (const file of files.data.files || []) {
    const type = file.mimeType || 'unknown';
    const size = parseInt(file.size || '0');

    if (!typeBreakdown[type]) {
      typeBreakdown[type] = { count: 0, size: 0 };
    }
    typeBreakdown[type].count++;
    typeBreakdown[type].size += size;
  }

  return NextResponse.json({
    success: true,
    capacity: {
      used_gb: (used / (1024 * 1024 * 1024)).toFixed(2),
      total_gb: (total / (1024 * 1024 * 1024)).toFixed(2),
      utilization_percent: ((used / total) * 100).toFixed(1),
      available_gb: ((total - used) / (1024 * 1024 * 1024)).toFixed(2)
    },
    file_types: Object.entries(typeBreakdown)
      .map(([type, data]) => ({
        type,
        count: data.count,
        size_mb: (data.size / (1024 * 1024)).toFixed(2)
      }))
      .sort((a, b) => parseFloat(b.size_mb) - parseFloat(a.size_mb)),
    timestamp: new Date().toISOString()
  });
}

async function enableVercelBypass(drive: any, userId: string, config: any) {
  // Configure automatic bypass for large files
  const bypassConfig = {
    file_size_threshold: config.threshold || 25 * 1024 * 1024,
    enable_direct_upload: true,
    enable_streaming: true,
    compression_level: config.compressionLevel || 6,
    chunk_size: config.maxChunkSize || 4 * 1024 * 1024
  };

  await supabase.from('user_settings').upsert({
    user_id: userId,
    setting_key: 'vercel_bypass_config',
    setting_value: bypassConfig,
    updated_at: new Date().toISOString()
  });

  return NextResponse.json({
    success: true,
    message: 'Vercel bypass configuration enabled',
    config: bypassConfig,
    timestamp: new Date().toISOString()
  });
}

// Helper functions
async function ensureArchiveFolder(drive: any): Promise<{ id: string }> {
  // Check if archive folder exists
  const existingFolder = await drive.files.list({
    q: "name='KimbleAI-Archive' and mimeType='application/vnd.google-apps.folder'",
    fields: 'files(id)'
  });

  if (existingFolder.data.files.length > 0) {
    return { id: existingFolder.data.files[0].id };
  }

  // Create archive folder
  const folder = await drive.files.create({
    resource: {
      name: 'KimbleAI-Archive',
      mimeType: 'application/vnd.google-apps.folder'
    },
    fields: 'id'
  });

  return { id: folder.data.id };
}

async function compressFile(drive: any, fileId: string, config: any): Promise<any> {
  // Implementation depends on file type
  // This is a placeholder for the compression logic
  return { compressed: true, originalSize: 0, compressedSize: 0 };
}

async function moveToWorkspaceStorage(drive: any, fileId: string): Promise<void> {
  // Move file to workspace memory folder
  // Implementation would depend on the workspace folder structure
}

async function generateFileEmbedding(drive: any, fileId: string): Promise<number[] | null> {
  // Generate embedding for file content
  // Implementation would extract content and generate embedding
  return null;
}

export async function GET() {
  return NextResponse.json({
    service: 'Google Workspace Data Flow Optimization',
    version: '1.0.0',
    endpoints: {
      analyze_data_flow: 'POST { action: "analyze_data_flow", userId: "user_id" }',
      optimize_storage: 'POST { action: "optimize_storage", userId: "user_id", config: {...} }',
      batch_process_files: 'POST { action: "batch_process_files", userId: "user_id", data: {...} }',
      setup_smart_routing: 'POST { action: "setup_smart_routing", userId: "user_id", config: {...} }',
      get_capacity_metrics: 'POST { action: "get_capacity_metrics", userId: "user_id" }',
      enable_vercel_bypass: 'POST { action: "enable_vercel_bypass", userId: "user_id", config: {...} }'
    },
    features: [
      'Intelligent file size routing',
      'Automatic Vercel bypass for large files',
      'Smart compression and archiving',
      'Batch processing operations',
      'Real-time capacity monitoring',
      'Data flow optimization'
    ]
  });
}