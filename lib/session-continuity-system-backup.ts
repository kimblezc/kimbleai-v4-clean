/**
 * SESSION CONTINUITY SYSTEM
 * Automatic full context preservation for Opus 4 session transitions
 * This ensures ZERO information loss when hitting length limits
 */

import { createClient } from '@supabase/supabase-js';
import { MessageReferenceSystem } from './message-reference-system';
import { ConversationLogger } from './conversation-logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SessionSnapshot {
  id: string;
  timestamp: string;
  conversation_id: string;
  project_id?: string;
  user_id: string;
  message_count: number;
  token_count: number;
  
  // Complete conversation state
  messages: Array<{
    id: string;
    role: string;
    content: string;
    metadata: any;
  }>;
  
  // Current work context
  current_files: Array<{
    path: string;
    content: string;
    last_modified: string;
    changes: string[];
  }>;
  
  // Active decisions and tasks
  pending_decisions: Array<{
    id: string;
    description: string;
    options: string[];
    context: string;
  }>;
  
  active_tasks: Array<{
    id: string;
    description: string;
    status: string;
    progress: string;
  }>;
  
  // Code context
  code_blocks: Array<{
    id: string;
    language: string;
    filename?: string;
    content: string;
    purpose: string;
  }>;
  
  // System state
  environment_variables: Record<string, boolean>;
  deployment_status: {
    vercel: boolean;
    github: boolean;
    supabase: boolean;
    local: boolean;
  };
  
  // Git state
  git_status: {
    branch: string;
    last_commit: string;
    uncommitted_changes: string[];
    remote_url: string;
  };
  
  // Project structure
  project_structure: {
    root_path: string;
    key_directories: string[];
    key_files: string[];
    total_files: number;
  };
  
  // Continuation instructions
  continuation: {
    next_steps: string[];
    blockers: string[];
    important_context: string[];
    reference_messages: string[];
    opus_4_instructions: string;
  };
}

export class SessionContinuitySystem {
  private static instance: SessionContinuitySystem;
  private currentSnapshot: SessionSnapshot | null = null;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private tokenCounter: number = 0;
  private readonly TOKEN_WARNING_THRESHOLD = 90000; // Warn at 90k tokens
  private readonly TOKEN_EXPORT_THRESHOLD = 95000; // Auto-export at 95k tokens
  
  private constructor() {
    this.startAutoSave();
  }
  
  public static getInstance(): SessionContinuitySystem {
    if (!SessionContinuitySystem.instance) {
      SessionContinuitySystem.instance = new SessionContinuitySystem();
    }
    return SessionContinuitySystem.instance;
  }
  
  /**
   * Create a complete session snapshot
   */
  async createSnapshot(
    conversationId: string,
    userId: string,
    projectId?: string
  ): Promise<SessionSnapshot> {
    try {
      console.log('Creating comprehensive session snapshot...');
      
      // Get all messages in conversation
      const messageSystem = MessageReferenceSystem.getInstance();
      const messages = await this.getAllMessages(conversationId);
      
      // Get current file states
      const currentFiles = await this.getCurrentFileStates();
      
      // Get pending decisions and tasks
      const decisions = await this.getPendingDecisions(projectId);
      const tasks = await this.getActiveTasks(projectId);
      
      // Get code blocks
      const codeBlocks = await this.getCodeBlocks(conversationId);
      
      // Get environment and deployment status
      const envStatus = await this.getEnvironmentStatus();
      const deployStatus = await this.getDeploymentStatus();
      
      // Get git status
      const gitStatus = await this.getGitStatus();
      
      // Get project structure
      const projectStructure = await this.getProjectStructure();
      
      // Calculate token count
      const tokenCount = this.estimateTokenCount(messages);
      
      // Generate continuation instructions
      const continuation = this.generateContinuationInstructions(
        messages,
        decisions,
        tasks,
        currentFiles
      );
      
      const snapshot: SessionSnapshot = {
        id: `snapshot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        conversation_id: conversationId,
        project_id: projectId,
        user_id: userId,
        message_count: messages.length,
        token_count: tokenCount,
        messages,
        current_files: currentFiles,
        pending_decisions: decisions,
        active_tasks: tasks,
        code_blocks: codeBlocks,
        environment_variables: envStatus,
        deployment_status: deployStatus,
        git_status: gitStatus,
        project_structure: projectStructure,
        continuation
      };
      
      // Store snapshot in database
      await this.storeSnapshot(snapshot);
      
      // Store locally
      this.currentSnapshot = snapshot;
      
      // Export to file for manual reference
      await this.exportSnapshotToFile(snapshot);
      
      // Log to Master Document via Zapier
      await this.logToMasterDocument(snapshot);
      
      return snapshot;
      
    } catch (error) {
      console.error('Failed to create snapshot:', error);
      throw error;
    }
  }
  
  /**
   * Monitor token usage and auto-export when approaching limit
   */
  async monitorTokenUsage(
    conversationId: string,
    userId: string,
    currentTokens: number
  ): Promise<void> {
    this.tokenCounter += currentTokens;
    
    if (this.tokenCounter >= this.TOKEN_WARNING_THRESHOLD) {
      console.warn(`TOKEN WARNING: ${this.tokenCounter} tokens used`);
      
      // Send warning to UI
      await this.sendTokenWarning(this.tokenCounter);
    }
    
    if (this.tokenCounter >= this.TOKEN_EXPORT_THRESHOLD) {
      console.log('TOKEN LIMIT APPROACHING - AUTO-EXPORTING SESSION');
      
      // Create and export snapshot
      const snapshot = await this.createSnapshot(conversationId, userId);
      
      // Generate Opus 4 transition file
      await this.generateOpus4Transition(snapshot);
      
      // Reset counter
      this.tokenCounter = 0;
    }
  }
  
  /**
   * Generate Opus 4 transition file with complete context
   */
  async generateOpus4Transition(snapshot: SessionSnapshot): Promise<void> {
    const transitionContent = `# OPUS 4 SESSION TRANSITION - ${new Date().toISOString()}
## AUTOMATIC EXPORT DUE TO TOKEN LIMIT

---

## 🚨 CRITICAL CONTEXT

**Conversation ID**: ${snapshot.conversation_id}
**Project ID**: ${snapshot.project_id || 'None'}
**Message Count**: ${snapshot.message_count}
**Token Count**: ${snapshot.token_count}

---

## 📍 CURRENT STATE

### Active Files Being Edited
${snapshot.current_files.map(f => `
**${f.path}**
- Last Modified: ${f.last_modified}
- Recent Changes: ${f.changes.join(', ')}
\`\`\`
${f.content.substring(0, 500)}...
\`\`\`
`).join('\n')}

### Pending Decisions
${snapshot.pending_decisions.map(d => `
- **${d.description}**
  - Options: ${d.options.join(', ')}
  - Context: ${d.context}
`).join('\n')}

### Active Tasks
${snapshot.active_tasks.map(t => `
- **${t.description}**
  - Status: ${t.status}
  - Progress: ${t.progress}
`).join('\n')}

---

## 💾 LAST 10 MESSAGES FOR CONTEXT

${snapshot.messages.slice(-10).map(m => `
**${m.role}** (${m.id}):
${m.content.substring(0, 200)}...
`).join('\n---\n')}

---

## 🔧 SYSTEM STATUS

### Environment Variables
- Supabase: ${snapshot.environment_variables.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌'}
- OpenAI: ${snapshot.environment_variables.OPENAI_API_KEY ? '✅' : '❌'}
- Zapier: ${snapshot.environment_variables.ZAPIER_WEBHOOK_URL ? '✅' : '❌'}

### Deployment
- Vercel: ${snapshot.deployment_status.vercel ? '✅ Live' : '❌ Not deployed'}
- GitHub: ${snapshot.deployment_status.github ? '✅ Synced' : '❌ Changes pending'}
- Supabase: ${snapshot.deployment_status.supabase ? '✅ Connected' : '❌ Check connection'}

### Git Status
- Branch: ${snapshot.git_status.branch}
- Last Commit: ${snapshot.git_status.last_commit}
- Uncommitted: ${snapshot.git_status.uncommitted_changes.length} files

---

## 🎯 CONTINUATION INSTRUCTIONS FOR OPUS 4

${snapshot.continuation.opus_4_instructions}

### Next Steps
${snapshot.continuation.next_steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

### Current Blockers
${snapshot.continuation.blockers.map(b => `- ⚠️ ${b}`).join('\n')}

### Important Context
${snapshot.continuation.important_context.map(c => `- 📌 ${c}`).join('\n')}

### Key Message References
${snapshot.continuation.reference_messages.map(r => `- ${r}`).join('\n')}

---

## 🔄 TO CONTINUE IN NEW CHAT

1. Start new Opus 4 chat
2. Say: "Continue KimbleAI V4 session from snapshot ${snapshot.id}"
3. Reference: D:\\OneDrive\\Documents\\kimbleai-v4-clean\\OPUS_4_TRANSITION_${snapshot.id}.md
4. Load conversation ${snapshot.conversation_id}

---

## 📂 PROJECT LOCATION
\`\`\`
${snapshot.project_structure.root_path}
\`\`\`

## 🔗 QUICK COMMANDS

\`\`\`powershell
cd D:\\OneDrive\\Documents\\kimbleai-v4-clean
git status
npm run dev
\`\`\`

---

**AUTO-GENERATED AT TOKEN LIMIT**
**Snapshot ID**: ${snapshot.id}
**Timestamp**: ${snapshot.timestamp}
`;

    // Write transition file
    const fs = await import('fs').then(m => m.promises);
    const path = `D:\\OneDrive\\Documents\\kimbleai-v4-clean\\OPUS_4_TRANSITION_${snapshot.id}.md`;
    await fs.writeFile(path, transitionContent);
    
    console.log(`Opus 4 transition file created: ${path}`);
  }
  
  /**
   * Restore session from snapshot
   */
  async restoreFromSnapshot(snapshotId: string): Promise<SessionSnapshot> {
    try {
      const { data, error } = await supabase
        .from('session_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .single();
      
      if (error) throw error;
      
      console.log(`Session restored from snapshot: ${snapshotId}`);
      return data;
      
    } catch (error) {
      console.error('Failed to restore snapshot:', error);
      throw error;
    }
  }
  
  // Helper methods
  
  private async getAllMessages(conversationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('message_references')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });
    
    return data || [];
  }
  
  private async getCurrentFileStates(): Promise<any[]> {
    // Get recently modified files from git
    try {
      const { execSync } = await import('child_process');
      const gitStatus = execSync('git status --porcelain', {
        cwd: 'D:\\OneDrive\\Documents\\kimbleai-v4-clean'
      }).toString();
      
      const files = gitStatus.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [status, ...pathParts] = line.trim().split(' ');
          const path = pathParts.join(' ');
          return { path, status };
        });
      
      // Read file contents for modified files
      const fs = await import('fs').then(m => m.promises);
      const fileStates = await Promise.all(
        files.slice(0, 10).map(async (file) => {
          try {
            const fullPath = `D:\\OneDrive\\Documents\\kimbleai-v4-clean\\${file.path}`;
            const content = await fs.readFile(fullPath, 'utf-8');
            const stats = await fs.stat(fullPath);
            
            return {
              path: file.path,
              content: content.substring(0, 5000), // First 5000 chars
              last_modified: stats.mtime.toISOString(),
              changes: [file.status]
            };
          } catch {
            return null;
          }
        })
      );
      
      return fileStates.filter(Boolean);
      
    } catch (error) {
      console.error('Failed to get file states:', error);
      return [];
    }
  }
  
  private async getPendingDecisions(projectId?: string): Promise<any[]> {
    if (!projectId) return [];
    
    const { data } = await supabase
      .from('decisions')
      .select('*')
      .eq('project_id', projectId)
      .is('completed_at', null)
      .limit(10);
    
    return data || [];
  }
  
  private async getActiveTasks(projectId?: string): Promise<any[]> {
    if (!projectId) return [];
    
    const { data } = await supabase
      .from('action_items')
      .select('*')
      .eq('project_id', projectId)
      .in('status', ['pending', 'in_progress'])
      .limit(10);
    
    return data || [];
  }
  
  private async getCodeBlocks(conversationId: string): Promise<any[]> {
    const { data } = await supabase
      .from('code_blocks')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    return data || [];
  }
  
  private async getEnvironmentStatus(): Promise<Record<string, boolean>> {
    return {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      ZAPIER_WEBHOOK_URL: !!process.env.ZAPIER_WEBHOOK_URL
    };
  }
  
  private async getDeploymentStatus(): Promise<any> {
    // Check various deployment statuses
    return {
      vercel: await this.checkVercelStatus(),
      github: await this.checkGitHubStatus(),
      supabase: await this.checkSupabaseStatus(),
      local: true
    };
  }
  
  private async getGitStatus(): Promise<any> {
    try {
      const { execSync } = await import('child_process');
      const cwd = 'D:\\OneDrive\\Documents\\kimbleai-v4-clean';
      
      const branch = execSync('git branch --show-current', { cwd }).toString().trim();
      const lastCommit = execSync('git log -1 --oneline', { cwd }).toString().trim();
      const status = execSync('git status --porcelain', { cwd }).toString();
      const remoteUrl = execSync('git remote get-url origin', { cwd }).toString().trim();
      
      const uncommittedChanges = status.split('\n')
        .filter(line => line.trim())
        .map(line => line.trim().split(' ').slice(1).join(' '));
      
      return {
        branch,
        last_commit: lastCommit,
        uncommitted_changes: uncommittedChanges,
        remote_url: remoteUrl
      };
      
    } catch (error) {
      console.error('Failed to get git status:', error);
      return {
        branch: 'unknown',
        last_commit: 'unknown',
        uncommitted_changes: [],
        remote_url: 'unknown'
      };
    }
  }
  
  private async getProjectStructure(): Promise<any> {
    const fs = await import('fs').then(m => m.promises);
    const path = 'D:\\OneDrive\\Documents\\kimbleai-v4-clean';
    
    const keyDirectories = [
      'app', 'lib', 'components', 'supabase', '.git'
    ];
    
    const keyFiles = [
      'package.json', '.env.local', 'next.config.js',
      'OPUS_4_MASTER_INTEGRATION.md', 'DEPLOYMENT_STATUS.md'
    ];
    
    // Count total files
    let totalFiles = 0;
    try {
      const countFiles = async (dir: string): Promise<number> => {
        let count = 0;
        const items = await fs.readdir(dir);
        for (const item of items) {
          const fullPath = `${dir}\\${item}`;
          const stats = await fs.stat(fullPath);
          if (stats.isFile()) count++;
          else if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            count += await countFiles(fullPath);
          }
        }
        return count;
      };
      totalFiles = await countFiles(path);
    } catch {
      totalFiles = -1;
    }
    
    return {
      root_path: path,
      key_directories: keyDirectories,
      key_files: keyFiles,
      total_files: totalFiles
    };
  }
  
  private estimateTokenCount(messages: any[]): number {
    // Rough estimation: 4 characters = 1 token
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }
  
  private generateContinuationInstructions(
    messages: any[],
    decisions: any[],
    tasks: any[],
    files: any[]
  ): any {
    const lastMessages = messages.slice(-5);
    const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0];
    const lastAssistantMessage = messages.filter(m => m.role === 'assistant').slice(-1)[0];
    
    const nextSteps = [];
    const blockers = [];
    const importantContext = [];
    const referenceMessages = [];
    
    // Analyze last messages for context
    if (lastUserMessage) {
      if (lastUserMessage.content.includes('deploy')) {
        nextSteps.push('Complete deployment to Vercel');
      }
      if (lastUserMessage.content.includes('error')) {
        blockers.push('Resolve error from last message');
      }
    }
    
    // Check for pending decisions
    if (decisions.length > 0) {
      blockers.push(`${decisions.length} pending decisions need resolution`);
      decisions.forEach(d => referenceMessages.push(d.message_id));
    }
    
    // Check for active tasks
    if (tasks.length > 0) {
      nextSteps.push(`Complete ${tasks.length} active tasks`);
      tasks.forEach(t => {
        if (t.status === 'in_progress') {
          importantContext.push(`Task in progress: ${t.description}`);
        }
      });
    }
    
    // Check for uncommitted changes
    if (files.length > 0) {
      nextSteps.push(`Commit ${files.length} modified files`);
      importantContext.push(`Files modified: ${files.map(f => f.path).join(', ')}`);
    }
    
    // Generate Opus 4 specific instructions
    const opus4Instructions = `
WHEN CONTINUING THIS SESSION:
1. Load this transition file first
2. Check message references: ${referenceMessages.slice(0, 5).join(', ')}
3. Current working directory: D:\\OneDrive\\Documents\\kimbleai-v4-clean
4. Active conversation: ${messages[0]?.conversation_id || 'unknown'}
5. Token count before transition: ${this.tokenCounter}

IMMEDIATE CONTEXT:
- Last user request: "${lastUserMessage?.content.substring(0, 100)}..."
- Last assistant response: "${lastAssistantMessage?.content.substring(0, 100)}..."
- Working on: ${files.map(f => f.path).slice(0, 3).join(', ')}

MAINTAIN CONTINUITY BY:
- Referencing specific message IDs when needed
- Checking git status for uncommitted changes
- Reviewing active tasks and decisions
- Maintaining the same conversational tone
- Continuing file edits where left off
`;
    
    return {
      next_steps: nextSteps,
      blockers,
      important_context: importantContext,
      reference_messages: referenceMessages.slice(0, 10),
      opus_4_instructions: opus4Instructions
    };
  }
  
  private async storeSnapshot(snapshot: SessionSnapshot): Promise<void> {
    const { error } = await supabase
      .from('session_snapshots')
      .insert(snapshot);
    
    if (error) {
      console.error('Failed to store snapshot:', error);
    }
  }
  
  private async exportSnapshotToFile(snapshot: SessionSnapshot): Promise<void> {
    const fs = await import('fs').then(m => m.promises);
    const path = `D:\\OneDrive\\Documents\\kimbleai-v4-clean\\snapshots\\snapshot_${snapshot.id}.json`;
    
    // Create snapshots directory if it doesn't exist
    try {
      await fs.mkdir('D:\\OneDrive\\Documents\\kimbleai-v4-clean\\snapshots', { recursive: true });
    } catch {}
    
    await fs.writeFile(path, JSON.stringify(snapshot, null, 2));
    console.log(`Snapshot exported to: ${path}`);
  }
  
  private async logToMasterDocument(snapshot: SessionSnapshot): Promise<void> {
    try {
      await ConversationLogger.logSystemEvent('SESSION_SNAPSHOT_CREATED', {
        snapshot_id: snapshot.id,
        conversation_id: snapshot.conversation_id,
        message_count: snapshot.message_count,
        token_count: snapshot.token_count,
        has_pending_decisions: snapshot.pending_decisions.length > 0,
        has_active_tasks: snapshot.active_tasks.length > 0,
        uncommitted_files: snapshot.current_files.length
      });
    } catch (error) {
      console.error('Failed to log to Master Document:', error);
    }
  }
  
  private async sendTokenWarning(tokenCount: number): Promise<void> {
    // This would send a warning to the UI
    console.warn(`TOKEN WARNING: ${tokenCount} tokens used (${Math.round(tokenCount / 1000)}k)`);
  }
  
  private async checkVercelStatus(): Promise<boolean> {
    try {
      const response = await fetch('https://kimbleai-v4-clean.vercel.app/api/health');
      return response.ok;
    } catch {
      return false;
    }
  }
  
  private async checkGitHubStatus(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      const status = execSync('git status --porcelain', {
        cwd: 'D:\\OneDrive\\Documents\\kimbleai-v4-clean'
      }).toString();
      return status.trim() === ''; // True if no uncommitted changes
    } catch {
      return false;
    }
  }
  
  private async checkSupabaseStatus(): Promise<boolean> {
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
  
  private startAutoSave(): void {
    // Auto-save snapshot every 10 minutes
    this.autoSaveInterval = setInterval(async () => {
      if (this.currentSnapshot) {
        console.log('Auto-saving session snapshot...');
        // Update current snapshot
        await this.storeSnapshot(this.currentSnapshot);
      }
    }, 10 * 60 * 1000); // 10 minutes
  }
  
  public stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }
}

export default SessionContinuitySystem;