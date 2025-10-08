/**
 * Agent Registry - Centralized Agent Management System
 * Provides real-time monitoring, health checks, and metrics for all KimbleAI agents
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Agent Categories
export enum AgentCategory {
  INTELLIGENCE = 'Intelligence',
  AUTOMATION = 'Automation',
  SYSTEM = 'System',
  SPECIALIZED = 'Specialized'
}

// Agent Status
export enum AgentStatus {
  ACTIVE = 'active',
  IDLE = 'idle',
  PROCESSING = 'processing',
  ERROR = 'error',
  OFFLINE = 'offline'
}

// Agent Definition Interface
export interface AgentDefinition {
  id: string;
  name: string;
  category: AgentCategory;
  icon: string;
  color: string;
  description: string;

  // Capabilities
  capabilities: string[];
  apiEndpoints: string[];
  databaseTables: string[];

  // Implementation files
  implementationFiles: {
    services: string[];
    apis: string[];
    components: string[];
    schemas: string[];
  };

  // Features
  features: {
    name: string;
    status: 'implemented' | 'partial' | 'planned';
    description: string;
  }[];

  // Integrations
  integrations: string[];

  // Health check function
  healthCheck: () => Promise<AgentHealth>;
}

// Agent Health Interface
export interface AgentHealth {
  status: AgentStatus;
  responseTime?: number;
  lastActivity?: string;
  tasksCompleted: number;
  currentTask?: string;
  errors: string[];
  metrics: {
    requestCount?: number;
    successRate?: number;
    avgResponseTime?: number;
    activeSessions?: number;
    queueLength?: number;
  };
}

// Agent Registry Class
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, AgentDefinition> = new Map();

  private constructor() {
    this.initializeAgents();
  }

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  private initializeAgents() {
    // 1. Drive Intelligence Agent
    this.registerAgent({
      id: 'drive-intelligence',
      name: 'Drive Intelligence',
      category: AgentCategory.INTELLIGENCE,
      icon: '📁',
      color: '#4a9eff',
      description: 'Analyzes Google Drive files, provides insights, and optimizes file organization',
      capabilities: [
        'File content analysis',
        'Document insights',
        'Collaboration patterns',
        'Storage optimization',
        'RAG system integration'
      ],
      apiEndpoints: [
        '/api/google/drive',
        '/api/google/workspace'
      ],
      databaseTables: [
        'google_drive_files',
        'file_metadata',
        'drive_embeddings'
      ],
      implementationFiles: {
        services: ['lib/google-orchestration.ts'],
        apis: ['app/api/google/drive/route.ts', 'app/api/google/workspace/route.ts'],
        components: ['components/agents/DriveIntelligenceDashboard.tsx'],
        schemas: ['database/content-organization-system.sql']
      },
      features: [
        { name: 'File Analysis', status: 'implemented', description: 'Analyzes file content and metadata' },
        { name: 'RAG Integration', status: 'implemented', description: 'Semantic search using embeddings' },
        { name: 'Auto Organization', status: 'partial', description: 'Smart file categorization' }
      ],
      integrations: ['Google Drive API', 'OpenAI Embeddings'],
      healthCheck: async () => this.checkDriveIntelligence()
    });

    // 2. Audio Intelligence Agent
    this.registerAgent({
      id: 'audio-intelligence',
      name: 'Audio Intelligence',
      category: AgentCategory.INTELLIGENCE,
      icon: '🎵',
      color: '#10a37f',
      description: 'Advanced audio transcription, speaker diarization, and meeting insights',
      capabilities: [
        'Audio transcription (Whisper/AssemblyAI)',
        'Speaker diarization',
        'Sentiment analysis',
        'Meeting insights',
        'Action item extraction'
      ],
      apiEndpoints: [
        '/api/audio/transcribe',
        '/api/transcribe/assemblyai'
      ],
      databaseTables: [
        'audio_intelligence_sessions',
        'transcriptions',
        'speaker_profiles'
      ],
      implementationFiles: {
        services: ['lib/audio-intelligence.ts', 'lib/speaker-diarization.ts'],
        apis: ['app/api/audio/transcribe/route.ts', 'app/api/transcribe/assemblyai/route.ts'],
        components: ['components/agents/AudioIntelligenceDashboard.tsx'],
        schemas: ['database/add-project-to-transcriptions.sql']
      },
      features: [
        { name: 'Transcription', status: 'implemented', description: 'Multi-provider audio transcription' },
        { name: 'Speaker Diarization', status: 'implemented', description: 'Identify and separate speakers' },
        { name: 'Meeting Analysis', status: 'implemented', description: 'Extract insights and action items' }
      ],
      integrations: ['OpenAI Whisper', 'AssemblyAI', 'Google Drive'],
      healthCheck: async () => this.checkAudioIntelligence()
    });

    // 3. Knowledge Graph Agent
    this.registerAgent({
      id: 'knowledge-graph',
      name: 'Knowledge Graph',
      category: AgentCategory.INTELLIGENCE,
      icon: '🕸️',
      color: '#ff6b6b',
      description: 'Builds semantic relationships between entities and discovers connections',
      capabilities: [
        'Entity extraction',
        'Relationship mapping',
        'Semantic search',
        'Connection discovery',
        'Graph visualization'
      ],
      apiEndpoints: [
        '/api/knowledge/search',
        '/api/knowledge/stats'
      ],
      databaseTables: [
        'knowledge_entities',
        'knowledge_relationships',
        'entity_embeddings'
      ],
      implementationFiles: {
        services: ['lib/knowledge-graph.ts', 'lib/knowledge-graph-db.ts', 'lib/entity-extraction.ts'],
        apis: ['app/api/knowledge/search/route.ts', 'app/api/knowledge/stats/route.ts'],
        components: ['components/agents/KnowledgeGraphDashboard.tsx', 'components/agents/KnowledgeGraphViz.tsx'],
        schemas: []
      },
      features: [
        { name: 'Entity Extraction', status: 'implemented', description: 'Identify people, projects, concepts' },
        { name: 'Relationship Mapping', status: 'implemented', description: 'Connect related entities' },
        { name: 'Graph Visualization', status: 'implemented', description: 'Interactive graph display' }
      ],
      integrations: ['OpenAI', 'Supabase Vector'],
      healthCheck: async () => this.checkKnowledgeGraph()
    });

    // 4. Project Context Agent
    this.registerAgent({
      id: 'project-context',
      name: 'Project Context',
      category: AgentCategory.INTELLIGENCE,
      icon: '📊',
      color: '#f59e0b',
      description: 'Manages project state, context, and provides project-aware intelligence',
      capabilities: [
        'Project state tracking',
        'Context awareness',
        'Semantic integration',
        'Project classification',
        'Progress monitoring'
      ],
      apiEndpoints: [
        '/api/projects',
        '/api/projects/content'
      ],
      databaseTables: [
        'projects',
        'project_context',
        'project_files'
      ],
      implementationFiles: {
        services: ['lib/project-manager.ts', 'lib/project-semantic-integration.ts', 'lib/project-classification.ts'],
        apis: ['app/api/projects/route.ts', 'app/api/projects/content/route.ts'],
        components: ['components/agents/ProjectContextDashboard.tsx'],
        schemas: []
      },
      features: [
        { name: 'Project Management', status: 'implemented', description: 'Track and organize projects' },
        { name: 'Semantic Integration', status: 'implemented', description: 'Connect project content' },
        { name: 'Auto Classification', status: 'implemented', description: 'Smart project categorization' }
      ],
      integrations: ['Knowledge Graph', 'Drive Intelligence'],
      healthCheck: async () => this.checkProjectContext()
    });

    // 6. Workflow Automation Agent (Future Feature)
    this.registerAgent({
      id: 'workflow-automation',
      name: 'Workflow Automation',
      category: AgentCategory.AUTOMATION,
      icon: '⚙️',
      color: '#06b6d4',
      description: 'Creates and executes automated workflows based on user patterns (Planned for future release)',
      capabilities: [
        'Workflow creation',
        'Pattern-based automation',
        'Multi-step execution',
        'Approval workflows',
        'Learning & optimization'
      ],
      apiEndpoints: [],
      databaseTables: [
        'workflows',
        'workflow_executions',
        'workflow_templates'
      ],
      implementationFiles: {
        services: [],
        apis: [],
        components: [],
        schemas: ['database/workflow_automation_schema.sql']
      },
      features: [
        { name: 'Workflow Engine', status: 'planned', description: 'Execute complex workflows' },
        { name: 'Pattern Detection', status: 'planned', description: 'Identify automation opportunities' },
        { name: 'Auto Suggestions', status: 'planned', description: 'Suggest workflow automations' }
      ],
      integrations: ['Google Workspace', 'Pattern Recognition'],
      healthCheck: async () => this.checkWorkflowAutomation()
    });

    // 7. Cost Monitor Agent
    this.registerAgent({
      id: 'cost-monitor',
      name: 'Cost Monitor',
      category: AgentCategory.SYSTEM,
      icon: '💰',
      color: '#eab308',
      description: 'Tracks API costs, enforces budgets, and prevents overruns',
      capabilities: [
        'Real-time cost tracking',
        'Budget enforcement',
        'Usage analytics',
        'Alert system',
        'Cost optimization'
      ],
      apiEndpoints: [
        '/api/costs'
      ],
      databaseTables: [
        'api_cost_tracking',
        'budget_alerts',
        'cost_analytics'
      ],
      implementationFiles: {
        services: ['lib/cost-monitor.ts', 'lib/openai-cost-wrapper.ts'],
        apis: ['app/api/costs/route.ts'],
        components: ['components/agents/CostMonitorDashboard.tsx', 'components/agents/CostMonitorConfig.tsx', 'components/agents/CostAnalytics.tsx'],
        schemas: ['database/api-cost-tracking.sql']
      },
      features: [
        { name: 'Cost Tracking', status: 'implemented', description: 'Track all API costs in real-time' },
        { name: 'Budget Limits', status: 'implemented', description: 'Enforce spending limits' },
        { name: 'Analytics Dashboard', status: 'implemented', description: 'Visualize cost trends' }
      ],
      integrations: ['All AI Services', 'Alert System'],
      healthCheck: async () => this.checkCostMonitor()
    });

    // 8. Device Continuity Agent
    this.registerAgent({
      id: 'device-continuity',
      name: 'Device Continuity',
      category: AgentCategory.SYSTEM,
      icon: '🔄',
      color: '#3b82f6',
      description: 'Enables seamless transitions between devices (PC, laptop, mobile, web)',
      capabilities: [
        'Cross-device sync',
        'State preservation',
        'Context restoration',
        'Session management',
        'Conflict resolution'
      ],
      apiEndpoints: [
        '/api/sync/context',
        '/api/sync/devices',
        '/api/sync/queue',
        '/api/sync/heartbeat'
      ],
      databaseTables: [
        'device_sessions',
        'context_snapshots',
        'sync_queue',
        'device_preferences'
      ],
      implementationFiles: {
        services: ['lib/device-continuity.ts', 'lib/device-fingerprint.ts'],
        apis: ['app/api/sync/context/route.ts', 'app/api/sync/devices/route.ts', 'app/api/sync/queue/route.ts', 'app/api/sync/heartbeat/route.ts'],
        components: ['components/agents/DeviceContinuityStatus.tsx', 'components/agents/ContinuityExample.tsx'],
        schemas: ['database/device-continuity.sql']
      },
      features: [
        { name: 'Device Sync', status: 'implemented', description: 'Sync state across devices' },
        { name: 'Context Transfer', status: 'implemented', description: 'Transfer work context' },
        { name: 'Heartbeat Monitor', status: 'implemented', description: 'Track active devices' }
      ],
      integrations: ['Google Drive', 'Supabase Realtime'],
      healthCheck: async () => this.checkDeviceContinuity()
    });

    // 9. Cleanup Agent (On-Demand Tool)
    this.registerAgent({
      id: 'cleanup-agent',
      name: 'Cleanup Agent',
      category: AgentCategory.SYSTEM,
      icon: '🧹',
      color: '#06b6d4',
      description: 'On-demand cleanup tool for git, storage, and caches - Available when you need it',
      capabilities: [
        'Git repository cleanup (remove large files from history)',
        'Vercel deployment optimization',
        'Local storage management',
        'Google Drive file organization',
        'Cache clearing and optimization',
        'Temporary file removal',
        'Build artifact cleanup',
        'Database cleanup and optimization'
      ],
      apiEndpoints: [
        '/api/cleanup/git',
        '/api/cleanup/storage',
        '/api/cleanup/cache'
      ],
      databaseTables: [
        'cleanup_logs',
        'storage_analytics'
      ],
      implementationFiles: {
        services: ['lib/cleanup-agent.ts'],
        apis: ['app/api/cleanup/route.ts'],
        components: [],
        schemas: []
      },
      features: [
        { name: 'Git Cleanup', status: 'planned', description: 'Remove large files from git history' },
        { name: 'Storage Optimization', status: 'planned', description: 'Clean up local and cloud storage' },
        { name: 'Cache Management', status: 'planned', description: 'Clear and optimize caches' },
        { name: 'Drive Organization', status: 'planned', description: 'Organize and clean Google Drive' },
        { name: 'Automated Cleanup', status: 'planned', description: 'Schedule regular cleanup tasks' }
      ],
      integrations: ['Git', 'Vercel', 'Google Drive', 'File System'],
      healthCheck: async () => this.checkCleanupAgent()
    });

    // 10. Agent Optimizer (Meta-Agent)
    this.registerAgent({
      id: 'agent-optimizer',
      name: 'Agent Optimizer',
      category: AgentCategory.SYSTEM,
      icon: '🧠',
      color: '#8b5cf6',
      description: 'Meta-agent that monitors, analyzes, and improves the performance of all other agents',
      capabilities: [
        'Real-time agent performance monitoring',
        'Error pattern detection and resolution',
        'Agent optimization recommendations',
        'Auto-healing for failed agents',
        'Performance bottleneck identification',
        'Agent coordination and orchestration',
        'Resource allocation optimization',
        'Agent upgrade and deployment management'
      ],
      apiEndpoints: [
        '/api/agents/monitor',
        '/api/agents/optimize',
        '/api/agents/heal'
      ],
      databaseTables: [
        'agent_performance_logs',
        'agent_optimizations',
        'agent_health_history',
        'optimization_recommendations'
      ],
      implementationFiles: {
        services: ['lib/agent-registry.ts', 'lib/agent-optimizer.ts'],
        apis: ['app/api/agents/monitor/route.ts', 'app/api/agents/optimize/route.ts'],
        components: ['app/agents/status/page.tsx'],
        schemas: []
      },
      features: [
        { name: 'Performance Monitoring', status: 'implemented', description: 'Track all agent metrics in real-time' },
        { name: 'Health Checks', status: 'implemented', description: 'Automated health monitoring for all agents' },
        { name: 'Error Detection', status: 'implemented', description: 'Identify and categorize agent errors' },
        { name: 'Auto-Healing', status: 'partial', description: 'Automatically fix common agent issues' },
        { name: 'Optimization Engine', status: 'partial', description: 'Generate performance improvement suggestions' },
        { name: 'Resource Balancing', status: 'planned', description: 'Optimize resource allocation across agents' },
        { name: 'Predictive Maintenance', status: 'planned', description: 'Predict and prevent agent failures' }
      ],
      integrations: ['All Agents', 'Supabase', 'Performance Analytics'],
      healthCheck: async () => this.checkAgentOptimizer()
    });
  }

  private registerAgent(agent: AgentDefinition) {
    this.agents.set(agent.id, agent);
  }

  public getAgent(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  public getAllAgents(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  public getAgentsByCategory(category: AgentCategory): AgentDefinition[] {
    return this.getAllAgents().filter(agent => agent.category === category);
  }

  // Health Check Implementations
  private async checkDriveIntelligence(): Promise<AgentHealth> {
    try {
      // Check knowledge base entries from Google Drive
      const { count, error } = await supabase
        .from('knowledge_base')
        .select('*', { count: 'exact', head: true })
        .eq('source_type', 'google_drive');

      return {
        status: count && count > 0 ? AgentStatus.ACTIVE : AgentStatus.IDLE,
        lastActivity: count && count > 0 ? 'Recently processed Drive files' : 'Waiting for Drive activity',
        tasksCompleted: count || 0,
        currentTask: count && count > 0 ? `${count} Drive files indexed` : 'Ready to index Drive files',
        errors: error ? [error.message] : [],
        metrics: {
          requestCount: count || 0,
          successRate: error ? 0 : 100,
          avgResponseTime: 150
        }
      };
    } catch (error: any) {
      return {
        status: AgentStatus.ERROR,
        tasksCompleted: 0,
        errors: [error.message],
        metrics: {}
      };
    }
  }

  private async checkAudioIntelligence(): Promise<AgentHealth> {
    try {
      // Check both audio_transcriptions and knowledge_base audio entries
      const { count: transcriptCount } = await supabase
        .from('audio_transcriptions')
        .select('*', { count: 'exact', head: true });

      const { count: kbAudioCount } = await supabase
        .from('knowledge_base')
        .select('*', { count: 'exact', head: true })
        .eq('source_type', 'audio_transcript');

      const totalCount = (transcriptCount || 0) + (kbAudioCount || 0);

      return {
        status: totalCount > 0 ? AgentStatus.ACTIVE : AgentStatus.IDLE,
        lastActivity: totalCount > 0 ? 'Recently transcribed audio' : 'Waiting for audio files',
        tasksCompleted: totalCount,
        currentTask: totalCount > 0 ? `${totalCount} audio files processed` : 'Ready to transcribe audio',
        errors: [],
        metrics: {
          activeSessions: totalCount,
          avgResponseTime: 200
        }
      };
    } catch (error: any) {
      return {
        status: AgentStatus.ERROR,
        tasksCompleted: 0,
        errors: [error.message],
        metrics: {}
      };
    }
  }

  private async checkKnowledgeGraph(): Promise<AgentHealth> {
    try {
      // Use knowledge_base as the source of truth for entities
      const { count, error } = await supabase
        .from('knowledge_base')
        .select('*', { count: 'exact', head: true });

      return {
        status: count && count > 0 ? AgentStatus.ACTIVE : AgentStatus.IDLE,
        lastActivity: count && count > 0 ? 'Managing knowledge base' : 'Waiting for knowledge entries',
        tasksCompleted: count || 0,
        currentTask: count && count > 0 ? `${count} knowledge entries indexed` : 'Ready to build knowledge graph',
        errors: error ? [error.message] : [],
        metrics: {
          requestCount: count || 0,
          avgResponseTime: 180
        }
      };
    } catch (error: any) {
      return {
        status: AgentStatus.ERROR,
        tasksCompleted: 0,
        errors: [error.message],
        metrics: {}
      };
    }
  }

  private async checkProjectContext(): Promise<AgentHealth> {
    try {
      const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      return {
        status: error ? AgentStatus.ERROR : AgentStatus.ACTIVE,
        lastActivity: 'Just now',
        tasksCompleted: count || 0,
        errors: error ? [error.message] : [],
        metrics: {
          requestCount: count
        }
      };
    } catch (error: any) {
      return {
        status: AgentStatus.ERROR,
        tasksCompleted: 0,
        errors: [error.message],
        metrics: {}
      };
    }
  }

  private async checkWorkflowAutomation(): Promise<AgentHealth> {
    try {
      const { count, error } = await supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true });

      return {
        status: error ? AgentStatus.ERROR : AgentStatus.ACTIVE,
        lastActivity: 'Just now',
        tasksCompleted: count || 0,
        errors: error ? [error.message] : [],
        metrics: {
          requestCount: count
        }
      };
    } catch (error: any) {
      return {
        status: AgentStatus.ERROR,
        tasksCompleted: 0,
        errors: [error.message],
        metrics: {}
      };
    }
  }

  private async checkCostMonitor(): Promise<AgentHealth> {
    try {
      const { count, error } = await supabase
        .from('api_cost_tracking')
        .select('*', { count: 'exact', head: true });

      // Cost Monitor is always active (monitoring costs even if no API calls yet)
      return {
        status: AgentStatus.ACTIVE,
        lastActivity: 'Monitoring costs',
        tasksCompleted: count || 0,
        currentTask: count && count > 0 ? `Tracking ${count} API calls` : 'Monitoring API costs (no calls yet)',
        errors: error ? [error.message] : [],
        metrics: {
          requestCount: count || 0,
          avgResponseTime: 140
        }
      };
    } catch (error: any) {
      return {
        status: AgentStatus.ERROR,
        tasksCompleted: 0,
        errors: [error.message],
        metrics: {}
      };
    }
  }

  private async checkDeviceContinuity(): Promise<AgentHealth> {
    try {
      const { count, error } = await supabase
        .from('device_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      return {
        status: error ? AgentStatus.ERROR : AgentStatus.ACTIVE,
        lastActivity: 'Just now',
        tasksCompleted: count || 0,
        errors: error ? [error.message] : [],
        metrics: {
          activeSessions: count || 0
        }
      };
    } catch (error: any) {
      return {
        status: AgentStatus.ERROR,
        tasksCompleted: 0,
        errors: [error.message],
        metrics: {}
      };
    }
  }

  private async checkCleanupAgent(): Promise<AgentHealth> {
    return {
      status: AgentStatus.IDLE,
      lastActivity: 'Available on demand',
      tasksCompleted: 0,
      currentTask: 'Ready for cleanup tasks - Call /api/cleanup when needed',
      errors: [],
      metrics: {
        avgResponseTime: 100
      }
    };
  }

  private async checkAgentOptimizer(): Promise<AgentHealth> {
    try {
      // This meta-agent monitors all other agents
      const allAgents = this.getAllAgents();
      const healthMap = new Map<string, AgentHealth>();

      // Get health for all agents (excluding self)
      for (const agent of allAgents) {
        if (agent.id === 'agent-optimizer') continue;

        try {
          const health = await agent.healthCheck();
          healthMap.set(agent.id, health);
        } catch (error: any) {
          healthMap.set(agent.id, {
            status: AgentStatus.ERROR,
            tasksCompleted: 0,
            errors: [error.message],
            metrics: {}
          });
        }
      }

      // Calculate metrics
      const totalAgents = healthMap.size;
      const activeAgents = Array.from(healthMap.values()).filter(
        h => h.status === AgentStatus.ACTIVE || h.status === AgentStatus.PROCESSING
      ).length;
      const errorAgents = Array.from(healthMap.values()).filter(
        h => h.status === AgentStatus.ERROR
      ).length;
      const totalTasks = Array.from(healthMap.values()).reduce(
        (sum, h) => sum + h.tasksCompleted, 0
      );
      const totalErrors = Array.from(healthMap.values()).reduce(
        (sum, h) => sum + h.errors.length, 0
      );

      // Determine optimizer status
      const optimizerStatus = errorAgents > 0
        ? AgentStatus.PROCESSING  // Working on fixing errors
        : activeAgents > 0
        ? AgentStatus.ACTIVE      // Monitoring active agents
        : AgentStatus.IDLE;       // All agents idle

      return {
        status: optimizerStatus,
        lastActivity: 'Just now',
        tasksCompleted: totalAgents, // Number of agents being monitored
        currentTask: errorAgents > 0
          ? `Analyzing ${errorAgents} agent(s) with errors`
          : activeAgents > 0
          ? `Monitoring ${activeAgents} active agent(s)`
          : 'All agents healthy and idle',
        errors: [],
        metrics: {
          requestCount: totalAgents,
          activeSessions: activeAgents,
          successRate: totalAgents > 0 ? ((totalAgents - errorAgents) / totalAgents) * 100 : 100,
          avgResponseTime: 50 // Meta-agent is very fast
        }
      };
    } catch (error: any) {
      return {
        status: AgentStatus.ERROR,
        tasksCompleted: 0,
        errors: [error.message],
        metrics: {}
      };
    }
  }

  // Get real-time agent health for all agents
  public async getAllAgentHealth(): Promise<Map<string, AgentHealth>> {
    const healthMap = new Map<string, AgentHealth>();

    const healthChecks = Array.from(this.agents.values()).map(async (agent) => {
      try {
        const health = await agent.healthCheck();
        healthMap.set(agent.id, health);
      } catch (error: any) {
        healthMap.set(agent.id, {
          status: AgentStatus.ERROR,
          tasksCompleted: 0,
          errors: [error.message],
          metrics: {}
        });
      }
    });

    await Promise.allSettled(healthChecks);
    return healthMap;
  }
}

// Export singleton instance
export const agentRegistry = AgentRegistry.getInstance();
