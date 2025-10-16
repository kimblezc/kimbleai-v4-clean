'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface CostStats {
  hourly: { used: number; limit: number; percentage: number };
  daily: { used: number; limit: number; percentage: number };
  monthly: { used: number; limit: number; percentage: number };
  recentCalls: Array<{
    id: string;
    timestamp: string;
    model: string;
    endpoint: string;
    cost: number;
    tokens: { input: number; output: number };
  }>;
}

export default function CostsPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<CostStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCostStats = async () => {
    if (!session?.user?.email) {
      setError('No user session found');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the user UUID from the database first
      const userResponse = await fetch(`/api/users?email=${encodeURIComponent(session.user.email)}`);
      const userData = await userResponse.json();

      if (!userData.success || !userData.user?.id) {
        setError('Could not find user in database');
        return;
      }

      const userId = userData.user.id;

      // Now fetch cost stats with the actual user UUID
      const response = await fetch(`/api/costs?action=summary&userId=${userId}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadCostStats();
      const interval = setInterval(loadCostStats, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [session]);

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f0f', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Please sign in to view cost monitoring</h2>
          <button
            onClick={() => window.location.href = '/api/auth/signin'}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#4a9eff', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return '#ef4444'; // Red
    if (percentage >= 75) return '#f59e0b'; // Yellow
    if (percentage >= 50) return '#3b82f6'; // Blue
    return '#10b981'; // Green
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#fff', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Cost Monitoring</h1>
            <p style={{ color: '#9ca3af' }}>Real-time API usage and budget tracking</p>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#374151', border: '1px solid #4b5563', borderRadius: '0.375rem', color: '#fff', cursor: 'pointer' }}
          >
            ← Back
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '2rem' }}>
            <p style={{ color: '#f87171' }}>❌ {error}</p>
          </div>
        )}

        {loading && !stats ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#9ca3af' }}>Loading cost data...</p>
          </div>
        ) : stats && (
          <>
            {/* Budget Limits Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              {/* Hourly */}
              <div style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', padding: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>Hourly Usage</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: getStatusColor(stats.hourly.percentage) }}>
                  ${stats.hourly.used.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1rem' }}>
                  of ${stats.hourly.limit.toFixed(2)} limit
                </div>
                <div style={{ width: '100%', backgroundColor: '#374151', borderRadius: '9999px', height: '0.5rem' }}>
                  <div
                    style={{
                      backgroundColor: getStatusColor(stats.hourly.percentage),
                      height: '0.5rem',
                      borderRadius: '9999px',
                      width: `${Math.min(stats.hourly.percentage, 100)}%`,
                      transition: 'width 0.3s'
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                  {stats.hourly.percentage.toFixed(1)}% used
                </div>
              </div>

              {/* Daily */}
              <div style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', padding: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>Daily Usage</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: getStatusColor(stats.daily.percentage) }}>
                  ${stats.daily.used.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1rem' }}>
                  of ${stats.daily.limit.toFixed(2)} limit
                </div>
                <div style={{ width: '100%', backgroundColor: '#374151', borderRadius: '9999px', height: '0.5rem' }}>
                  <div
                    style={{
                      backgroundColor: getStatusColor(stats.daily.percentage),
                      height: '0.5rem',
                      borderRadius: '9999px',
                      width: `${Math.min(stats.daily.percentage, 100)}%`,
                      transition: 'width 0.3s'
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                  {stats.daily.percentage.toFixed(1)}% used
                </div>
              </div>

              {/* Monthly */}
              <div style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', padding: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>Monthly Usage</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: getStatusColor(stats.monthly.percentage) }}>
                  ${stats.monthly.used.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1rem' }}>
                  of ${stats.monthly.limit.toFixed(2)} limit
                </div>
                <div style={{ width: '100%', backgroundColor: '#374151', borderRadius: '9999px', height: '0.5rem' }}>
                  <div
                    style={{
                      backgroundColor: getStatusColor(stats.monthly.percentage),
                      height: '0.5rem',
                      borderRadius: '9999px',
                      width: `${Math.min(stats.monthly.percentage, 100)}%`,
                      transition: 'width 0.3s'
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                  {stats.monthly.percentage.toFixed(1)}% used
                </div>
              </div>
            </div>

            {/* Recent API Calls */}
            <div style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Recent API Calls</h2>
                <button
                  onClick={loadCostStats}
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: '0.375rem',
                    color: '#fff',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  {loading ? 'Refreshing...' : '🔄 Refresh'}
                </button>
              </div>

              {stats.recentCalls.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>No API calls recorded yet</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #374151' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af' }}>Time</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af' }}>Model</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af' }}>Endpoint</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', color: '#9ca3af' }}>Tokens</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', color: '#9ca3af' }}>Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentCalls.map((call) => (
                        <tr key={call.id} style={{ borderBottom: '1px solid #374151' }}>
                          <td style={{ padding: '0.75rem' }}>
                            {new Date(call.timestamp).toLocaleTimeString()}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{ backgroundColor: '#374151', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                              {call.model}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', color: '#9ca3af', fontSize: '0.75rem' }}>
                            {call.endpoint}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#9ca3af' }}>
                            {(call.tokens.input + call.tokens.output).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>
                            ${call.cost.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Budget Status Alert */}
            {stats.daily.percentage >= 75 && (
              <div style={{
                backgroundColor: stats.daily.percentage >= 90 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: `1px solid ${stats.daily.percentage >= 90 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                borderRadius: '0.5rem',
                padding: '1rem',
                marginTop: '2rem'
              }}>
                <p style={{ color: stats.daily.percentage >= 90 ? '#f87171' : '#fbbf24', fontWeight: '600' }}>
                  {stats.daily.percentage >= 90 ? '⚠️ Daily budget nearly exhausted!' : '⚠️ Daily budget warning'}
                </p>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  You've used {stats.daily.percentage.toFixed(1)}% of your daily budget.
                  {stats.daily.percentage >= 90 && ' API calls will be blocked when limit is reached.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
