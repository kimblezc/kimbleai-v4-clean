'use client';

/**
 * Autonomous Agent Dashboard
 *
 * Two-column layout:
 * - Left: Executive Summary (for humans)
 * - Right: Technical Logs (for debugging)
 */

import { useState, useEffect } from 'react';

interface AgentStatus {
  agent_state: {
    agent_enabled: boolean;
    last_health_check: string;
    total_tasks_completed: number;
    total_issues_fixed: number;
  };
  statistics: {
    tasks: {
      total: number;
      completed: number;
      failed: number;
      pending: number;
    };
    findings: {
      total: number;
      critical: number;
      high: number;
      medium: number;
    };
    logs: {
      total: number;
      errors: number;
      warnings: number;
    };
  };
  latest_report?: {
    executive_summary: string;
    key_accomplishments: string[];
    critical_issues: string[];
    recommendations: string[];
    tasks_completed: number;
    issues_found: number;
    issues_fixed: number;
    generated_at: string;
  };
  recent_activity: {
    tasks: any[];
    findings: any[];
  };
}

export default function AutonomousAgentDashboard() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'summary' | 'logs' | 'tasks' | 'findings' | 'reports'>('summary');
  const [logLevel, setLogLevel] = useState<'all' | 'error' | 'warn' | 'info'>('all');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [view, logLevel]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load summary
      const statusRes = await fetch('/api/agent/status?view=summary');
      const statusData = await statusRes.json();
      setStatus(statusData);

      // Load logs if in logs view
      if (view === 'logs') {
        const logsRes = await fetch(`/api/agent/status?view=logs&level=${logLevel !== 'all' ? logLevel : ''}&limit=100`);
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
      }

      // Load reports if in reports view
      if (view === 'reports') {
        const reportsRes = await fetch('/api/agent/status?view=reports&limit=10');
        const reportsData = await reportsRes.json();
        setReports(reportsData.reports || []);
      }
    } catch (error) {
      console.error('Failed to load agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = () => {
    if (!status) return { label: 'Unknown', color: 'gray' };

    const { statistics } = status;
    const successRate = statistics.tasks.total > 0
      ? (statistics.tasks.completed / statistics.tasks.total) * 100
      : 100;

    if (successRate >= 90 && statistics.findings.critical === 0) {
      return { label: 'Excellent', color: 'green' };
    } else if (successRate >= 70 && statistics.findings.critical <= 1) {
      return { label: 'Good', color: 'blue' };
    } else if (successRate >= 50) {
      return { label: 'Fair', color: 'yellow' };
    } else {
      return { label: 'Needs Attention', color: 'red' };
    }
  };

  const health = getHealthStatus();

  if (loading && !status) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading Autonomous Agent Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🤖 Autonomous Agent</h1>
            <p className="text-sm text-gray-600">Self-healing system monitoring • Runs 24/7 in the cloud</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${status?.agent_state?.agent_enabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-gray-700">
                {status?.agent_state?.agent_enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium bg-${health.color}-100 text-${health.color}-800`}>
              System Health: {health.label}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setView('summary')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'summary' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            📊 Summary
          </button>
          <button
            onClick={() => setView('reports')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'reports' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            📋 Executive Reports
          </button>
          <button
            onClick={() => setView('logs')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'logs' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            🔧 Technical Logs
          </button>
          <button
            onClick={() => setView('tasks')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'tasks' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            ⚙️ Tasks
          </button>
          <button
            onClick={() => setView('findings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'findings' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            🔍 Findings
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {view === 'summary' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Executive Summary (Left) */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Executive Summary</h2>

              {status?.latest_report && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Latest Report</h3>
                    <span className="text-xs text-gray-500">
                      {new Date(status.latest_report.generated_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-gray-700 mb-4">{status.latest_report.executive_summary}</p>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{status.latest_report.tasks_completed}</div>
                      <div className="text-xs text-gray-600">Tasks Completed</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{status.latest_report.issues_found}</div>
                      <div className="text-xs text-gray-600">Issues Found</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{status.latest_report.issues_fixed}</div>
                      <div className="text-xs text-gray-600">Issues Fixed</div>
                    </div>
                  </div>

                  {status.latest_report.key_accomplishments.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">✅ Key Accomplishments</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {status.latest_report.key_accomplishments.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {status.latest_report.critical_issues.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-red-900 mb-2">⚠️ Critical Issues</h4>
                      <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                        {status.latest_report.critical_issues.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {status.latest_report.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">💡 Recommendations</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {status.latest_report.recommendations.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🕐 Recent Activity</h3>

                <div className="space-y-3">
                  {status?.recent_activity?.tasks?.map((task, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        task.status === 'completed' ? 'bg-green-500' :
                        task.status === 'failed' ? 'bg-red-500' :
                        task.status === 'in_progress' ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{task.title}</p>
                        <p className="text-xs text-gray-500">{task.task_type}</p>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(task.created_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Technical Stats (Right) */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">🔧 Technical Overview</h2>

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Tasks (Last 24h)</h3>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">{status?.statistics.tasks.total || 0}</div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">{status?.statistics.tasks.completed || 0}</div>
                      <div className="text-xs text-gray-500">Done</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">{status?.statistics.tasks.pending || 0}</div>
                      <div className="text-xs text-gray-500">Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-red-600">{status?.statistics.tasks.failed || 0}</div>
                      <div className="text-xs text-gray-500">Failed</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Findings (Last 24h)</h3>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">{status?.statistics.findings.total || 0}</div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-red-600">{status?.statistics.findings.critical || 0}</div>
                      <div className="text-xs text-gray-500">Critical</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-orange-600">{status?.statistics.findings.high || 0}</div>
                      <div className="text-xs text-gray-500">High</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-yellow-600">{status?.statistics.findings.medium || 0}</div>
                      <div className="text-xs text-gray-500">Medium</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Logs (Last 24h)</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">{status?.statistics.logs.total || 0}</div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-red-600">{status?.statistics.logs.errors || 0}</div>
                      <div className="text-xs text-gray-500">Errors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-yellow-600">{status?.statistics.logs.warnings || 0}</div>
                      <div className="text-xs text-gray-500">Warnings</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Findings */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Recent Findings</h3>

                <div className="space-y-3">
                  {status?.recent_activity?.findings?.map((finding, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border-l-4 border-${finding.severity === 'critical' ? 'red' : finding.severity === 'high' ? 'orange' : 'yellow'}-500">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{finding.title}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          finding.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          finding.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {finding.severity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{finding.description}</p>
                      {finding.location && (
                        <p className="text-xs text-gray-500 mt-1">📍 {finding.location}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'logs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">🔧 Technical Logs</h2>
              <div className="flex gap-2">
                {(['all', 'error', 'warn', 'info'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setLogLevel(level)}
                    className={`px-3 py-1 rounded text-sm ${
                      logLevel === level ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 font-mono text-xs max-h-[800px] overflow-auto">
              {logs.map((log, idx) => (
                <div key={idx} className={`py-1 ${log.log_level === 'error' ? 'text-red-600' : log.log_level === 'warn' ? 'text-yellow-600' : 'text-gray-700'}`}>
                  <span className="text-gray-500">[{new Date(log.timestamp).toLocaleString()}]</span>
                  <span className="font-bold ml-2">[{log.log_level.toUpperCase()}]</span>
                  <span className="ml-2">{log.message}</span>
                  {log.details && (
                    <pre className="ml-8 mt-1 text-gray-600">{JSON.stringify(log.details, null, 2)}</pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'reports' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Executive Reports</h2>
            <div className="space-y-4">
              {reports.map((report, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{report.report_type.replace('_', ' ').toUpperCase()}</h3>
                    <span className="text-xs text-gray-500">{new Date(report.generated_at).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-700 mb-4">{report.executive_summary}</p>
                  {report.key_accomplishments && report.key_accomplishments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Accomplishments:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {report.key_accomplishments.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
