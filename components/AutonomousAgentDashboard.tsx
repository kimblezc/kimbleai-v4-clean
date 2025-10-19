'use client';

/**
 * Autonomous Agent Dashboard v4.0 - Reorganized
 * Updated: Oct 19, 2025
 *
 * Clear 3-Section Structure:
 * 1. ✅ COMPLETED - What Archie finished (with files generated)
 * 2. 🔥 WORKING ON - What Archie is doing RIGHT NOW
 * 3. ⏳ IN QUEUE - What's waiting to be started
 */

import { useState, useEffect } from 'react';

interface AgentStatus {
  agent_state: any;
  statistics: {
    tasks: { total: number; completed: number; failed: number; pending: number };
    findings: { total: number; critical: number; high: number; medium: number };
    logs: { total: number; errors: number; warnings: number };
  };
  latest_report?: any;
  recent_activity: {
    tasks: any[];
    findings: any[];
  };
}

function TaskCard({ task, findings, status }: { task: any; findings: any[]; status: 'completed' | 'in_progress' | 'pending' }) {
  const relatedFinding = findings?.find((f: any) =>
    f.title?.includes(task.title) || f.description?.includes(task.title)
  );
  const files = relatedFinding?.evidence?.files || [];

  const styles = {
    completed: {
      border: 'border-green-500/50',
      icon: '✅',
      iconBg: 'bg-green-500/20 border-green-500',
      badge: 'bg-green-500/20 text-green-400 border-green-500/40',
      badgeText: '✅ COMPLETED',
      progressBar: 'bg-gradient-to-r from-green-500 via-green-400 to-green-500'
    },
    in_progress: {
      border: 'border-blue-500/50',
      icon: '🔄',
      iconBg: 'bg-blue-500/20 border-blue-500',
      badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      badgeText: '🔄 WORKING ON',
      progressBar: 'bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 animate-pulse'
    },
    pending: {
      border: 'border-gray-700',
      icon: '⏳',
      iconBg: 'bg-gray-800 border-gray-700',
      badge: 'bg-gray-700 text-gray-400 border-gray-600',
      badgeText: '⏳ IN QUEUE',
      progressBar: 'bg-gray-700'
    }
  };

  const style = styles[status];
  const progress = status === 'completed' ? 100 : status === 'pending' ? 0 : 40;

  return (
    <div className={`bg-gray-900/50 border-2 ${style.border} rounded-xl p-6 hover:scale-[1.01] transition-all`}>
      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-4xl border-2 ${style.iconBg}`}>
          {style.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              task.priority === 10 ? 'bg-red-600 text-white' : 'bg-orange-600 text-white'
            }`}>
              P{task.priority}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${style.badge}`}>
              {style.badgeText}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{task.title}</h3>
          <p className="text-sm text-gray-400">{task.description}</p>
        </div>
      </div>

      {/* Progress */}
      {status !== 'pending' && (
        <div className="mb-5 bg-gray-950/50 rounded-lg p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-white">Progress</span>
            <span className="text-2xl font-black text-white">{progress}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-4">
            <div
              className={`h-4 rounded-full ${style.progressBar}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Details - Only for completed */}
      {status === 'completed' && files.length > 0 && (
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-green-400">✅ {files.length} production-ready files generated</span>
            <a href="/agent?view=findings" className="text-xs text-green-400 hover:underline">View Files →</a>
          </div>
        </div>
      )}

      {/* In Progress message */}
      {status === 'in_progress' && (
        <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
          <p className="text-sm text-blue-300">
            <span className="animate-pulse">●</span> Archie is working on this now. Will complete in next run (within 5 min)
          </p>
        </div>
      )}

      {/* Pending message */}
      {status === 'pending' && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400">
            ⏳ Queued to start after current work finishes
          </p>
        </div>
      )}
    </div>
  );
}

export default function AutonomousAgentDashboard() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const statusRes = await fetch('/api/agent/status?view=summary');
      const statusData = await statusRes.json();
      setStatus(statusData);
    } catch (error) {
      console.error('Failed to load agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-blue-500"></div>
          <p className="mt-4 text-gray-400">Loading Archie's Dashboard...</p>
        </div>
      </div>
    );
  }

  const completedTasks = status?.recent_activity?.tasks?.filter(t => t.status === 'completed') || [];
  const inProgressTasks = status?.recent_activity?.tasks?.filter(t => t.status === 'in_progress') || [];
  const pendingTasks = status?.recent_activity?.tasks?.filter(t => t.status === 'pending') || [];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-bold text-white mb-2">🦉 Archie's Dashboard</h1>
          <p className="text-gray-400 text-lg">Autonomous Agent • Real-time updates every 30s</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="bg-green-500/10 border-2 border-green-500/40 rounded-xl p-5">
              <div className="text-5xl font-black text-green-400 mb-1">{completedTasks.length}</div>
              <div className="text-sm font-bold text-green-300">✅ Completed</div>
            </div>
            <div className="bg-blue-500/10 border-2 border-blue-500/40 rounded-xl p-5">
              <div className="text-5xl font-black text-blue-400 mb-1">{inProgressTasks.length}</div>
              <div className="text-sm font-bold text-blue-300">🔥 Working On</div>
            </div>
            <div className="bg-gray-800 border-2 border-gray-700 rounded-xl p-5">
              <div className="text-5xl font-black text-gray-400 mb-1">{pendingTasks.length}</div>
              <div className="text-sm font-bold text-gray-400">⏳ In Queue</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-8">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* SECTION 1: COMPLETED */}
          {completedTasks.length > 0 && (
            <div>
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                  <span>✅</span>
                  <span>Completed Work</span>
                  <span className="text-xl text-gray-500">({completedTasks.length})</span>
                </h2>
                <p className="text-gray-400 mt-1">Production-ready code generated by Archie</p>
              </div>
              <div className="space-y-4">
                {completedTasks.map((task: any, idx: number) => (
                  <TaskCard key={idx} task={task} findings={status?.recent_activity?.findings || []} status="completed" />
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: WORKING ON */}
          {inProgressTasks.length > 0 && (
            <div>
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-blue-400 flex items-center gap-3">
                  <span className="animate-pulse">🔥</span>
                  <span>Working On Right Now</span>
                  <span className="text-xl text-gray-500">({inProgressTasks.length})</span>
                </h2>
                <p className="text-gray-400 mt-1">Archie is actively building these right now</p>
              </div>
              <div className="space-y-4">
                {inProgressTasks.map((task: any, idx: number) => (
                  <TaskCard key={idx} task={task} findings={status?.recent_activity?.findings || []} status="in_progress" />
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: PENDING QUEUE */}
          {pendingTasks.length > 0 && (
            <div>
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-400 flex items-center gap-3">
                  <span>⏳</span>
                  <span>In Queue</span>
                  <span className="text-xl text-gray-500">({pendingTasks.length})</span>
                </h2>
                <p className="text-gray-400 mt-1">Waiting to start after current work finishes</p>
              </div>
              <div className="space-y-4">
                {pendingTasks.map((task: any, idx: number) => (
                  <TaskCard key={idx} task={task} findings={status?.recent_activity?.findings || []} status="pending" />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {completedTasks.length === 0 && inProgressTasks.length === 0 && pendingTasks.length === 0 && (
            <div className="text-center py-20">
              <div className="text-8xl mb-6 opacity-50">🦉</div>
              <h3 className="text-2xl font-bold text-white mb-2">No Tasks Yet</h3>
              <p className="text-gray-400">Archie will start working on goals from PROJECT_GOALS.md on his next run</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
