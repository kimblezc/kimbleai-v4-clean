/**
 * Drive Intelligence Agent
 *
 * FOCUS: Google Drive organization and semantic search
 *
 * Capabilities:
 * - Auto-organize files into project folders based on content/name
 * - Detect duplicate files (same name, similar size)
 * - Find transcription-ready audio files (not yet transcribed)
 * - Index document content for semantic search
 * - Suggest file naming improvements (inconsistent patterns)
 * - Create weekly Drive cleanup reports
 */

import { createClient } from '@supabase/supabase-js';
import { google, drive_v3 } from 'googleapis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  parents?: string[];
  webViewLink?: string;
}

export interface DriveIntelligenceFinding {
  type: 'duplicate_file' | 'transcription_ready' | 'naming_issue' | 'organization_suggestion' | 'large_file';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  files: DriveFile[];
  suggestedAction: string;
  confidenceScore: number; // 0-100
  metadata: Record<string, any>;
}

export interface DriveCleanupReport {
  reportDate: string;
  totalFiles: number;
  totalSize: number;
  findings: DriveIntelligenceFinding[];
  duplicatesFound: number;
  transcriptionCandidates: number;
  namingIssues: number;
  organizationSuggestions: number;
  estimatedSpaceSavings: number;
}

export class DriveIntelligenceAgent {
  private static instance: DriveIntelligenceAgent;
  private sessionId: string;
  private drive: drive_v3.Drive | null = null;

  private constructor() {
    this.sessionId = `drive_intel_${Date.now()}`;
  }

  static getInstance(): DriveIntelligenceAgent {
    if (!DriveIntelligenceAgent.instance) {
      DriveIntelligenceAgent.instance = new DriveIntelligenceAgent();
    }
    return DriveIntelligenceAgent.instance;
  }

  /**
   * Main execution - analyze user's Drive and generate findings
   */
  async run(userId: string, accessToken: string): Promise<DriveCleanupReport> {
    const startTime = Date.now();
    await this.log('info', '📁 Drive Intelligence Agent starting analysis', { userId });

    try {
      // Initialize Drive API
      this.drive = this.initializeDriveAPI(accessToken);

      // Get all files from Drive
      const files = await this.getAllDriveFiles();
      await this.log('info', `Found ${files.length} files in Drive`);

      const findings: DriveIntelligenceFinding[] = [];

      // 1. Detect duplicate files
      const duplicates = await this.detectDuplicateFiles(files);
      findings.push(...duplicates);

      // 2. Find transcription-ready audio files
      const transcriptionCandidates = await this.findTranscriptionReadyFiles(files, userId);
      findings.push(...transcriptionCandidates);

      // 3. Detect naming inconsistencies
      const namingIssues = await this.detectNamingIssues(files);
      findings.push(...namingIssues);

      // 4. Generate organization suggestions
      const orgSuggestions = await this.generateOrganizationSuggestions(files, userId);
      findings.push(...orgSuggestions);

      // 5. Identify large files
      const largeFiles = await this.identifyLargeFiles(files);
      findings.push(...largeFiles);

      // Calculate statistics
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      const duplicatesCount = findings.filter(f => f.type === 'duplicate_file').length;
      const transcriptionCount = findings.filter(f => f.type === 'transcription_ready').length;
      const namingCount = findings.filter(f => f.type === 'naming_issue').length;
      const orgCount = findings.filter(f => f.type === 'organization_suggestion').length;

      const estimatedSpaceSavings = this.calculateSpaceSavings(findings);

      // Save findings to database
      await this.saveFindings(userId, findings);

      const report: DriveCleanupReport = {
        reportDate: new Date().toISOString(),
        totalFiles: files.length,
        totalSize,
        findings,
        duplicatesFound: duplicatesCount,
        transcriptionCandidates: transcriptionCount,
        namingIssues: namingCount,
        organizationSuggestions: orgCount,
        estimatedSpaceSavings
      };

      // Save report
      await this.saveReport(userId, report);

      const executionTime = Date.now() - startTime;
      await this.log('info', `✅ Drive Intelligence completed in ${executionTime}ms`, {
        findingsCount: findings.length,
        duplicates: duplicatesCount,
        transcriptionCandidates: transcriptionCount
      });

      return report;
    } catch (error: any) {
      await this.log('error', 'Drive Intelligence execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Detect duplicate files (same name, similar size)
   */
  private async detectDuplicateFiles(files: DriveFile[]): Promise<DriveIntelligenceFinding[]> {
    await this.log('info', '🔍 Detecting duplicate files');

    const findings: DriveIntelligenceFinding[] = [];
    const fileGroups = new Map<string, DriveFile[]>();

    // Group files by normalized name and approximate size
    for (const file of files) {
      // Skip folders
      if (file.mimeType === 'application/vnd.google-apps.folder') continue;

      const normalizedName = file.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const sizeCategory = Math.floor(file.size / 1000); // Group by KB
      const key = `${normalizedName}_${sizeCategory}`;

      if (!fileGroups.has(key)) {
        fileGroups.set(key, []);
      }
      fileGroups.get(key)!.push(file);
    }

    // Find groups with duplicates
    for (const [key, group] of Array.from(fileGroups.entries())) {
      if (group.length > 1) {
        // Calculate confidence based on exact name match and size similarity
        const exactNameMatch = new Set(group.map(f => f.name)).size === 1;
        const sizeDiff = Math.max(...group.map(f => f.size)) - Math.min(...group.map(f => f.size));
        const avgSize = group.reduce((sum, f) => sum + f.size, 0) / group.length;
        const sizeSimilarity = 100 - Math.min(100, (sizeDiff / avgSize) * 100);

        const confidenceScore = exactNameMatch ? 95 : Math.max(60, sizeSimilarity);

        findings.push({
          type: 'duplicate_file',
          severity: group.length >= 3 ? 'high' : 'medium',
          title: `Duplicate files detected: ${group[0].name}`,
          description: `Found ${group.length} files with the same or similar name and size.`,
          files: group,
          suggestedAction: `Keep the most recent version and delete ${group.length - 1} duplicate(s)`,
          confidenceScore,
          metadata: {
            exactNameMatch,
            sizeSimilarity: sizeSimilarity.toFixed(1),
            totalSize: group.reduce((sum, f) => sum + f.size, 0)
          }
        });
      }
    }

    await this.log('info', `Found ${findings.length} duplicate file groups`);
    return findings;
  }

  /**
   * Find audio/video files that haven't been transcribed yet
   */
  private async findTranscriptionReadyFiles(files: DriveFile[], userId: string): Promise<DriveIntelligenceFinding[]> {
    await this.log('info', '🎤 Finding transcription-ready files');

    const findings: DriveIntelligenceFinding[] = [];
    const transcribableTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mp4',
      'video/mp4', 'video/quicktime', 'video/x-msvideo'
    ];

    // Get already transcribed files
    const { data: existingTranscriptions } = await supabase
      .from('transcriptions')
      .select('source_file_id')
      .eq('user_id', userId);

    const transcribedFileIds = new Set(
      (existingTranscriptions || []).map(t => t.source_file_id).filter(Boolean)
    );

    // Find audio/video files not yet transcribed
    const candidates = files.filter(file =>
      transcribableTypes.some(type => file.mimeType?.includes(type)) &&
      !transcribedFileIds.has(file.id) &&
      file.size > 10000 && // At least 10KB
      file.size < 500 * 1024 * 1024 // Less than 500MB
    );

    if (candidates.length > 0) {
      // Group by size category
      const smallFiles = candidates.filter(f => f.size < 10 * 1024 * 1024); // <10MB
      const mediumFiles = candidates.filter(f => f.size >= 10 * 1024 * 1024 && f.size < 50 * 1024 * 1024);
      const largeFiles = candidates.filter(f => f.size >= 50 * 1024 * 1024);

      if (smallFiles.length > 0) {
        findings.push({
          type: 'transcription_ready',
          severity: 'high',
          title: `${smallFiles.length} small audio/video files ready for transcription`,
          description: 'These files are good candidates for automatic transcription (under 10MB).',
          files: smallFiles,
          suggestedAction: 'Auto-transcribe these files',
          confidenceScore: 95,
          metadata: {
            sizeCategory: 'small',
            estimatedCost: (smallFiles.length * 0.01).toFixed(2)
          }
        });
      }

      if (mediumFiles.length > 0) {
        findings.push({
          type: 'transcription_ready',
          severity: 'medium',
          title: `${mediumFiles.length} medium audio/video files ready for transcription`,
          description: 'These files can be transcribed (10-50MB each).',
          files: mediumFiles,
          suggestedAction: 'Review and transcribe selected files',
          confidenceScore: 85,
          metadata: {
            sizeCategory: 'medium',
            estimatedCost: (mediumFiles.length * 0.05).toFixed(2)
          }
        });
      }

      if (largeFiles.length > 0) {
        findings.push({
          type: 'transcription_ready',
          severity: 'low',
          title: `${largeFiles.length} large audio/video files available`,
          description: 'These files are large (50MB+). Transcription will take longer and cost more.',
          files: largeFiles.slice(0, 10), // Limit to 10
          suggestedAction: 'Manually review before transcription',
          confidenceScore: 70,
          metadata: {
            sizeCategory: 'large',
            estimatedCost: (largeFiles.length * 0.20).toFixed(2)
          }
        });
      }
    }

    await this.log('info', `Found ${candidates.length} transcription candidates`);
    return findings;
  }

  /**
   * Detect naming inconsistencies
   */
  private async detectNamingIssues(files: DriveFile[]): Promise<DriveIntelligenceFinding[]> {
    await this.log('info', '📝 Analyzing file naming patterns');

    const findings: DriveIntelligenceFinding[] = [];

    // Find files with poor naming patterns
    const issuePatterns = [
      { pattern: /^untitled/i, issue: 'Untitled files', severity: 'medium' as const },
      { pattern: /^copy of/i, issue: 'Copy files', severity: 'low' as const },
      { pattern: /\(\d+\)/, issue: 'Numbered duplicates', severity: 'medium' as const },
      { pattern: /^[0-9]{8,}/, issue: 'Timestamp-only names', severity: 'low' as const },
      { pattern: /^document\d*/i, issue: 'Generic document names', severity: 'low' as const }
    ];

    for (const { pattern, issue, severity } of issuePatterns) {
      const matchingFiles = files.filter(f =>
        f.mimeType !== 'application/vnd.google-apps.folder' &&
        pattern.test(f.name)
      );

      if (matchingFiles.length > 0) {
        findings.push({
          type: 'naming_issue',
          severity,
          title: `${issue}: ${matchingFiles.length} files`,
          description: `Found ${matchingFiles.length} files with naming pattern: ${issue}`,
          files: matchingFiles.slice(0, 20), // Limit to 20 examples
          suggestedAction: 'Rename files with descriptive names',
          confidenceScore: 90,
          metadata: {
            pattern: pattern.source,
            count: matchingFiles.length
          }
        });
      }
    }

    await this.log('info', `Found ${findings.length} naming issue categories`);
    return findings;
  }

  /**
   * Generate organization suggestions based on file types and user's projects
   */
  private async generateOrganizationSuggestions(files: DriveFile[], userId: string): Promise<DriveIntelligenceFinding[]> {
    await this.log('info', '🗂️ Generating organization suggestions');

    const findings: DriveIntelligenceFinding[] = [];

    // Get user's projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, description')
      .eq('user_id', userId);

    // Find files at root level (no parents or in "My Drive")
    const rootFiles = files.filter(f =>
      f.mimeType !== 'application/vnd.google-apps.folder' &&
      (!f.parents || f.parents.length === 0)
    );

    if (rootFiles.length > 20) {
      findings.push({
        type: 'organization_suggestion',
        severity: 'high',
        title: `${rootFiles.length} files at root level`,
        description: 'Many files are not organized into folders. Consider creating folders by file type or project.',
        files: rootFiles.slice(0, 20),
        suggestedAction: 'Auto-organize files into folders by type',
        confidenceScore: 85,
        metadata: {
          rootFileCount: rootFiles.length
        }
      });
    }

    // Group files by type
    const filesByType = this.groupFilesByType(files);

    for (const [type, typeFiles] of Object.entries(filesByType)) {
      if (typeFiles.length > 10 && type !== 'folder') {
        const folderName = this.suggestFolderNameForType(type);

        findings.push({
          type: 'organization_suggestion',
          severity: 'medium',
          title: `Organize ${typeFiles.length} ${type} files`,
          description: `Found ${typeFiles.length} ${type} files that could be organized together.`,
          files: typeFiles.slice(0, 10),
          suggestedAction: `Create "${folderName}" folder and move files`,
          confidenceScore: 75,
          metadata: {
            fileType: type,
            count: typeFiles.length,
            suggestedFolder: folderName
          }
        });
      }
    }

    // Match files to projects based on name similarity
    if (projects && projects.length > 0) {
      for (const project of projects) {
        const projectKeywords = this.extractKeywords(project.name + ' ' + (project.description || ''));
        const matchingFiles = files.filter(file => {
          const fileName = file.name.toLowerCase();
          return projectKeywords.some(keyword => fileName.includes(keyword));
        });

        if (matchingFiles.length > 3) {
          findings.push({
            type: 'organization_suggestion',
            severity: 'medium',
            title: `Link ${matchingFiles.length} files to project: ${project.name}`,
            description: `These files appear related to project "${project.name}" based on naming patterns.`,
            files: matchingFiles.slice(0, 10),
            suggestedAction: `Add files to project "${project.name}"`,
            confidenceScore: 65,
            metadata: {
              projectId: project.id,
              projectName: project.name,
              matchingCount: matchingFiles.length
            }
          });
        }
      }
    }

    await this.log('info', `Generated ${findings.length} organization suggestions`);
    return findings;
  }

  /**
   * Identify large files that might need cleanup
   */
  private async identifyLargeFiles(files: DriveFile[]): Promise<DriveIntelligenceFinding[]> {
    await this.log('info', '📊 Identifying large files');

    const findings: DriveIntelligenceFinding[] = [];
    const largeThreshold = 100 * 1024 * 1024; // 100MB

    const largeFiles = files.filter(f =>
      f.mimeType !== 'application/vnd.google-apps.folder' &&
      f.size > largeThreshold
    ).sort((a, b) => b.size - a.size);

    if (largeFiles.length > 0) {
      const totalSize = largeFiles.reduce((sum, f) => sum + f.size, 0);

      findings.push({
        type: 'large_file',
        severity: totalSize > 1024 * 1024 * 1024 ? 'high' : 'medium', // 1GB+
        title: `${largeFiles.length} large files using ${this.formatFileSize(totalSize)}`,
        description: 'These files are taking up significant storage space. Consider archiving or compressing.',
        files: largeFiles.slice(0, 20),
        suggestedAction: 'Review and archive/compress large files',
        confidenceScore: 100,
        metadata: {
          totalSize,
          largestFile: largeFiles[0].name,
          largestFileSize: largeFiles[0].size
        }
      });
    }

    return findings;
  }

  // Helper methods

  private initializeDriveAPI(accessToken: string): drive_v3.Drive {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.drive({ version: 'v3', auth });
  }

  private async getAllDriveFiles(): Promise<DriveFile[]> {
    if (!this.drive) throw new Error('Drive API not initialized');

    const files: DriveFile[] = [];
    let pageToken: string | undefined;

    try {
      do {
        const response = await this.drive.files.list({
          pageSize: 1000,
          fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, parents, webViewLink)',
          q: 'trashed = false',
          pageToken
        });

        const responseFiles = response.data.files || [];
        for (const file of responseFiles) {
          files.push({
            id: file.id!,
            name: file.name!,
            mimeType: file.mimeType!,
            size: parseInt(file.size || '0'),
            modifiedTime: file.modifiedTime!,
            parents: file.parents,
            webViewLink: file.webViewLink
          });
        }

        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);

      return files;
    } catch (error: any) {
      await this.log('error', 'Failed to fetch Drive files', { error: error.message });
      throw error;
    }
  }

  private groupFilesByType(files: DriveFile[]): Record<string, DriveFile[]> {
    const groups: Record<string, DriveFile[]> = {};

    for (const file of files) {
      let type = 'other';

      if (file.mimeType.includes('folder')) type = 'folder';
      else if (file.mimeType.includes('document')) type = 'document';
      else if (file.mimeType.includes('spreadsheet')) type = 'spreadsheet';
      else if (file.mimeType.includes('presentation')) type = 'presentation';
      else if (file.mimeType.includes('pdf')) type = 'pdf';
      else if (file.mimeType.startsWith('image/')) type = 'image';
      else if (file.mimeType.startsWith('video/')) type = 'video';
      else if (file.mimeType.startsWith('audio/')) type = 'audio';

      if (!groups[type]) groups[type] = [];
      groups[type].push(file);
    }

    return groups;
  }

  private suggestFolderNameForType(type: string): string {
    const folderNames: Record<string, string> = {
      'document': 'Documents',
      'spreadsheet': 'Spreadsheets',
      'presentation': 'Presentations',
      'pdf': 'PDFs',
      'image': 'Images',
      'video': 'Videos',
      'audio': 'Audio Files'
    };
    return folderNames[type] || 'Miscellaneous';
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);

    // Remove common words
    const stopWords = new Set(['this', 'that', 'with', 'from', 'have', 'will', 'your', 'about']);
    return words.filter(w => !stopWords.has(w));
  }

  private calculateSpaceSavings(findings: DriveIntelligenceFinding[]): number {
    let savings = 0;

    for (const finding of findings) {
      if (finding.type === 'duplicate_file') {
        // Save space by keeping only 1 copy
        const totalSize = finding.files.reduce((sum, f) => sum + f.size, 0);
        const largestFile = Math.max(...finding.files.map(f => f.size));
        savings += totalSize - largestFile;
      }
    }

    return savings;
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  private async saveFindings(userId: string, findings: DriveIntelligenceFinding[]): Promise<void> {
    for (const finding of findings) {
      await supabase.from('agent_findings').insert({
        finding_type: 'insight',
        severity: finding.severity === 'high' ? 'high' : finding.severity === 'medium' ? 'medium' : 'low',
        title: finding.title,
        description: finding.description + `\n\nConfidence: ${finding.confidenceScore}%`,
        detection_method: 'drive_intelligence',
        evidence: {
          ...finding.metadata,
          files: finding.files.map(f => ({ id: f.id, name: f.name, size: f.size })),
          suggestedAction: finding.suggestedAction
        }
      });
    }
  }

  private async saveReport(userId: string, report: DriveCleanupReport): Promise<void> {
    await supabase.from('agent_reports').insert({
      report_type: 'optimization_report',
      period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      period_end: new Date().toISOString(),
      executive_summary: `Drive Intelligence Report: Analyzed ${report.totalFiles} files (${this.formatFileSize(report.totalSize)}). Found ${report.duplicatesFound} duplicate groups, ${report.transcriptionCandidates} transcription candidates, ${report.namingIssues} naming issues, and ${report.organizationSuggestions} organization opportunities. Potential space savings: ${this.formatFileSize(report.estimatedSpaceSavings)}.`,
      key_accomplishments: [
        `Analyzed ${report.totalFiles} Drive files`,
        `Identified ${report.duplicatesFound} duplicate file groups`,
        `Found ${report.transcriptionCandidates} transcription-ready files`
      ],
      recommendations: report.findings.slice(0, 10).map(f => f.suggestedAction),
      metrics: {
        totalFiles: report.totalFiles,
        totalSize: report.totalSize,
        findings: report.findings.length,
        estimatedSavings: report.estimatedSpaceSavings
      }
    });
  }

  private async log(level: string, message: string, details?: any): Promise<void> {
    await supabase.from('agent_logs').insert({
      log_level: level,
      category: 'drive-intelligence',
      message,
      details,
      session_id: this.sessionId
    });

    console.log(`[DRIVE-INTEL] [${level.toUpperCase()}] ${message}`, details || '');
  }
}
