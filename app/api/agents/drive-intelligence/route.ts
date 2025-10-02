import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { DriveOptimizer } from '@/lib/drive-optimization';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DriveIntelligenceRequest {
  action: 'analyze' | 'organize' | 'deduplicate' | 'optimize_permissions' | 'storage_report' | 'version_control' | 'auto_organize';
  userId?: string;
  folderId?: string;
  options?: {
    dryRun?: boolean;
    aggressiveness?: 'conservative' | 'moderate' | 'aggressive';
    includeSharedFiles?: boolean;
    maxDepth?: number;
    fileTypes?: string[];
    sizeThreshold?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { action, userId = 'zach', folderId, options = {} }: DriveIntelligenceRequest = await request.json();

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
    const optimizer = new DriveOptimizer(drive, supabase, userId);

    switch (action) {
      case 'analyze':
        return await analyzeDriveStructure(optimizer, folderId, options);

      case 'organize':
        return await organizeFolderStructure(optimizer, folderId, options);

      case 'deduplicate':
        return await detectAndMergeDuplicates(optimizer, folderId, options);

      case 'optimize_permissions':
        return await optimizePermissions(optimizer, folderId, options);

      case 'storage_report':
        return await generateStorageReport(optimizer, options);

      case 'version_control':
        return await manageVersionControl(optimizer, folderId, options);

      case 'auto_organize':
        return await performAutoOrganization(optimizer, folderId, options);

      default:
        return NextResponse.json({
          error: 'Invalid action specified'
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Drive Intelligence error:', error);
    return NextResponse.json({
      error: 'Failed to process Drive Intelligence request',
      details: error.message
    }, { status: 500 });
  }
}

async function analyzeDriveStructure(optimizer: DriveOptimizer, folderId?: string, options: any = {}) {
  const analysis = await optimizer.analyzeDriveStructure(folderId, options);

  return NextResponse.json({
    success: true,
    action: 'analyze',
    analysis: {
      totalFiles: analysis.totalFiles,
      totalFolders: analysis.totalFolders,
      totalSize: analysis.totalSize,
      fileTypes: analysis.fileTypes,
      duplicates: analysis.duplicates,
      largeFiles: analysis.largeFiles,
      oldFiles: analysis.oldFiles,
      organizationScore: analysis.organizationScore,
      permissionIssues: analysis.permissionIssues,
      recommendations: analysis.recommendations
    },
    executionTime: analysis.executionTime
  });
}

async function organizeFolderStructure(optimizer: DriveOptimizer, folderId?: string, options: any = {}) {
  const result = await optimizer.organizeByContent(folderId, options);

  return NextResponse.json({
    success: true,
    action: 'organize',
    result: {
      foldersCreated: result.foldersCreated,
      filesMoved: result.filesMoved,
      organizationRules: result.organizationRules,
      summary: result.summary
    },
    dryRun: options.dryRun || false
  });
}

async function detectAndMergeDuplicates(optimizer: DriveOptimizer, folderId?: string, options: any = {}) {
  const result = await optimizer.detectDuplicates(folderId, options);

  return NextResponse.json({
    success: true,
    action: 'deduplicate',
    result: {
      duplicateGroups: result.duplicateGroups,
      spaceSaved: result.spaceSaved,
      filesProcessed: result.filesProcessed,
      mergeActions: result.mergeActions
    },
    dryRun: options.dryRun || false
  });
}

async function optimizePermissions(optimizer: DriveOptimizer, folderId?: string, options: any = {}) {
  const result = await optimizer.optimizePermissions(folderId, options);

  return NextResponse.json({
    success: true,
    action: 'optimize_permissions',
    result: {
      filesAnalyzed: result.filesAnalyzed,
      permissionIssues: result.permissionIssues,
      recommendedChanges: result.recommendedChanges,
      securityScore: result.securityScore
    }
  });
}

async function generateStorageReport(optimizer: DriveOptimizer, options: any = {}) {
  const report = await optimizer.generateStorageReport(options);

  return NextResponse.json({
    success: true,
    action: 'storage_report',
    report: {
      totalUsage: report.totalUsage,
      usageByType: report.usageByType,
      largestFiles: report.largestFiles,
      oldestFiles: report.oldestFiles,
      recommendations: report.recommendations,
      potentialSavings: report.potentialSavings
    }
  });
}

async function manageVersionControl(optimizer: DriveOptimizer, folderId?: string, options: any = {}) {
  const result = await optimizer.manageVersions(folderId, options);

  return NextResponse.json({
    success: true,
    action: 'version_control',
    result: {
      versionsDetected: result.versionsDetected,
      versionsOrganized: result.versionsOrganized,
      namingConventions: result.namingConventions,
      archiveActions: result.archiveActions
    }
  });
}

async function performAutoOrganization(optimizer: DriveOptimizer, folderId?: string, options: any = {}) {
  // Comprehensive auto-organization that combines multiple optimization strategies
  const results = await optimizer.performFullOptimization(folderId, options);

  return NextResponse.json({
    success: true,
    action: 'auto_organize',
    results: {
      analysis: results.analysis,
      organization: results.organization,
      deduplication: results.deduplication,
      permissions: results.permissions,
      versionControl: results.versionControl,
      totalImprovements: results.totalImprovements,
      timeSpent: results.timeSpent
    },
    dryRun: options.dryRun || false
  });
}

export async function GET(request: NextRequest) {
  // Get Drive Intelligence status and capabilities
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || 'zach';

  try {
    // Check if user has Google token
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .single();

    const capabilities = {
      available: !!tokenData?.access_token,
      features: [
        'Content-based file organization',
        'Duplicate detection and merging',
        'Permission optimization',
        'Storage analytics',
        'Version control',
        'Intelligent folder structure',
        'Access pattern analysis'
      ],
      supportedFileTypes: [
        'Google Docs', 'Google Sheets', 'Google Slides',
        'PDF', 'Word', 'Excel', 'PowerPoint',
        'Images', 'Text files', 'Presentations'
      ]
    };

    return NextResponse.json({
      success: true,
      capabilities,
      status: tokenData?.access_token ? 'ready' : 'authentication_required'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to check Drive Intelligence status'
    }, { status: 500 });
  }
}