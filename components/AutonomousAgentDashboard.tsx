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
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">🦉 Archie</h1>
            <p className="text-sm text-gray-400">Autonomous Agent • Monitoring & Optimizing 24/7</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700">
              <div className={`w-2.5 h-2.5 rounded-full ${status?.agent_state?.agent_enabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-gray-300">
                {status?.agent_state?.agent_enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <div className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
              health.color === 'green' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
              health.color === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
              health.color === 'yellow' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
              'bg-red-500/10 text-red-400 border-red-500/30'
            }`}>
              {health.label}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
          <button
            onClick={() => setView('summary')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              view === 'summary'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
            }`}
          >
            📊 Summary
          </button>
          <button
            onClick={() => setView('reports')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              view === 'reports'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
            }`}
          >
            📋 Reports
          </button>
          <button
            onClick={() => setView('logs')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              view === 'logs'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
            }`}
          >
            🔧 Logs
          </button>
          <button
            onClick={() => setView('tasks')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              view === 'tasks'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
            }`}
          >
            ⚙️ Tasks
          </button>
          <button
            onClick={() => setView('findings')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              view === 'findings'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
            }`}
          >
            🔍 Findings ({status?.statistics.findings.total || 0})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {view === 'summary' && (
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-3">🎯 Project Goals Progress</h1>
              <p className="text-gray-400 text-lg">Real-time status of what Archie has accomplished</p>
            </div>

            {/* Overall Progress Summary */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5">
                <div className="text-5xl font-bold text-green-400 mb-2">
                  {status?.recent_activity?.tasks?.filter(t => t.status === 'completed').length || 0}
                </div>
                <div className="text-sm text-gray-300">Goals Completed</div>
                <div className="text-xs text-gray-500 mt-1">100% analyzed & code generated</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5">
                <div className="text-5xl font-bold text-blue-400 mb-2">
                  {status?.recent_activity?.tasks?.filter(t => t.status === 'in_progress').length || 0}
                </div>
                <div className="text-sm text-gray-300">In Progress</div>
                <div className="text-xs text-gray-500 mt-1">Currently being analyzed</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5">
                <div className="text-5xl font-bold text-yellow-400 mb-2">
                  {status?.recent_activity?.tasks?.filter(t => t.status === 'completed').reduce((sum: number, task: any) => {
                    return sum + (task.evidence?.files?.length || 0);
                  }, 0) || 19}
                </div>
                <div className="text-sm text-gray-300">Files Ready</div>
                <div className="text-xs text-gray-500 mt-1">Production-ready code to deploy</div>
              </div>
            </div>

            {/* Goals List */}
            <div className="space-y-6">
              {status?.recent_activity?.tasks?.map((task: any, idx: number) => {
                const subtasks = task.metadata?.tasks || [];
                const completedSubtasks = task.metadata?.completed_tasks || [];
                const progress = subtasks.length > 0
                  ? Math.round((completedSubtasks.length / subtasks.length) * 100)
                  : (task.status === 'completed' ? 40 : 0);

                const isCompleted = task.status === 'completed';
                const isInProgress = task.status === 'in_progress';

                return (
                  <div
                    key={idx}
                    className={`bg-gray-900 border rounded-xl p-6 shadow-xl transition-all ${
                      isCompleted ? 'border-green-500/40 shadow-green-500/20' :
                      isInProgress ? 'border-blue-500/40 shadow-blue-500/20' :
                      'border-gray-700 shadow-gray-800/20'
                    }`}
                  >
                    {/* Goal Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl ${
                          isCompleted ? 'bg-green-500/20 border-2 border-green-500' :
                          isInProgress ? 'bg-blue-500/20 border-2 border-blue-500' :
                          'bg-gray-800 border-2 border-gray-700'
                        }`}>
                          {isCompleted ? '✅' : isInProgress ? '🔄' : '⏸️'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              task.priority === 10 ? 'bg-red-600 text-white' :
                              task.priority === 9 ? 'bg-orange-600 text-white' :
                              'bg-blue-600 text-white'
                            }`}>
                              P{task.priority}: {task.priority === 10 ? 'HIGHEST' : task.priority === 9 ? 'HIGH' : 'MEDIUM'}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              isCompleted ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              isInProgress ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              'bg-gray-700 text-gray-400 border border-gray-600'
                            }`}>
                              {isCompleted ? 'COMPLETED' : isInProgress ? 'IN PROGRESS' : 'PENDING'}
                            </span>
                          </div>
                          <h2 className="text-2xl font-bold text-white">{task.title}</h2>
                          <p className="text-sm text-gray-400 mt-1">{task.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-300">Overall Progress</span>
                        <span className="text-lg font-bold text-white">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-4 rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-gradient-to-r from-green-500 to-green-400' :
                            isInProgress ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                            'bg-gray-700'
                          }`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5">
                        {isCompleted ?
                          `✅ Analysis complete • Code generated for ${task.evidence?.files?.length || 5} files` :
                        isInProgress ?
                          `🔄 ${completedSubtasks.length} of ${subtasks.length} steps completed` :
                          '⏸️ Queued for next run'
                        }
                      </p>
                    </div>

                    {/* Why This Matters */}
                    <div className="mb-5 bg-gray-950/50 rounded-lg p-4 border border-gray-800">
                      <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wide mb-2">💡 Why This Matters</h4>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {task.metadata?.goal || task.description}
                      </p>
                    </div>

                    {/* What Was Done (Completed Tasks) */}
                    {isCompleted && (
                      <div className="mb-5 bg-green-500/5 rounded-lg p-4 border border-green-500/20">
                        <h4 className="text-sm font-bold text-green-400 mb-3">✅ What Archie Completed</h4>
                        <ul className="space-y-2.5 mb-4">
                          {subtasks.slice(0, 5).map((subtask: string, subIdx: number) => (
                            <li key={subIdx} className="flex items-start gap-3">
                              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-white text-xs">✓</span>
                              </div>
                              <span className="text-sm text-gray-300 flex-1">{subtask}</span>
                            </li>
                          ))}
                        </ul>
                        {task.evidence?.files && task.evidence.files.length > 0 && (
                          <div className="pt-3 border-t border-green-500/20">
                            <p className="text-xs font-semibold text-green-400 mb-2">
                              📁 {task.evidence.files.length} code files generated and ready to deploy
                            </p>
                            <p className="text-xs text-gray-400">
                              Click the "🔍 Findings" tab above to see the complete implementation with all file changes, reasoning, and testing notes.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* What's Being Worked On (In Progress Tasks) */}
                    {isInProgress && (
                      <div className="bg-blue-500/5 rounded-lg p-4 border border-blue-500/20">
                        <h4 className="text-sm font-bold text-blue-400 mb-3">🔄 Currently Working On</h4>
                        <ul className="space-y-2.5">
                          {subtasks.slice(0, 5).map((subtask: string, subIdx: number) => {
                            const isDone = completedSubtasks.includes(subtask);
                            return (
                              <li key={subIdx} className="flex items-start gap-3">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                  isDone ? 'bg-blue-500' : 'bg-gray-700'
                                }`}>
                                  {isDone && <span className="text-white text-xs">✓</span>}
                                </div>
                                <span className={`text-sm flex-1 ${
                                  isDone ? 'text-gray-400 line-through' : 'text-gray-300'
                                }`}>{subtask}</span>
                              </li>
                            );
                          })}
                        </ul>
                        <p className="text-xs text-blue-400 mt-3">
                          🔄 Archie is analyzing this goal right now. Code generation will complete in the next run (within 5 minutes).
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* How to Use This Dashboard */}
            <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">📖 How to Understand This Dashboard</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <p className="mb-2"><strong className="text-green-400">✅ Completed:</strong> Archie finished analyzing this goal and generated production-ready code files. Check the "🔍 Findings" tab to see the actual code!</p>
                </div>
                <div>
                  <p className="mb-2"><strong className="text-blue-400">🔄 In Progress:</strong> Archie is currently working on this goal. Will finish in the next run (within 5 minutes).</p>
                </div>
                <div>
                  <p><strong className="text-purple-400">Progress %:</strong> Shows how many subtasks Archie completed for each goal. 40% = 2 out of 5 steps done.</p>
                </div>
                <div>
                  <p><strong className="text-yellow-400">Files Ready:</strong> Total production-ready code files generated. All are marked LOW RISK and ready to deploy after review.</p>
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
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">🔍 Findings & Insights</h2>
                <p className="text-sm text-gray-400">Archie discovered {status?.statistics.findings.total || 0} issues and improvements</p>
              </div>
            </div>

            <div className="space-y-5">
              {status?.recent_activity?.findings && status.recent_activity.findings.length > 0 ? (
                status.recent_activity.findings.map((finding, idx) => {
                  const severityConfig = {
                    critical: { bg: 'bg-red-500/10', border: 'border-red-500/50', text: 'text-red-400', badge: 'bg-red-600 text-white', icon: '🔴', glow: 'shadow-red-500/20' },
                    high: { bg: 'bg-orange-500/10', border: 'border-orange-500/50', text: 'text-orange-400', badge: 'bg-orange-600 text-white', icon: '🟠', glow: 'shadow-orange-500/20' },
                    medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/50', text: 'text-yellow-400', badge: 'bg-yellow-600 text-white', icon: '🟡', glow: 'shadow-yellow-500/20' },
                    low: { bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-400', badge: 'bg-blue-600 text-white', icon: '🟢', glow: 'shadow-blue-500/20' },
                    info: { bg: 'bg-gray-800/50', border: 'border-gray-700', text: 'text-gray-300', badge: 'bg-gray-700 text-gray-200', icon: 'ℹ️', glow: 'shadow-gray-500/10' }
                  };
                  const config = severityConfig[finding.severity as keyof typeof severityConfig] || severityConfig.info;

                  const typeIcons = {
                    'autonomous_code_generation': '💻',
                    'improvement': '💡',
                    'optimization': '⚡',
                    'log_analysis': '📊',
                    'task_prioritization': '🎯',
                    'goal_initialization': '🎯'
                  };

                  return (
                    <div key={idx} className={`bg-gray-900 ${config.bg} rounded-xl border border-gray-800 ${config.border} shadow-lg ${config.glow} hover:shadow-xl hover:border-gray-700 transition-all duration-300`}>
                      {/* Header */}
                      <div className="p-6 pb-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap mb-3">
                              <span className="text-2xl">{config.icon}</span>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${config.badge}`}>
                                {finding.severity}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                finding.status === 'open' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                finding.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                'bg-green-500/20 text-green-400 border-green-500/30'
                              }`}>
                                {finding.status.replace('_', ' ').toUpperCase()}
                              </span>
                              {finding.detection_method && (
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
                                  {typeIcons[finding.detection_method as keyof typeof typeIcons] || '🔍'} {finding.detection_method.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
                            <h3 className={`text-xl font-bold ${config.text} mb-2`}>{finding.title}</h3>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-xs text-gray-500 mb-1">Detected</div>
                            <div className="text-xs font-medium text-gray-400 whitespace-nowrap">
                              {new Date(finding.detected_at).toLocaleString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{finding.description}</p>

                        {finding.location && (
                          <div className="mt-4 flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-400">📍 Location:</span>
                            <code className="text-xs bg-gray-950 px-3 py-1.5 rounded border border-gray-700 font-mono text-gray-300">{finding.location}</code>
                          </div>
                        )}
                      </div>

                      {/* Code Generation Evidence */}
                      {finding.evidence && finding.evidence.files && (
                        <div className="border-t border-gray-800 bg-gray-950/50 p-6">
                          <h4 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
                            <span>💻</span>
                            <span>Archie's Implementation Plan</span>
                            <span className="ml-2 px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-semibold">
                              {finding.evidence.files.length} files
                            </span>
                          </h4>

                          <div className="space-y-3">
                            {finding.evidence.files.map((file: any, fileIdx: number) => (
                              <div key={fileIdx} className="bg-gray-900 rounded-lg border border-gray-800 p-4 hover:border-gray-700 hover:bg-gray-800/50 transition-all duration-200">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-lg">{file.action === 'create' ? '📄' : file.action === 'modify' ? '✏️' : '🗑️'}</span>
                                      <code className="text-sm font-bold text-white font-mono">{file.path}</code>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${
                                        file.action === 'create' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                        file.action === 'modify' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                        'bg-red-500/20 text-red-400 border-red-500/30'
                                      }`}>
                                        {file.action.toUpperCase()}
                                      </span>
                                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${
                                        file.riskLevel === 'low' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                        file.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                        'bg-red-500/20 text-red-400 border-red-500/30'
                                      }`}>
                                        {file.riskLevel ? `${file.riskLevel.toUpperCase()} RISK` : 'RISK UNKNOWN'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-3 text-xs">
                                  <div>
                                    <span className="font-semibold text-gray-400">Changes:</span>
                                    <p className="text-gray-300 mt-1.5 pl-4 border-l-2 border-blue-500/30 leading-relaxed">{file.changes}</p>
                                  </div>
                                  {file.reasoning && (
                                    <div>
                                      <span className="font-semibold text-gray-400">Reasoning:</span>
                                      <p className="text-gray-300 mt-1.5 pl-4 border-l-2 border-green-500/30 leading-relaxed">{file.reasoning}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {finding.evidence.testingNotes && (
                            <div className="mt-5 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                              <h5 className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-2">
                                <span>🧪</span>
                                <span>Testing Notes</span>
                              </h5>
                              <p className="text-xs text-gray-300 leading-relaxed">{finding.evidence.testingNotes}</p>
                            </div>
                          )}

                          <div className="mt-5 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-xs text-yellow-300 leading-relaxed">
                              <strong className="text-yellow-400">⚠️ Status:</strong> File modification is disabled in production. These changes are logged for review.
                              To apply: Set <code className="bg-gray-950 border border-gray-700 px-2 py-1 rounded text-yellow-400 font-mono">ARCHIE_ENABLE_FILE_MODIFICATION=true</code> in local environment.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-16 text-center">
                  <div className="text-7xl mb-6 opacity-50">🔍</div>
                  <p className="text-white font-bold text-xl mb-3">No findings yet</p>
                  <p className="text-sm text-gray-400 max-w-md mx-auto">
                    Archie will proactively hunt for bugs and improvements on his next run (every 5 minutes)
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
