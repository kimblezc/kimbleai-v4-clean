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

              {/* How to Read This Dashboard */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-bold text-blue-900 mb-2">📖 How to Read This Dashboard</h3>
                <div className="space-y-2 text-xs text-blue-800">
                  <p>
                    <strong>Real Work:</strong> Tasks and findings created by Archie during his automated runs (every 5 minutes)
                  </p>
                  <p>
                    <strong>Test Data:</strong> Marked with ⚠️ yellow badges - used to verify dashboard functionality
                  </p>
                  <p>
                    <strong>Progress:</strong> Each task shows % complete based on subtasks finished and current phase
                  </p>
                  <p>
                    <strong>Priority:</strong> P10 = Highest (Gmail, Drive, Files), P9 = High (Performance, Speed, Costs)
                  </p>
                </div>
              </div>

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

              {/* What Archie is Doing Right Now */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🦉 What Archie is Doing</h3>

                {status?.recent_activity?.tasks?.length > 0 ? (
                  <div className="space-y-3">
                    {status.recent_activity.tasks
                      .filter(task => task.status === 'in_progress' || task.status === 'pending')
                      .slice(0, 3)
                      .map((task, idx) => {
                        const subtasks = task.metadata?.tasks || [];
                        const completedSubtasks = task.metadata?.completed_tasks || [];
                        const progress = subtasks.length > 0
                          ? Math.round((completedSubtasks.length / subtasks.length) * 100)
                          : 0;

                        return (
                          <div key={idx} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <div className="flex items-start gap-3 mb-2">
                              <div className={`w-3 h-3 mt-1 rounded-full ${
                                task.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
                              }`}></div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
                                    P{task.priority}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mb-2">{task.metadata?.goal || task.task_type}</p>

                                {/* Mini Progress Bar */}
                                {subtasks.length > 0 && (
                                  <div className="mb-1">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                      <span className="text-gray-600">Progress</span>
                                      <span className="font-bold text-blue-600">{progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className="h-2 rounded-full bg-blue-500"
                                        style={{ width: `${progress}%` }}
                                      ></div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {completedSubtasks.length}/{subtasks.length} subtasks done
                                    </p>
                                  </div>
                                )}

                                {/* Current Action */}
                                <div className="text-xs text-blue-700 font-medium">
                                  {task.status === 'in_progress' ? '🔄 Active' : '⏸️ Queued'}
                                  {task.metadata?.current_phase && ` • ${task.metadata.current_phase}`}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    {/* Completed Tasks Summary */}
                    {status.recent_activity.tasks.filter(t => t.status === 'completed').length > 0 && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-800">
                          ✅ <strong>{status.recent_activity.tasks.filter(t => t.status === 'completed').length}</strong> task(s) completed recently
                        </p>
                      </div>
                    )}

                    {/* No Active Tasks */}
                    {status.recent_activity.tasks.filter(t => t.status === 'in_progress' || t.status === 'pending').length === 0 && (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                        <p className="text-sm text-gray-600">
                          🦉 Archie is currently idle. Next run in ~5 minutes.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      ⚠️ <strong>No tasks yet.</strong> Archie will create priority tasks from PROJECT_GOALS.md on his next run.
                    </p>
                  </div>
                )}
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

        {view === 'tasks' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">⚙️ Active Tasks</h2>
              <p className="text-sm text-gray-600">Showing real-time task progress from Archie</p>
            </div>

            <div className="space-y-4">
              {status?.recent_activity?.tasks && status.recent_activity.tasks.length > 0 ? (
                status.recent_activity.tasks.map((task, idx) => {
                  const subtasks = task.metadata?.tasks || [];
                  const completedSubtasks = task.metadata?.completed_tasks || [];
                  const progress = subtasks.length > 0
                    ? Math.round((completedSubtasks.length / subtasks.length) * 100)
                    : 0;

                  const priorityColors = {
                    10: 'bg-red-100 text-red-700 border-red-300',
                    9: 'bg-orange-100 text-orange-700 border-orange-300',
                    8: 'bg-yellow-100 text-yellow-700 border-yellow-300',
                    7: 'bg-blue-100 text-blue-700 border-blue-300',
                  };
                  const priorityColor = priorityColors[task.priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-700 border-gray-300';

                  const statusIcons = {
                    pending: '⏸️',
                    in_progress: '🔄',
                    completed: '✅',
                    failed: '❌'
                  };

                  const phaseInfo = task.metadata?.current_phase || 'Planning';

                  return (
                    <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      {/* Task Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${priorityColor}`}>
                              P{task.priority}
                            </span>
                            <span className="text-2xl">{statusIcons[task.status as keyof typeof statusIcons]}</span>
                            <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          {task.metadata?.goal && (
                            <p className="text-xs text-blue-600 font-medium">🎯 {task.metadata.goal}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500 mb-1">Last Updated</div>
                          <div className="text-xs font-medium text-gray-700">
                            {new Date(task.updated_at || task.created_at).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {subtasks.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Progress</span>
                            <span className="text-sm font-bold text-blue-600">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                progress === 100 ? 'bg-green-500' :
                                progress > 0 ? 'bg-blue-500' :
                                'bg-gray-400'
                              }`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {completedSubtasks.length} of {subtasks.length} subtasks completed
                          </div>
                        </div>
                      )}

                      {/* Current Phase */}
                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Current Phase</div>
                        <div className="flex gap-2">
                          {['Planning', 'Implementation', 'Testing', 'Deployment'].map(phase => (
                            <div
                              key={phase}
                              className={`flex-1 text-center py-2 rounded text-xs font-medium ${
                                phaseInfo === phase
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {phase}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Subtasks */}
                      {subtasks.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">Subtasks</div>
                          <div className="space-y-2">
                            {subtasks.map((subtask: string, subIdx: number) => {
                              const isCompleted = completedSubtasks.includes(subtask);
                              return (
                                <div
                                  key={subIdx}
                                  className={`flex items-center gap-3 p-2 rounded ${
                                    isCompleted ? 'bg-green-50' : 'bg-gray-50'
                                  }`}
                                >
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                                  }`}>
                                    {isCompleted && <span className="text-white text-xs">✓</span>}
                                  </div>
                                  <span className={`text-sm ${
                                    isCompleted ? 'text-gray-600 line-through' : 'text-gray-900'
                                  }`}>
                                    {subtask}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Test Data Badge */}
                      {task.metadata?.test && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-xs text-yellow-800">
                            ⚠️ <strong>Test Data:</strong> This is a test task to verify the dashboard is working.
                            Real tasks will appear here when Archie runs his next cycle.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <p className="text-gray-500 mb-2">No tasks found</p>
                  <p className="text-sm text-gray-400">
                    Archie will create tasks from PROJECT_GOALS.md on his next run (every 5 minutes)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'findings' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">🔍 Findings & Insights</h2>
              <p className="text-sm text-gray-600">Issues and improvements discovered by Archie</p>
            </div>

            <div className="space-y-4">
              {status?.recent_activity?.findings && status.recent_activity.findings.length > 0 ? (
                status.recent_activity.findings.map((finding, idx) => {
                  const severityConfig = {
                    critical: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-900', badge: 'bg-red-600 text-white' },
                    high: { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-900', badge: 'bg-orange-600 text-white' },
                    medium: { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-900', badge: 'bg-yellow-600 text-white' },
                    low: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-900', badge: 'bg-blue-600 text-white' },
                    info: { bg: 'bg-gray-50', border: 'border-gray-500', text: 'text-gray-900', badge: 'bg-gray-600 text-white' }
                  };
                  const config = severityConfig[finding.severity as keyof typeof severityConfig] || severityConfig.info;

                  return (
                    <div key={idx} className={`${config.bg} rounded-lg border-l-4 ${config.border} p-6`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.badge}`}>
                              {finding.severity.toUpperCase()}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              finding.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                              finding.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {finding.status.replace('_', ' ')}
                            </span>
                            <h3 className={`text-lg font-semibold ${config.text}`}>{finding.title}</h3>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            {new Date(finding.detected_at).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mb-3">{finding.description}</p>

                      {finding.location && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-gray-600">📍 Location:</span>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded ml-2">{finding.location}</code>
                        </div>
                      )}

                      {finding.detection_method && (
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Detection Method:</span> {finding.detection_method}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <p className="text-gray-500 mb-2">No findings yet</p>
                  <p className="text-sm text-gray-400">
                    Archie will proactively hunt for bugs and improvements on his next run
                  </p>
                </div>
              )}
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
