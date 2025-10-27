'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title } from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title);

interface ModelCostData {
  totalCost: number;
  totalCalls: number;
  byProvider: Record<string, {
    totalCost: number;
    totalCalls: number;
    avgCost: number;
    models: string[];
    inputTokens: number;
    outputTokens: number;
  }>;
  byModel: Record<string, {
    totalCost: number;
    totalCalls: number;
    avgCost: number;
    provider: string;
    inputTokens: number;
    outputTokens: number;
  }>;
  byDay: Array<{
    date: string;
    total: number;
    [key: string]: number | string;
  }>;
  byHour: Array<{
    hour: string;
    total: number;
    [key: string]: number | string;
  }>;
  topExpensive: Array<{
    model: string;
    provider: string;
    endpoint: string;
    cost: number;
    inputTokens: number;
    outputTokens: number;
    timestamp: string;
  }>;
  savings: Array<{
    description: string;
    actualCost: number;
    potentialCost: number;
    savings: number;
    percentage: number;
  }>;
  summary: {
    openai: { cost: number; calls: number; percentage: number };
    anthropic: { cost: number; calls: number; percentage: number };
    other: { cost: number; calls: number; percentage: number };
  };
  dateRange: {
    start: string;
    end: string;
    days: number;
  };
}

export default function ModelCostComparisonPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<ModelCostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const loadData = async () => {
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

      // Fetch model cost data
      const response = await fetch(`/api/costs/models?userId=${userId}&days=${days}`);
      const costData = await response.json();

      if (costData.error) {
        setError(costData.error);
        return;
      }

      setData(costData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session, days]);

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a0a2e 0%, #0f0618 100%)', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Please sign in to view cost analytics</h2>
          <button
            onClick={() => window.location.href = '/api/auth/signin'}
            style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Provider colors (D&D theme)
  const providerColors: Record<string, string> = {
    openai: '#10b981',      // Emerald
    anthropic: '#8b5cf6',   // Purple
    google: '#3b82f6',      // Blue
    assemblyai: '#f59e0b',  // Amber
    other: '#6b7280',       // Gray
  };

  const getProviderGradient = (provider: string) => {
    const colors: Record<string, string> = {
      openai: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      anthropic: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      google: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      assemblyai: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      other: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
    };
    return colors[provider] || colors.other;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a0a2e 0%, #0f0618 100%)', color: '#fff', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI Model Cost Dashboard
            </h1>
            <p style={{ color: '#9ca3af' }}>Compare costs across OpenAI, Anthropic, and other providers</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '0.375rem', color: '#fff', cursor: 'pointer' }}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={() => window.location.href = '/costs'}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#374151', border: '1px solid #4b5563', borderRadius: '0.375rem', color: '#fff', cursor: 'pointer' }}
            >
              Budget View
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#374151', border: '1px solid #4b5563', borderRadius: '0.375rem', color: '#fff', cursor: 'pointer' }}
            >
              Back Home
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '2rem' }}>
            <p style={{ color: '#f87171' }}>Error: {error}</p>
          </div>
        )}

        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#9ca3af' }}>Loading cost analytics...</p>
          </div>
        ) : data && (
          <>
            {/* Total Cost Summary */}
            <div style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)', border: '1px solid #374151', borderRadius: '1rem', padding: '2rem', marginBottom: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                TOTAL SPENT ({data.dateRange.days} DAYS)
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ${data.totalCost.toFixed(2)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>OpenAI</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#10b981' }}>
                    ${data.summary.openai.cost.toFixed(2)}
                    <span style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                      ({data.summary.openai.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Anthropic</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#8b5cf6' }}>
                    ${data.summary.anthropic.cost.toFixed(2)}
                    <span style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                      ({data.summary.anthropic.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Total API Calls</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#60a5fa' }}>
                    {data.totalCalls.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Avg Cost/Call</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#f59e0b' }}>
                    ${(data.totalCost / data.totalCalls).toFixed(4)}
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {/* Provider Distribution Pie Chart */}
              <div style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)', border: '1px solid #374151', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Cost by Provider</h2>
                {Object.keys(data.byProvider).length > 0 ? (
                  <div style={{ maxWidth: '300px', margin: '0 auto' }}>
                    <Doughnut
                      data={{
                        labels: Object.keys(data.byProvider).map(p => p.charAt(0).toUpperCase() + p.slice(1)),
                        datasets: [{
                          data: Object.values(data.byProvider).map(p => p.totalCost),
                          backgroundColor: Object.keys(data.byProvider).map(p => providerColors[p] || providerColors.other),
                          borderColor: '#1f2937',
                          borderWidth: 2,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: { color: '#9ca3af', padding: 15 }
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return `${label}: $${value.toFixed(2)}`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                ) : (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No data available</p>
                )}
              </div>

              {/* Top Models Bar Chart */}
              <div style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)', border: '1px solid #374151', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Cost by Model</h2>
                {Object.keys(data.byModel).length > 0 ? (
                  <Bar
                    data={{
                      labels: Object.keys(data.byModel).slice(0, 8).map(m => m.length > 20 ? m.substring(0, 17) + '...' : m),
                      datasets: [{
                        label: 'Cost (USD)',
                        data: Object.values(data.byModel).slice(0, 8).map(m => m.totalCost),
                        backgroundColor: Object.values(data.byModel).slice(0, 8).map(m => providerColors[m.provider] || providerColors.other),
                        borderRadius: 4,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { color: '#9ca3af' },
                          grid: { color: '#374151' }
                        },
                        x: {
                          ticks: { color: '#9ca3af' },
                          grid: { display: false }
                        }
                      },
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) => `Cost: $${context.parsed.y.toFixed(4)}`
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No data available</p>
                )}
              </div>
            </div>

            {/* Cost Over Time */}
            <div style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)', border: '1px solid #374151', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Daily Cost Trend</h2>
              {data.byDay.length > 0 ? (
                <Line
                  data={{
                    labels: data.byDay.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                    datasets: Object.keys(data.byProvider).map(provider => ({
                      label: provider.charAt(0).toUpperCase() + provider.slice(1),
                      data: data.byDay.map(d => d[provider] || 0),
                      borderColor: providerColors[provider] || providerColors.other,
                      backgroundColor: providerColors[provider] || providerColors.other,
                      tension: 0.3,
                      fill: false,
                    }))
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { color: '#9ca3af' },
                        grid: { color: '#374151' }
                      },
                      x: {
                        ticks: { color: '#9ca3af' },
                        grid: { display: false }
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: { color: '#9ca3af' }
                      },
                      tooltip: {
                        callbacks: {
                          label: (context) => `${context.dataset.label}: $${context.parsed.y.toFixed(4)}`
                        }
                      }
                    }
                  }}
                  height={300}
                />
              ) : (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No data available</p>
              )}
            </div>

            {/* Savings Insights */}
            {data.savings.length > 0 && (
              <div style={{ background: 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)', border: '1px solid #10b981', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#10b981' }}>
                  Savings Opportunities
                </h2>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {data.savings.map((saving, idx) => (
                    <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #10b981' }}>
                      <div style={{ fontSize: '0.875rem', color: '#6ee7b7', marginBottom: '0.5rem' }}>
                        {saving.description}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Actual: </span>
                          <span style={{ color: '#fff', fontWeight: '600' }}>${saving.actualCost.toFixed(2)}</span>
                          <span style={{ color: '#9ca3af', fontSize: '0.875rem', marginLeft: '1rem' }}>If switched: </span>
                          <span style={{ color: '#fff', fontWeight: '600' }}>${saving.potentialCost.toFixed(2)}</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                          Save ${saving.savings.toFixed(2)}
                          <span style={{ fontSize: '0.875rem', color: '#6ee7b7', marginLeft: '0.5rem' }}>
                            ({saving.percentage.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Provider Details */}
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
              {Object.entries(data.byProvider).map(([provider, info]) => (
                <div key={provider} style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)', border: `1px solid ${providerColors[provider]}`, borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: providerColors[provider], marginBottom: '0.5rem' }}>
                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                      </h3>
                      <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                        {info.totalCalls.toLocaleString()} calls • {info.models.length} model{info.models.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: providerColors[provider] }}>
                        ${info.totalCost.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                        ${info.avgCost.toFixed(4)} avg
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #374151' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Input Tokens</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fff' }}>
                        {info.inputTokens.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Output Tokens</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fff' }}>
                        {info.outputTokens.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Models Used</div>
                      <div style={{ fontSize: '0.875rem', color: '#d1d5db', marginTop: '0.25rem' }}>
                        {info.models.join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Top Expensive Calls */}
            {data.topExpensive.length > 0 && (
              <div style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)', border: '1px solid #374151', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Most Expensive API Calls</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #374151' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af' }}>Model</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af' }}>Provider</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af' }}>Endpoint</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', color: '#9ca3af' }}>Tokens</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', color: '#9ca3af' }}>Cost</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', color: '#9ca3af' }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topExpensive.map((call, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #374151' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{ backgroundColor: '#374151', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                              {call.model}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{ color: providerColors[call.provider] || providerColors.other, fontWeight: '600' }}>
                              {call.provider}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', color: '#9ca3af', fontSize: '0.75rem' }}>
                            {call.endpoint}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#9ca3af' }}>
                            {(call.inputTokens + call.outputTokens).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#f59e0b' }}>
                            ${call.cost.toFixed(4)}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#6b7280', fontSize: '0.75rem' }}>
                            {new Date(call.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
