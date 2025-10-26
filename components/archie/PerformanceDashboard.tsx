'use client';

import React, { useState, useEffect } from 'react';
import { TaskCompletionChart } from './metrics/TaskCompletionChart';
import { SuccessRateChart } from './metrics/SuccessRateChart';
import { TimeSavedCalculator } from './metrics/TimeSavedCalculator';
import { CostAnalysis } from './metrics/CostAnalysis';
import { ActivityHeatmap } from './metrics/ActivityHeatmap';

interface PerformanceData {
  overview: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    successRate: number;
    totalTimeSaved: number; // in minutes
    totalCost: number;
    roi: number;
  };
  timeSeriesData: {
    daily: Array<{ date: string; completed: number; failed: number }>;
    weekly: Array<{ week: string; completed: number; failed: number }>;
    monthly: Array<{ month: string; completed: number; failed: number }>;
  };
  agentBreakdown: Array<{
    agentType: string;
    completed: number;
    failed: number;
    avgDuration: number;
    successRate: number;
  }>;
  taskTypeBreakdown: Array<{
    taskType: string;
    count: number;
    avgDuration: number;
    timeSaved: number;
    color: string;
  }>;
  activityHeatmap: {
    hourly: number[][];  // 7 days x 24 hours
    weekday: string[];
  };
  costBreakdown: {
    byAgent: Array<{ name: string; cost: number; tasks: number }>;
    byTaskType: Array<{ name: string; cost: number; tasks: number }>;
  };
}

export function PerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/archie/performance');
      if (!response.ok) throw new Error('Failed to fetch performance data');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching performance data:', err);
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-2xl p-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-purple-500/30"></div>
            <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-400">Loading performance analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm border-2 border-red-500/30 rounded-2xl p-8">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-bold text-white mb-2">Unable to Load Performance Data</h3>
          <p className="text-slate-400 mb-4">{error || 'An unexpected error occurred'}</p>
          <button
            onClick={fetchPerformanceData}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <span className="relative">
              <span className="absolute inset-0 blur-xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-50"></span>
              <span className="relative">Performance Analytics</span>
            </span>
          </h2>
          <p className="text-slate-400">Proving Archie's value through data-driven insights</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 bg-slate-900/50 p-1 rounded-lg border-2 border-slate-800">
          {(['daily', 'weekly', 'monthly'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-all
                ${timeRange === range
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'}
              `}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ROI Impact Summary - Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/30 via-slate-900/50 to-indigo-900/30 backdrop-blur-sm border-2 border-purple-500/30 rounded-2xl p-8">
        {/* Mystical background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(168,85,247,0.15),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.15),transparent_50%)]"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">This Month's Impact</h3>
              <p className="text-purple-300">Tangible value delivered by Archie</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Tasks Completed */}
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                {data.overview.completedTasks}
              </div>
              <div className="text-sm text-slate-400 uppercase tracking-wider">Tasks Completed</div>
            </div>

            {/* Time Saved */}
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                {(data.overview.totalTimeSaved / 60).toFixed(1)}h
              </div>
              <div className="text-sm text-slate-400 uppercase tracking-wider">Time Saved</div>
            </div>

            {/* Total Cost */}
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                ${data.overview.totalCost.toFixed(2)}
              </div>
              <div className="text-sm text-slate-400 uppercase tracking-wider">Total Cost</div>
            </div>

            {/* ROI */}
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-2">
                {data.overview.roi.toFixed(0)}%
              </div>
              <div className="text-sm text-slate-400 uppercase tracking-wider">ROI</div>
            </div>
          </div>

          {/* Success Rate Progress Bar */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">Overall Success Rate</span>
              <span className="text-sm font-bold text-green-400">{data.overview.successRate.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${data.overview.successRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Completion Chart */}
        <TaskCompletionChart
          data={data.timeSeriesData[timeRange]}
          timeRange={timeRange}
        />

        {/* Success Rate by Agent */}
        <SuccessRateChart
          data={data.agentBreakdown}
        />

        {/* Time Saved Calculator */}
        <TimeSavedCalculator
          taskTypeBreakdown={data.taskTypeBreakdown}
          totalTimeSaved={data.overview.totalTimeSaved}
        />

        {/* Cost Analysis */}
        <CostAnalysis
          costBreakdown={data.costBreakdown}
          totalCost={data.overview.totalCost}
          roi={data.overview.roi}
        />
      </div>

      {/* Activity Heatmap - Full Width */}
      <ActivityHeatmap
        hourlyData={data.activityHeatmap.hourly}
        weekdays={data.activityHeatmap.weekday}
      />

      {/* Agent Performance Breakdown */}
      <div className="bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Agent Performance Breakdown
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <th className="pb-3">Agent Type</th>
                <th className="pb-3 text-right">Completed</th>
                <th className="pb-3 text-right">Failed</th>
                <th className="pb-3 text-right">Success Rate</th>
                <th className="pb-3 text-right">Avg Duration</th>
                <th className="pb-3 text-right">Performance</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {data.agentBreakdown.map((agent, index) => (
                <tr key={index} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
                      <span className="font-medium text-white">{agent.agentType}</span>
                    </div>
                  </td>
                  <td className="py-4 text-right text-green-400 font-medium">{agent.completed}</td>
                  <td className="py-4 text-right text-red-400 font-medium">{agent.failed}</td>
                  <td className="py-4 text-right">
                    <span className={`
                      font-bold
                      ${agent.successRate >= 90 ? 'text-green-400' :
                        agent.successRate >= 70 ? 'text-yellow-400' :
                        'text-orange-400'}
                    `}>
                      {agent.successRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-4 text-right text-slate-300">
                    {(agent.avgDuration / 1000).toFixed(1)}s
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {agent.successRate >= 90 ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-bold">
                          Excellent
                        </span>
                      ) : agent.successRate >= 70 ? (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold">
                          Good
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs font-bold">
                          Needs Optimization
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
