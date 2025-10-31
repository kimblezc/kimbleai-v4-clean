/**
 * Archie Utility Agent
 *
 * FOCUS: REAL actionable improvements based on actual data patterns
 *
 * Capabilities:
 * - Detect conversations that should be converted to tasks
 * - Find stale projects (no activity in 30+ days)
 * - Monitor API cost spikes
 * - Detect failed transcriptions and auto-retry
 * - Find duplicate tasks and merge them
 * - Suggest project organization improvements
 */

import { createClient } from '@supabase/supabase-js';
import { logAgentActivity, logTaskStart, logTaskProgress, logTaskComplete, logTaskError } from '@/lib/activity-stream';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface UtilityFinding {
  type: 'actionable_conversation' | 'stale_project' | 'cost_spike' | 'failed_transcription' | 'duplicate_task' | 'organization_suggestion';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionable: boolean;
  metadata: Record<string, any>;
  suggestedAction?: string;
}

export class ArchieUtilityAgent {
  private static instance: ArchieUtilityAgent;
  private sessionId: string;

  private constructor() {
    this.sessionId = `utility_${Date.now()}`;
  }

  static getInstance(): ArchieUtilityAgent {
    if (!ArchieUtilityAgent.instance) {
      ArchieUtilityAgent.instance = new ArchieUtilityAgent();
    }
    return ArchieUtilityAgent.instance;
  }

  /**
   * Main execution - run all utility checks
   */
  async run(): Promise<{
    findings: UtilityFinding[];
    tasksCreated: number;
    executionTime: number;
  }> {
    const startTime = Date.now();
    const taskId = this.sessionId;

    // Broadcast task start
    logTaskStart(taskId, 'utility_analysis', 'Utility Agent', 'Beginning utility analysis sweep across workspace', 'task_processing');
    await this.log('info', '🔧 Archie Utility Agent starting execution');

    const findings: UtilityFinding[] = [];
    let tasksCreated = 0;

    try {
      // 1. Detect actionable conversations
      logAgentActivity('Utility Agent', 'Scanning conversations for actionable items', 'info', 'task_processing', 'Analyzing recent conversations for task candidates');
      const conversationFindings = await this.detectActionableConversations();
      findings.push(...conversationFindings);

      // 2. Find stale projects
      logTaskProgress(taskId, 'utility_analysis', 'Utility Agent', 'Checking for stale projects requiring attention', 'task_processing', 20);
      const staleProjects = await this.findStaleProjects();
      findings.push(...staleProjects);

      // 3. Monitor API costs
      logTaskProgress(taskId, 'utility_analysis', 'Utility Agent', 'Monitoring API costs for unusual spikes', 'task_processing', 40);
      const costFindings = await this.monitorCostSpikes();
      findings.push(...costFindings);

      // 4. Detect failed transcriptions
      logTaskProgress(taskId, 'utility_analysis', 'Utility Agent', 'Detecting failed transcriptions for retry', 'task_processing', 60);
      const transcriptionFindings = await this.detectFailedTranscriptions();
      findings.push(...transcriptionFindings);

      // 5. Find duplicate tasks
      logTaskProgress(taskId, 'utility_analysis', 'Utility Agent', 'Hunting for duplicate tasks to merge', 'task_processing', 75);
      const duplicateFindings = await this.findDuplicateTasks();
      findings.push(...duplicateFindings);

      // 6. Suggest project organization
      logTaskProgress(taskId, 'utility_analysis', 'Utility Agent', 'Analyzing project organization patterns', 'task_processing', 90);
      const organizationFindings = await this.suggestProjectOrganization();
      findings.push(...organizationFindings);

      // Create tasks for high-severity findings
      logAgentActivity('Utility Agent', `Creating tasks from ${findings.filter(f => f.severity === 'high' && f.actionable).length} high-severity findings`, 'info', 'task_processing');
      for (const finding of findings.filter(f => f.severity === 'high' && f.actionable)) {
        const created = await this.createTaskFromFinding(finding);
        if (created) tasksCreated++;
      }

      const executionTime = Date.now() - startTime;
      await this.log('info', `✅ Utility Agent completed: ${findings.length} findings, ${tasksCreated} tasks created`, {
        executionTime,
        findingsByType: this.groupFindingsByType(findings)
      });

      // Broadcast completion
      logTaskComplete(taskId, 'utility_analysis', 'Utility Agent', `Analysis complete: discovered ${findings.length} findings and created ${tasksCreated} tasks`, 'task_processing', executionTime);

      return { findings, tasksCreated, executionTime };
    } catch (error: any) {
      await this.log('error', 'Utility Agent execution failed', { error: error.message });
      logTaskError(taskId, 'utility_analysis', 'Utility Agent', 'Utility analysis failed', 'task_processing', error.message);
      throw error;
    }
  }

  /**
   * Detect conversations that should be converted to tasks
   * Look for action words: "fix", "implement", "todo", "need to", "should"
   */
  private async detectActionableConversations(): Promise<UtilityFinding[]> {
    await this.log('info', '🔍 Scanning conversations for actionable items');

    const findings: UtilityFinding[] = [];

    try {
      // Get recent conversations (last 7 days)
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('id, user_id, title, messages, created_at, updated_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const actionKeywords = [
        'fix', 'implement', 'todo', 'need to', 'should',
        'create', 'add', 'build', 'develop', 'refactor',
        'update', 'improve', 'optimize', 'debug'
      ];

      for (const conv of conversations || []) {
        const messages = conv.messages || [];
        const recentMessages = messages.slice(-5); // Last 5 messages

        let actionableCount = 0;
        const actionableMessages: string[] = [];

        for (const msg of recentMessages) {
          const content = (msg.content || '').toLowerCase();
          const hasActionWord = actionKeywords.some(keyword => content.includes(keyword));

          if (hasActionWord) {
            actionableCount++;
            actionableMessages.push(msg.content?.substring(0, 100) || '');
          }
        }

        // If 2+ messages contain action words, this is likely actionable
        if (actionableCount >= 2) {
          findings.push({
            type: 'actionable_conversation',
            severity: actionableCount >= 3 ? 'high' : 'medium',
            title: `Actionable conversation: ${conv.title || 'Untitled'}`,
            description: `Found ${actionableCount} messages with action keywords. Consider converting to tasks.`,
            actionable: true,
            metadata: {
              conversationId: conv.id,
              userId: conv.user_id,
              actionableCount,
              preview: actionableMessages[0]
            },
            suggestedAction: 'Create tasks from conversation'
          });
        }
      }

      await this.log('info', `Found ${findings.length} actionable conversations`);
      if (findings.length > 0) {
        logAgentActivity('Utility Agent', `Found ${findings.length} actionable conversations that could become tasks`, 'success', 'task_processing', `Detected conversations with action keywords: ${findings.map(f => f.title).slice(0, 3).join(', ')}...`);
      }
      return findings;
    } catch (error: any) {
      await this.log('error', 'Failed to detect actionable conversations', { error: error.message });
      return findings;
    }
  }

  /**
   * Find stale projects (no activity in 30+ days)
   */
  private async findStaleProjects(): Promise<UtilityFinding[]> {
    await this.log('info', '📦 Checking for stale projects');

    const findings: UtilityFinding[] = [];

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name, description, updated_at, created_at')
        .lt('updated_at', thirtyDaysAgo)
        .eq('archived', false)
        .order('updated_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      for (const project of projects || []) {
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(project.updated_at).getTime()) / (24 * 60 * 60 * 1000)
        );

        findings.push({
          type: 'stale_project',
          severity: daysSinceUpdate > 90 ? 'high' : daysSinceUpdate > 60 ? 'medium' : 'low',
          title: `Stale project: ${project.name}`,
          description: `No activity for ${daysSinceUpdate} days. Consider archiving or updating.`,
          actionable: true,
          metadata: {
            projectId: project.id,
            daysSinceUpdate,
            lastUpdate: project.updated_at
          },
          suggestedAction: daysSinceUpdate > 90 ? 'Archive project' : 'Review and update project'
        });
      }

      await this.log('info', `Found ${findings.length} stale projects`);
      if (findings.length > 0) {
        logAgentActivity('Utility Agent', `Discovered ${findings.length} stale projects gathering dust`, 'warn', 'task_processing', `Projects without activity: ${findings.map(f => f.title.replace('Stale project: ', '')).slice(0, 3).join(', ')}`);
      }
      return findings;
    } catch (error: any) {
      await this.log('error', 'Failed to find stale projects', { error: error.message });
      return findings;
    }
  }

  /**
   * Monitor API cost spikes
   */
  private async monitorCostSpikes(): Promise<UtilityFinding[]> {
    await this.log('info', '💰 Monitoring API costs');

    const findings: UtilityFinding[] = [];

    try {
      // Get cost data for last 24 hours and previous 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      const { data: recentCosts } = await supabase
        .from('api_usage')
        .select('cost, service, created_at')
        .gte('created_at', yesterday);

      const { data: previousCosts } = await supabase
        .from('api_usage')
        .select('cost, service, created_at')
        .gte('created_at', twoDaysAgo)
        .lt('created_at', yesterday);

      if (!recentCosts || !previousCosts) {
        await this.log('info', 'No cost data available for spike detection');
        return findings;
      }

      // Calculate totals by service
      const recentByService = this.groupCostsByService(recentCosts);
      const previousByService = this.groupCostsByService(previousCosts);

      for (const [service, recentCost] of Object.entries(recentByService)) {
        const previousCost = previousByService[service] || 0;
        const increase = recentCost - previousCost;
        const percentIncrease = previousCost > 0 ? (increase / previousCost) * 100 : 0;

        // Alert if cost increased by 50%+ or $10+
        if (percentIncrease > 50 || increase > 10) {
          findings.push({
            type: 'cost_spike',
            severity: increase > 50 ? 'high' : increase > 20 ? 'medium' : 'low',
            title: `Cost spike detected: ${service}`,
            description: `${service} costs increased by ${percentIncrease.toFixed(1)}% ($${increase.toFixed(2)}) in the last 24 hours.`,
            actionable: true,
            metadata: {
              service,
              recentCost: recentCost.toFixed(2),
              previousCost: previousCost.toFixed(2),
              increase: increase.toFixed(2),
              percentIncrease: percentIncrease.toFixed(1)
            },
            suggestedAction: 'Review API usage patterns and optimize'
          });
        }
      }

      await this.log('info', `Detected ${findings.length} cost spikes`);
      return findings;
    } catch (error: any) {
      await this.log('error', 'Failed to monitor cost spikes', { error: error.message });
      return findings;
    }
  }

  /**
   * Detect failed transcriptions and auto-retry
   */
  private async detectFailedTranscriptions(): Promise<UtilityFinding[]> {
    await this.log('info', '🎤 Checking for failed transcriptions');

    const findings: UtilityFinding[] = [];

    try {
      const { data: failedTranscriptions, error } = await supabase
        .from('transcriptions')
        .select('id, file_name, status, error_message, created_at, retry_count')
        .eq('status', 'failed')
        .lt('retry_count', 3) // Only retry up to 3 times
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      for (const transcription of failedTranscriptions || []) {
        const retryCount = transcription.retry_count || 0;

        findings.push({
          type: 'failed_transcription',
          severity: retryCount >= 2 ? 'high' : 'medium',
          title: `Failed transcription: ${transcription.file_name}`,
          description: `Transcription failed ${retryCount + 1} time(s). Error: ${transcription.error_message || 'Unknown'}`,
          actionable: true,
          metadata: {
            transcriptionId: transcription.id,
            fileName: transcription.file_name,
            retryCount,
            errorMessage: transcription.error_message
          },
          suggestedAction: retryCount < 2 ? 'Auto-retry transcription' : 'Manual review required'
        });
      }

      await this.log('info', `Found ${findings.length} failed transcriptions`);
      return findings;
    } catch (error: any) {
      await this.log('error', 'Failed to detect transcription failures', { error: error.message });
      return findings;
    }
  }

  /**
   * Find duplicate tasks and merge them
   */
  private async findDuplicateTasks(): Promise<UtilityFinding[]> {
    await this.log('info', '🔍 Searching for duplicate tasks');

    const findings: UtilityFinding[] = [];

    try {
      const { data: tasks, error } = await supabase
        .from('agent_tasks')
        .select('id, title, description, status, created_at')
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const taskGroups = new Map<string, any[]>();

      for (const task of tasks || []) {
        // Create normalized key from title
        const normalizedTitle = task.title.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');

        if (!taskGroups.has(normalizedTitle)) {
          taskGroups.set(normalizedTitle, []);
        }
        taskGroups.get(normalizedTitle)!.push(task);
      }

      // Find groups with duplicates
      for (const [normalizedTitle, group] of Array.from(taskGroups.entries())) {
        if (group.length > 1) {
          findings.push({
            type: 'duplicate_task',
            severity: group.length >= 3 ? 'high' : 'medium',
            title: `Duplicate tasks: ${group[0].title}`,
            description: `Found ${group.length} duplicate tasks with similar titles.`,
            actionable: true,
            metadata: {
              taskIds: group.map(t => t.id),
              count: group.length,
              statuses: group.map(t => t.status)
            },
            suggestedAction: 'Merge duplicate tasks'
          });
        }
      }

      await this.log('info', `Found ${findings.length} duplicate task groups`);
      return findings;
    } catch (error: any) {
      await this.log('error', 'Failed to find duplicate tasks', { error: error.message });
      return findings;
    }
  }

  /**
   * Suggest project organization improvements based on conversation patterns
   */
  private async suggestProjectOrganization(): Promise<UtilityFinding[]> {
    await this.log('info', '📊 Analyzing project organization');

    const findings: UtilityFinding[] = [];

    try {
      // Get conversations without projects
      const { data: unorganizedConvs } = await supabase
        .from('conversations')
        .select('id, title, user_id, created_at')
        .is('project_id', null)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (unorganizedConvs && unorganizedConvs.length > 10) {
        findings.push({
          type: 'organization_suggestion',
          severity: unorganizedConvs.length > 50 ? 'high' : 'medium',
          title: `${unorganizedConvs.length} conversations without projects`,
          description: 'Many recent conversations are not organized into projects. Consider creating projects to group related conversations.',
          actionable: true,
          metadata: {
            count: unorganizedConvs.length,
            conversationIds: unorganizedConvs.slice(0, 10).map(c => c.id)
          },
          suggestedAction: 'Suggest project creation based on conversation topics'
        });
      }

      // Get projects with too many conversations
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name');

      // Count conversations for each project
      for (const project of projects || []) {
        const { count } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);

        const convCount = count || 0;

        if (convCount > 100) {
          findings.push({
            type: 'organization_suggestion',
            severity: 'medium',
            title: `Project has many conversations: ${project.name}`,
            description: `Project has ${convCount} conversations. Consider splitting into sub-projects.`,
            actionable: true,
            metadata: {
              projectId: project.id,
              conversationCount: convCount
            },
            suggestedAction: 'Suggest sub-project creation'
          });
        }
      }

      await this.log('info', `Generated ${findings.length} organization suggestions`);
      return findings;
    } catch (error: any) {
      await this.log('error', 'Failed to analyze project organization', { error: error.message });
      return findings;
    }
  }

  /**
   * Create a task from a finding
   */
  private async createTaskFromFinding(finding: UtilityFinding): Promise<boolean> {
    try {
      const taskType = this.mapFindingToTaskType(finding.type);
      const priority = finding.severity === 'high' ? 9 : finding.severity === 'medium' ? 7 : 5;

      const { error } = await supabase
        .from('agent_tasks')
        .insert({
          task_type: taskType,
          priority,
          status: 'pending',
          title: finding.title,
          description: finding.description + (finding.suggestedAction ? `\n\nSuggested Action: ${finding.suggestedAction}` : ''),
          metadata: {
            ...finding.metadata,
            source: 'utility_agent',
            finding_type: finding.type
          },
          scheduled_for: new Date().toISOString()
        });

      if (error) {
        await this.log('error', `Failed to create task from finding: ${finding.title}`, { error: error.message });
        return false;
      }

      return true;
    } catch (error: any) {
      await this.log('error', 'Failed to create task from finding', { error: error.message });
      return false;
    }
  }

  // Helper methods

  private mapFindingToTaskType(findingType: string): string {
    const mapping: Record<string, string> = {
      'actionable_conversation': 'code_cleanup',
      'stale_project': 'code_cleanup',
      'cost_spike': 'optimize_performance',
      'failed_transcription': 'fix_bugs',
      'duplicate_task': 'code_cleanup',
      'organization_suggestion': 'documentation_update'
    };
    return mapping[findingType] || 'code_cleanup';
  }

  private groupCostsByService(costs: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const cost of costs) {
      const service = cost.service || 'unknown';
      grouped[service] = (grouped[service] || 0) + (parseFloat(cost.cost) || 0);
    }
    return grouped;
  }

  private groupFindingsByType(findings: UtilityFinding[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const finding of findings) {
      grouped[finding.type] = (grouped[finding.type] || 0) + 1;
    }
    return grouped;
  }

  private async log(level: string, message: string, details?: any): Promise<void> {
    await supabase.from('agent_logs').insert({
      log_level: level,
      category: 'utility-agent',
      message,
      details,
      session_id: this.sessionId
    });

    console.log(`[UTILITY-AGENT] [${level.toUpperCase()}] ${message}`, details || '');
  }
}
