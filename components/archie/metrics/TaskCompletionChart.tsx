'use client';

import React from 'react';

interface DataPoint {
  date?: string;
  week?: string;
  month?: string;
  completed: number;
  failed: number;
}

interface TaskCompletionChartProps {
  data: DataPoint[];
  timeRange: 'daily' | 'weekly' | 'monthly';
}

export function TaskCompletionChart({ data, timeRange }: TaskCompletionChartProps) {
  const maxValue = Math.max(
    ...data.map(d => d.completed + d.failed),
    1
  );

  const getLabel = (point: DataPoint): string => {
    if (point.date) {
      const date = new Date(point.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
    if (point.week) return point.week;
    if (point.month) return point.month;
    return '';
  };

  const totalCompleted = data.reduce((sum, d) => sum + d.completed, 0);
  const totalFailed = data.reduce((sum, d) => sum + d.failed, 0);
  const successRate = totalCompleted + totalFailed > 0
    ? (totalCompleted / (totalCompleted + totalFailed)) * 100
    : 0;

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Task Completion Trends
        </h3>
        <p className="text-sm text-slate-400">
          Tracking success over time ({timeRange})
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-400">{totalCompleted}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">Completed</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-400">{totalFailed}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">Failed</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-400">{successRate.toFixed(1)}%</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">Success</div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-xs text-slate-500">
          <span>{maxValue}</span>
          <span>{Math.floor(maxValue * 0.75)}</span>
          <span>{Math.floor(maxValue * 0.5)}</span>
          <span>{Math.floor(maxValue * 0.25)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="absolute left-12 right-0 top-0 bottom-8">
          {/* Grid lines */}
          <div className="absolute inset-0">
            {[0, 25, 50, 75, 100].map((percent) => (
              <div
                key={percent}
                className="absolute left-0 right-0 border-t border-slate-800/50"
                style={{ top: `${100 - percent}%` }}
              />
            ))}
          </div>

          {/* Bars */}
          <div className="relative h-full flex items-end justify-between gap-1">
            {data.map((point, index) => {
              const total = point.completed + point.failed;
              const completedHeight = maxValue > 0 ? (point.completed / maxValue) * 100 : 0;
              const failedHeight = maxValue > 0 ? (point.failed / maxValue) * 100 : 0;

              return (
                <div key={index} className="flex-1 group relative">
                  <div className="flex flex-col items-stretch justify-end h-full gap-0.5">
                    {/* Failed bar (on top) */}
                    {point.failed > 0 && (
                      <div
                        className="w-full bg-gradient-to-t from-red-600 to-red-500 rounded-t-sm transition-all duration-500 hover:from-red-500 hover:to-red-400"
                        style={{
                          height: `${failedHeight}%`,
                          transitionDelay: `${index * 30}ms`
                        }}
                      />
                    )}
                    {/* Completed bar (on bottom) */}
                    {point.completed > 0 && (
                      <div
                        className={`
                          w-full bg-gradient-to-t from-green-600 to-green-500 transition-all duration-500 hover:from-green-500 hover:to-green-400
                          ${point.failed === 0 ? 'rounded-t-sm' : ''}
                        `}
                        style={{
                          height: `${completedHeight}%`,
                          transitionDelay: `${index * 30}ms`
                        }}
                      />
                    )}
                  </div>

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                      <div className="font-bold text-white mb-1">{getLabel(point)}</div>
                      <div className="flex items-center gap-2 text-green-400">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>Completed: {point.completed}</span>
                      </div>
                      <div className="flex items-center gap-2 text-red-400">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span>Failed: {point.failed}</span>
                      </div>
                      <div className="mt-1 pt-1 border-t border-slate-700 text-slate-300">
                        Total: {total}
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-slate-800 border-r border-b border-slate-700 rotate-45 absolute top-full left-1/2 -translate-x-1/2 -mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* X-axis */}
        <div className="absolute left-12 right-0 bottom-0 h-6 flex justify-between text-xs text-slate-500">
          {data.map((point, index) => {
            // Show every nth label to prevent crowding
            const showLabel = timeRange === 'daily'
              ? index % Math.ceil(data.length / 7) === 0
              : true;

            return showLabel ? (
              <span key={index} className="flex-shrink-0">
                {getLabel(point)}
              </span>
            ) : (
              <span key={index}></span>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-t from-green-600 to-green-500"></div>
          <span className="text-slate-400">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-t from-red-600 to-red-500"></div>
          <span className="text-slate-400">Failed</span>
        </div>
      </div>
    </div>
  );
}
