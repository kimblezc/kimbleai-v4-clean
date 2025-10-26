/**
 * Archie Dashboard - Brand New Build
 * Server-side rendered, no caching
 */

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { AgentTriggerButtons } from '@/components/AgentTriggerButtons';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Force dynamic rendering - AGGRESSIVE CACHE BUSTING
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Archie Dashboard | KimbleAI',
  description: 'Autonomous agent dashboard'
};

async function getData() {
  // Fetch recent tasks with proper limits
  const { data: completedTasks } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20); // Last 20 completed

  const { data: inProgressTasks } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false });

  const { data: pendingTasks } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: false });

  // Fetch recent findings
  const { data: findings } = await supabase
    .from('agent_findings')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(50); // Last 50 findings

  // Fetch recent logs to show agent activity
  const { data: recentLogs } = await supabase
    .from('agent_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(20);

  // Get total counts
  const { count: totalCompleted } = await supabase
    .from('agent_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');

  const { count: totalFindings } = await supabase
    .from('agent_findings')
    .select('*', { count: 'exact', head: true });

  return {
    completed: completedTasks || [],
    inProgress: inProgressTasks || [],
    pending: pendingTasks || [],
    suggestions: findings?.filter(f =>
      f.finding_type === 'improvement' ||
      f.finding_type === 'optimization' ||
      f.severity === 'low'
    ) || [],
    allFindings: findings || [],
    recentLogs: recentLogs || [],
    totalCompleted: totalCompleted || 0,
    totalFindings: totalFindings || 0,
    lastActivity: recentLogs?.[0]?.timestamp || null
  };
}

export default async function ArchieDashboard() {
  const data = await getData();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: 'white',
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* KimbleAI Logo */}
      <div style={{ width: '100%', padding: '0 20px 20px 20px' }}>
        <Link href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          textDecoration: 'none',
          color: 'inherit'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4a9eff 0%, #667eea 50%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
          }}>
            20
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
            <span style={{
              fontSize: '20px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #4a9eff 0%, #667eea 50%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.5px',
            }}>
              KimbleAI
            </span>
            <span style={{
              fontSize: '10px',
              color: '#888',
              fontWeight: '500',
              letterSpacing: '1px',
            }}>
              ROLL FOR INSIGHT
            </span>
          </div>
        </Link>
      </div>

      {/* Header */}
      <div style={{ width: '100%', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            fontSize: '60px',
            marginBottom: '10px',
            filter: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.6))'
          }}>
            🦉
          </div>
          <h1 style={{
            fontSize: '42px',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, #60a5fa, #34d399)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '5px'
          }}>
            Archie's Dashboard
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Auto-updates every request • Server-side rendered
          </p>
        </div>

        {/* Active Agents Overview */}
        <div style={{
          background: 'rgba(34, 197, 94, 0.05)',
          border: '2px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '40px'
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, #22c55e, #10b981)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '32px' }}>🤖</span>
            Active Agents (4 Total)
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            {/* Autonomous Agent (Original Archie) */}
            <div style={{
              background: '#1a1a1a',
              border: '2px solid #22c55e',
              borderRadius: '12px',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 10px #22c55e',
                animation: 'pulse 2s infinite'
              }}></div>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🦉</div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#22c55e', marginBottom: '8px' }}>
                Autonomous Agent
              </h3>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                Main orchestrator • Code analysis • Self-improvement
              </p>
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                borderRadius: '6px',
                padding: '8px',
                marginBottom: '8px'
              }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Schedule</div>
                <div style={{ fontSize: '13px', color: '#22c55e', fontWeight: 'bold' }}>Every 5 minutes</div>
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                Endpoint: <span style={{ color: '#60a5fa' }}>/api/agent/cron</span>
              </div>
            </div>

            {/* Archie Utility Agent */}
            <div style={{
              background: '#1a1a1a',
              border: '2px solid #3b82f6',
              borderRadius: '12px',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#3b82f6',
                boxShadow: '0 0 10px #3b82f6',
                animation: 'pulse 2s infinite'
              }}></div>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔍</div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '8px' }}>
                Archie Utility
              </h3>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                Actionable insights • Cost monitoring • Task optimization
              </p>
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '6px',
                padding: '8px',
                marginBottom: '8px'
              }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Schedule</div>
                <div style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 'bold' }}>Every 15 minutes</div>
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                Endpoint: <span style={{ color: '#60a5fa' }}>/api/cron/archie-utility</span>
              </div>
            </div>

            {/* Drive Intelligence Agent */}
            <div style={{
              background: '#1a1a1a',
              border: '2px solid #a855f7',
              borderRadius: '12px',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#a855f7',
                boxShadow: '0 0 10px #a855f7',
                animation: 'pulse 2s infinite'
              }}></div>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>📁</div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#a855f7', marginBottom: '8px' }}>
                Drive Intelligence
              </h3>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                File organization • Duplicate detection • Media discovery
              </p>
              <div style={{
                background: 'rgba(168, 85, 247, 0.1)',
                borderRadius: '6px',
                padding: '8px',
                marginBottom: '8px'
              }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Schedule</div>
                <div style={{ fontSize: '13px', color: '#a855f7', fontWeight: 'bold' }}>Every 6 hours</div>
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                Endpoint: <span style={{ color: '#60a5fa' }}>/api/cron/drive-intelligence</span>
              </div>
            </div>

            {/* Device Sync Agent */}
            <div style={{
              background: '#1a1a1a',
              border: '2px solid #f97316',
              borderRadius: '12px',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#f97316',
                boxShadow: '0 0 10px #f97316',
                animation: 'pulse 2s infinite'
              }}></div>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔄</div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f97316', marginBottom: '8px' }}>
                Device Sync
              </h3>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                Cross-device state • Conflict resolution • Continuity
              </p>
              <div style={{
                background: 'rgba(249, 115, 22, 0.1)',
                borderRadius: '6px',
                padding: '8px',
                marginBottom: '8px'
              }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Schedule</div>
                <div style={{ fontSize: '13px', color: '#f97316', fontWeight: 'bold' }}>Every 2 minutes</div>
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                Endpoint: <span style={{ color: '#60a5fa' }}>/api/cron/device-sync</span>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: data.lastActivity && (Date.now() - new Date(data.lastActivity).getTime()) < 3600000
              ? 'rgba(34, 197, 94, 0.1)'
              : 'rgba(239, 68, 68, 0.1)',
            border: data.lastActivity && (Date.now() - new Date(data.lastActivity).getTime()) < 3600000
              ? '1px solid rgba(34, 197, 94, 0.3)'
              : '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '12px', color: '#93c5fd', marginBottom: '8px', fontWeight: 'bold' }}>
              🔴 LIVE AGENT STATUS
            </div>
            <div style={{ fontSize: '14px', color: '#d1d5db', lineHeight: '1.6', marginBottom: '8px' }}>
              {data.lastActivity ? (
                <>
                  <strong>Last Activity:</strong>{' '}
                  {new Date(data.lastActivity).toLocaleString()}{' '}
                  ({Math.round((Date.now() - new Date(data.lastActivity).getTime()) / 60000)} minutes ago)
                </>
              ) : (
                <strong style={{ color: '#ef4444' }}>⚠️ No recent activity detected</strong>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              <strong>Total Work Done:</strong> {data.totalCompleted} tasks completed • {data.totalFindings} findings discovered
            </div>
          </div>
        </div>

        {/* MANUAL TRIGGER BUTTONS */}
        <AgentTriggerButtons
          agents={[
            { name: 'Autonomous Agent', endpoint: '/api/agent/cron?trigger=archie-now', color: '#22c55e' },
            { name: 'Archie Utility', endpoint: '/api/cron/archie-utility?trigger=manual', color: '#3b82f6' },
            { name: 'Drive Intelligence', endpoint: '/api/cron/drive-intelligence?trigger=manual', color: '#a855f7' },
            { name: 'Device Sync', endpoint: '/api/cron/device-sync?trigger=manual', color: '#f97316' }
          ]}
        />

        {/* RECENT LOGS / ACTIVITY FEED */}
        <div style={{
          background: '#1a1a1a',
          border: '3px solid #3b82f6',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '40px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#3b82f6',
            marginBottom: '20px',
            borderBottom: '2px solid rgba(59, 130, 246, 0.3)',
            paddingBottom: '12px'
          }}>
            📝 RECENT AGENT ACTIVITY ({data.recentLogs.length})
          </h2>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {data.recentLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>📭</div>
                <p>No recent agent activity</p>
              </div>
            ) : (
              data.recentLogs.map((log: any, i: number) => (
                <div key={i} style={{
                  background: log.log_level === 'error' ? 'rgba(239, 68, 68, 0.1)' : '#0f0f0f',
                  border: log.log_level === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '8px',
                  fontSize: '13px',
                  lineHeight: '1.5'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{
                      color: log.log_level === 'error' ? '#ef4444' : log.log_level === 'warn' ? '#f59e0b' : '#22c55e',
                      fontWeight: 'bold',
                      fontSize: '11px',
                      textTransform: 'uppercase'
                    }}>
                      {log.log_level}
                    </span>
                    <span style={{ color: '#6b7280', fontSize: '11px' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ color: '#d1d5db' }}>
                    {log.message}
                  </div>
                  {log.details && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#9ca3af',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {JSON.stringify(log.details, null, 2)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '2px solid #22c55e',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', color: '#22c55e', fontWeight: 'bold' }}>
              {data.totalCompleted}
            </div>
            <div style={{ color: '#86efac', fontSize: '14px' }}>✅ Completed (showing last 20)</div>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', color: '#3b82f6', fontWeight: 'bold' }}>
              {data.inProgress.length}
            </div>
            <div style={{ color: '#93c5fd', fontSize: '14px' }}>🔄 In Progress</div>
          </div>

          <div style={{
            background: 'rgba(249, 115, 22, 0.1)',
            border: '2px solid #f97316',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', color: '#f97316', fontWeight: 'bold' }}>
              {data.pending.length}
            </div>
            <div style={{ color: '#fdba74', fontSize: '14px' }}>⏳ Pending</div>
          </div>

          <div style={{
            background: 'rgba(168, 85, 247, 0.1)',
            border: '2px solid #a855f7',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', color: '#a855f7', fontWeight: 'bold' }}>
              {data.totalFindings}
            </div>
            <div style={{ color: '#d8b4fe', fontSize: '14px' }}>💡 All Findings</div>
          </div>
        </div>

        {/* Grid Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px'
        }}>

          {/* COMPLETED */}
          <div style={{
            background: '#1a1a1a',
            border: '3px solid #22c55e',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#22c55e',
              marginBottom: '20px',
              borderBottom: '2px solid rgba(34, 197, 94, 0.3)',
              paddingBottom: '12px'
            }}>
              ✅ COMPLETED ({data.completed.length})
            </h2>

            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {data.completed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
                  <p>No completed tasks yet</p>
                </div>
              ) : (
                data.completed.map((task: any, i: number) => (
                  <div key={i} style={{
                    background: '#0f0f0f',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      background: '#22c55e',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      display: 'inline-block',
                      marginBottom: '8px'
                    }}>
                      P{task.priority}
                    </div>
                    <h3 style={{
                      fontSize: '15px',
                      fontWeight: 'bold',
                      marginBottom: '10px',
                      color: 'white',
                      lineHeight: '1.4'
                    }}>
                      {task.title}
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      color: '#d1d5db',
                      lineHeight: '1.6',
                      marginBottom: '12px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {task.description || 'No description provided'}
                    </p>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: '#374151',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: '#22c55e'
                      }}></div>
                    </div>
                    {task.completed_at && (
                      <div style={{
                        fontSize: '11px',
                        color: '#6b7280',
                        marginTop: '8px'
                      }}>
                        Completed: {new Date(task.completed_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* IN PROGRESS */}
          <div style={{
            background: '#1a1a1a',
            border: '3px solid #3b82f6',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#3b82f6',
              marginBottom: '20px',
              borderBottom: '2px solid rgba(59, 130, 246, 0.3)',
              paddingBottom: '12px'
            }}>
              🔄 IN PROGRESS ({data.inProgress.length})
            </h2>

            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {data.inProgress.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔄</div>
                  <p>No active tasks</p>
                </div>
              ) : (
                data.inProgress.map((task: any, i: number) => {
                  // Calculate progress percentage
                  const metadata = task.metadata || {};
                  const completed = metadata.completed?.length || 0;
                  const remaining = metadata.remaining?.length || 0;
                  const total = completed + remaining;
                  const progress = total > 0
                    ? Math.round((completed / total) * 100)
                    : 0;

                  return (
                    <div key={i} style={{
                      background: '#0f0f0f',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        background: '#3b82f6',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        display: 'inline-block',
                        marginBottom: '8px'
                      }}>
                        P{task.priority} • ACTIVE
                      </div>
                      <h3 style={{
                        fontSize: '15px',
                        fontWeight: 'bold',
                        marginBottom: '10px',
                        color: 'white',
                        lineHeight: '1.4'
                      }}>
                        {task.title}
                      </h3>
                      <p style={{
                        fontSize: '14px',
                        color: '#d1d5db',
                        lineHeight: '1.6',
                        marginBottom: '12px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {task.description || 'No description provided'}
                      </p>

                      {/* Progress Bar */}
                      <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '6px',
                        padding: '10px',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '6px'
                        }}>
                          <span style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 'bold' }}>
                            Progress
                          </span>
                          <span style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 'bold' }}>
                            {progress}%
                          </span>
                        </div>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          background: '#1e293b',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${progress}%`,
                            height: '100%',
                            background: 'linear-gradient(to right, #3b82f6, #60a5fa)',
                            borderRadius: '4px',
                            transition: 'width 0.5s ease'
                          }}></div>
                        </div>
                        {total > 0 && (
                          <div style={{
                            fontSize: '11px',
                            color: '#64748b',
                            marginTop: '6px'
                          }}>
                            {completed} of {total} tasks complete
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* PENDING */}
          <div style={{
            background: '#1a1a1a',
            border: '3px solid #f97316',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#f97316',
              marginBottom: '20px',
              borderBottom: '2px solid rgba(249, 115, 22, 0.3)',
              paddingBottom: '12px'
            }}>
              ⏳ PENDING ({data.pending.length})
            </h2>

            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {data.pending.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>⏳</div>
                  <p>No pending tasks</p>
                </div>
              ) : (
                data.pending.map((task: any, i: number) => (
                  <div key={i} style={{
                    background: '#0f0f0f',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      background: '#f97316',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      display: 'inline-block',
                      marginBottom: '8px'
                    }}>
                      P{task.priority} • QUEUED
                    </div>
                    <h3 style={{
                      fontSize: '15px',
                      fontWeight: 'bold',
                      marginBottom: '10px',
                      color: 'white',
                      lineHeight: '1.4'
                    }}>
                      {task.title}
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      color: '#d1d5db',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {task.description || 'No description provided'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ALL FINDINGS */}
          <div style={{
            background: '#1a1a1a',
            border: '3px solid #a855f7',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#a855f7',
              marginBottom: '20px',
              borderBottom: '2px solid rgba(168, 85, 247, 0.3)',
              paddingBottom: '12px'
            }}>
              💡 ALL FINDINGS ({data.allFindings.length})
            </h2>

            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {data.allFindings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>💡</div>
                  <p>Archie is analyzing...</p>
                </div>
              ) : (
                data.allFindings.map((suggestion: any, i: number) => {
                  // Determine implementation approach based on type
                  const getImplementation = () => {
                    if (suggestion.finding_type === 'optimization') {
                      if (suggestion.title.includes('Cost')) {
                        return 'Enable OpenAI prompt caching in API calls';
                      } else if (suggestion.title.includes('Performance')) {
                        return 'Add streaming responses + Redis caching layer';
                      }
                    } else if (suggestion.finding_type === 'improvement') {
                      if (suggestion.description?.includes('error boundaries')) {
                        return 'Wrap components with ErrorBoundary';
                      } else if (suggestion.description?.includes('try-catch')) {
                        return 'Add try-catch to async functions';
                      } else if (suggestion.description?.includes('database queries')) {
                        return 'Profile queries + add indexes';
                      }
                    }
                    return 'Review and prioritize based on impact';
                  };

                  return (
                    <div key={i} style={{
                      background: '#0f0f0f',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        background: '#a855f7',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        display: 'inline-block',
                        marginBottom: '8px'
                      }}>
                        {suggestion.finding_type?.toUpperCase() || 'SUGGESTION'}
                      </div>
                      <h3 style={{
                        fontSize: '15px',
                        fontWeight: 'bold',
                        marginBottom: '10px',
                        color: 'white',
                        lineHeight: '1.4'
                      }}>
                        {suggestion.title}
                      </h3>
                      <p style={{
                        fontSize: '14px',
                        color: '#d1d5db',
                        lineHeight: '1.6',
                        marginBottom: '12px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {suggestion.description || 'No description provided'}
                      </p>

                      {/* Implementation Guidance */}
                      <div style={{
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                        borderRadius: '4px',
                        padding: '8px 10px',
                        marginTop: '8px'
                      }}>
                        <div style={{
                          fontSize: '10px',
                          color: '#a855f7',
                          fontWeight: 'bold',
                          marginBottom: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          → Implementation
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#c4b5fd',
                          lineHeight: '1.4'
                        }}>
                          {getImplementation()}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Minimal Footer */}
        <div style={{
          marginTop: '40px',
          textAlign: 'center',
          padding: '20px',
          borderTop: '1px solid #333'
        }}>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0' }}>
            Archie 🦉 • Autonomous Agent • Runs every 5 minutes • Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
