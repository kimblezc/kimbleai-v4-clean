'use client';

/**
 * Archie's Consolidated Dashboard - v2.0
 * Combines /agent and /accomplishments into one readable view
 *
 * Updated: Oct 21, 2025
 *
 * Layout: 4 columns with clear boundaries
 * - Completed Tasks (with details)
 * - In Progress Tasks (with % complete and updates)
 * - Pending Tasks (with explanations)
 * - Archie Suggestions (based on project goals)
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Clock, Lightbulb, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

export default function ArchieConsolidatedDashboard() {
  const router = useRouter();
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
      <div className="flex items-center justify-center h-screen bg-[#0f0f0f]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🦉</div>
          <p className="text-gray-400">Loading Archie's Dashboard...</p>
        </div>
      </div>
    );
  }

  // Get tasks from agent API
  const completedTasks = status?.recent_activity?.tasks?.filter(t => t.status === 'completed') || [];
  const inProgressTasks = status?.recent_activity?.tasks?.filter(t => t.status === 'in_progress') || [];
  const pendingTasks = status?.recent_activity?.tasks?.filter(t => t.status === 'pending') || [];

  // Get suggestions from findings
  const suggestions = status?.recent_activity?.findings?.filter((f: any) =>
    f.finding_type === 'improvement' ||
    f.finding_type === 'optimization' ||
    f.severity === 'low'
  ) || [];

  // Helper: Get progress percentage
  const getTaskProgress = (task: any) => {
    const metadata = task.metadata || {};
    const completedSubtasks = metadata.completed_tasks?.length || 0;
    const totalSubtasks = metadata.tasks?.length || 0;

    if (totalSubtasks > 0) {
      return Math.round((completedSubtasks / totalSubtasks) * 100);
    }

    // Default progress for in-progress tasks
    return 40;
  };

  // Helper: Get progress description
  const getProgressDescription = (task: any) => {
    const metadata = task.metadata || {};
    const completedSubtasks = metadata.completed_tasks?.length || 0;
    const totalSubtasks = metadata.tasks?.length || 0;

    if (completedSubtasks > 0 && totalSubtasks > 0) {
      return `${completedSubtasks} of ${totalSubtasks} subtasks completed`;
    }

    if (task.started_at) {
      const elapsed = Math.floor((Date.now() - new Date(task.started_at).getTime()) / 60000);
      return `Running for ${elapsed} minute${elapsed !== 1 ? 's' : ''}`;
    }

    return 'Just started';
  };

  // Helper: Get pending reason
  const getPendingReason = (task: any) => {
    if (inProgressTasks.length > 0) {
      return 'Waiting for current task to complete';
    }

    if (task.scheduled_for && new Date(task.scheduled_for) > new Date()) {
      const date = new Date(task.scheduled_for).toLocaleString();
      return `Scheduled for ${date}`;
    }

    if (task.priority < 8) {
      return 'Lower priority - will start when high-priority tasks are done';
    }

    return 'In queue - will start on next agent run (every 5 minutes)';
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <div className="bg-[#171717] border-b-2 border-[#333]">
        <div className="max-w-[1800px] mx-auto px-6 py-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="text-6xl">🦉</div>
            <div>
              <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                Archie's Dashboard
              </h1>
              <p className="text-gray-400 text-lg">
                Autonomous Agent System • Updates every 30 seconds
              </p>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-green-900/30 border-2 border-green-500 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-400 mb-1">{completedTasks.length}</div>
              <div className="text-sm text-green-300">✅ Completed</div>
            </div>
            <div className="bg-blue-900/30 border-2 border-blue-500 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-400 mb-1">{inProgressTasks.length}</div>
              <div className="text-sm text-blue-300">🔄 In Progress</div>
            </div>
            <div className="bg-orange-900/30 border-2 border-orange-500 rounded-lg p-4">
              <div className="text-3xl font-bold text-orange-400 mb-1">{pendingTasks.length}</div>
              <div className="text-sm text-orange-300">⏳ Pending</div>
            </div>
            <div className="bg-purple-900/30 border-2 border-purple-500 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-400 mb-1">{suggestions.length}</div>
              <div className="text-sm text-purple-300">💡 Suggestions</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Column Layout */}
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        <div className="grid grid-cols-4 gap-6">

          {/* COLUMN 1: COMPLETED TASKS */}
          <div className="border-2 border-green-500 rounded-lg bg-[#1a1a1a] p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-green-500/50">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-bold text-green-400">COMPLETED</h2>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {completedTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-sm">No completed tasks yet</p>
                </div>
              ) : (
                completedTasks.map((task: any, idx: number) => (
                  <div key={idx} className="bg-[#0a0a0a] border border-green-500/30 rounded p-3 hover:border-green-500/60 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded">
                        P{task.priority}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(task.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-white mb-1">{task.title}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">{task.description}</p>

                    {/* Progress Bar - 100% */}
                    <div className="mt-3 w-full bg-gray-800 rounded-full h-2">
                      <div className="h-2 rounded-full bg-green-500 w-full"></div>
                    </div>

                    {task.result && (
                      <div className="mt-2 text-xs text-green-300 bg-green-900/20 rounded p-2">
                        <strong>Result:</strong> {task.result}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: IN PROGRESS TASKS */}
          <div className="border-2 border-blue-500 rounded-lg bg-[#1a1a1a] p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-blue-500/50">
              <TrendingUp className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-blue-400">IN PROGRESS</h2>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {inProgressTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🔄</div>
                  <p className="text-sm">No active tasks</p>
                </div>
              ) : (
                inProgressTasks.map((task: any, idx: number) => {
                  const progress = getTaskProgress(task);
                  const description = getProgressDescription(task);

                  return (
                    <div key={idx} className="bg-[#0a0a0a] border border-blue-500/30 rounded p-3 hover:border-blue-500/60 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded animate-pulse">
                          P{task.priority} • ACTIVE
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-white mb-1">{task.title}</h3>
                      <p className="text-xs text-gray-400 leading-relaxed mb-3">{task.description}</p>

                      {/* Progress Info */}
                      <div className="bg-blue-900/20 rounded p-2 mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-blue-300 font-semibold">Progress</span>
                          <span className="text-xs font-bold text-blue-400">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                          <div
                            className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-blue-200">{description}</p>
                      </div>

                      <div className="text-xs text-gray-500">
                        ⏱️ Will complete within 5 minutes
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMN 3: PENDING TASKS */}
          <div className="border-2 border-orange-500 rounded-lg bg-[#1a1a1a] p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-orange-500/50">
              <Clock className="w-6 h-6 text-orange-400" />
              <h2 className="text-xl font-bold text-orange-400">PENDING</h2>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">⏳</div>
                  <p className="text-sm">No pending tasks</p>
                </div>
              ) : (
                pendingTasks.map((task: any, idx: number) => {
                  const reason = getPendingReason(task);

                  return (
                    <div key={idx} className="bg-[#0a0a0a] border border-orange-500/30 rounded p-3 hover:border-orange-500/60 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <span className="px-2 py-0.5 bg-orange-600 text-white text-xs font-bold rounded">
                          P{task.priority} • QUEUED
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-white mb-1">{task.title}</h3>
                      <p className="text-xs text-gray-400 leading-relaxed mb-3">{task.description}</p>

                      {/* Why Not Started */}
                      <div className="bg-orange-900/20 rounded p-2">
                        <div className="text-xs text-orange-300 font-semibold mb-1">
                          Why Not Started Yet:
                        </div>
                        <p className="text-xs text-orange-200 leading-relaxed">{reason}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMN 4: ARCHIE SUGGESTIONS */}
          <div className="border-2 border-purple-500 rounded-lg bg-[#1a1a1a] p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-purple-500/50">
              <Lightbulb className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold text-purple-400">SUGGESTIONS</h2>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {/* Project Goals from PROJECT_GOALS.md */}
              <div className="bg-purple-900/20 border border-purple-500/30 rounded p-3">
                <div className="text-xs text-purple-300 font-semibold mb-2">🎯 Top Project Goals</div>
                <div className="space-y-2 text-xs text-gray-300">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">P10</span>
                    <span>Gmail Search Excellence - 95%+ relevance, &lt;2s response</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">P10</span>
                    <span>Google Drive Integration - All file types, fast queries</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">P10</span>
                    <span>File Search Optimization - Stay under Supabase limits</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold">P9</span>
                    <span>Eliminate 504 Timeouts - Streaming, request queuing</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold">P9</span>
                    <span>Cost Tracking - Real-time dashboard for all services</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold">P9</span>
                    <span>Project Page Speed - 3min → &lt;500ms load time</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold">P9</span>
                    <span>Chat Speed - 90% under 8 seconds</span>
                  </div>
                </div>
              </div>

              {/* AI-Generated Suggestions */}
              {suggestions.map((suggestion: any, idx: number) => (
                <div key={idx} className="bg-[#0a0a0a] border border-purple-500/30 rounded p-3 hover:border-purple-500/60 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                      suggestion.severity === 'low' ? 'bg-green-600 text-white' :
                      suggestion.severity === 'medium' ? 'bg-yellow-600 text-white' :
                      'bg-purple-600 text-white'
                    }`}>
                      {suggestion.finding_type?.toUpperCase() || 'SUGGESTION'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(suggestion.detected_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">{suggestion.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{suggestion.description}</p>

                  {suggestion.location && (
                    <div className="mt-2 text-xs text-purple-300 bg-purple-900/20 rounded p-2 font-mono">
                      📍 {suggestion.location}
                    </div>
                  )}
                </div>
              ))}

              {suggestions.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <div className="text-4xl mb-2">💡</div>
                  <p className="text-sm">Archie is analyzing...</p>
                  <p className="text-xs mt-1">New suggestions appear as Archie finds opportunities</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 bg-[#1a1a1a] border border-[#333] rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="text-4xl">🦉</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">About Archie</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-3">
                Archie is your autonomous agent - a wise horned owl with green eyes who runs every 5 minutes.
                He monitors your system, fixes bugs, optimizes performance, and works toward the goals in PROJECT_GOALS.md.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                <div>
                  <strong className="text-green-400">✓ Auto-fixes bugs</strong>
                  <br />Detects errors and deploys fixes automatically
                </div>
                <div>
                  <strong className="text-blue-400">⚡ Optimizes performance</strong>
                  <br />Improves speed and reduces costs
                </div>
                <div>
                  <strong className="text-purple-400">💡 Suggests improvements</strong>
                  <br />Analyzes code and finds opportunities
                </div>
                <div>
                  <strong className="text-orange-400">📊 Tracks progress</strong>
                  <br />Works toward project goals systematically
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
