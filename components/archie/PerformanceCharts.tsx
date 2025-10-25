'use client';

import React from 'react';

interface PerformanceChartsProps {
  hourlyActivity: number[];
  completionRate: number;
  avgTaskDuration: number;
}

export function PerformanceCharts({
  hourlyActivity,
  completionRate,
  avgTaskDuration
}: PerformanceChartsProps) {
  const maxActivity = Math.max(...hourlyActivity, 1);

  // Generate hour labels (last 24 hours)
  const getHourLabel = (index: number): string => {
    const now = new Date();
    const hour = new Date(now.getTime() - (23 - index) * 60 * 60 * 1000);
    return hour.getHours().toString().padStart(2, '0');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Activity Chart */}
      <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-2xl p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-1">Activity (Last 24 Hours)</h3>
          <p className="text-sm text-slate-400">Real-time agent actions by hour</p>
        </div>

        {/* Chart */}
        <div className="relative h-48">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-slate-500">
            <span>{maxActivity}</span>
            <span>{Math.floor(maxActivity / 2)}</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="absolute left-10 right-0 top-0 bottom-8 flex items-end justify-between gap-1">
            {hourlyActivity.map((count, index) => {
              const height = maxActivity > 0 ? (count / maxActivity) * 100 : 0;
              const isRecent = index >= hourlyActivity.length - 6; // Last 6 hours

              return (
                <div key={index} className="flex-1 group relative">
                  {/* Bar */}
                  <div
                    className={`
                      w-full rounded-t-sm transition-all duration-500 ease-out
                      ${isRecent
                        ? 'bg-gradient-to-t from-indigo-500 to-purple-500'
                        : 'bg-gradient-to-t from-slate-700 to-slate-600'}
                      hover:from-indigo-400 hover:to-purple-400
                    `}
                    style={{
                      height: `${height}%`,
                      transitionDelay: `${index * 20}ms`
                    }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <div className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs whitespace-nowrap shadow-xl">
                        <div className="font-bold text-white">{count} actions</div>
                        <div className="text-slate-400">{getHourLabel(index)}:00</div>
                      </div>
                      <div className="w-2 h-2 bg-slate-800 border-r border-b border-slate-700 rotate-45 absolute top-full left-1/2 -translate-x-1/2 -mt-1" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-axis */}
          <div className="absolute left-10 right-0 bottom-0 h-6 flex justify-between text-xs text-slate-500">
            {[0, 6, 12, 18, 23].map((index) => (
              <span key={index} className="flex-shrink-0">
                {getHourLabel(index)}h
              </span>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gradient-to-t from-slate-700 to-slate-600" />
            <span className="text-slate-400">Older</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gradient-to-t from-indigo-500 to-purple-500" />
            <span className="text-slate-400">Recent (6h)</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="space-y-6">
        {/* Completion Rate */}
        <div className="bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-2xl p-6">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-300 mb-1">Completion Rate</h4>
            <p className="text-xs text-slate-500">Tasks completed today</p>
          </div>

          {/* Circular Progress */}
          <div className="relative w-32 h-32 mx-auto mb-4">
            {/* Background circle */}
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                className="text-slate-800"
              />
              {/* Progress circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - completionRate / 100)}`}
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
            </svg>

            {/* Percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {Math.round(completionRate)}%
                </div>
              </div>
            </div>
          </div>

          {/* Status text */}
          <div className="text-center">
            <span className={`
              text-sm font-medium
              ${completionRate >= 80 ? 'text-green-400' :
                completionRate >= 50 ? 'text-yellow-400' :
                'text-orange-400'}
            `}>
              {completionRate >= 80 ? 'Excellent' :
               completionRate >= 50 ? 'Good' :
               'Needs Attention'}
            </span>
          </div>
        </div>

        {/* Avg Task Duration */}
        <div className="bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-2xl p-6">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-300 mb-1">Avg Duration</h4>
            <p className="text-xs text-slate-500">Per task completion</p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {avgTaskDuration}
              </span>
              <span className="text-lg text-slate-400">sec</span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>
                  {avgTaskDuration < 30 ? 'Very Fast' :
                   avgTaskDuration < 60 ? 'Fast' :
                   avgTaskDuration < 120 ? 'Normal' :
                   'Slow'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
