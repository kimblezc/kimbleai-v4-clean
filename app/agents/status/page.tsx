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
  status: 'active' | 'processing' | 'idle' | 'error' | 'offline';

  // What it does
  capabilities: string[];

  // REAL data from database
  tasksCompleted: number;
  lastActivity: string;
  currentTask?: string;

  // Features and implementation status
  features?: Array<{
    name: string;
    status: 'implemented' | 'partial' | 'planned';
    description: string;
  }>;

  // API endpoints and database tables (shows what's really connected)
  apiEndpoints?: string[];
  databaseTables?: string[];

  // Metrics
  metrics: {
    requestCount?: number;
    successRate?: number;
    avgResponseTime?: number;
    activeSessions?: number;
  };

  // Errors
  errors: string[];
}

// Goals for each agent (static, user-defined objectives)
const AGENT_GOALS: Record<string, string[]> = {
  'drive-intelligence': [
    'Build comprehensive file index for semantic search',
    'Implement automatic file organization',
    'Enable smart collaboration suggestions'
  ],
  'audio-intelligence': [
    'Achieve real-time transcription capability',
    'Add emotion and sentiment analysis',
    'Integrate with calendar for automatic meeting processing'
  ],
  'knowledge-graph': [
    'Reach 10,000 mapped entities from conversations',
    'Implement graph-based project suggestions',
    'Enable natural language graph queries'
  ],
  'context-prediction': [
    'Achieve 85% prediction accuracy',
    'Reduce average task prep time by 50%',
    'Implement cross-device prediction sync'
  ],
  'project-context': [
    'Implement automatic project health scoring',
    'Enable predictive project timeline estimation',
    'Build cross-project resource optimization'
  ],
  'workflow-automation': [
    'Build library of 50 reusable workflows',
    'Implement AI-suggested automation opportunities',
    'Reduce manual tasks by 60%'
  ],
  'workspace-orchestrator': [
    'Achieve 100% email-calendar-drive sync',
    'Implement smart Workspace suggestions',
    'Build unified search across all services'
  ],
  'cost-monitor': [
    'Reduce overall AI costs by 25%',
    'Implement predictive budget warnings',
    'Build cost-aware auto-scaling'
  ],
  'device-continuity': [
    'Achieve <50ms cross-device sync latency',
    'Enable instant handoff with zero user friction',
    'Support unlimited simultaneous devices'
  ],
  'security-perimeter': [
    'Maintain 99.9% uptime with zero breaches',
    'Implement AI-powered threat prediction',
    'Build automated incident response'
  ],
  'file-monitor': [
    'Expand to 20 watched directories',
    'Implement smart action suggestions',
    'Add cloud storage integration'
  ],
  'audio-transfer': [
    'Support 5GB file limit',
    'Reduce quick reference time to <15 seconds',
    'Implement resume capability for failed uploads'
  ],
  'cleanup-agent': [
    'Automate git repository cleanup and optimization',
    'Maintain storage usage below 80% capacity',
    'Implement scheduled cleanup tasks',
    'Reduce deployment size by 50%',
    'Organize and deduplicate cloud storage'
  ],
  'agent-optimizer': [
    'Achieve 99.9% agent uptime across all systems',
    'Reduce agent error rate to <0.1%',
    'Implement predictive failure prevention',
    'Auto-optimize agent performance in real-time',
    'Build self-healing capabilities for all agents'
  ]
};

export default function AgentStatusPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentActivity | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Fetch real agent data from API
  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/agents/monitor');

        if (!response.ok) {
          throw new Error(`Failed to fetch agents: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.agents) {
          setAgents(data.agents);
          setError(null);
        } else {
          throw new Error(data.error || 'Failed to load agent data');
        }
      } catch (err: any) {
        console.error('Error fetching agent data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentData();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchAgentData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Helper to generate accomplishment text based on real data
  const getAccomplishments = (agent: AgentActivity): string[] => {
    const accomplishments: string[] = [];

    if (agent.tasksCompleted === 0) {
      accomplishments.push('Ready to start processing');

      if (agent.features && agent.features.length > 0) {
        const implemented = agent.features.filter(f => f.status === 'implemented').length;
        accomplishments.push(`${implemented} features implemented and ready`);
      }

      if (agent.apiEndpoints && agent.apiEndpoints.length > 0) {
        accomplishments.push(`${agent.apiEndpoints.length} API endpoints configured`);
      }

      if (agent.databaseTables && agent.databaseTables.length > 0) {
        accomplishments.push(`${agent.databaseTables.length} database tables ready`);
      }
    } else {
      // Show real accomplishments
      switch (agent.id) {
        case 'drive-intelligence':
          accomplishments.push(`${agent.tasksCompleted} files analyzed and indexed`);
          break;
        case 'audio-intelligence':
          accomplishments.push(`${agent.tasksCompleted} audio transcription sessions completed`);
          break;
        case 'knowledge-graph':
          accomplishments.push(`${agent.tasksCompleted} entities mapped in knowledge graph`);
          break;
        case 'project-context':
          accomplishments.push(`${agent.tasksCompleted} projects tracked and managed`);
          break;
        case 'device-continuity':
          accomplishments.push(`${agent.tasksCompleted} device sessions synchronized`);
          break;
        default:
          accomplishments.push(`${agent.tasksCompleted} tasks completed successfully`);
      }

      if (agent.metrics.activeSessions) {
        accomplishments.push(`${agent.metrics.activeSessions} active sessions right now`);
      }

      if (agent.lastActivity) {
        accomplishments.push(`Last active: ${agent.lastActivity}`);
      }
    }

    return accomplishments;
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0f0f0f',
        color: '#ffffff',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔄</div>
          <div style={{ fontSize: '18px', color: '#888' }}>Loading agent data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0f0f0f',
        color: '#ffffff',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <div style={{ fontSize: '18px', color: '#ef4444', marginBottom: '8px' }}>Failed to load agents</div>
          <div style={{ fontSize: '14px', color: '#888' }}>{error}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              backgroundColor: '#4a9eff',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const categories = ['all', ...new Set(agents.map(a => a.category))];
  const filteredAgents = categoryFilter === 'all'
    ? agents
    : agents.filter(a => a.category === categoryFilter);

  const totalTasks = agents.reduce((sum, a) => sum + a.tasksCompleted, 0);
  const avgResponseTime = Math.round(
    agents.reduce((sum, a) => sum + (a.metrics.avgResponseTime || 0), 0) / agents.length
  );

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
            Real-time monitoring of all {agents.length} intelligent agents - showing actual database metrics
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
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Total Tasks Completed</div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#4a9eff' }}>
                {totalTasks.toLocaleString()}
              </div>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: '#1a1a1a',
              borderRadius: '8px',
              border: '1px solid #333'
            }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Avg Response Time</div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#10a37f' }}>
                {avgResponseTime}ms
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
          {filteredAgents.map(agent => {
            const accomplishments = getAccomplishments(agent);
            const goals = AGENT_GOALS[agent.id] || [];

            return (
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
                    backgroundColor:
                      agent.status === 'processing' ? '#f59e0b' :
                      agent.status === 'active' ? '#10a37f' :
                      agent.status === 'error' ? '#ef4444' : '#888',
                    boxShadow: `0 0 10px ${
                      agent.status === 'processing' ? '#f59e0b' :
                      agent.status === 'active' ? '#10a37f' :
                      agent.status === 'error' ? '#ef4444' : '#888'
                    }`
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
                    {agent.tasksCompleted > 0 ? 'REAL ACCOMPLISHMENTS' : 'STATUS'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#fff' }}>
                    {agent.currentTask || (agent.tasksCompleted > 0 ? `${agent.tasksCompleted} items processed` : 'Ready - not yet used')}
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
                    <span style={{ color: '#666' }}>Tasks:</span>{' '}
                    <span style={{ color: '#fff', fontWeight: '600' }}>{agent.tasksCompleted}</span>
                  </div>
                  <div>
                    <span style={{ color: '#666' }}>Response:</span>{' '}
                    <span style={{ color: '#fff', fontWeight: '600' }}>{agent.metrics.avgResponseTime || 0}ms</span>
                  </div>
                  <div>
                    <span style={{ color: '#666' }}>Status:</span>{' '}
                    <span style={{
                      color: agent.status === 'active' || agent.status === 'processing' ? '#10a37f' : '#888',
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }}>
                      {agent.status}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#666' }}>Errors:</span>{' '}
                    <span style={{
                      color: agent.errors.length > 0 ? '#ef4444' : '#10a37f',
                      fontWeight: '600'
                    }}>
                      {agent.errors.length}
                    </span>
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

                    {/* Real Accomplishments */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{
                        fontSize: '12px',
                        color: agent.color,
                        fontWeight: '600',
                        marginBottom: '8px'
                      }}>
                        WHAT IT HAS DONE ({agent.tasksCompleted} total)
                      </div>
                      <ul style={{
                        margin: 0,
                        paddingLeft: '20px',
                        fontSize: '13px',
                        color: '#aaa',
                        lineHeight: '1.8'
                      }}>
                        {accomplishments.map((acc, i) => (
                          <li key={i}>{acc}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Implementation Status */}
                    {agent.features && agent.features.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{
                          fontSize: '12px',
                          color: agent.color,
                          fontWeight: '600',
                          marginBottom: '8px'
                        }}>
                          IMPLEMENTATION STATUS
                        </div>
                        <ul style={{
                          margin: 0,
                          paddingLeft: '20px',
                          fontSize: '13px',
                          color: '#aaa',
                          lineHeight: '1.8'
                        }}>
                          {agent.features.map((feature, i) => (
                            <li key={i}>
                              <span style={{
                                color:
                                  feature.status === 'implemented' ? '#10a37f' :
                                  feature.status === 'partial' ? '#f59e0b' : '#888'
                              }}>
                                {feature.status === 'implemented' ? '✓' : feature.status === 'partial' ? '◐' : '○'}
                              </span>
                              {' '}{feature.name}: {feature.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Goals */}
                    {goals.length > 0 && (
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
                          {goals.map((goal, i) => (
                            <li key={i}>{goal}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Errors */}
                    {agent.errors.length > 0 && (
                      <div style={{ marginTop: '20px' }}>
                        <div style={{
                          fontSize: '12px',
                          color: '#ef4444',
                          fontWeight: '600',
                          marginBottom: '8px'
                        }}>
                          ERRORS
                        </div>
                        <ul style={{
                          margin: 0,
                          paddingLeft: '20px',
                          fontSize: '13px',
                          color: '#ef4444',
                          lineHeight: '1.8'
                        }}>
                          {agent.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
