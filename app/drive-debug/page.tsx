'use client';

import React, { useState } from 'react';

export default function DriveDebugPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/google/drive/debug');
      const data = await response.json();
      setResults(data);
    } catch (error: any) {
      setResults({
        fatalError: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'running': return '#f59e0b';
      case 'skipped': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'running': return '⏳';
      case 'skipped': return '⏭️';
      default: return '�';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f0f0f',
      color: '#ffffff',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            marginBottom: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🔍 Drive Intelligence Debug Agent
          </h1>
          <p style={{ fontSize: '16px', color: '#888', marginBottom: '24px' }}>
            Iterative testing to diagnose Drive indexing issues
          </p>

          <button
            onClick={runDiagnostics}
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#666' : '#667eea',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? '⏳ Running Diagnostics...' : '▶️ Run Diagnostics'}
          </button>
        </div>

        {/* Results */}
        {results && (
          <div>
            {/* Summary Card */}
            <div style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px',
              border: `2px solid ${results.success ? '#10b981' : '#ef4444'}`
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
                {results.success ? '✅ All Tests Passed' : '❌ Issues Detected'}
              </h2>

              {results.summary && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>
                      {results.summary.passed}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>Passed</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#ef4444' }}>
                      {results.summary.failed}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>Failed</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#6b7280' }}>
                      {results.summary.skipped}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>Skipped</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#fff' }}>
                      {results.summary.totalSteps}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>Total Steps</div>
                  </div>
                </div>
              )}

              {results.timestamp && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '12px' }}>
                  Test run: {new Date(results.timestamp).toLocaleString()}
                </div>
              )}
            </div>

            {/* Error Summary */}
            {results.errors && results.errors.length > 0 && (
              <div style={{
                backgroundColor: '#2a1a1a',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                border: '2px solid #ef4444'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#ef4444' }}>
                  ❌ Errors Found
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {results.errors.map((error: string, index: number) => (
                    <li key={index} style={{ marginBottom: '8px', color: '#ff8888' }}>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {results.recommendations && results.recommendations.length > 0 && (
              <div style={{
                backgroundColor: '#1a2a1a',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                border: '2px solid #10b981'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#10b981' }}>
                  💡 Recommendations
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {results.recommendations.map((rec: string, index: number) => (
                    <li key={index} style={{ marginBottom: '8px', color: '#88ff88' }}>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Step-by-Step Results */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                Step-by-Step Diagnostics
              </h3>

              {results.steps && results.steps.map((step: any) => (
                <div
                  key={step.step}
                  style={{
                    backgroundColor: '#1a1a1a',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '12px',
                    borderLeft: `4px solid ${getStatusColor(step.status)}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '24px', marginRight: '12px' }}>
                      {getStatusEmoji(step.status)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                        Step {step.step}: {step.name}
                      </h4>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                        Status: <span style={{ color: getStatusColor(step.status), fontWeight: '600' }}>
                          {step.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {step.error && (
                    <div style={{
                      backgroundColor: '#2a1a1a',
                      borderRadius: '4px',
                      padding: '12px',
                      marginTop: '8px',
                      color: '#ff8888'
                    }}>
                      <strong>Error:</strong> {step.error}
                      {step.suggestion && (
                        <div style={{ marginTop: '8px', color: '#ffaa88' }}>
                          <strong>💡 Suggestion:</strong> {step.suggestion}
                        </div>
                      )}
                    </div>
                  )}

                  {step.result && (
                    <div style={{
                      backgroundColor: '#1a2a1a',
                      borderRadius: '4px',
                      padding: '12px',
                      marginTop: '8px',
                      fontSize: '14px'
                    }}>
                      <pre style={{
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        color: '#88ff88'
                      }}>
                        {typeof step.result === 'string'
                          ? step.result
                          : JSON.stringify(step.result, null, 2)
                        }
                      </pre>
                    </div>
                  )}

                  {step.reason && (
                    <div style={{ marginTop: '8px', fontSize: '14px', color: '#888' }}>
                      Reason: {step.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Raw JSON (Expandable) */}
            <details style={{ marginTop: '24px' }}>
              <summary style={{
                cursor: 'pointer',
                padding: '12px',
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                📋 View Raw JSON
              </summary>
              <pre style={{
                backgroundColor: '#0a0a0a',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '8px',
                overflow: 'auto',
                fontSize: '12px',
                color: '#888'
              }}>
                {JSON.stringify(results, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Instructions */}
        {!results && !loading && (
          <div style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '12px',
            padding: '24px',
            border: '2px solid #667eea'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              How This Works
            </h3>
            <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
              <li>Checks Supabase database connection</li>
              <li>Verifies Google Drive authentication tokens exist</li>
              <li>Initializes Google OAuth client</li>
              <li>Tests Google Drive API access (fetches max 5 files)</li>
              <li>Tests database insertion with a test record</li>
              <li>Checks count of existing indexed files</li>
            </ol>

            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#2a2a1a',
              borderRadius: '8px',
              borderLeft: '4px solid #f59e0b'
            }}>
              <strong>⚠️ Note:</strong> This diagnostic only fetches 5 files from Drive and creates 1 test
              record (which is immediately deleted). It will not exceed any service limits.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
