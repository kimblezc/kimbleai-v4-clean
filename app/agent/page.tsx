/**
 * Archie Dashboard - Comprehensive Activity Log
 * Shows detailed logging of what Archie has done
 */

import Link from 'next/link';
import { execSync } from 'child_process';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Archie Dashboard | KimbleAI',
  description: 'Autonomous code maintenance activity log'
};

interface Fix {
  type: string;
  description: string;
}

interface Activity {
  hash: string;
  subject: string;
  time: string;
  body: string;
  fixes: Fix[];
}

async function getArchieActivity() {
  try {
    // Get recent commits by Archie
    const commits = execSync(
      'git log --author="Archie" --pretty=format:"%h|%s|%ar|%b" -20',
      { encoding: 'utf-8', cwd: process.cwd() }
    ).toString();

    const activities: Activity[] = commits.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, subject, time, ...bodyParts] = line.split('|');
        const body = bodyParts.join('|');

        // Parse fixes from body
        const fixes: Fix[] = [];
        const lines = body.split('\n');
        for (const line of lines) {
          const match = line.match(/^-\s*(lint|dead_code|type_error|dependency|optimization):\s*(.+)$/);
          if (match) {
            fixes.push({
              type: match[1],
              description: match[2].trim()
            });
          }
        }

        return { hash, subject, time, body: body || '', fixes };
      });

    // Calculate statistics
    const totalFixes = activities.reduce((sum, a) => sum + a.fixes.length, 0);
    const fixTypes: Record<string, number> = {};
    activities.forEach(a => {
      a.fixes.forEach(f => {
        fixTypes[f.type] = (fixTypes[f.type] || 0) + 1;
      });
    });

    return {
      recentActivities: activities,
      totalCommits: activities.length,
      totalFixes,
      fixTypes,
      lastRun: activities[0]?.time || 'Never'
    };
  } catch (error) {
    return {
      recentActivities: [],
      totalCommits: 0,
      totalFixes: 0,
      fixTypes: {},
      lastRun: 'Never'
    };
  }
}

const fixTypeColors: Record<string, { bg: string; border: string; text: string }> = {
  lint: { bg: '#1a1a2e', border: '#3b82f6', text: '#60a5fa' },
  dead_code: { bg: '#1a1a2e', border: '#a855f7', text: '#c084fc' },
  type_error: { bg: '#1a1a2e', border: '#ef4444', text: '#f87171' },
  dependency: { bg: '#1a1a2e', border: '#22c55e', text: '#4ade80' },
  optimization: { bg: '#1a1a2e', border: '#f59e0b', text: '#fbbf24' }
};

const fixTypeIcons: Record<string, string> = {
  lint: '🔧',
  dead_code: '🧹',
  type_error: '🐛',
  dependency: '📦',
  optimization: '⚡'
};

const fixTypeNames: Record<string, string> = {
  lint: 'Linting',
  dead_code: 'Dead Code',
  type_error: 'Type Error',
  dependency: 'Dependency',
  optimization: 'Optimization'
};

export default async function ArchieDashboard() {
  const data = await getArchieActivity();

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

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
            Archie Activity Log
          </h1>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            Autonomous Repository Coding & Housekeeping Intelligence Engine
          </p>
          <p style={{ color: '#4b5563', fontSize: '14px', marginTop: '8px' }}>
            Every fix is logged, tracked, and committed to git
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
              {data.totalFixes}
            </div>
            <div style={{ color: '#86efac', fontSize: '14px' }}>Total Fixes</div>
          </div>

          <div style={{
            background: '#1a1a1a',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', color: '#3b82f6', fontWeight: 'bold' }}>
              {data.totalCommits}
            </div>
            <div style={{ color: '#93c5fd', fontSize: '14px' }}>Commits</div>
          </div>

          <div style={{
            background: '#1a1a1a',
            border: '2px solid #a855f7',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '16px', color: '#a855f7', fontWeight: 'bold' }}>
              {data.lastRun}
            </div>
            <div style={{ color: '#d8b4fe', fontSize: '14px' }}>Last Run</div>
          </div>

          <div style={{
            background: '#1a1a1a',
            border: '2px solid #f59e0b',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '16px', color: '#f59e0b', fontWeight: 'bold' }}>
              Every Hour
            </div>
            <div style={{ color: '#fbbf24', fontSize: '14px' }}>Schedule</div>
          </div>
        </div>

        {/* Fix Types Breakdown */}
        {Object.keys(data.fixTypes).length > 0 && (
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
              marginBottom: '16px'
            }}>
              📊 Fix Types Breakdown
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '12px'
            }}>
              {Object.entries(data.fixTypes).map(([type, count]) => (
                <div key={type} style={{
                  background: fixTypeColors[type]?.bg || '#1a1a2e',
                  border: `1px solid ${fixTypeColors[type]?.border || '#666'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>
                    {fixTypeIcons[type] || '🔧'}
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: fixTypeColors[type]?.text || '#fff',
                    marginBottom: '4px'
                  }}>
                    {count}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {fixTypeNames[type] || type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How to Read the Logs (Layman Explanation) */}
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
            💡 How to Read the Logs (Plain English)
          </h2>
          <div style={{ color: '#d1d5db', fontSize: '14px', lineHeight: '1.8' }}>
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: '#8b5cf6' }}>Each box below = 1 time Archie ran and found problems</strong>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#22c55e', fontWeight: 'bold' }}>Green code (abc1234)</span> = The unique ID for this run. You can use this to see exactly what changed in git.
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#6b7280', fontWeight: 'bold' }}>"2 hours ago"</span> = When Archie did this work.
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontWeight: 'bold' }}>🔧 Linting</span> = Fixed code formatting (missing semicolons, spacing, etc.)
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontWeight: 'bold' }}>🧹 Dead Code</span> = Removed unused code that wasn't doing anything
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontWeight: 'bold' }}>🐛 Type Error</span> = Fixed TypeScript errors (wrong data types)
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontWeight: 'bold' }}>📦 Dependency</span> = Updated libraries to newer patch versions (security fixes, bug fixes)
            </div>
            <div style={{ marginTop: '16px', padding: '12px', background: '#0a0a0a', borderRadius: '6px', border: '1px solid #333' }}>
              <strong style={{ color: '#8b5cf6' }}>Bottom line:</strong> Each entry shows automatic code maintenance that would normally require a developer to do manually. Archie does it for you, tests it works, and saves it to git.
            </div>
          </div>
        </div>

        {/* What Gets Logged */}
        <div style={{
          background: '#1a1a1a',
          border: '2px solid #10b981',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '30px'
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#10b981',
            marginBottom: '16px'
          }}>
            📝 What Gets Logged (Technical Details)
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            color: '#d1d5db',
            fontSize: '14px'
          }}>
            <div>
              <div style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '8px' }}>
                📋 For Each Run:
              </div>
              <div style={{ lineHeight: '1.8' }}>
                • When Archie ran<br />
                • Issues found<br />
                • Issues fixed<br />
                • Commit hash<br />
                • Summary
              </div>
            </div>
            <div>
              <div style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '8px' }}>
                🔧 For Each Fix:
              </div>
              <div style={{ lineHeight: '1.8' }}>
                • File affected<br />
                • Type of issue<br />
                • Description<br />
                • AI model used<br />
                • Success/failure
              </div>
            </div>
            <div>
              <div style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '8px' }}>
                🎯 Accessible Via:
              </div>
              <div style={{ lineHeight: '1.8' }}>
                • Git commits<br />
                • This dashboard<br />
                • Railway logs<br />
                • API endpoint<br />
                • Console output
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
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
            marginBottom: '20px'
          }}>
            📜 Recent Activity Log ({data.recentActivities.length} commits)
          </h2>

          <div style={{ maxHeight: '800px', overflowY: 'auto' }}>
            {data.recentActivities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>😴</div>
                <p>No activity yet - Archie is waiting for the first run</p>
                <p style={{ fontSize: '12px', marginTop: '8px', color: '#4b5563' }}>
                  Runs automatically every hour • Next run: top of the hour
                </p>
              </div>
            ) : (
              data.recentActivities.map((activity, i) => (
                <div key={i} style={{
                  background: '#0f0f0f',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '16px'
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
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
                        {activity.hash}
                      </code>
                      {activity.fixes.length > 0 && (
                        <span style={{
                          fontSize: '12px',
                          background: '#22c55e',
                          color: '#000',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>
                          {activity.fixes.length} fix{activity.fixes.length !== 1 ? 'es' : ''}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                      {activity.time}
                    </span>
                  </div>

                  {/* Commit Subject */}
                  <div style={{
                    fontSize: '16px',
                    color: 'white',
                    fontWeight: 'bold',
                    marginBottom: '16px'
                  }}>
                    {activity.subject}
                  </div>

                  {/* Individual Fixes */}
                  {activity.fixes.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      {activity.fixes.map((fix, j) => (
                        <div key={j} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          marginBottom: '10px',
                          padding: '10px',
                          background: fixTypeColors[fix.type]?.bg || '#1a1a2e',
                          border: `1px solid ${fixTypeColors[fix.type]?.border || '#666'}`,
                          borderRadius: '6px'
                        }}>
                          <span style={{ fontSize: '18px', lineHeight: '1' }}>
                            {fixTypeIcons[fix.type] || '🔧'}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '11px',
                              fontWeight: 'bold',
                              color: fixTypeColors[fix.type]?.text || '#fff',
                              marginBottom: '4px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              {fixTypeNames[fix.type] || fix.type}
                            </div>
                            <div style={{
                              fontSize: '13px',
                              color: '#d1d5db',
                              lineHeight: '1.5'
                            }}>
                              {fix.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Full Body (if no parsed fixes) */}
                  {activity.fixes.length === 0 && activity.body && (
                    <div style={{
                      fontSize: '13px',
                      color: '#9ca3af',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      background: '#0a0a0a',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #333'
                    }}>
                      {activity.body}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Manual Trigger */}
        <div style={{
          marginTop: '30px',
          textAlign: 'center'
        }}>
          <a
            href="/api/archie/run?trigger=manual"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #22c55e, #10b981)',
              color: 'white',
              padding: '14px 28px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
            }}
          >
            🦉 Run Archie Now
          </a>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '10px' }}>
            Manually trigger a maintenance run (takes 1-2 minutes)
          </p>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          textAlign: 'center',
          padding: '20px',
          borderTop: '1px solid #333'
        }}>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px 0' }}>
            Archie runs automatically every hour • All changes committed to git
          </p>
          <p style={{ fontSize: '12px', color: '#4b5563', margin: '0' }}>
            View detailed logging guide: <code style={{ background: '#333', padding: '2px 6px', borderRadius: '4px' }}>ARCHIE-LOGGING.md</code>
          </p>
        </div>
      </div>
    </div>
  );
}
