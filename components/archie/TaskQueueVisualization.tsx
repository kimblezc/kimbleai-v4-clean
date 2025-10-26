'use client';

/**
 * Task Queue Visualization Component
 *
 * A beautiful, real-time task queue monitor with dark D&D fantasy theming.
 * Shows pending, in-progress, completed, and failed Archie tasks.
 *
 * Features:
 * - Real-time updates via SSE
 * - Categorized task views (Pending, In Progress, Completed, Failed)
 * - Visual progress indicators and animations
 * - Task filtering and search
 * - Statistics panel
 * - Retry functionality for failed tasks
 * - Dark D&D mystical theme
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { activityStream } from '@/lib/activity-stream';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
type TaskType = 'monitor_errors' | 'optimize_performance' | 'fix_bugs' | 'run_tests' |
                'analyze_logs' | 'security_scan' | 'dependency_update' | 'code_cleanup' |
                'documentation_update';

interface AgentTask {
  id: string;
  task_type: TaskType;
  priority: number;
  status: TaskStatus;
  title: string;
  description?: string;
  file_paths?: string[];
  metadata?: Record<string, any>;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  attempts: number;
  max_attempts: number;
  result?: string;
  changes_made?: string[];
  tests_passed?: boolean;
  error_message?: string;
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  failed: number;
  successRate: number;
  avgDuration: number;
  tasksByType: Record<string, number>;
}

interface TaskQueueVisualizationProps {
  maxItems?: number;
  showStats?: boolean;
  showFilters?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function TaskQueueVisualization({
  maxItems = 100,
  showStats = true,
  showFilters = true,
  autoRefresh = true,
  refreshInterval = 10000 // 10 seconds
}: TaskQueueVisualizationProps) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'all'>('all');
  const [selectedType, setSelectedType] = useState<TaskType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [retryingTasks, setRetryingTasks] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
    successRate: 0,
    avgDuration: 0,
    tasksByType: {}
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/archie/tasks/queue');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
      setStats(data.stats || stats);
      setError(null);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load task queue');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    refreshTimerRef.current = setInterval(fetchTasks, refreshInterval);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // Connect to SSE for real-time updates
  useEffect(() => {
    const connectToStream = () => {
      try {
        const eventSource = new EventSource('/api/archie/activity/stream');
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            // Listen for task-related activities
            if (message.type === 'activity' && message.event?.category === 'task_processing') {
              // Refresh tasks when task events occur
              fetchTasks();
            }
          } catch (err) {
            console.error('Error parsing SSE message:', err);
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          // Attempt to reconnect after 5 seconds
          setTimeout(connectToStream, 5000);
        };
      } catch (err) {
        console.error('Failed to connect to SSE:', err);
      }
    };

    connectToStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Filter and search tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (selectedStatus !== 'all' && task.status !== selectedStatus) return false;
      if (selectedType !== 'all' && task.task_type !== selectedType) return false;
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [tasks, selectedStatus, selectedType, searchQuery]);

  // Group tasks by status
  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, AgentTask[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      failed: [],
      skipped: []
    };

    filteredTasks.forEach(task => {
      if (groups[task.status]) {
        groups[task.status].push(task);
      }
    });

    // Sort each group
    Object.keys(groups).forEach(status => {
      groups[status as TaskStatus].sort((a, b) => {
        if (status === 'pending') {
          // Pending: by priority (higher first), then scheduled time
          if (a.priority !== b.priority) return b.priority - a.priority;
          return new Date(a.scheduled_for || a.created_at).getTime() -
                 new Date(b.scheduled_for || b.created_at).getTime();
        } else {
          // Others: by most recent first
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
      });
    });

    return groups;
  }, [filteredTasks]);

  // Toggle task expansion
  const toggleExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // Retry failed task
  const retryTask = async (taskId: string) => {
    setRetryingTasks(prev => new Set(prev).add(taskId));

    try {
      const response = await fetch('/api/archie/tasks/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });

      if (!response.ok) throw new Error('Failed to retry task');

      await fetchTasks(); // Refresh task list
    } catch (err) {
      console.error('Error retrying task:', err);
      alert('Failed to retry task');
    } finally {
      setRetryingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  // Helper functions
  const getTaskTypeIcon = (type: TaskType): string => {
    const icons: Record<TaskType, string> = {
      monitor_errors: '🔍',
      optimize_performance: '⚡',
      fix_bugs: '🔧',
      run_tests: '🧪',
      analyze_logs: '📊',
      security_scan: '🛡️',
      dependency_update: '📦',
      code_cleanup: '🧹',
      documentation_update: '📚'
    };
    return icons[type] || '⚙️';
  };

  const getTaskTypeColor = (type: TaskType): string => {
    const colors: Record<TaskType, string> = {
      monitor_errors: 'from-red-500/20 to-orange-500/20 border-red-500/30',
      optimize_performance: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
      fix_bugs: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
      run_tests: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
      analyze_logs: 'from-purple-500/20 to-violet-500/20 border-purple-500/30',
      security_scan: 'from-indigo-500/20 to-blue-500/20 border-indigo-500/30',
      dependency_update: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
      code_cleanup: 'from-teal-500/20 to-cyan-500/20 border-teal-500/30',
      documentation_update: 'from-orange-500/20 to-yellow-500/30 border-orange-500/30'
    };
    return colors[type] || 'from-slate-500/20 to-slate-600/20 border-slate-500/30';
  };

  const getStatusColor = (status: TaskStatus): string => {
    const colors: Record<TaskStatus, string> = {
      pending: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      failed: 'text-red-400 bg-red-500/10 border-red-500/30',
      skipped: 'text-slate-400 bg-slate-500/10 border-slate-500/30'
    };
    return colors[status] || 'text-slate-400 bg-slate-500/10 border-slate-500/30';
  };

  const getPriorityColor = (priority: number): string => {
    if (priority >= 8) return 'text-red-400 bg-red-500/20';
    if (priority >= 6) return 'text-orange-400 bg-orange-500/20';
    if (priority >= 4) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-slate-400 bg-slate-500/20';
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return '--';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  };

  const formatRelativeTime = (date: string): string => {
    const now = new Date().getTime();
    const then = new Date(date).getTime();
    const diff = now - then;

    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  // Render task card
  const renderTaskCard = (task: AgentTask) => {
    const isExpanded = expandedTasks.has(task.id);
    const isRetrying = retryingTasks.has(task.id);

    return (
      <div
        key={task.id}
        className={`
          group relative
          bg-gradient-to-br ${getTaskTypeColor(task.task_type)}
          backdrop-blur-sm border rounded-xl p-4
          hover:shadow-lg hover:shadow-purple-500/10
          transition-all duration-300
          ${task.status === 'in_progress' ? 'animate-pulse-subtle' : ''}
        `}
      >
        {/* Glow effect based on status */}
        {task.status === 'in_progress' && (
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 rounded-xl blur-md opacity-50 animate-pulse" />
        )}
        {task.status === 'completed' && (
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-xl blur-sm opacity-30" />
        )}
        {task.status === 'failed' && (
          <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-xl blur-sm opacity-40" />
        )}

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="text-3xl flex-shrink-0">
                {getTaskTypeIcon(task.task_type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`
                    px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider
                    ${getStatusColor(task.status)}
                  `}>
                    {task.status.replace('_', ' ')}
                  </span>

                  <span className={`
                    px-2 py-0.5 rounded-md text-xs font-bold
                    ${getPriorityColor(task.priority)}
                  `}>
                    P{task.priority}
                  </span>
                </div>

                <h4 className="text-white font-semibold text-sm truncate">
                  {task.title}
                </h4>
              </div>
            </div>

            <button
              onClick={() => toggleExpanded(task.id)}
              className="flex-shrink-0 text-slate-400 hover:text-white transition-colors"
            >
              <svg
                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Progress bar for in-progress tasks */}
          {task.status === 'in_progress' && (
            <div className="mb-3">
              <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 animate-progress-indeterminate" />
              </div>
            </div>
          )}

          {/* Quick info */}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="text-slate-500">🕐</span>
              {formatRelativeTime(task.updated_at)}
            </span>

            {task.duration_ms && (
              <span className="flex items-center gap-1">
                <span className="text-slate-500">⏱️</span>
                {formatDuration(task.duration_ms)}
              </span>
            )}

            {task.attempts > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-slate-500">🔄</span>
                {task.attempts}/{task.max_attempts}
              </span>
            )}
          </div>

          {/* Expanded details */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
              {task.description && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
                  <p className="text-sm text-slate-300 mt-1">{task.description}</p>
                </div>
              )}

              {task.file_paths && task.file_paths.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Files</label>
                  <div className="mt-1 space-y-1">
                    {task.file_paths.map((path, i) => (
                      <div key={i} className="text-xs font-mono text-blue-400 bg-slate-900/50 px-2 py-1 rounded">
                        {path}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {task.result && (
                <div>
                  <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Result</label>
                  <p className="text-sm text-slate-300 mt-1 bg-emerald-500/5 border border-emerald-500/20 rounded p-2">
                    {task.result}
                  </p>
                </div>
              )}

              {task.error_message && (
                <div>
                  <label className="text-xs font-bold text-red-400 uppercase tracking-wider">Error</label>
                  <p className="text-sm text-red-300 mt-1 bg-red-500/5 border border-red-500/20 rounded p-2 font-mono">
                    {task.error_message}
                  </p>
                </div>
              )}

              {task.changes_made && task.changes_made.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Changes Made</label>
                  <ul className="mt-1 space-y-1">
                    {task.changes_made.map((change, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-400">✓</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-500">Created</label>
                  <div className="text-slate-300">{new Date(task.created_at).toLocaleString()}</div>
                </div>
                {task.started_at && (
                  <div>
                    <label className="text-slate-500">Started</label>
                    <div className="text-slate-300">{new Date(task.started_at).toLocaleString()}</div>
                  </div>
                )}
                {task.completed_at && (
                  <div>
                    <label className="text-slate-500">Completed</label>
                    <div className="text-slate-300">{new Date(task.completed_at).toLocaleString()}</div>
                  </div>
                )}
                <div>
                  <label className="text-slate-500">Created By</label>
                  <div className="text-slate-300">{task.created_by}</div>
                </div>
              </div>

              {/* Retry button for failed tasks */}
              {task.status === 'failed' && task.attempts < task.max_attempts && (
                <button
                  onClick={() => retryTask(task.id)}
                  disabled={isRetrying}
                  className="w-full mt-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isRetrying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      🔄 Retry Task
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render task section
  const renderSection = (title: string, icon: string, tasks: AgentTask[], color: string) => {
    if (tasks.length === 0) return null;

    return (
      <div className="mb-6">
        <div className={`flex items-center gap-3 mb-4 pb-2 border-b ${color}`}>
          <span className="text-2xl">{icon}</span>
          <h3 className="text-lg font-bold text-white">
            {title}
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({tasks.length})
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.slice(0, maxItems).map(renderTaskCard)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
          <p className="text-slate-400">Loading mystical task queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Mystical Background */}
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/10 via-indigo-600/10 to-purple-600/10 rounded-2xl blur-2xl opacity-50" />

      <div className="relative bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 backdrop-blur-sm border-2 border-purple-500/20 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative border-b border-purple-500/20 bg-gradient-to-r from-slate-900/50 via-slate-800/50 to-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/50 animate-pulse">
                  <span className="text-2xl">⚙️</span>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
              </div>

              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  🌟 Archie's Task Forge 🌟
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Witness the autonomous spellwork in action
                </p>
              </div>
            </div>

            {/* Refresh button */}
            <button
              onClick={fetchTasks}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-all flex items-center gap-2"
            >
              <span>🔄</span>
              Refresh
            </button>
          </div>

          {/* Stats Panel */}
          {showStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Total Tasks</div>
                <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                <div className="text-xs text-purple-400 uppercase tracking-wider">Pending</div>
                <div className="text-2xl font-bold text-purple-300 mt-1">{stats.pending}</div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="text-xs text-blue-400 uppercase tracking-wider">In Progress</div>
                <div className="text-2xl font-bold text-blue-300 mt-1">{stats.in_progress}</div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                <div className="text-xs text-emerald-400 uppercase tracking-wider">Completed</div>
                <div className="text-2xl font-bold text-emerald-300 mt-1">{stats.completed}</div>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="text-xs text-red-400 uppercase tracking-wider">Failed</div>
                <div className="text-2xl font-bold text-red-300 mt-1">{stats.failed}</div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Success Rate</div>
                <div className="text-2xl font-bold text-emerald-300 mt-1">{stats.successRate.toFixed(0)}%</div>
              </div>
            </div>
          )}

          {/* Filters */}
          {showFilters && (
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-xs text-slate-400 font-medium">Filter:</label>

              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
              />

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as TaskStatus | 'all')}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
              >
                <option value="all">All Status</option>
                <option value="pending">⏳ Pending</option>
                <option value="in_progress">⚡ In Progress</option>
                <option value="completed">✅ Completed</option>
                <option value="failed">❌ Failed</option>
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as TaskType | 'all')}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
              >
                <option value="all">All Types</option>
                <option value="monitor_errors">🔍 Monitor Errors</option>
                <option value="optimize_performance">⚡ Optimize Performance</option>
                <option value="fix_bugs">🔧 Fix Bugs</option>
                <option value="run_tests">🧪 Run Tests</option>
                <option value="analyze_logs">📊 Analyze Logs</option>
                <option value="security_scan">🛡️ Security Scan</option>
                <option value="dependency_update">📦 Update Dependencies</option>
                <option value="code_cleanup">🧹 Code Cleanup</option>
                <option value="documentation_update">📚 Update Documentation</option>
              </select>
            </div>
          )}
        </div>

        {/* Task Sections */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 opacity-50">🧙‍♂️</div>
              <p className="text-slate-500 font-medium">No tasks found</p>
              <p className="text-xs text-slate-600 mt-2">The task forge is quiet... for now.</p>
            </div>
          ) : (
            <>
              {renderSection('In Progress', '⚡', groupedTasks.in_progress, 'border-blue-500/30')}
              {renderSection('Pending', '⏳', groupedTasks.pending, 'border-purple-500/30')}
              {renderSection('Failed', '❌', groupedTasks.failed, 'border-red-500/30')}
              {renderSection('Completed', '✅', groupedTasks.completed, 'border-emerald-500/30')}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-purple-500/20 bg-slate-900/50 px-6 py-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </span>
            <span className="text-slate-600">
              Task forge powered by Archie's mystical energies ✨
            </span>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.9; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }

        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
