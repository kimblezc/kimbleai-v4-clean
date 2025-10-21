/**
 * Archie Dashboard - Brand New Build
 * Server-side rendered, no caching
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Archie Dashboard | KimbleAI',
  description: 'Autonomous agent dashboard'
};

async function getData() {
  // Fetch tasks
  const { data: tasks } = await supabase
    .from('agent_tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  // Fetch findings
  const { data: findings } = await supabase
    .from('agent_findings')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(50);

  return {
    completed: tasks?.filter(t => t.status === 'completed') || [],
    inProgress: tasks?.filter(t => t.status === 'in_progress') || [],
    pending: tasks?.filter(t => t.status === 'pending') || [],
    suggestions: findings?.filter(f =>
      f.finding_type === 'improvement' ||
      f.finding_type === 'optimization' ||
      f.severity === 'low'
    ) || []
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
      {/* Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>🦉</div>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, #60a5fa, #34d399)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '10px'
          }}>
            Archie's Dashboard
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '18px' }}>
            NEW BUILD - Auto-updates every request
          </p>
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
              {data.completed.length}
            </div>
            <div style={{ color: '#86efac', fontSize: '14px' }}>✅ Completed</div>
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
              {data.suggestions.length}
            </div>
            <div style={{ color: '#d8b4fe', fontSize: '14px' }}>💡 Suggestions</div>
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
                      fontSize: '16px',
                      fontWeight: 'bold',
                      marginBottom: '8px',
                      color: 'white'
                    }}>
                      {task.title}
                    </h3>
                    <p style={{
                      fontSize: '13px',
                      color: '#9ca3af',
                      lineHeight: '1.5',
                      marginBottom: '12px'
                    }}>
                      {task.description}
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
                data.inProgress.map((task: any, i: number) => (
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
                      fontSize: '16px',
                      fontWeight: 'bold',
                      marginBottom: '8px',
                      color: 'white'
                    }}>
                      {task.title}
                    </h3>
                    <p style={{
                      fontSize: '13px',
                      color: '#9ca3af',
                      lineHeight: '1.5'
                    }}>
                      {task.description}
                    </p>
                  </div>
                ))
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
                      fontSize: '16px',
                      fontWeight: 'bold',
                      marginBottom: '8px',
                      color: 'white'
                    }}>
                      {task.title}
                    </h3>
                    <p style={{
                      fontSize: '13px',
                      color: '#9ca3af',
                      lineHeight: '1.5'
                    }}>
                      {task.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SUGGESTIONS */}
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
              💡 SUGGESTIONS ({data.suggestions.length})
            </h2>

            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {data.suggestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>💡</div>
                  <p>Archie is analyzing...</p>
                </div>
              ) : (
                data.suggestions.map((suggestion: any, i: number) => (
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
                      fontSize: '16px',
                      fontWeight: 'bold',
                      marginBottom: '8px',
                      color: 'white'
                    }}>
                      {suggestion.title}
                    </h3>
                    <p style={{
                      fontSize: '13px',
                      color: '#9ca3af',
                      lineHeight: '1.5'
                    }}>
                      {suggestion.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{
          marginTop: '60px',
          textAlign: 'center',
          padding: '30px',
          background: '#1a1a1a',
          borderRadius: '12px',
          border: '1px solid #333'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🦉</div>
          <h3 style={{ fontSize: '24px', marginBottom: '10px', color: 'white' }}>
            About Archie
          </h3>
          <p style={{ color: '#9ca3af', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto' }}>
            Archie is your autonomous agent - a wise horned owl who runs every 5 minutes.
            He monitors your system, fixes bugs, optimizes performance, and works toward your project goals.
          </p>
          <div style={{
            marginTop: '20px',
            fontSize: '12px',
            color: '#6b7280'
          }}>
            Last updated: {new Date().toLocaleString()} • Server-side rendered
          </div>
        </div>
      </div>
    </div>
  );
}
