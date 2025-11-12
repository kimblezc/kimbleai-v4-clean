/**
 * Archie V2 Dashboard - Enhanced Database-Driven Oversight
 * Comprehensive tracking with runs, issues, fixes, costs, and learning insights
 */

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Archie V2 Dashboard | KimbleAI',
  description: 'Enhanced autonomous code maintenance with AI tracking and learning'
};

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Run {
  id: string;
  started_at: string;
  completed_at: string;
  status: string;
  trigger_type: string;
  tasks_found: number;
  tasks_completed: number;
  tasks_skipped: number;
  tasks_failed: number;
  total_cost_usd: string;
  ai_model_used: string;
  commit_hash: string;
  summary: string;
}

interface Issue {
  id: string;
  run_id: string;
  fingerprint: string;
  type: string;
  severity: string;
  priority: number;
  file_path: string;
  issue_description: string;
  status: string;
  fix_applied: string;
  fix_strategy: string;
  times_seen: number;
}

interface FixAttempt {
  id: string;
  issue_id: string;
  attempt_number: number;
  strategy: string;
  ai_model_used: string;
  success: boolean;
  cost_usd: string;
  duration_ms: number;
}

interface DashboardData {
  recentRuns: Run[];
  totalRuns: number;
  totalIssuesFound: number;
  totalIssuesFixed: number;
  totalCost: number;
  successRate: number;
  recentIssues: Issue[];
  topFixStrategies: Array<{ strategy: string; count: number; successRate: number }>;
}

async function getDashboardData(): Promise<DashboardData> {
  try {
    // Get recent runs (last 10)
    const { data: runs, error: runsError } = await supabase
      .from('archie_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);

    if (runsError) {
      console.error('Error fetching runs:', runsError);
      return getEmptyData();
    }

    // Get aggregate stats
    const { data: allRuns } = await supabase
      .from('archie_runs')
      .select('tasks_found, tasks_completed, total_cost_usd');

    const totalRuns = allRuns?.length || 0;
    const totalIssuesFound = allRuns?.reduce((sum, r) => sum + (r.tasks_found || 0), 0) || 0;
    const totalIssuesFixed = allRuns?.reduce((sum, r) => sum + (r.tasks_completed || 0), 0) || 0;
    const totalCost = allRuns?.reduce((sum, r) => sum + parseFloat(r.total_cost_usd || '0'), 0) || 0;
    const successRate = totalIssuesFound > 0 ? (totalIssuesFixed / totalIssuesFound) * 100 : 0;

    // Get recent issues (last 20)
    const { data: issues } = await supabase
      .from('archie_issues')
      .select('*')
      .order('first_seen_at', { ascending: false })
      .limit(20);

    // Get fix attempt statistics
    const { data: fixAttempts } = await supabase
      .from('archie_fix_attempts')
      .select('strategy, success');

    // Calculate top fix strategies
    const strategyStats: Record<string, { total: number; success: number }> = {};
    fixAttempts?.forEach((attempt: any) => {
      if (!strategyStats[attempt.strategy]) {
        strategyStats[attempt.strategy] = { total: 0, success: 0 };
      }
      strategyStats[attempt.strategy].total++;
      if (attempt.success) {
        strategyStats[attempt.strategy].success++;
      }
    });

    const topFixStrategies = Object.entries(strategyStats)
      .map(([strategy, stats]) => ({
        strategy,
        count: stats.total,
        successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    return {
      recentRuns: runs || [],
      totalRuns,
      totalIssuesFound,
      totalIssuesFixed,
      totalCost,
      successRate,
      recentIssues: issues || [],
      topFixStrategies
    };
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return getEmptyData();
  }
}

function getEmptyData(): DashboardData {
  return {
    recentRuns: [],
    totalRuns: 0,
    totalIssuesFound: 0,
    totalIssuesFixed: 0,
    totalCost: 0,
    successRate: 0,
    recentIssues: [],
    topFixStrategies: []
  };
}

const issueTypeColors: Record<string, { bg: string; border: string; text: string }> = {
  lint: { bg: '#1a1a2e', border: '#3b82f6', text: '#60a5fa' },
  dead_code: { bg: '#1a1a2e', border: '#a855f7', text: '#c084fc' },
  type_error: { bg: '#1a1a2e', border: '#ef4444', text: '#f87171' },
  dependency: { bg: '#1a1a2e', border: '#22c55e', text: '#4ade80' },
  optimization: { bg: '#1a1a2e', border: '#f59e0b', text: '#fbbf24' },
  security: { bg: '#1a1a2e', border: '#dc2626', text: '#f87171' },
  performance: { bg: '#1a1a2e', border: '#06b6d4', text: '#22d3ee' }
};

const issueTypeIcons: Record<string, string> = {
  lint: '🔧',
  dead_code: '🧹',
  type_error: '🐛',
  dependency: '📦',
  optimization: '⚡',
  security: '🔒',
  performance: '🚀'
};

const severityColors: Record<string, string> = {
  critical: '#dc2626',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#10b981'
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default async function ArchieV2Dashboard() {
  const data = await getDashboardData();

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
            color: 'white'
          }}>
            20
          </div>
          <div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #4a9eff 0%, #667eea 50%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              KimbleAI
            </div>
            <div style={{ fontSize: '10px', color: '#888' }}>
              ROLL FOR INSIGHT
            </div>
          </div>
        </Link>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '60px', marginBottom: '10px' }}>🦉</div>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, #60a5fa, #34d399)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            Archie V2 Dashboard
          </h1>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            Enhanced AI-Powered Code Maintenance
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '12px',
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #22c55e, #10b981)',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold'
          }}>
            <span>⚡</span>
            <span>Database Tracking • Multi-Model AI • Learning System</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            background: '#1a1a1a',
            border: '2px solid #22c55e',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', color: '#22c55e', fontWeight: 'bold' }}>
              {data.totalIssuesFixed}
            </div>
            <div style={{ color: '#86efac', fontSize: '14px' }}>Issues Fixed</div>
          </div>

          <div style={{
            background: '#1a1a1a',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', color: '#3b82f6', fontWeight: 'bold' }}>
              {data.totalRuns}
            </div>
            <div style={{ color: '#93c5fd', fontSize: '14px' }}>Total Runs</div>
          </div>

          <div style={{
            background: '#1a1a1a',
            border: '2px solid #a855f7',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', color: '#a855f7', fontWeight: 'bold' }}>
              {data.successRate.toFixed(0)}%
            </div>
            <div style={{ color: '#d8b4fe', fontSize: '14px' }}>Success Rate</div>
          </div>

          <div style={{
            background: '#1a1a1a',
            border: '2px solid #f59e0b',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', color: '#f59e0b', fontWeight: 'bold' }}>
              ${data.totalCost.toFixed(4)}
            </div>
            <div style={{ color: '#fbbf24', fontSize: '14px' }}>Total Cost</div>
          </div>

          <div style={{
            background: '#1a1a1a',
            border: '2px solid #10b981',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', color: '#10b981', fontWeight: 'bold' }}>
              {data.recentRuns[0] ? formatTimeAgo(data.recentRuns[0].started_at) : 'Never'}
            </div>
            <div style={{ color: '#34d399', fontSize: '14px' }}>Last Run</div>
          </div>
        </div>

        {/* V2 Features Highlight */}
        <div style={{
          background: '#1a1a1a',
          border: '2px solid #8b5cf6',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '30px'
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#8b5cf6',
            marginBottom: '16px'
          }}>
            ✨ V2 Enhancements
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            fontSize: '14px'
          }}>
            <div style={{ lineHeight: '1.8' }}>
              <div style={{ color: '#8b5cf6', fontWeight: 'bold', marginBottom: '8px' }}>
                🗄️ Database Tracking:
              </div>
              <div style={{ color: '#d1d5db' }}>
                • Full run history in PostgreSQL<br />
                • Issue deduplication via fingerprints<br />
                • Fix attempt audit trails<br />
                • Cost and performance metrics
              </div>
            </div>
            <div style={{ lineHeight: '1.8' }}>
              <div style={{ color: '#8b5cf6', fontWeight: 'bold', marginBottom: '8px' }}>
                🤖 Multi-Model AI:
              </div>
              <div style={{ color: '#d1d5db' }}>
                • GPT-4o-mini for simple fixes<br />
                • GPT-4o for standard issues<br />
                • Claude 3.5 Sonnet for complex<br />
                • Progressive strategy escalation
              </div>
            </div>
            <div style={{ lineHeight: '1.8' }}>
              <div style={{ color: '#8b5cf6', fontWeight: 'bold', marginBottom: '8px' }}>
                🧠 Learning System:
              </div>
              <div style={{ color: '#d1d5db' }}>
                • Remembers successful strategies<br />
                • Skips known unfixable issues<br />
                • Pattern recognition<br />
                • Cost optimization over time
              </div>
            </div>
          </div>
        </div>

        {/* Recent Runs */}
        <div style={{
          background: '#1a1a1a',
          border: '2px solid #22c55e',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '30px'
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#22c55e',
            marginBottom: '20px'
          }}>
            📊 Recent Runs ({data.recentRuns.length})
          </h2>

          {data.recentRuns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>😴</div>
              <p>No V2 runs yet - waiting for first execution</p>
              <p style={{ fontSize: '12px', marginTop: '8px', color: '#4b5563' }}>
                Runs automatically every hour or trigger manually below
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {data.recentRuns.map((run) => (
                <div key={run.id} style={{
                  background: '#0f0f0f',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  {/* Run Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #333'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <code style={{
                        fontSize: '13px',
                        color: '#22c55e',
                        background: '#1a1a1a',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontWeight: 'bold'
                      }}>
                        {run.commit_hash || run.id.slice(0, 8)}
                      </code>
                      <span style={{
                        fontSize: '12px',
                        background: run.status === 'completed' ? '#22c55e' : '#ef4444',
                        color: '#000',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        {run.status}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        background: '#3b82f6',
                        color: '#000',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: 'bold'
                      }}>
                        {run.trigger_type}
                      </span>
                    </div>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                      {formatTimeAgo(run.started_at)}
                    </span>
                  </div>

                  {/* Run Stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', color: '#3b82f6', fontWeight: 'bold' }}>
                        {run.tasks_found}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Found</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', color: '#22c55e', fontWeight: 'bold' }}>
                        {run.tasks_completed}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Fixed</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', color: '#f59e0b', fontWeight: 'bold' }}>
                        {run.tasks_skipped}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Skipped</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', color: '#ef4444', fontWeight: 'bold' }}>
                        {run.tasks_failed}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Failed</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', color: '#a855f7', fontWeight: 'bold' }}>
                        ${parseFloat(run.total_cost_usd || '0').toFixed(4)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Cost</div>
                    </div>
                  </div>

                  {/* AI Model Used */}
                  {run.ai_model_used && (
                    <div style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      marginBottom: '8px'
                    }}>
                      🤖 Model: <span style={{ color: '#d1d5db', fontWeight: 'bold' }}>{run.ai_model_used}</span>
                    </div>
                  )}

                  {/* Summary */}
                  {run.summary && (
                    <div style={{
                      fontSize: '13px',
                      color: '#d1d5db',
                      background: '#0a0a0a',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #333'
                    }}>
                      {run.summary}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Issues */}
        {data.recentIssues.length > 0 && (
          <div style={{
            background: '#1a1a1a',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '30px'
          }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#ef4444',
              marginBottom: '20px'
            }}>
              🐛 Recent Issues ({data.recentIssues.length})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.recentIssues.slice(0, 10).map((issue) => (
                <div key={issue.id} style={{
                  background: issueTypeColors[issue.type]?.bg || '#1a1a2e',
                  border: `1px solid ${issueTypeColors[issue.type]?.border || '#666'}`,
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>
                        {issueTypeIcons[issue.type] || '🔧'}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: issueTypeColors[issue.type]?.text || '#fff',
                        textTransform: 'uppercase'
                      }}>
                        {issue.type}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: severityColors[issue.severity] || '#666',
                        color: '#fff',
                        fontWeight: 'bold'
                      }}>
                        {issue.severity}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: '#333',
                        color: '#fbbf24',
                        fontWeight: 'bold'
                      }}>
                        P{issue.priority}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: issue.status === 'fixed' ? '#22c55e' : '#ef4444',
                      color: '#fff',
                      fontWeight: 'bold'
                    }}>
                      {issue.status}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '13px',
                    color: '#d1d5db',
                    marginBottom: '8px'
                  }}>
                    {issue.issue_description}
                  </div>

                  <div style={{
                    fontSize: '11px',
                    color: '#6b7280',
                    fontFamily: 'monospace'
                  }}>
                    📁 {issue.file_path}
                    {issue.times_seen > 1 && (
                      <span style={{ marginLeft: '12px', color: '#f59e0b' }}>
                        • Seen {issue.times_seen}x
                      </span>
                    )}
                  </div>

                  {issue.fix_strategy && (
                    <div style={{
                      fontSize: '11px',
                      color: '#22c55e',
                      marginTop: '8px'
                    }}>
                      ✓ Strategy: {issue.fix_strategy}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Fix Strategies */}
        {data.topFixStrategies.length > 0 && (
          <div style={{
            background: '#1a1a1a',
            border: '2px solid #6366f1',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '30px'
          }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#6366f1',
              marginBottom: '20px'
            }}>
              🎯 Top Fix Strategies
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {data.topFixStrategies.map((strategy, i) => (
                <div key={i} style={{
                  background: '#0f0f0f',
                  border: '1px solid #6366f1',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '24px',
                    color: '#6366f1',
                    fontWeight: 'bold',
                    marginBottom: '4px'
                  }}>
                    {strategy.successRate.toFixed(0)}%
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: '#d1d5db',
                    fontWeight: 'bold',
                    marginBottom: '4px',
                    textTransform: 'uppercase'
                  }}>
                    {strategy.strategy}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#9ca3af'
                  }}>
                    {strategy.count} attempts
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginTop: '30px'
        }}>
          <a
            href="/api/archie/run?trigger=manual&v2=true"
            style={{
              display: 'block',
              background: 'linear-gradient(135deg, #22c55e, #10b981)',
              color: 'white',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              textDecoration: 'none',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
            }}
          >
            🦉 Run Archie V2 Now
          </a>

          <a
            href="/api/archie/metrics?days=7"
            target="_blank"
            style={{
              display: 'block',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              textDecoration: 'none',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            📊 View Metrics API
          </a>

          <a
            href="/api/archie/issues?page=1&limit=20"
            target="_blank"
            style={{
              display: 'block',
              background: 'linear-gradient(135deg, #a855f7, #9333ea)',
              color: 'white',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              textDecoration: 'none',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)'
            }}
          >
            🐛 View Issues API
          </a>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          textAlign: 'center',
          padding: '20px',
          borderTop: '1px solid #333'
        }}>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px 0' }}>
            Archie V2 runs automatically every hour • Full database tracking enabled
          </p>
          <p style={{ fontSize: '12px', color: '#4b5563', margin: '0' }}>
            Database: 5 tables (runs, issues, fix_attempts, metrics, learning) • Multi-model AI strategy • Cost optimized
          </p>
        </div>
      </div>
    </div>
  );
}
