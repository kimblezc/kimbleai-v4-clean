import { drive_v3 } from 'googleapis';
import { SupabaseClient } from '@supabase/supabase-js';

interface FileAnalysis {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  createdTime: string;
  parents: string[];
  permissions: any[];
  content?: string;
  category?: string;
  duplicates?: string[];
  organizationSuggestion?: string;
}

interface DriveAnalysis {
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  fileTypes: Record<string, number>;
  duplicates: any[];
  largeFiles: FileAnalysis[];
  oldFiles: FileAnalysis[];
  organizationScore: number;
  permissionIssues: any[];
  recommendations: string[];
  executionTime: number;
}

interface OrganizationRule {
  name: string;
  condition: (file: FileAnalysis) => boolean;
  targetFolder: string;
  description: string;
  priority: number;
}

export class DriveOptimizer {
  private drive: drive_v3.Drive;
  private supabase: SupabaseClient;
  private userId: string;
  private organizationRules: OrganizationRule[];

  constructor(drive: drive_v3.Drive, supabase: SupabaseClient, userId: string) {
    this.drive = drive;
    this.supabase = supabase;
    this.userId = userId;
    this.organizationRules = this.initializeOrganizationRules();
  }

  private initializeOrganizationRules(): OrganizationRule[] {
    return [
      {
        name: 'Documents',
        condition: (file) => file.mimeType === 'application/vnd.google-apps.document' ||
                            file.mimeType === 'application/pdf' ||
                            file.mimeType === 'application/msword',
        targetFolder: 'Documents',
        description: 'Text documents and PDFs',
        priority: 1
      },
      {
        name: 'Spreadsheets',
        condition: (file) => file.mimeType === 'application/vnd.google-apps.spreadsheet' ||
                            file.mimeType === 'application/vnd.ms-excel',
        targetFolder: 'Spreadsheets',
        description: 'Spreadsheet files',
        priority: 1
      },
      {
        name: 'Presentations',
        condition: (file) => file.mimeType === 'application/vnd.google-apps.presentation' ||
                            file.mimeType === 'application/vnd.ms-powerpoint',
        targetFolder: 'Presentations',
        description: 'Presentation files',
        priority: 1
      },
      {
        name: 'Images',
        condition: (file) => file.mimeType?.startsWith('image/'),
        targetFolder: 'Images',
        description: 'Image files',
        priority: 1
      },
      {
        name: 'Archives',
        condition: (file) => {
          const archiveTypes = ['application/zip', 'application/x-rar', 'application/x-7z-compressed'];
          return archiveTypes.includes(file.mimeType);
        },
        targetFolder: 'Archives',
        description: 'Compressed archive files',
        priority: 2
      },
      {
        name: 'Old Files',
        condition: (file) => {
          const fileAge = Date.now() - new Date(file.modifiedTime).getTime();
          const oneYear = 365 * 24 * 60 * 60 * 1000;
          return fileAge > oneYear;
        },
        targetFolder: 'Archive/Old Files',
        description: 'Files older than one year',
        priority: 3
      },
      {
        name: 'Large Files',
        condition: (file) => file.size > 100 * 1024 * 1024, // 100MB
        targetFolder: 'Large Files',
        description: 'Files larger than 100MB',
        priority: 4
      }
    ];
  }

  async analyzeDriveStructure(folderId?: string, options: any = {}): Promise<DriveAnalysis> {
    const startTime = Date.now();
    console.log('Starting Drive structure analysis...');

    try {
      // Get all files in the specified folder or root
      const files = await this.getAllFiles(folderId, options.maxDepth || 10);

      const analysis: DriveAnalysis = {
        totalFiles: 0,
        totalFolders: 0,
        totalSize: 0,
        fileTypes: {},
        duplicates: [],
        largeFiles: [],
        oldFiles: [],
        organizationScore: 0,
        permissionIssues: [],
        recommendations: [],
        executionTime: 0
      };

      // Analyze each file
      for (const file of files) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          analysis.totalFolders++;
        } else {
          analysis.totalFiles++;
          analysis.totalSize += parseInt(file.size || '0');

          // Track file types
          const mimeType = file.mimeType || 'unknown';
          analysis.fileTypes[mimeType] = (analysis.fileTypes[mimeType] || 0) + 1;

          // Identify large files (>50MB)
          if (parseInt(file.size || '0') > 50 * 1024 * 1024) {
            analysis.largeFiles.push(this.convertToFileAnalysis(file));
          }

          // Identify old files (>1 year)
          const fileAge = Date.now() - new Date(file.modifiedTime || '').getTime();
          if (fileAge > 365 * 24 * 60 * 60 * 1000) {
            analysis.oldFiles.push(this.convertToFileAnalysis(file));
          }
        }
      }

      // Detect duplicates
      analysis.duplicates = await this.findDuplicatesByName(files);

      // Calculate organization score
      analysis.organizationScore = this.calculateOrganizationScore(files);

      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      analysis.executionTime = Date.now() - startTime;
      console.log(`Drive analysis completed in ${analysis.executionTime}ms`);

      return analysis;

    } catch (error) {
      console.error('Error analyzing drive structure:', error);
      throw error;
    }
  }

  async organizeByContent(folderId?: string, options: any = {}) {
    console.log('Starting content-based organization...');

    const files = await this.getAllFiles(folderId);
    const result = {
      foldersCreated: [],
      filesMoved: [],
      organizationRules: this.organizationRules,
      summary: {}
    };

    if (options.dryRun) {
      console.log('Running in dry-run mode - no actual changes will be made');
    }

    // Create organized folder structure
    const folderMap = new Map<string, string>();

    for (const rule of this.organizationRules) {
      if (!options.dryRun) {
        const folder = await this.createFolderIfNotExists(rule.targetFolder, folderId);
        folderMap.set(rule.targetFolder, folder.id);
        result.foldersCreated.push(folder);
      }
    }

    // Organize files according to rules
    for (const file of files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') continue;

      const fileAnalysis = this.convertToFileAnalysis(file);

      for (const rule of this.organizationRules.sort((a, b) => a.priority - b.priority)) {
        if (rule.condition(fileAnalysis)) {
          const targetFolderId = folderMap.get(rule.targetFolder);

          if (!options.dryRun && targetFolderId && !file.parents?.includes(targetFolderId)) {
            await this.moveFile(file.id!, targetFolderId, file.parents?.[0]);
          }

          result.filesMoved.push({
            fileId: file.id,
            fileName: file.name,
            rule: rule.name,
            targetFolder: rule.targetFolder
          });
          break; // Apply only the first matching rule
        }
      }
    }

    result.summary = {
      totalFiles: files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder').length,
      filesOrganized: result.filesMoved.length,
      foldersCreated: result.foldersCreated.length
    };

    return result;
  }

  async detectDuplicates(folderId?: string, options: any = {}) {
    console.log('Starting duplicate detection...');

    const files = await this.getAllFiles(folderId);
    const duplicateGroups = [];
    let totalSpaceSaved = 0;

    // Group files by name similarity and size
    const fileGroups = new Map<string, any[]>();

    for (const file of files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') continue;

      const key = this.generateDuplicateKey(file);
      if (!fileGroups.has(key)) {
        fileGroups.set(key, []);
      }
      fileGroups.get(key)!.push(file);
    }

    // Process groups with potential duplicates
    for (const [key, group] of fileGroups) {
      if (group.length > 1) {
        // Analyze content similarity for Google Docs/Sheets/Slides
        const contentSimilarGroup = await this.analyzeContentSimilarity(group);

        if (contentSimilarGroup.length > 1) {
          const duplicateGroup = {
            key,
            files: contentSimilarGroup,
            recommendedAction: this.recommendDuplicateAction(contentSimilarGroup),
            spaceSavings: this.calculateSpaceSavings(contentSimilarGroup)
          };

          duplicateGroups.push(duplicateGroup);
          totalSpaceSaved += duplicateGroup.spaceSavings;
        }
      }
    }

    const mergeActions = [];
    if (!options.dryRun && options.autoMerge) {
      for (const group of duplicateGroups) {
        if (group.recommendedAction === 'merge') {
          const mergeResult = await this.mergeDuplicateFiles(group.files);
          mergeActions.push(mergeResult);
        }
      }
    }

    return {
      duplicateGroups,
      spaceSaved: totalSpaceSaved,
      filesProcessed: files.length,
      mergeActions
    };
  }

  async optimizePermissions(folderId?: string, options: any = {}) {
    console.log('Starting permission optimization...');

    const files = await this.getAllFiles(folderId);
    const permissionIssues = [];
    const recommendedChanges = [];
    let securityScore = 100;

    for (const file of files) {
      try {
        // Get file permissions
        const permissionsResponse = await this.drive.permissions.list({
          fileId: file.id!,
          fields: 'permissions(id,type,role,emailAddress,domain,allowFileDiscovery)'
        });

        const permissions = permissionsResponse.data.permissions || [];

        // Analyze permission issues
        for (const permission of permissions) {
          // Check for overly broad permissions
          if (permission.type === 'anyone' && permission.role !== 'reader') {
            permissionIssues.push({
              fileId: file.id,
              fileName: file.name,
              issue: 'Public file with edit access',
              severity: 'high',
              recommendation: 'Restrict to specific users or make read-only'
            });
            securityScore -= 10;
          }

          // Check for domain-wide sharing
          if (permission.type === 'domain' && permission.role === 'writer') {
            permissionIssues.push({
              fileId: file.id,
              fileName: file.name,
              issue: 'Domain-wide edit access',
              severity: 'medium',
              recommendation: 'Limit to specific users who need edit access'
            });
            securityScore -= 5;
          }

          // Check for unnecessary discoverable files
          if (permission.allowFileDiscovery && permission.type === 'anyone') {
            permissionIssues.push({
              fileId: file.id,
              fileName: file.name,
              issue: 'File discoverable by search engines',
              severity: 'medium',
              recommendation: 'Disable file discovery'
            });
            securityScore -= 3;
          }
        }

        // Generate optimization recommendations
        if (permissions.length > 10) {
          recommendedChanges.push({
            fileId: file.id,
            fileName: file.name,
            action: 'cleanup_permissions',
            description: 'Too many individual permissions - consider using groups'
          });
        }

      } catch (error) {
        console.error(`Error analyzing permissions for file ${file.name}:`, error);
      }
    }

    return {
      filesAnalyzed: files.length,
      permissionIssues,
      recommendedChanges,
      securityScore: Math.max(0, securityScore)
    };
  }

  async generateStorageReport(options: any = {}) {
    console.log('Generating storage report...');

    const files = await this.getAllFiles();
    let totalUsage = 0;
    const usageByType: Record<string, number> = {};
    const largestFiles = [];
    const oldestFiles = [];

    // Calculate usage statistics
    for (const file of files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') continue;

      const size = parseInt(file.size || '0');
      totalUsage += size;

      const mimeType = file.mimeType || 'unknown';
      usageByType[mimeType] = (usageByType[mimeType] || 0) + size;

      largestFiles.push({
        id: file.id,
        name: file.name,
        size: size,
        mimeType: file.mimeType
      });

      oldestFiles.push({
        id: file.id,
        name: file.name,
        modifiedTime: file.modifiedTime,
        size: size
      });
    }

    // Sort and limit results
    largestFiles.sort((a, b) => b.size - a.size);
    oldestFiles.sort((a, b) => new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime());

    const recommendations = this.generateStorageRecommendations(totalUsage, usageByType, largestFiles, oldestFiles);

    return {
      totalUsage,
      usageByType,
      largestFiles: largestFiles.slice(0, 20),
      oldestFiles: oldestFiles.slice(0, 20),
      recommendations,
      potentialSavings: this.calculatePotentialSavings(largestFiles, oldestFiles)
    };
  }

  async manageVersions(folderId?: string, options: any = {}) {
    console.log('Starting version control management...');

    const files = await this.getAllFiles(folderId);
    const versionsDetected = [];
    const versionsOrganized = [];
    const namingConventions = [];

    // Detect version patterns
    const versionPatterns = [
      /(.+)_v(\d+)(\.\w+)?$/,
      /(.+)_(\d+)(\.\w+)?$/,
      /(.+) \((\d+)\)(\.\w+)?$/,
      /(.+) - Copy( \(\d+\))?(\.\w+)?$/
    ];

    const versionGroups = new Map<string, any[]>();

    for (const file of files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') continue;

      const fileName = file.name || '';
      let baseNameFound = false;

      for (const pattern of versionPatterns) {
        const match = fileName.match(pattern);
        if (match) {
          const baseName = match[1];
          if (!versionGroups.has(baseName)) {
            versionGroups.set(baseName, []);
          }
          versionGroups.get(baseName)!.push({
            ...file,
            versionNumber: match[2],
            detectedPattern: pattern.source
          });
          baseNameFound = true;
          break;
        }
      }

      if (!baseNameFound) {
        // Check if this could be a base file for versions
        const possibleVersions = files.filter(f =>
          f.id !== file.id &&
          f.name?.includes(fileName.replace(/\.\w+$/, ''))
        );

        if (possibleVersions.length > 0) {
          versionGroups.set(fileName, [file, ...possibleVersions]);
        }
      }
    }

    // Process version groups
    for (const [baseName, versions] of versionGroups) {
      if (versions.length > 1) {
        versionsDetected.push({
          baseName,
          versions: versions.length,
          files: versions
        });

        // Suggest naming convention improvements
        const suggestedNaming = this.suggestVersionNaming(baseName, versions);
        namingConventions.push(suggestedNaming);

        if (!options.dryRun && options.organizeVersions) {
          const organized = await this.organizeVersionGroup(baseName, versions);
          versionsOrganized.push(organized);
        }
      }
    }

    return {
      versionsDetected,
      versionsOrganized,
      namingConventions,
      archiveActions: []
    };
  }

  async performFullOptimization(folderId?: string, options: any = {}) {
    console.log('Starting full Drive optimization...');
    const startTime = Date.now();

    const results = {
      analysis: {},
      organization: {},
      deduplication: {},
      permissions: {},
      versionControl: {},
      totalImprovements: 0,
      timeSpent: 0
    };

    try {
      // Step 1: Analyze current state
      results.analysis = await this.analyzeDriveStructure(folderId, options);

      // Step 2: Organize files by content
      if (options.organize !== false) {
        results.organization = await this.organizeByContent(folderId, options);
        results.totalImprovements += results.organization.filesMoved?.length || 0;
      }

      // Step 3: Detect and handle duplicates
      if (options.deduplicate !== false) {
        results.deduplication = await this.detectDuplicates(folderId, options);
        results.totalImprovements += results.deduplication.duplicateGroups?.length || 0;
      }

      // Step 4: Optimize permissions
      if (options.optimizePermissions !== false) {
        results.permissions = await this.optimizePermissions(folderId, options);
        results.totalImprovements += results.permissions.recommendedChanges?.length || 0;
      }

      // Step 5: Manage versions
      if (options.manageVersions !== false) {
        results.versionControl = await this.manageVersions(folderId, options);
        results.totalImprovements += results.versionControl.versionsDetected?.length || 0;
      }

      results.timeSpent = Date.now() - startTime;
      console.log(`Full optimization completed in ${results.timeSpent}ms`);

      return results;

    } catch (error) {
      console.error('Error during full optimization:', error);
      throw error;
    }
  }

  // Helper methods
  private async getAllFiles(folderId?: string, maxDepth: number = 10): Promise<any[]> {
    const allFiles: any[] = [];

    try {
      const query = folderId ? `'${folderId}' in parents` : undefined;

      let nextPageToken: string | undefined;
      do {
        const response = await this.drive.files.list({
          q: query,
          fields: 'nextPageToken, files(id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink)',
          pageSize: 1000,
          pageToken: nextPageToken
        });

        const files = response.data.files || [];
        allFiles.push(...files);
        nextPageToken = response.data.nextPageToken || undefined;

      } while (nextPageToken);

      return allFiles;
    } catch (error) {
      console.error('Error getting files:', error);
      return [];
    }
  }

  private convertToFileAnalysis(file: any): FileAnalysis {
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: parseInt(file.size || '0'),
      modifiedTime: file.modifiedTime,
      createdTime: file.createdTime,
      parents: file.parents || [],
      permissions: []
    };
  }

  private calculateOrganizationScore(files: any[]): number {
    // Simple organization score based on folder structure depth and file distribution
    let score = 100;

    const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    const regularFiles = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

    // Penalize too many files in root
    const rootFiles = regularFiles.filter(f => !f.parents || f.parents.length === 0);
    if (rootFiles.length > 20) {
      score -= Math.min(50, rootFiles.length - 20);
    }

    // Reward good folder structure
    if (folders.length > 0 && regularFiles.length / folders.length < 10) {
      score += 10;
    }

    return Math.max(0, score);
  }

  private generateRecommendations(analysis: DriveAnalysis): string[] {
    const recommendations = [];

    if (analysis.duplicates.length > 0) {
      recommendations.push(`Found ${analysis.duplicates.length} potential duplicate files - consider using deduplication feature`);
    }

    if (analysis.largeFiles.length > 0) {
      recommendations.push(`${analysis.largeFiles.length} large files detected - consider archiving or compressing`);
    }

    if (analysis.oldFiles.length > 0) {
      recommendations.push(`${analysis.oldFiles.length} old files found - consider archiving files older than 1 year`);
    }

    if (analysis.organizationScore < 70) {
      recommendations.push('Drive organization could be improved - consider using auto-organization feature');
    }

    return recommendations;
  }

  private async createFolderIfNotExists(folderName: string, parentId?: string): Promise<any> {
    try {
      // Check if folder already exists
      const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder'${parentId ? ` and '${parentId}' in parents` : ''}`;

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id,name)'
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0];
      }

      // Create new folder
      const folderMetadata: any = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };

      if (parentId) {
        folderMetadata.parents = [parentId];
      }

      const createResponse = await this.drive.files.create({
        resource: folderMetadata,
        fields: 'id,name'
      });

      return createResponse.data;
    } catch (error) {
      console.error(`Error creating folder ${folderName}:`, error);
      throw error;
    }
  }

  private async moveFile(fileId: string, newParentId: string, oldParentId?: string): Promise<void> {
    try {
      await this.drive.files.update({
        fileId: fileId,
        addParents: newParentId,
        removeParents: oldParentId,
        fields: 'id,parents'
      });
    } catch (error) {
      console.error(`Error moving file ${fileId}:`, error);
      throw error;
    }
  }

  private generateDuplicateKey(file: any): string {
    // Generate a key for grouping potential duplicates
    const name = file.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
    const size = file.size || '0';
    const type = file.mimeType || '';

    return `${name}_${size}_${type}`;
  }

  private async analyzeContentSimilarity(files: any[]): Promise<any[]> {
    // For now, return files that have the same name and size
    // In a full implementation, this would analyze actual content
    const similar = [];

    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        if (files[i].name === files[j].name && files[i].size === files[j].size) {
          if (!similar.includes(files[i])) similar.push(files[i]);
          if (!similar.includes(files[j])) similar.push(files[j]);
        }
      }
    }

    return similar;
  }

  private recommendDuplicateAction(files: any[]): string {
    // Simple logic: recommend merge if files have same name and similar modification times
    const modTimes = files.map(f => new Date(f.modifiedTime).getTime());
    const timeDiff = Math.max(...modTimes) - Math.min(...modTimes);

    // If modified within 24 hours, likely duplicates
    if (timeDiff < 24 * 60 * 60 * 1000) {
      return 'merge';
    }

    return 'review';
  }

  private calculateSpaceSavings(files: any[]): number {
    const totalSize = files.reduce((sum, file) => sum + parseInt(file.size || '0'), 0);
    return totalSize * (files.length - 1) / files.length; // Estimate savings from keeping one file
  }

  private async mergeDuplicateFiles(files: any[]): Promise<any> {
    // Keep the most recently modified file, move others to trash
    files.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());

    const keepFile = files[0];
    const trashFiles = files.slice(1);

    for (const file of trashFiles) {
      try {
        await this.drive.files.update({
          fileId: file.id,
          resource: { trashed: true }
        });
      } catch (error) {
        console.error(`Error trashing duplicate file ${file.name}:`, error);
      }
    }

    return {
      kept: keepFile,
      trashed: trashFiles.length
    };
  }

  private generateStorageRecommendations(totalUsage: number, usageByType: Record<string, number>, largestFiles: any[], oldestFiles: any[]): string[] {
    const recommendations = [];

    // Calculate 1GB in bytes for reference
    const GB = 1024 * 1024 * 1024;

    if (totalUsage > 10 * GB) {
      recommendations.push('Consider archiving old files to free up space');
    }

    // Find the largest file type category
    const largestType = Object.entries(usageByType).sort((a, b) => b[1] - a[1])[0];
    if (largestType && largestType[1] > totalUsage * 0.3) {
      recommendations.push(`${largestType[0]} files use most space - consider organizing or compressing`);
    }

    if (largestFiles.length > 0 && largestFiles[0].size > 100 * 1024 * 1024) {
      recommendations.push('Several large files detected - consider moving to Google Drive or external storage');
    }

    return recommendations;
  }

  private calculatePotentialSavings(largestFiles: any[], oldestFiles: any[]): number {
    // Calculate potential space savings from archiving old/large files
    const oldFilesSavings = oldestFiles.slice(0, 10).reduce((sum, file) => sum + file.size, 0);
    const largeFilesSavings = largestFiles.slice(0, 5).reduce((sum, file) => sum + file.size * 0.8, 0); // Assume 80% compression

    return oldFilesSavings + largeFilesSavings;
  }

  private suggestVersionNaming(baseName: string, versions: any[]): any {
    // Suggest a consistent naming convention
    return {
      baseName,
      currentNaming: versions.map(v => v.name),
      suggestedPattern: `${baseName}_v{version}`,
      example: `${baseName}_v1, ${baseName}_v2, ${baseName}_v3`
    };
  }

  private async organizeVersionGroup(baseName: string, versions: any[]): Promise<any> {
    // Create a versions folder and move old versions there
    const versionFolder = await this.createFolderIfNotExists(`${baseName} - Versions`);

    // Keep the latest version in place, move others to version folder
    versions.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());

    const oldVersions = versions.slice(1);
    for (const version of oldVersions) {
      await this.moveFile(version.id, versionFolder.id, version.parents?.[0]);
    }

    return {
      baseName,
      versionFolder: versionFolder.id,
      versionsMoveds: oldVersions.length
    };
  }
}