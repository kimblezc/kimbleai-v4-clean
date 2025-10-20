'use client';

/**
 * Autonomous Agent Dashboard v5.0 - 4-Column Layout
 * Updated: Oct 19, 2025
 *
 * Clean 4-Column Structure:
 * 1. ✅ COMPLETED - What's done
 * 2. 🔥 WORKING ON - What's in progress (with reasons)
 * 3. ⏳ PENDING - What's queued (with reasons why not started)
 * 4. 💡 IDEAS - Future improvements
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

  // Filter findings for ideas/suggestions
  const ideas = status?.recent_activity?.findings?.filter((f: any) =>
    f.finding_type === 'improvement' ||
    f.finding_type === 'optimization' ||
    f.detection_method === 'log_analysis' ||
    (f.severity === 'low' && !f.evidence?.files)
  ) || [];

  // Helper to determine why a task is pending
  const getPendingReason = (task: any) => {
    if (inProgressTasks.length > 0) {
      return 'Waiting for current task to complete';
    }
    if (task.scheduled_for && new Date(task.scheduled_for) > new Date()) {
      return 'Scheduled for later';
    }
    if (task.priority < 8) {
      return 'Lower priority - will start when high-priority tasks are done';
    }
    return 'Queued - will start on next agent run';
  };

  // Helper to get progress reason
  const getProgressReason = (task: any) => {
    const metadata = task.metadata || {};
    const completedSubtasks = metadata.completed_tasks?.length || 0;
    const totalSubtasks = metadata.tasks?.length || 0;

    if (completedSubtasks > 0 && totalSubtasks > 0) {
      return `${completedSubtasks}/${totalSubtasks} subtasks completed`;
    }
    if (task.started_at) {
      const elapsed = Math.floor((Date.now() - new Date(task.started_at).getTime()) / 1000);
      return `Running for ${elapsed}s`;
    }
    return 'Just started';
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 px-6 py-12">
        <div className="max-w-[1800px] mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-6xl">🦉</div>
            <div>
              <h1 className="text-5xl font-black text-white mb-2">Archie's Dashboard</h1>
              <p className="text-gray-400 text-lg">Autonomous Agent • Updates every 30s</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-green-500/10 border-2 border-green-500/50 rounded-xl p-6 hover:border-green-500/70 transition-all">
              <div className="text-6xl font-black text-green-400 mb-2">{completedTasks.length}</div>
              <div className="text-sm font-bold text-green-300 uppercase tracking-wider">✅ Completed</div>
            </div>
            <div className="bg-blue-500/10 border-2 border-blue-500/50 rounded-xl p-6 hover:border-blue-500/70 transition-all">
              <div className="text-6xl font-black text-blue-400 mb-2">{inProgressTasks.length}</div>
              <div className="text-sm font-bold text-blue-300 uppercase tracking-wider">🔥 In Progress</div>
            </div>
            <div className="bg-orange-500/10 border-2 border-orange-500/50 rounded-xl p-6 hover:border-orange-500/70 transition-all">
              <div className="text-6xl font-black text-orange-400 mb-2">{pendingTasks.length}</div>
              <div className="text-sm font-bold text-orange-300 uppercase tracking-wider">⏳ Pending</div>
            </div>
            <div className="bg-purple-500/10 border-2 border-purple-500/50 rounded-xl p-6 hover:border-purple-500/70 transition-all">
              <div className="text-6xl font-black text-purple-400 mb-2">{ideas.length}</div>
              <div className="text-sm font-bold text-purple-300 uppercase tracking-wider">💡 Ideas</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Column Layout */}
      <div className="px-6 py-8">
        <div className="max-w-[1800px] mx-auto">
          <div className="grid grid-cols-4 gap-6">
            {/* COLUMN 1: COMPLETED */}
            <div className="flex flex-col">
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-2 border-green-500/50 rounded-xl p-5 mb-4">
                <h2 className="text-2xl font-black text-green-400 flex items-center gap-2">
                  <span>✅</span>
                  <span>COMPLETED</span>
                </h2>
                <p className="text-sm text-green-200/80 mt-1">Production ready</p>
              </div>

              <div className="space-y-3 flex-1">
                {completedTasks.length === 0 ? (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 text-center">
                    <div className="text-4xl mb-2 opacity-40">✅</div>
                    <p className="text-sm text-gray-500">No completed tasks yet</p>
                  </div>
                ) : (
                  completedTasks.map((task: any, idx: number) => {
                    const findings = status?.recent_activity?.findings || [];
                    const relatedFinding = findings.find((f: any) =>
                      f.title?.includes(task.title) || f.description?.includes(task.title)
                    );
                    const fileCount = relatedFinding?.evidence?.files?.length || 0;

                    return (
                      <div key={idx} className="bg-gray-900/80 border-2 border-green-500/40 rounded-lg p-4 hover:border-green-500/60 transition-all hover:scale-[1.02]">
                        <div className="flex items-start gap-2 mb-3">
                          <div className="text-2xl flex-shrink-0">✅</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full">
                                P{task.priority}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {new Date(task.completed_at).toLocaleDateString()}
                              </span>
                            </div>
                            <h3 className="font-bold text-white text-sm leading-tight mb-1">{task.title}</h3>
                            <p className="text-xs text-gray-400 line-clamp-2 leading-snug">{task.description}</p>
                          </div>
                        </div>

                        {/* Progress Bar - Always 100% */}
                        <div className="mb-3">
                          <div className="w-full bg-gray-800 rounded-full h-2">
                            <div className="h-2 rounded-full bg-gradient-to-r from-green-500 to-green-400 w-full"></div>
                          </div>
                        </div>

                        {/* Files Generated */}
                        {fileCount > 0 && (
                          <div className="bg-green-500/10 rounded px-3 py-2 border border-green-500/30">
                            <p className="text-xs text-green-300 font-medium">
                              📁 {fileCount} file{fileCount > 1 ? 's' : ''} generated
                            </p>
                          </div>
                        )}

                        {fileCount === 0 && (
                          <div className="text-xs text-gray-600">
                            ✓ Task completed successfully
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLUMN 2: IN PROGRESS */}
            <div className="flex flex-col">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-2 border-blue-500/50 rounded-xl p-5 mb-4">
                <h2 className="text-2xl font-black text-blue-400 flex items-center gap-2">
                  <span className="animate-pulse">🔥</span>
                  <span>IN PROGRESS</span>
                </h2>
                <p className="text-sm text-blue-200/80 mt-1">Working on now</p>
              </div>

              <div className="space-y-3 flex-1">
                {inProgressTasks.length === 0 ? (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 text-center">
                    <div className="text-4xl mb-2 opacity-40">🔥</div>
                    <p className="text-sm text-gray-500">No active tasks</p>
                  </div>
                ) : (
                  inProgressTasks.map((task: any, idx: number) => {
                    const progress = 40; // Default progress for in-progress tasks
                    const reason = getProgressReason(task);

                    return (
                      <div key={idx} className="bg-gray-900/80 border-2 border-blue-500/40 rounded-lg p-4 hover:border-blue-500/60 transition-all hover:scale-[1.02]">
                        <div className="flex items-start gap-2 mb-3">
                          <div className="text-2xl flex-shrink-0 animate-pulse">🔄</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full">
                                P{task.priority}
                              </span>
                              <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full animate-pulse">
                                ACTIVE
                              </span>
                            </div>
                            <h3 className="font-bold text-white text-sm leading-tight mb-1">{task.title}</h3>
                            <p className="text-xs text-gray-400 line-clamp-2 leading-snug">{task.description}</p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-blue-300 font-bold uppercase">{reason}</span>
                            <span className="text-xs font-black text-blue-400">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 animate-pulse"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="bg-blue-500/10 rounded px-3 py-2 border border-blue-500/30">
                          <p className="text-xs text-blue-300">
                            <span className="animate-pulse">●</span> Will complete within 5 min
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLUMN 3: PENDING */}
            <div className="flex flex-col">
              <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-2 border-orange-500/50 rounded-xl p-5 mb-4">
                <h2 className="text-2xl font-black text-orange-400 flex items-center gap-2">
                  <span>⏳</span>
                  <span>PENDING</span>
                </h2>
                <p className="text-sm text-orange-200/80 mt-1">Waiting to start</p>
              </div>

              <div className="space-y-3 flex-1">
                {pendingTasks.length === 0 ? (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 text-center">
                    <div className="text-4xl mb-2 opacity-40">⏳</div>
                    <p className="text-sm text-gray-500">No pending tasks</p>
                  </div>
                ) : (
                  pendingTasks.map((task: any, idx: number) => {
                    const reason = getPendingReason(task);

                    return (
                      <div key={idx} className="bg-gray-900/80 border-2 border-orange-500/40 rounded-lg p-4 hover:border-orange-500/60 transition-all hover:scale-[1.02]">
                        <div className="flex items-start gap-2 mb-3">
                          <div className="text-2xl flex-shrink-0">⏳</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full">
                                P{task.priority}
                              </span>
                              <span className="px-2 py-0.5 bg-orange-600 text-white text-[10px] font-bold rounded-full">
                                QUEUED
                              </span>
                            </div>
                            <h3 className="font-bold text-white text-sm leading-tight mb-1">{task.title}</h3>
                            <p className="text-xs text-gray-400 line-clamp-2 leading-snug">{task.description}</p>
                          </div>
                        </div>

                        {/* Why Not Started */}
                        <div className="bg-orange-500/10 rounded px-3 py-2 border border-orange-500/30">
                          <p className="text-[10px] text-orange-300 font-bold uppercase mb-1">Why Not Started Yet:</p>
                          <p className="text-xs text-orange-200">{reason}</p>
                        </div>

                        {/* Scheduled Time */}
                        {task.scheduled_for && (
                          <div className="mt-2 text-xs text-gray-600">
                            📅 Scheduled: {new Date(task.scheduled_for).toLocaleString()}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLUMN 4: IDEAS */}
            <div className="flex flex-col">
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-2 border-purple-500/50 rounded-xl p-5 mb-4">
                <h2 className="text-2xl font-black text-purple-400 flex items-center gap-2">
                  <span>💡</span>
                  <span>IDEAS</span>
                </h2>
                <p className="text-sm text-purple-200/80 mt-1">Future improvements</p>
              </div>

              <div className="space-y-3 flex-1">
                {ideas.length === 0 ? (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 text-center">
                    <div className="text-4xl mb-2 opacity-40">💡</div>
                    <p className="text-sm text-gray-500">No ideas yet</p>
                  </div>
                ) : (
                  ideas.map((idea: any, idx: number) => (
                    <div key={idx} className="bg-gray-900/80 border-2 border-purple-500/40 rounded-lg p-4 hover:border-purple-500/60 transition-all hover:scale-[1.02]">
                      <div className="flex items-start gap-2 mb-3">
                        <div className="text-2xl flex-shrink-0">💡</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              idea.severity === 'low' ? 'bg-green-600 text-white' :
                              idea.severity === 'medium' ? 'bg-yellow-600 text-white' :
                              'bg-blue-600 text-white'
                            }`}>
                              {idea.finding_type?.toUpperCase() || 'IDEA'}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {new Date(idea.detected_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-bold text-white text-sm leading-tight mb-1">{idea.title}</h3>
                          <p className="text-xs text-gray-400 line-clamp-3 leading-snug">{idea.description}</p>
                        </div>
                      </div>

                      {/* Location */}
                      {idea.location && (
                        <div className="bg-purple-500/10 rounded px-3 py-2 border border-purple-500/30">
                          <p className="text-[10px] text-purple-300 font-bold uppercase mb-1">Location:</p>
                          <code className="text-xs text-purple-200 break-all">{idea.location}</code>
                        </div>
                      )}

                      {!idea.location && (
                        <div className="text-xs text-gray-600">
                          💭 Suggested improvement
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Empty State */}
          {completedTasks.length === 0 && inProgressTasks.length === 0 && pendingTasks.length === 0 && ideas.length === 0 && (
            <div className="text-center py-20">
              <div className="text-8xl mb-6 opacity-50">🦉</div>
              <h3 className="text-2xl font-bold text-white mb-2">Archie is Ready</h3>
              <p className="text-gray-400">Tasks will appear here on the next agent run (every 5 minutes)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
