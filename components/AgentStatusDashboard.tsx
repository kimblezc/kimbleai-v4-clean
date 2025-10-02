'use client';

import React, { useState, useEffect } from 'react';

interface AgentStatus {
  id: string;
  name: string;
  category: string;
  status: 'active' | 'idle' | 'processing' | 'error' | 'offline';
  lastActivity: string;
  tasksCompleted: number;
  currentTask?: string;
  responseTime?: number;
  icon: string;
  color: string;
  description?: string;
  capabilities?: string[];
  features?: any[];
  metrics?: any;
}

export default function AgentStatusDashboard() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [summary, setSummary] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Fetch real agent data from API
    const fetchAgentData = async () => {
      try {
        const response = await fetch('/api/agents/monitor');
        const data = await response.json();

        if (data.success) {
          setAgents(data.agents);
          setSummary(data.summary);
          setLastUpdate(new Date());
          setError(null);
        } else {
          setError(data.error || 'Failed to fetch agent data');
        }
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to fetch agent data:', err);
        setError(err.message || 'Failed to connect to agent monitor');
        setLoading(false);
      }
    };

    fetchAgentData();

    // Refresh every 10 seconds for real-time updates
    const interval = setInterval(fetchAgentData, 10000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10a37f';
      case 'processing': return '#f59e0b';
      case 'idle': return '#6b7280';
      case 'error': return '#ef4444';
      case 'offline': return '#1f2937';
      default: return '#6b7280';
    }
  };

  const filteredAgents = filter === 'all'
    ? agents
    : agents.filter(a => a.category.toLowerCase() === filter.toLowerCase());

  const categories = ['all', ...new Set(agents.map(a => a.category))];

  const totalTasks = summary?.totalTasks || agents.reduce((sum, a) => sum + a.tasksCompleted, 0);
  const avgResponseTime = summary?.avgResponseTime || Math.round(agents.reduce((sum, a) => sum + (a.responseTime || 0), 0) / (agents.length || 1));
  const activeAgents = agents.filter(a => a.status === 'active').length;

  // Loading state
  if (loading) {
    return (
      <div style={{
        backgroundColor: '#0a0a0a',
        borderRadius: '12px',
        border: '1px solid #333',
        padding: '40px',
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '16px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          🤖
        </div>
        <p style={{ color: '#888', margin: 0 }}>Loading agent ecosystem...</p>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        backgroundColor: '#0a0a0a',
        borderRadius: '12px',
        border: '1px solid #ef4444',
        padding: '40px',
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <p style={{ color: '#ef4444', margin: 0, marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>
          Failed to Load Agents
        </p>
        <p style={{ color: '#888', margin: 0, fontSize: '13px' }}>{error}</p>
      </div>
    );
  }

  // Empty state
  if (agents.length === 0) {
    return (
      <div style={{
        backgroundColor: '#0a0a0a',
        borderRadius: '12px',
        border: '1px solid #333',
        padding: '40px',
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
        <p style={{ color: '#888', margin: 0 }}>No agents available</p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#0a0a0a',
      borderRadius: '12px',
      border: '1px solid #333',
      padding: '20px',
      marginBottom: '20px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #333',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '600',
            color: '#ffffff',
            marginBottom: '8px'
          }}>
            🤖 Agent Ecosystem
          </h2>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#888',
            marginBottom: '6px'
          }}>
            {agents.length} total • {activeAgents} active • {totalTasks.toLocaleString()} tasks • {avgResponseTime}ms avg
          </p>
          {lastUpdate && (
            <p style={{
              margin: 0,
              fontSize: '11px',
              color: '#666'
            }}>
              Updated {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: '6px 12px',
                backgroundColor: filter === cat ? '#4a9eff' : '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '6px',
                color: filter === cat ? '#fff' : '#888',
                fontSize: '12px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '12px'
      }}>
        {filteredAgents.map(agent => (
          <div
            key={agent.id}
            onClick={() => setShowDetails(showDetails === agent.id ? null : agent.id)}
            style={{
              backgroundColor: '#1a1a1a',
              border: `1px solid ${agent.color}33`,
              borderRadius: '8px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative',
              overflow: 'hidden'
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
            {/* Status Indicator */}
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(agent.status),
              boxShadow: `0 0 8px ${getStatusColor(agent.status)}`
            }} />

            {/* Agent Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ fontSize: '24px' }}>{agent.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#fff',
                  marginBottom: '2px'
                }}>
                  {agent.name}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#888'
                }}>
                  {agent.category}
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#888',
              marginTop: '10px'
            }}>
              <span>Tasks: {agent.tasksCompleted}</span>
              <span>{agent.responseTime}ms</span>
            </div>

            {/* Status Bar */}
            <div style={{
              marginTop: '8px',
              height: '3px',
              backgroundColor: '#333',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: agent.status === 'active' ? '100%' : '50%',
                backgroundColor: agent.color,
                transition: 'width 0.3s'
              }} />
            </div>

            {/* Expanded Details */}
            {showDetails === agent.id && (
              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #333',
                fontSize: '12px',
                color: '#aaa',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {/* Description */}
                {agent.description && (
                  <div style={{
                    marginBottom: '12px',
                    padding: '8px',
                    backgroundColor: '#0a0a0a',
                    borderRadius: '4px',
                    fontSize: '11px',
                    lineHeight: '1.5'
                  }}>
                    {agent.description}
                  </div>
                )}

                {/* Status Info */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ marginBottom: '6px' }}>
                    <strong style={{ color: agent.color }}>Status:</strong>{' '}
                    <span style={{ textTransform: 'capitalize' }}>{agent.status}</span>
                  </div>
                  <div style={{ marginBottom: '6px' }}>
                    <strong style={{ color: agent.color }}>Last Activity:</strong> {agent.lastActivity}
                  </div>
                  <div style={{ marginBottom: '6px' }}>
                    <strong style={{ color: agent.color }}>Avg Response:</strong> {agent.responseTime}ms
                  </div>
                </div>

                {/* Current Task */}
                {agent.currentTask && (
                  <div style={{
                    marginTop: '10px',
                    marginBottom: '10px',
                    padding: '8px',
                    backgroundColor: '#0a0a0a',
                    borderRadius: '4px',
                    fontSize: '11px',
                    borderLeft: `2px solid ${agent.color}`
                  }}>
                    <strong style={{ color: agent.color }}>Current Task:</strong><br />
                    <span style={{ color: '#ccc', marginTop: '4px', display: 'block' }}>
                      {agent.currentTask}
                    </span>
                  </div>
                )}

                {/* Capabilities */}
                {agent.capabilities && agent.capabilities.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <strong style={{ color: agent.color, marginBottom: '6px', display: 'block' }}>
                      Capabilities:
                    </strong>
                    <ul style={{
                      margin: '6px 0',
                      paddingLeft: '20px',
                      fontSize: '11px',
                      lineHeight: '1.6'
                    }}>
                      {agent.capabilities.slice(0, 5).map((cap, idx) => (
                        <li key={idx} style={{ marginBottom: '4px', color: '#ccc' }}>{cap}</li>
                      ))}
                      {agent.capabilities.length > 5 && (
                        <li style={{ color: '#666', fontStyle: 'italic' }}>
                          +{agent.capabilities.length - 5} more...
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Metrics */}
                {agent.metrics && Object.keys(agent.metrics).length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <strong style={{ color: agent.color, marginBottom: '6px', display: 'block' }}>
                      Metrics:
                    </strong>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '6px',
                      fontSize: '11px'
                    }}>
                      {Object.entries(agent.metrics).slice(0, 6).map(([key, value]) => (
                        <div key={key} style={{
                          padding: '4px 6px',
                          backgroundColor: '#0a0a0a',
                          borderRadius: '3px',
                          border: `1px solid #333`
                        }}>
                          <div style={{ color: '#666', fontSize: '10px' }}>{key}</div>
                          <div style={{ color: '#fff', fontWeight: '600' }}>{String(value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty filter state */}
      {filteredAgents.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#888'
        }}>
          <p style={{ margin: 0 }}>No agents found in this category</p>
        </div>
      )}

      {/* Footer with Legend and Summary */}
      <div style={{
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid #333'
      }}>
        {/* Status Legend */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '12px',
          color: '#888',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10a37f' }} />
            Active
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            Processing
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6b7280' }} />
            Idle
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
            Error
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1f2937' }} />
            Offline
          </div>
        </div>

        {/* System Summary */}
        {summary && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            padding: '12px',
            backgroundColor: '#0f0f0f',
            borderRadius: '6px',
            border: '1px solid #222'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#10a37f' }}>
                {summary.activeAgents || activeAgents}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                Active Agents
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#4a9eff' }}>
                {totalTasks.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                Total Tasks
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#f59e0b' }}>
                {avgResponseTime}ms
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                Avg Response
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#a855f7' }}>
                {((activeAgents / agents.length) * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                Uptime
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
