'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AgentActivity {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  description: string;
  status: 'active' | 'idle' | 'processing';

  // What it does
  capabilities: string[];

  // What it has done
  accomplishments: {
    total: number;
    recent: string[];
  };

  // What it's doing now
  currentActivity: string;

  // Goals
  goals: string[];

  // Metrics
  metrics: {
    requestsProcessed: number;
    avgResponseTime: number;
    successRate: number;
    uptime: string;
  };
}

const AGENT_DATA: AgentActivity[] = [
  {
    id: 'drive-intelligence',
    name: 'Drive Intelligence',
    category: 'Intelligence & Analysis',
    icon: '📁',
    color: '#4a9eff',
    description: 'Intelligent Google Drive optimization and file management system',
    status: 'active',
    capabilities: [
      'Analyze Drive storage usage and optimize file organization',
      'Detect duplicate files and suggest consolidation',
      'Monitor file access patterns and recommend archival',
      'Compress large files to save space',
      'Generate intelligent folder structure based on content'
    ],
    accomplishments: {
      total: 1247,
      recent: [
        'Optimized 50GB of Drive storage (2 hours ago)',
        'Detected and removed 127 duplicate files (5 hours ago)',
        'Archived 200 unused files from last year (1 day ago)'
      ]
    },
    currentActivity: 'Scanning Drive for optimization opportunities',
    goals: [
      'Reduce Drive storage usage by 30%',
      'Implement automatic monthly archival system',
      'Create smart folder templates for new projects'
    ],
    metrics: {
      requestsProcessed: 1247,
      avgResponseTime: 150,
      successRate: 98.5,
      uptime: '99.9%'
    }
  },
  {
    id: 'audio-intelligence',
    name: 'Audio Intelligence',
    category: 'Intelligence & Analysis',
    icon: '🎵',
    color: '#10a37f',
    description: 'Advanced audio transcription, speaker diarization, and meeting insights',
    status: 'processing',
    capabilities: [
      'Transcribe audio files with 99% accuracy',
      'Identify and label different speakers',
      'Extract key topics and action items',
      'Generate meeting summaries automatically',
      'Support files up to 2GB (m4a, mp3, wav)'
    ],
    accomplishments: {
      total: 523,
      recent: [
        'Transcribed 3-hour board meeting with 8 speakers (30 min ago)',
        'Generated action items from team standup (1 hour ago)',
        'Processed 15 podcast episodes for searchable archive (3 hours ago)'
      ]
    },
    currentActivity: 'Processing 2.1GB client presentation recording',
    goals: [
      'Achieve real-time transcription capability',
      'Add emotion and sentiment analysis',
      'Integrate with calendar for automatic meeting processing'
    ],
    metrics: {
      requestsProcessed: 523,
      avgResponseTime: 200,
      successRate: 99.1,
      uptime: '99.8%'
    }
  },
  {
    id: 'knowledge-graph',
    name: 'Knowledge Graph',
    category: 'Intelligence & Analysis',
    icon: '🕸️',
    color: '#ff6b6b',
    description: 'Build and maintain intelligent knowledge networks from your data',
    status: 'active',
    capabilities: [
      'Extract entities from conversations and documents',
      'Build relationship maps between concepts',
      'Enable semantic search across all knowledge',
      'Discover hidden connections in data',
      'Generate context-aware recommendations'
    ],
    accomplishments: {
      total: 8934,
      recent: [
        'Mapped 50 new entities from project documents (20 min ago)',
        'Discovered 12 cross-project connections (1 hour ago)',
        'Enhanced search with 200 new semantic relationships (2 hours ago)'
      ]
    },
    currentActivity: 'Building knowledge map from uploaded research papers',
    goals: [
      'Reach 10,000 mapped entities',
      'Implement graph-based project suggestions',
      'Enable natural language graph queries'
    ],
    metrics: {
      requestsProcessed: 8934,
      avgResponseTime: 180,
      successRate: 97.2,
      uptime: '99.7%'
    }
  },
  {
    id: 'context-prediction',
    name: 'Context Prediction',
    category: 'Intelligence & Analysis',
    icon: '🔮',
    color: '#a855f7',
    description: 'Predict user needs and prepare resources proactively',
    status: 'active',
    capabilities: [
      'Analyze user behavior patterns',
      'Predict next likely actions',
      'Pre-load relevant context and resources',
      'Suggest optimal workflows',
      'Adapt to individual working styles'
    ],
    accomplishments: {
      total: 2156,
      recent: [
        'Predicted need for Q4 reports, pre-loaded data (15 min ago)',
        'Suggested switching to automotive project based on context (1 hour ago)',
        'Prepared client files 10 minutes before meeting (2 hours ago)'
      ]
    },
    currentActivity: 'Learning user patterns from recent activity',
    goals: [
      'Achieve 85% prediction accuracy',
      'Reduce average task prep time by 50%',
      'Implement cross-device prediction sync'
    ],
    metrics: {
      requestsProcessed: 2156,
      avgResponseTime: 120,
      successRate: 82.3,
      uptime: '99.9%'
    }
  },
  {
    id: 'project-context',
    name: 'Project Context',
    category: 'Intelligence & Analysis',
    icon: '📊',
    color: '#f59e0b',
    description: 'Maintain deep understanding of all projects and their relationships',
    status: 'active',
    capabilities: [
      'Track project status and dependencies',
      'Maintain project-specific context and history',
      'Suggest relevant past work for new projects',
      'Generate project insights and analytics',
      'Auto-tag conversations by project'
    ],
    accomplishments: {
      total: 3421,
      recent: [
        'Classified 45 conversations across 12 projects (10 min ago)',
        'Generated monthly project report (1 hour ago)',
        'Identified 3 projects at risk of deadline miss (3 hours ago)'
      ]
    },
    currentActivity: 'Analyzing project dependencies for Q1 planning',
    goals: [
      'Implement automatic project health scoring',
      'Enable predictive project timeline estimation',
      'Build cross-project resource optimization'
    ],
    metrics: {
      requestsProcessed: 3421,
      avgResponseTime: 160,
      successRate: 96.8,
      uptime: '99.6%'
    }
  },
  {
    id: 'workflow-automation',
    name: 'Workflow Automation',
    category: 'Automation & Orchestration',
    icon: '⚙️',
    color: '#06b6d4',
    description: 'Automate repetitive tasks and build intelligent workflows',
    status: 'active',
    capabilities: [
      'Create custom automation workflows',
      'Trigger actions based on events',
      'Integrate with external services',
      'Schedule recurring tasks',
      'Build approval and notification chains'
    ],
    accomplishments: {
      total: 1876,
      recent: [
        'Automated weekly report generation (30 min ago)',
        'Triggered backup workflow after file changes (1 hour ago)',
        'Sent 15 automated client follow-ups (2 hours ago)'
      ]
    },
    currentActivity: 'Executing scheduled end-of-day backup workflow',
    goals: [
      'Reduce manual tasks by 60%',
      'Build library of 50 reusable workflows',
      'Implement AI-suggested automation opportunities'
    ],
    metrics: {
      requestsProcessed: 1876,
      avgResponseTime: 190,
      successRate: 95.4,
      uptime: '99.5%'
    }
  },
  {
    id: 'workspace-orchestrator',
    name: 'Workspace Orchestrator',
    category: 'Automation & Orchestration',
    icon: '🎯',
    color: '#8b5cf6',
    description: 'Coordinate Google Workspace services for seamless productivity',
    status: 'active',
    capabilities: [
      'Sync data across Gmail, Drive, and Calendar',
      'Orchestrate multi-service workflows',
      'Manage permissions and sharing',
      'Monitor Workspace usage and optimize',
      'Generate cross-service insights'
    ],
    accomplishments: {
      total: 945,
      recent: [
        'Synced 200 calendar events with Drive files (25 min ago)',
        'Organized 50 emails with auto-filing (1 hour ago)',
        'Generated weekly Workspace usage report (4 hours ago)'
      ]
    },
    currentActivity: 'Coordinating Drive cleanup with Gmail attachments',
    goals: [
      'Achieve 100% email-calendar-drive sync',
      'Implement smart Workspace suggestions',
      'Build unified search across all services'
    ],
    metrics: {
      requestsProcessed: 945,
      avgResponseTime: 175,
      successRate: 97.8,
      uptime: '99.7%'
    }
  },
  {
    id: 'cost-monitor',
    name: 'Cost Monitor',
    category: 'System Management',
    icon: '💰',
    color: '#eab308',
    description: 'Track and optimize AI API costs with intelligent budgeting',
    status: 'active',
    capabilities: [
      'Real-time cost tracking for all AI services',
      'Budget alerts and warnings',
      'Cost optimization recommendations',
      'Usage analytics and forecasting',
      'Automatic model selection for cost efficiency'
    ],
    accomplishments: {
      total: 15234,
      recent: [
        'Saved $45 by optimizing model selection (ongoing)',
        'Sent budget alert at 80% threshold (2 hours ago)',
        'Generated monthly cost report with savings suggestions (1 day ago)'
      ]
    },
    currentActivity: 'Monitoring real-time API usage and costs',
    goals: [
      'Reduce overall AI costs by 25%',
      'Implement predictive budget warnings',
      'Build cost-aware auto-scaling'
    ],
    metrics: {
      requestsProcessed: 15234,
      avgResponseTime: 140,
      successRate: 99.9,
      uptime: '100%'
    }
  },
  {
    id: 'device-continuity',
    name: 'Device Continuity',
    category: 'System Management',
    icon: '🔄',
    color: '#3b82f6',
    description: 'Seamless sync across all your devices in real-time',
    status: 'active',
    capabilities: [
      'Real-time state sync across devices',
      'Conflict resolution for simultaneous edits',
      'Offline mode with automatic sync',
      'Device fingerprinting and security',
      'Session handoff between devices'
    ],
    accomplishments: {
      total: 4521,
      recent: [
        'Synced conversation state across 3 devices (5 min ago)',
        'Resolved edit conflict between phone and laptop (30 min ago)',
        'Handed off active session from desktop to mobile (1 hour ago)'
      ]
    },
    currentActivity: 'Maintaining real-time sync for active sessions',
    goals: [
      'Achieve <100ms sync latency',
      'Support 5+ simultaneous devices',
      'Implement predictive pre-sync'
    ],
    metrics: {
      requestsProcessed: 4521,
      avgResponseTime: 130,
      successRate: 98.9,
      uptime: '99.8%'
    }
  },
  {
    id: 'security-perimeter',
    name: 'Security Perimeter',
    category: 'System Management',
    icon: '🛡️',
    color: '#ef4444',
    description: 'Advanced threat detection and system protection',
    status: 'active',
    capabilities: [
      'Real-time threat detection and blocking',
      'Rate limiting and DDoS protection',
      'Suspicious pattern recognition',
      'Automated security responses',
      'Comprehensive audit logging'
    ],
    accomplishments: {
      total: 8765,
      recent: [
        'Blocked 15 suspicious requests (ongoing)',
        'Detected and prevented rate limit abuse (10 min ago)',
        'Generated security audit report (6 hours ago)'
      ]
    },
    currentActivity: 'Active monitoring - 0 threats detected',
    goals: [
      'Maintain 99.9% uptime with zero breaches',
      'Implement AI-powered threat prediction',
      'Build automated incident response'
    ],
    metrics: {
      requestsProcessed: 8765,
      avgResponseTime: 110,
      successRate: 100,
      uptime: '100%'
    }
  },
  {
    id: 'file-monitor',
    name: 'File Monitor',
    category: 'Specialized',
    icon: '👁️',
    color: '#14b8a6',
    description: 'Real-time file system monitoring with automatic actions',
    status: 'active',
    capabilities: [
      'Watch directories for file changes',
      'MD5 hash-based change detection',
      'Auto-trigger actions on file events',
      'Pattern-based file filtering',
      'Support files up to 2GB'
    ],
    accomplishments: {
      total: 234,
      recent: [
        'Detected new recording, queued for transcription (just now)',
        'Monitored 5 directories with 1,200 files (ongoing)',
        'Auto-backed up 3 critical files (15 min ago)'
      ]
    },
    currentActivity: 'Watching 5 directories for changes',
    goals: [
      'Expand to 20 watched directories',
      'Implement smart action suggestions',
      'Add cloud storage integration'
    ],
    metrics: {
      requestsProcessed: 234,
      avgResponseTime: 95,
      successRate: 99.5,
      uptime: '99.9%'
    }
  },
  {
    id: 'audio-transfer',
    name: 'Audio Transfer',
    category: 'Specialized',
    icon: '📤',
    color: '#f97316',
    description: 'Optimized audio upload and processing for files up to 2GB',
    status: 'processing',
    capabilities: [
      'Chunked upload for large audio files',
      'Quick reference generation for immediate access',
      'Automatic transcription queuing',
      'Streaming audio support',
      'Progress tracking with webhooks'
    ],
    accomplishments: {
      total: 167,
      recent: [
        'Uploaded 1.8GB meeting recording (in progress)',
        'Generated quick reference in 30 seconds (20 min ago)',
        'Processed 12 audio files today (ongoing)'
      ]
    },
    currentActivity: 'Uploading 1.8GB file - 73% complete',
    goals: [
      'Support 5GB file limit',
      'Reduce quick reference time to <15 seconds',
      'Implement resume capability for failed uploads'
    ],
    metrics: {
      requestsProcessed: 167,
      avgResponseTime: 210,
      successRate: 96.4,
      uptime: '99.6%'
    }
  }
];

export default function AgentStatusPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentActivity[]>(AGENT_DATA);
  const [selectedAgent, setSelectedAgent] = useState<AgentActivity | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = ['all', ...new Set(agents.map(a => a.category))];
  const filteredAgents = categoryFilter === 'all'
    ? agents
    : agents.filter(a => a.category === categoryFilter);

  const totalRequests = agents.reduce((sum, a) => sum + a.metrics.requestsProcessed, 0);
  const avgSuccessRate = agents.reduce((sum, a) => sum + a.metrics.successRate, 0) / agents.length;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f0f0f',
      color: '#ffffff',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '10px 16px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← Back to Chat
        </button>

        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            margin: 0,
            marginBottom: '8px'
          }}>
            🤖 Agent Ecosystem Status
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#888',
            margin: 0,
            marginBottom: '16px'
          }}>
            Real-time monitoring of all {agents.length} intelligent agents
          </p>

          {/* System Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '24px'
          }}>
            <div style={{
              padding: '16px',
              backgroundColor: '#1a1a1a',
              borderRadius: '8px',
              border: '1px solid #333'
            }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Total Requests</div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#4a9eff' }}>
                {totalRequests.toLocaleString()}
              </div>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: '#1a1a1a',
              borderRadius: '8px',
              border: '1px solid #333'
            }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Avg Success Rate</div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#10a37f' }}>
                {avgSuccessRate.toFixed(1)}%
              </div>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: '#1a1a1a',
              borderRadius: '8px',
              border: '1px solid #333'
            }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Active Agents</div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#f59e0b' }}>
                {agents.filter(a => a.status === 'active' || a.status === 'processing').length}/{agents.length}
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '8px 16px',
                backgroundColor: categoryFilter === cat ? '#4a9eff' : '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '8px',
                color: categoryFilter === cat ? '#fff' : '#888',
                fontSize: '14px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Agent Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '16px'
        }}>
          {filteredAgents.map(agent => (
            <div
              key={agent.id}
              onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
              style={{
                backgroundColor: '#1a1a1a',
                border: `1px solid ${agent.color}33`,
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = agent.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `${agent.color}33`;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '32px' }}>{agent.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#fff',
                    marginBottom: '4px'
                  }}>
                    {agent.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    {agent.category}
                  </div>
                </div>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: agent.status === 'processing' ? '#f59e0b' : '#10a37f',
                  boxShadow: `0 0 10px ${agent.status === 'processing' ? '#f59e0b' : '#10a37f'}`
                }} />
              </div>

              {/* Description */}
              <p style={{
                fontSize: '14px',
                color: '#aaa',
                margin: '0 0 16px 0',
                lineHeight: '1.5'
              }}>
                {agent.description}
              </p>

              {/* Current Activity */}
              <div style={{
                padding: '12px',
                backgroundColor: '#0a0a0a',
                borderRadius: '8px',
                marginBottom: '16px',
                border: `1px solid ${agent.color}22`
              }}>
                <div style={{ fontSize: '11px', color: agent.color, marginBottom: '4px', fontWeight: '600' }}>
                  CURRENT ACTIVITY
                </div>
                <div style={{ fontSize: '13px', color: '#fff' }}>
                  {agent.currentActivity}
                </div>
              </div>

              {/* Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '12px',
                color: '#888'
              }}>
                <div>
                  <span style={{ color: '#666' }}>Requests:</span>{' '}
                  <span style={{ color: '#fff', fontWeight: '600' }}>{agent.metrics.requestsProcessed.toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: '#666' }}>Response:</span>{' '}
                  <span style={{ color: '#fff', fontWeight: '600' }}>{agent.metrics.avgResponseTime}ms</span>
                </div>
                <div>
                  <span style={{ color: '#666' }}>Success:</span>{' '}
                  <span style={{ color: '#10a37f', fontWeight: '600' }}>{agent.metrics.successRate}%</span>
                </div>
                <div>
                  <span style={{ color: '#666' }}>Uptime:</span>{' '}
                  <span style={{ color: '#4a9eff', fontWeight: '600' }}>{agent.metrics.uptime}</span>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedAgent?.id === agent.id && (
                <div style={{
                  marginTop: '20px',
                  paddingTop: '20px',
                  borderTop: '1px solid #333'
                }}>
                  {/* Capabilities */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      fontSize: '12px',
                      color: agent.color,
                      fontWeight: '600',
                      marginBottom: '8px'
                    }}>
                      WHAT IT DOES
                    </div>
                    <ul style={{
                      margin: 0,
                      paddingLeft: '20px',
                      fontSize: '13px',
                      color: '#aaa',
                      lineHeight: '1.8'
                    }}>
                      {agent.capabilities.map((cap, i) => (
                        <li key={i}>{cap}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Recent Accomplishments */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      fontSize: '12px',
                      color: agent.color,
                      fontWeight: '600',
                      marginBottom: '8px'
                    }}>
                      WHAT IT HAS DONE ({agent.accomplishments.total.toLocaleString()} total)
                    </div>
                    <ul style={{
                      margin: 0,
                      paddingLeft: '20px',
                      fontSize: '13px',
                      color: '#aaa',
                      lineHeight: '1.8'
                    }}>
                      {agent.accomplishments.recent.map((acc, i) => (
                        <li key={i}>{acc}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Goals */}
                  <div>
                    <div style={{
                      fontSize: '12px',
                      color: agent.color,
                      fontWeight: '600',
                      marginBottom: '8px'
                    }}>
                      GOALS TO ACCOMPLISH
                    </div>
                    <ul style={{
                      margin: 0,
                      paddingLeft: '20px',
                      fontSize: '13px',
                      color: '#aaa',
                      lineHeight: '1.8'
                    }}>
                      {agent.goals.map((goal, i) => (
                        <li key={i}>{goal}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
