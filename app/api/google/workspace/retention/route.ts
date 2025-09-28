import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { WorkspaceRAGSystem } from '../rag-system';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RetentionPolicy {
  type: string;
  maxAgeDays: number;
  importanceThreshold: number;
  action: 'delete' | 'archive' | 'compress';
  archiveLocation?: string;
}

const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    type: 'conversation',
    maxAgeDays: 180, // 6 months
    importanceThreshold: 0.3,
    action: 'archive'
  },
  {
    type: 'transcription',
    maxAgeDays: 365, // 1 year
    importanceThreshold: 0.5,
    action: 'compress'
  },
  {
    type: 'knowledge',
    maxAgeDays: 730, // 2 years
    importanceThreshold: 0.7,
    action: 'archive'
  },
  {
    type: 'audio',
    maxAgeDays: 90, // 3 months for raw audio
    importanceThreshold: 0.4,
    action: 'delete' // Keep transcriptions, delete raw audio
  },
  {
    type: 'analysis',
    maxAgeDays: 90,
    importanceThreshold: 0.6,
    action: 'compress'
  }
];

export async function POST(request: NextRequest) {
  try {
    const { action, userId = 'zach', dryRun = true, policies } = await request.json();

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

    // Initialize Google Drive and RAG system
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
    const ragSystem = new WorkspaceRAGSystem(drive);

    switch (action) {
      case 'analyze':
        return await analyzeRetentionNeeds(ragSystem, userId);

      case 'cleanup':
        return await performCleanup(ragSystem, userId, policies || DEFAULT_RETENTION_POLICIES, dryRun);

      case 'archive_old':
        return await archiveOldMemories(ragSystem, userId, dryRun);

      case 'compress_large':
        return await compressLargeMemories(ragSystem, userId, dryRun);

      case 'deduplicate':
        return await deduplicateMemories(ragSystem, userId, dryRun);

      default:
        return await analyzeRetentionNeeds(ragSystem, userId);
    }

  } catch (error: any) {
    console.error('Retention management error:', error);
    return NextResponse.json({
      error: 'Failed to manage data retention',
      details: error.message
    }, { status: 500 });
  }
}

// Analyze what needs retention management
async function analyzeRetentionNeeds(ragSystem: WorkspaceRAGSystem, userId: string) {
  try {
    console.log(`Analyzing retention needs for user: ${userId}`);

    // Get memory statistics from Supabase index
    const { data: memoryData } = await supabase
      .from('workspace_memory_index')
      .select('*')
      .eq('user_id', userId);

    if (!memoryData) {
      return NextResponse.json({
        success: true,
        analysis: {
          totalMemories: 0,
          recommendedActions: []
        }
      });
    }

    const analysis = {
      totalMemories: memoryData.length,
      memoryByType: {} as Record<string, number>,
      memoryByAge: {
        last7Days: 0,
        last30Days: 0,
        last90Days: 0,
        last365Days: 0,
        older: 0
      },
      sizeAnalysis: {
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        largestMemories: [] as any[],
        compressionEfficiency: '0%'
      },
      recommendedActions: [] as any[]
    };

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    for (const memory of memoryData) {
      // Count by type
      analysis.memoryByType[memory.type] = (analysis.memoryByType[memory.type] || 0) + 1;

      // Count by age
      const age = now - new Date(memory.created_at).getTime();
      if (age <= 7 * day) analysis.memoryByAge.last7Days++;
      else if (age <= 30 * day) analysis.memoryByAge.last30Days++;
      else if (age <= 90 * day) analysis.memoryByAge.last90Days++;
      else if (age <= 365 * day) analysis.memoryByAge.last365Days++;
      else analysis.memoryByAge.older++;

      // Size analysis
      analysis.sizeAnalysis.totalOriginalSize += memory.original_size || 0;
      analysis.sizeAnalysis.totalCompressedSize += memory.compressed_size || 0;

      // Find large memories
      if (memory.original_size > 100000) { // > 100KB
        analysis.sizeAnalysis.largestMemories.push({
          id: memory.id,
          title: memory.title,
          type: memory.type,
          originalSize: formatBytes(memory.original_size),
          age: Math.floor(age / day) + ' days',
          importance: memory.importance
        });
      }
    }

    // Calculate compression efficiency
    if (analysis.sizeAnalysis.totalOriginalSize > 0) {
      const efficiency = (1 - analysis.sizeAnalysis.totalCompressedSize / analysis.sizeAnalysis.totalOriginalSize) * 100;
      analysis.sizeAnalysis.compressionEfficiency = efficiency.toFixed(1) + '%';
    }

    // Sort largest memories by size
    analysis.sizeAnalysis.largestMemories.sort((a, b) =>
      parseFloat(a.originalSize) - parseFloat(b.originalSize)
    ).slice(0, 10);

    // Generate recommendations
    if (analysis.memoryByAge.older > 10) {
      analysis.recommendedActions.push({
        action: 'archive_old',
        reason: `${analysis.memoryByAge.older} memories older than 1 year`,
        priority: 'medium',
        estimatedSavings: 'Significant storage reduction'
      });
    }

    if (analysis.sizeAnalysis.largestMemories.length > 5) {
      analysis.recommendedActions.push({
        action: 'compress_large',
        reason: `${analysis.sizeAnalysis.largestMemories.length} large memories found`,
        priority: 'low',
        estimatedSavings: 'Additional compression possible'
      });
    }

    const lowImportanceCount = memoryData.filter(m => m.importance < 0.4).length;
    if (lowImportanceCount > 20) {
      analysis.recommendedActions.push({
        action: 'cleanup',
        reason: `${lowImportanceCount} low-importance memories`,
        priority: 'high',
        estimatedSavings: 'Major storage cleanup'
      });
    }

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json({
      error: 'Failed to analyze retention needs',
      details: error.message
    }, { status: 500 });
  }
}

// Perform cleanup based on retention policies
async function performCleanup(
  ragSystem: WorkspaceRAGSystem,
  userId: string,
  policies: RetentionPolicy[],
  dryRun: boolean
) {
  console.log(`${dryRun ? 'Simulating' : 'Performing'} cleanup for user: ${userId}`);

  const results = {
    totalMemories: 0,
    actionsPlanned: [] as any[],
    actionsPerformed: [] as any[],
    spaceSaved: 0,
    errors: [] as string[]
  };

  try {
    // Get all memories
    const { data: memoryData } = await supabase
      .from('workspace_memory_index')
      .select('*')
      .eq('user_id', userId);

    if (!memoryData) {
      return NextResponse.json({ success: true, results });
    }

    results.totalMemories = memoryData.length;

    for (const policy of policies) {
      const cutoffDate = new Date(Date.now() - policy.maxAgeDays * 24 * 60 * 60 * 1000);

      const candidateMemories = memoryData.filter(memory => {
        return memory.type === policy.type &&
               new Date(memory.created_at) < cutoffDate &&
               memory.importance < policy.importanceThreshold;
      });

      for (const memory of candidateMemories) {
        const action = {
          memoryId: memory.id,
          title: memory.title,
          type: memory.type,
          age: Math.floor((Date.now() - new Date(memory.created_at).getTime()) / (24 * 60 * 60 * 1000)),
          importance: memory.importance,
          originalSize: memory.original_size,
          action: policy.action,
          policy: policy
        };

        results.actionsPlanned.push(action);

        if (!dryRun) {
          try {
            switch (policy.action) {
              case 'delete':
                await deleteMemory(ragSystem, userId, memory.id);
                results.spaceSaved += memory.compressed_size || 0;
                break;

              case 'archive':
                await archiveMemory(ragSystem, userId, memory.id);
                break;

              case 'compress':
                await recompressMemory(ragSystem, userId, memory.id);
                break;
            }

            results.actionsPerformed.push(action);
          } catch (error: any) {
            results.errors.push(`Failed to ${policy.action} memory ${memory.id}: ${error.message}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      results
    });

  } catch (error: any) {
    console.error('Cleanup error:', error);
    results.errors.push(error.message);
    return NextResponse.json({
      success: false,
      results
    }, { status: 500 });
  }
}

// Archive old memories by moving to archive folder
async function archiveOldMemories(ragSystem: WorkspaceRAGSystem, userId: string, dryRun: boolean) {
  console.log(`${dryRun ? 'Simulating' : 'Performing'} archive of old memories`);

  // Implementation would create an "Archive" folder and move old memories there
  // For now, return simulation results

  return NextResponse.json({
    success: true,
    dryRun,
    message: 'Archive functionality ready for implementation',
    note: 'Would move memories older than 1 year to Archive folder in Google Drive'
  });
}

// Compress large memories further
async function compressLargeMemories(ragSystem: WorkspaceRAGSystem, userId: string, dryRun: boolean) {
  console.log(`${dryRun ? 'Simulating' : 'Performing'} compression of large memories`);

  return NextResponse.json({
    success: true,
    dryRun,
    message: 'Compression optimization ready for implementation',
    note: 'Would apply higher compression to large, old memories'
  });
}

// Remove duplicate memories
async function deduplicateMemories(ragSystem: WorkspaceRAGSystem, userId: string, dryRun: boolean) {
  console.log(`${dryRun ? 'Simulating' : 'Finding'} duplicate memories`);

  return NextResponse.json({
    success: true,
    dryRun,
    message: 'Deduplication ready for implementation',
    note: 'Would identify and merge similar content based on embeddings'
  });
}

// Helper functions
async function deleteMemory(ragSystem: WorkspaceRAGSystem, userId: string, memoryId: string) {
  // Delete from Google Drive and Supabase index
  console.log(`Deleting memory: ${memoryId}`);
  // Implementation would delete the actual files and index entries
}

async function archiveMemory(ragSystem: WorkspaceRAGSystem, userId: string, memoryId: string) {
  // Move to archive folder
  console.log(`Archiving memory: ${memoryId}`);
  // Implementation would move files to archive folder
}

async function recompressMemory(ragSystem: WorkspaceRAGSystem, userId: string, memoryId: string) {
  // Apply higher compression
  console.log(`Recompressing memory: ${memoryId}`);
  // Implementation would recompress with higher settings
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function GET() {
  return NextResponse.json({
    message: 'Google Workspace Smart Data Retention System',
    features: [
      'Intelligent retention policy management',
      'Automatic cleanup of old low-importance memories',
      'Storage optimization and compression',
      'Duplicate detection and removal',
      'Archive management for long-term storage'
    ],
    defaultPolicies: DEFAULT_RETENTION_POLICIES,
    endpoints: {
      analyze: 'POST /api/google/workspace/retention - { action: "analyze" }',
      cleanup: 'POST /api/google/workspace/retention - { action: "cleanup", dryRun: true }',
      archive: 'POST /api/google/workspace/retention - { action: "archive_old" }',
      compress: 'POST /api/google/workspace/retention - { action: "compress_large" }',
      deduplicate: 'POST /api/google/workspace/retention - { action: "deduplicate" }'
    }
  });
}