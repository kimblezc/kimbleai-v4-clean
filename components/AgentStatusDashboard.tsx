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
}

const AGENT_DEFINITIONS: Omit<AgentStatus, 'status' | 'lastActivity' | 'tasksCompleted'>[] = [
  // Intelligence & Analysis
  { id: 'drive-intelligence', name: 'Drive Intelligence', category: 'Intelligence', icon: '📁', color: '#4a9eff', responseTime: 150 },
  { id: 'audio-intelligence', name: 'Audio Intelligence', category: 'Intelligence', icon: '🎵', color: '#10a37f', responseTime: 200 },
  { id: 'knowledge-graph', name: 'Knowledge Graph', category: 'Intelligence', icon: '🕸️', color: '#ff6b6b', responseTime: 180 },
  { id: 'context-prediction', name: 'Context Prediction', category: 'Intelligence', icon: '🔮', color: '#a855f7', responseTime: 120 },
  { id: 'project-context', name: 'Project Context', category: 'Intelligence', icon: '📊', color: '#f59e0b', responseTime: 160 },

  // Automation & Orchestration
  { id: 'workflow-automation', name: 'Workflow Automation', category: 'Automation', icon: '⚙️', color: '#06b6d4', responseTime: 190 },
  { id: 'workspace-orchestrator', name: 'Workspace Orchestrator', category: 'Automation', icon: '🎯', color: '#8b5cf6', responseTime: 175 },

  // System Management
  { id: 'cost-monitor', name: 'Cost Monitor', category: 'System', icon: '💰', color: '#eab308', responseTime: 140 },
  { id: 'device-continuity', name: 'Device Continuity', category: 'System', icon: '🔄', color: '#3b82f6', responseTime: 130 },
  { id: 'security-perimeter', name: 'Security Perimeter', category: 'System', icon: '🛡️', color: '#ef4444', responseTime: 110 },

  // New Specialized Agents
  { id: 'file-monitor', name: 'File Monitor', category: 'Specialized', icon: '👁️', color: '#14b8a6', responseTime: 95 },
  { id: 'audio-transfer', name: 'Audio Transfer', category: 'Specialized', icon: '📤', color: '#f97316', responseTime: 210 },
];

export default function AgentStatusDashboard() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    // Initialize agents
    const initialAgents: AgentStatus[] = AGENT_DEFINITIONS.map(def => ({
      ...def,
      status: 'active',
      lastActivity: 'Just now',
      tasksCompleted: Math.floor(Math.random() * 100)
    }));
    setAgents(initialAgents);
    setLoading(false);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => ({
        ...agent,
        tasksCompleted: agent.tasksCompleted + Math.floor(Math.random() * 3),
        status: Math.random() > 0.95 ? 'processing' : 'active',
        lastActivity: Math.random() > 0.7 ? 'Just now' : agent.lastActivity
      })));
    }, 5000);

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

  const categories = ['all', ...new Set(AGENT_DEFINITIONS.map(a => a.category))];

  const totalTasks = agents.reduce((sum, a) => sum + a.tasksCompleted, 0);
  const avgResponseTime = Math.round(agents.reduce((sum, a) => sum + (a.responseTime || 0), 0) / agents.length);

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
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #333'
      }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#ffffff',
            marginBottom: '4px'
          }}>
            🤖 Agent Ecosystem Status
          </h2>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: '#888'
          }}>
            {agents.length} agents • {totalTasks.toLocaleString()} tasks completed • {avgResponseTime}ms avg response
          </p>
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
                color: '#aaa'
              }}>
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
                {agent.currentTask && (
                  <div style={{
                    marginTop: '8px',
                    padding: '6px',
                    backgroundColor: '#0a0a0a',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}>
                    <strong style={{ color: agent.color }}>Current Task:</strong><br />
                    {agent.currentTask}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid #333',
        display: 'flex',
        gap: '16px',
        fontSize: '12px',
        color: '#888'
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
      </div>
    </div>
  );
}
