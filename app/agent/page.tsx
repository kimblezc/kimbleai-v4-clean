/**
 * Archie Dashboard - Simple Activity Log
 * Shows what Archie has been doing automatically
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

async function getArchieActivity() {
  try {
    // Get recent commits by Archie
    const commits = execSync(
      'git log --author="Archie" --pretty=format:"%h|%s|%ar|%b" -20',
      { encoding: 'utf-8', cwd: process.cwd() }
    ).toString();

    const activities = commits.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, subject, time, body] = line.split('|');
        return { hash, subject, time, body: body || '' };
      });

    return {
      recentActivities: activities,
      totalFixes: activities.length,
      lastRun: activities[0]?.time || 'Never'
    };
  } catch (error) {
    return {
      recentActivities: [],
      totalFixes: 0,
      lastRun: 'Never'
    };
  }
}

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
            Archie
          </h1>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            Autonomous Repository Coding & Housekeeping Intelligence Engine
          </p>
          <p style={{ color: '#4b5563', fontSize: '14px', marginTop: '8px' }}>
            Automatically fixes linting, dead code, type errors, and updates dependencies
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
            <div style={{ fontSize: '16px', color: '#3b82f6', fontWeight: 'bold' }}>
              {data.lastRun}
            </div>
            <div style={{ color: '#93c5fd', fontSize: '14px' }}>Last Run</div>
          </div>

          <div style={{
            background: '#1a1a1a',
            border: '2px solid #a855f7',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '16px', color: '#a855f7', fontWeight: 'bold' }}>
              Every Hour
            </div>
            <div style={{ color: '#d8b4fe', fontSize: '14px' }}>Schedule</div>
          </div>
        </div>

        {/* What Archie Does */}
        <div style={{
          background: '#1a1a1a',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '30px'
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#f59e0b',
            marginBottom: '16px'
          }}>
            ⚡ What Archie Does
          </h2>
          <div style={{ color: '#d1d5db', fontSize: '14px', lineHeight: '1.8' }}>
            <div style={{ marginBottom: '8px' }}>✓ Fixes linting errors automatically</div>
            <div style={{ marginBottom: '8px' }}>✓ Removes unused imports and dead code</div>
            <div style={{ marginBottom: '8px' }}>✓ Updates patch-level dependencies (1.2.3 → 1.2.4)</div>
            <div style={{ marginBottom: '8px' }}>✓ Fixes simple TypeScript errors</div>
            <div style={{ marginBottom: '8px' }}>✓ Commits changes with detailed messages</div>
            <div style={{ marginBottom: '8px' }}>✓ Runs every hour automatically</div>
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
            📜 Recent Activity ({data.recentActivities.length})
          </h2>

          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {data.recentActivities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>😴</div>
                <p>No activity yet - Archie is waiting for the first run</p>
                <p style={{ fontSize: '12px', marginTop: '8px', color: '#4b5563' }}>
                  Trigger manually: <code style={{ background: '#333', padding: '2px 6px', borderRadius: '4px' }}>/api/archie/run?trigger=manual</code>
                </p>
              </div>
            ) : (
              data.recentActivities.map((activity, i) => (
                <div key={i} style={{
                  background: '#0f0f0f',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <code style={{
                      fontSize: '12px',
                      color: '#22c55e',
                      background: '#1a1a1a',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {activity.hash}
                    </code>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {activity.time}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '15px',
                    color: 'white',
                    fontWeight: 'bold',
                    marginBottom: '8px'
                  }}>
                    {activity.subject}
                  </div>
                  {activity.body && (
                    <div style={{
                      fontSize: '13px',
                      color: '#9ca3af',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace'
                    }}>
                      {activity.body}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Manual Trigger Button */}
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
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
            }}
          >
            🦉 Run Archie Now
          </a>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
            Manually trigger a maintenance run
          </p>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          textAlign: 'center',
          padding: '20px',
          borderTop: '1px solid #333'
        }}>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0' }}>
            Archie runs automatically every hour • No approvals needed • Just gets stuff done
          </p>
        </div>
      </div>
    </div>
  );
}
