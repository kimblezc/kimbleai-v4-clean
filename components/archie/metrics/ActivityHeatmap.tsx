'use client';

import React, { useState } from 'react';

interface ActivityHeatmapProps {
  hourlyData: number[][]; // 7 days x 24 hours
  weekdays: string[];
}

export function ActivityHeatmap({ hourlyData, weekdays }: ActivityHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);

  // Find max value for color scaling
  const maxActivity = Math.max(...hourlyData.flat(), 1);

  // Generate color intensity based on activity level
  const getColorIntensity = (value: number): string => {
    const intensity = value / maxActivity;

    if (intensity === 0) return 'bg-slate-800/30';
    if (intensity < 0.2) return 'bg-purple-900/40';
    if (intensity < 0.4) return 'bg-purple-800/60';
    if (intensity < 0.6) return 'bg-purple-700/80';
    if (intensity < 0.8) return 'bg-purple-600';
    return 'bg-purple-500';
  };

  const getGlowIntensity = (value: number): string => {
    const intensity = value / maxActivity;
    if (intensity < 0.6) return '';
    if (intensity < 0.8) return 'shadow-[0_0_8px_rgba(168,85,247,0.5)]';
    return 'shadow-[0_0_12px_rgba(168,85,247,0.8)]';
  };

  // Hours of day (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Get peak activity info
  const peakActivity = { value: 0, day: 0, hour: 0 };
  hourlyData.forEach((dayData, dayIndex) => {
    dayData.forEach((value, hourIndex) => {
      if (value > peakActivity.value) {
        peakActivity.value = value;
        peakActivity.day = dayIndex;
        peakActivity.hour = hourIndex;
      }
    });
  });

  const totalActivity = hourlyData.flat().reduce((sum, val) => sum + val, 0);
  const avgActivity = totalActivity / (7 * 24);

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Activity Heatmap - When Archie Works
        </h3>
        <p className="text-sm text-slate-400">
          Hourly activity patterns across the week
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/30 rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-400">{totalActivity}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">Total Activities</div>
        </div>
        <div className="bg-slate-800/30 rounded-lg p-3">
          <div className="text-2xl font-bold text-indigo-400">{avgActivity.toFixed(1)}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">Avg per Hour</div>
        </div>
        <div className="bg-slate-800/30 rounded-lg p-3">
          <div className="text-2xl font-bold text-pink-400">
            {weekdays[peakActivity.day]?.substring(0, 3)} {peakActivity.hour}:00
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">Peak Activity</div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Hour labels */}
          <div className="flex mb-2">
            <div className="w-16 flex-shrink-0"></div>
            <div className="flex-1 flex">
              {hours.map((hour) => {
                // Show labels for every 3 hours
                const showLabel = hour % 3 === 0;
                return (
                  <div key={hour} className="flex-1 text-center text-xs text-slate-500">
                    {showLabel ? `${hour}h` : ''}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Heatmap grid */}
          {weekdays.map((day, dayIndex) => (
            <div key={dayIndex} className="flex items-center mb-1">
              {/* Day label */}
              <div className="w-16 flex-shrink-0 text-sm font-medium text-slate-400 pr-2">
                {day}
              </div>

              {/* Hour cells */}
              <div className="flex-1 flex gap-1">
                {hours.map((hour) => {
                  const value = hourlyData[dayIndex]?.[hour] || 0;
                  const isHovered = hoveredCell?.day === dayIndex && hoveredCell?.hour === hour;

                  return (
                    <div
                      key={hour}
                      className={`
                        flex-1 aspect-square rounded-sm cursor-pointer
                        transition-all duration-200
                        ${getColorIntensity(value)}
                        ${getGlowIntensity(value)}
                        ${isHovered ? 'scale-110 ring-2 ring-purple-400 z-10' : ''}
                        hover:scale-110 hover:z-10
                      `}
                      onMouseEnter={() => setHoveredCell({ day: dayIndex, hour })}
                      onMouseLeave={() => setHoveredCell(null)}
                      title={`${day} ${hour}:00 - ${value} activities`}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Tooltip */}
          {hoveredCell && (
            <div className="mt-4 p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-white">
                    {weekdays[hoveredCell.day]} at {hoveredCell.hour}:00
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-purple-400">
                    {hourlyData[hoveredCell.day]?.[hoveredCell.hour] || 0}
                  </span>
                  <span className="text-slate-400 ml-1">activities</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 uppercase tracking-wider">Activity Level</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Less</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded-sm bg-slate-800/30"></div>
              <div className="w-4 h-4 rounded-sm bg-purple-900/40"></div>
              <div className="w-4 h-4 rounded-sm bg-purple-800/60"></div>
              <div className="w-4 h-4 rounded-sm bg-purple-700/80"></div>
              <div className="w-4 h-4 rounded-sm bg-purple-600"></div>
              <div className="w-4 h-4 rounded-sm bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.8)]"></div>
            </div>
            <span className="text-xs text-slate-500">More</span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-4 p-4 bg-indigo-900/20 border border-indigo-800/30 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 text-xs text-slate-400">
            <div className="font-semibold text-indigo-300 mb-1">Activity Insights</div>
            {peakActivity.value > avgActivity * 2 ? (
              <p>
                Peak activity occurs on <span className="text-white font-medium">{weekdays[peakActivity.day]}</span> at{' '}
                <span className="text-white font-medium">{peakActivity.hour}:00</span> with{' '}
                <span className="text-purple-400 font-medium">{peakActivity.value}</span> activities -
                {' '}{((peakActivity.value / avgActivity - 1) * 100).toFixed(0)}% above average.
              </p>
            ) : (
              <p>
                Activity is relatively consistent throughout the week, with an average of{' '}
                <span className="text-purple-400 font-medium">{avgActivity.toFixed(1)}</span> activities per hour.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
