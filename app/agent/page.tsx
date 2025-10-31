/**
 * Archie 2.0 Dashboard - Clean Rebuild
 * Smart autonomous agent with human oversight for big changes
 */

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Archie 2.0 Dashboard | KimbleAI',
  description: 'Smart autonomous agent with human oversight'
};

async function getData() {
  // Get Archie 2.0 state
  const { data: archieState } = await supabase
    .from('archie_state')
    .select('*');

  // Get recent runs
  const { data: recentRuns } = await supabase
    .from('archie_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(10);

  // Get proposals needing approval
  const { data: pendingProposals } = await supabase
    .from('archie_proposals')
    .select('*')
    .eq('status', 'proposed')
    .order('priority_score', { ascending: false })
    .limit(20);

  // Get auto-approved today
  const { data: autoApprovedToday } = await supabase
    .from('archie_proposals')
    .select('*')
    .eq('status', 'approved')
    .eq('reviewed_by', 'archie-auto-approval')
    .gte('reviewed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('reviewed_at', { ascending: false });

  // Get recent health scores
  const { data: healthHistory } = await supabase
    .from('archie_health_history')
    .select('*')
    .order('measured_at', { ascending: false })
    .limit(7);

  // Calculate stats
  const totalCostToday = recentRuns
    ?.filter(r => new Date(r.started_at) > new Date(Date.now() - 24 * 60 * 60 * 1000))
    .reduce((sum, r) => sum + (r.cost_cents || 0), 0) || 0;

  const latestHealthScore = healthHistory?.[0]?.health_score || null;
  const previousHealthScore = healthHistory?.[1]?.health_score || null;
  const healthChange = latestHealthScore && previousHealthScore
    ? latestHealthScore - previousHealthScore
    : 0;

  return {
    archieEnabled: archieState?.find(s => s.key === 'archie_enabled')?.value || false,
    emergencyStop: archieState?.find(s => s.key === 'emergency_stop')?.value === true,
    recentRuns: recentRuns || [],
    pendingProposals: pendingProposals || [],
    autoApprovedToday: autoApprovedToday || [],
    healthScore: latestHealthScore,
    healthChange,
    totalCostToday,
    lastRun: recentRuns?.[0] || null
  };
}

export default async function Archie2Dashboard() {
  const data = await getData();

  const isHealthy = data.lastRun &&
    data.lastRun.status === 'completed' &&
    (Date.now() - new Date(data.lastRun.completed_at).getTime()) < 3600000; // 1 hour

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: 'white',
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Back to Home */}
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

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            fontSize: '60px',
            marginBottom: '10px',
            filter: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.6))'
          }}>
            🦉
          </div>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, #60a5fa, #34d399)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            Archie 2.0
          </h1>
          <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '4px' }}>
            Smart Autonomous Agent • Auto-executes small improvements • Asks for big changes
          </p>
          <p style={{ color: '#4b5563', fontSize: '12px' }}>
            Server-side rendered • Auto-updates every request
          </p>
        </div>

        {/* Status Card */}
        <div style={{
          background: isHealthy ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
          border: `2px solid ${isHealthy ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '30px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: isHealthy ? '#22c55e' : '#ef4444',
                marginBottom: '10px'
              }}>
                {data.emergencyStop ? '🛑 EMERGENCY STOP ACTIVE' :
                 !data.archieEnabled ? '⏸️ PAUSED' :
                 isHealthy ? '✅ HEALTHY' : '⚠️ INACTIVE'}
              </h2>
              <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.6' }}>
                {data.lastRun ? (
                  <>Last run: {new Date(data.lastRun.completed_at || data.lastRun.started_at).toLocaleString()}
                    ({Math.round((Date.now() - new Date(data.lastRun.completed_at || data.lastRun.started_at).getTime()) / 60000)} min ago)</>
                ) : (
                  'No runs yet - waiting for first execution'
                )}
              </p>
            </div>

            {/* Health Score */}
            {data.healthScore !== null && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>CODE HEALTH</div>
                <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#22c55e', lineHeight: '1' }}>
                  {data.healthScore}
                  <span style={{ fontSize: '24px', color: '#6b7280' }}>/100</span>
                </div>
                {data.healthChange !== 0 && (
                  <div style={{
                    fontSize: '14px',
                    color: data.healthChange > 0 ? '#22c55e' : '#ef4444',
                    marginTop: '4px'
                  }}>
                    {data.healthChange > 0 ? '↑' : '↓'} {Math.abs(data.healthChange)} from last check
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '30px'
        }}>

          {/* NEEDS APPROVAL */}
          <div style={{
            background: '#1a1a1a',
            border: data.pendingProposals.length > 0 ? '3px solid #f97316' : '2px solid #374151',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: data.pendingProposals.length > 0 ? '#f97316' : '#6b7280',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '28px' }}>🔔</span>
              NEEDS YOUR APPROVAL ({data.pendingProposals.length})
            </h2>

            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {data.pendingProposals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
                  <p>All clear! No approvals needed.</p>
                  <p style={{ fontSize: '12px', marginTop: '8px', color: '#4b5563' }}>
                    Small improvements are auto-executing
                  </p>
                </div>
              ) : (
                data.pendingProposals.map((proposal: any, i: number) => (
                  <div key={i} style={{
                    background: '#0f0f0f',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <span style={{
                        background: '#f97316',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {proposal.category?.toUpperCase().replace('_', ' ')}
                      </span>
                      <span style={{
                        background: proposal.severity === 'critical' ? '#ef4444' :
                                   proposal.severity === 'high' ? '#f97316' :
                                   proposal.severity === 'medium' ? '#eab308' : '#6b7280',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {proposal.severity?.toUpperCase()}
                      </span>
                    </div>

                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: 'white',
                      marginBottom: '8px',
                      lineHeight: '1.4'
                    }}>
                      {proposal.title}
                    </h3>

                    <p style={{
                      fontSize: '14px',
                      color: '#d1d5db',
                      lineHeight: '1.5',
                      marginBottom: '12px'
                    }}>
                      {proposal.description}
                    </p>

                    {proposal.files_affected && proposal.files_affected.length > 0 && (
                      <div style={{
                        fontSize: '12px',
                        color: '#9ca3af',
                        marginBottom: '12px'
                      }}>
                        📁 {proposal.files_affected.length} file{proposal.files_affected.length !== 1 ? 's' : ''} affected
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button style={{
                        background: '#22c55e',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}>
                        ✓ APPROVE
                      </button>
                      <button style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}>
                        ✗ REJECT
                      </button>
                      <button style={{
                        background: '#374151',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}>
                        👁️ DETAILS
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AUTO-APPROVED TODAY */}
          <div style={{
            background: '#1a1a1a',
            border: '2px solid #22c55e',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#22c55e',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '28px' }}>⚡</span>
              AUTO-APPROVED TODAY ({data.autoApprovedToday.length})
            </h2>

            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {data.autoApprovedToday.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>😴</div>
                  <p>No auto-improvements yet today</p>
                </div>
              ) : (
                data.autoApprovedToday.map((proposal: any, i: number) => (
                  <div key={i} style={{
                    background: '#0f0f0f',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      color: '#22c55e',
                      fontWeight: 'bold',
                      marginBottom: '4px'
                    }}>
                      ✓ {proposal.category?.toUpperCase().replace('_', ' ')}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#d1d5db',
                      lineHeight: '1.4'
                    }}>
                      {proposal.title}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#6b7280',
                      marginTop: '6px'
                    }}>
                      {new Date(proposal.reviewed_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RECENT ACTIVITY */}
          <div style={{
            background: '#1a1a1a',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#3b82f6',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '28px' }}>📊</span>
              RECENT RUNS ({data.recentRuns.length})
            </h2>

            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {data.recentRuns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>🤖</div>
                  <p>Waiting for first run...</p>
                </div>
              ) : (
                data.recentRuns.map((run: any, i: number) => (
                  <div key={i} style={{
                    background: '#0f0f0f',
                    border: `1px solid ${run.status === 'completed' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '12px',
                        color: run.status === 'completed' ? '#22c55e' : '#ef4444',
                        fontWeight: 'bold'
                      }}>
                        {run.agent_type?.toUpperCase().replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>
                        {new Date(run.started_at).toLocaleString()}
                      </span>
                    </div>
                    {run.summary && (
                      <div style={{ fontSize: '13px', color: '#d1d5db', marginBottom: '6px' }}>
                        {run.summary}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                      Duration: {Math.round((run.duration_ms || 0) / 1000)}s • Cost: ${((run.cost_cents || 0) / 100).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Cost Tracking */}
        <div style={{
          background: '#1a1a1a',
          border: '2px solid #a855f7',
          borderRadius: '12px',
          padding: '24px',
          marginTop: '30px',
          textAlign: 'center'
        }}>
          <h3 style={{ fontSize: '18px', color: '#a855f7', marginBottom: '10px' }}>
            💰 Cost Tracking
          </h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>
            ${(data.totalCostToday / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: '14px', color: '#9ca3af' }}>
            spent today • ${((1500 - data.totalCostToday) / 100).toFixed(2)} remaining of $15.00 daily limit
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          textAlign: 'center',
          padding: '20px',
          borderTop: '1px solid #333'
        }}>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0' }}>
            Archie 2.0 🦉 • Runs every 30 minutes • Last updated: {new Date().toLocaleString()}
          </p>
          <p style={{ fontSize: '11px', color: '#4b5563', marginTop: '8px' }}>
            Auto-executes small improvements • Asks permission for big changes
          </p>
        </div>
      </div>
    </div>
  );
}
